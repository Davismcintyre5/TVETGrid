const Meeting = require('../../models/client/Meeting');
const MeetingInvite = require('../../models/client/MeetingInvite');
const MeetingParticipant = require('../../models/client/MeetingParticipant');
const User = require('../../models/client/User');
const ApiError = require('../../utils/ApiError');
const { ok, created } = require('../../utils/ApiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const { isValidObjectId } = require('../../utils/validateObjectId');
const { MEETING_STATUS } = require('../../utils/constants');
const { randomToken, shortCode } = require('../../utils/generateToken');
const { getIO } = require('../../config/socket');
const emailService = require('../../services/emailService');
const logger = require('../../utils/logger');
const env = require('../../config/env');

// ─── Helper: broadcast to meeting namespace ──────────
function broadcast(meetingId, event, payload) {
  try {
    const io = getIO();
    io.of('/meeting').to(`meeting:${meetingId}`).emit(event, payload);
  } catch (e) {
    logger.warn('meetingInviteController: broadcast failed', {
      event,
      err: e.message,
    });
  }
}

// ─── Helper: get meeting + assert host ───────────────
async function loadMeetingAsHost(req) {
  if (!isValidObjectId(req.params.id)) throw ApiError.badRequest('Invalid id');
  const meeting = await Meeting.findById(req.params.id);
  if (!meeting) throw ApiError.notFound('Meeting not found');
  if (String(meeting.hostId) !== String(req.user.id)) {
    throw ApiError.forbidden('Only the host can manage invites');
  }
  return meeting;
}

// ─── GET /meetings/:id/invites — list invites (host) ─
const listInvites = asyncHandler(async (req, res) => {
  const meeting = await loadMeetingAsHost(req);

  const invites = await MeetingInvite.find({ meetingId: meeting._id })
    .populate('userId', 'name email avatarUrl role')
    .sort({ createdAt: -1 })
    .lean();

  const shaped = invites.map((i) => ({
    _id: i._id,
    email: i.email,
    name: i.name || i.userId?.name || '',
    avatarUrl: i.userId?.avatarUrl || null,
    userId: i.userId?._id ? String(i.userId._id) : null,
    role: i.userId?.role || null,
    rsvp: i.rsvp,
    channel: i.channel,
    joinedAt: i.joinedAt,
    reminderSentAt: i.reminderSentAt,
    createdAt: i.createdAt,
  }));

  return ok(res, {
    meeting: {
      _id: meeting._id,
      title: meeting.title,
      scheduledAt: meeting.scheduledAt,
      status: meeting.status,
      durationMin: meeting.durationMin,
    },
    invites: shaped,
    counts: {
      total: shaped.length,
      invited: shaped.filter((i) => i.rsvp === 'invited').length,
      accepted: shaped.filter((i) => i.rsvp === 'accepted' || i.rsvp === 'attended').length,
      declined: shaped.filter((i) => i.rsvp === 'declined').length,
    },
  });
});

// ─── POST /meetings/:id/invites — add invitees ───────
const addInvites = asyncHandler(async (req, res) => {
  const meeting = await loadMeetingAsHost(req);

  if (meeting.status === MEETING_STATUS.ENDED) {
    throw ApiError.badRequest('Cannot add invites to an ended meeting');
  }

  const invitees = Array.isArray(req.body?.invitees) ? req.body.invitees : [];
  const cleanEmails = invitees
    .map((e) => String(e || '').toLowerCase().trim())
    .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));

  if (cleanEmails.length === 0) {
    return ok(res, { added: 0, skipped: 0 }, 'No valid emails');
  }

  const users = await User.find({
    email: { $in: cleanEmails },
    isActive: true,
  })
    .select('_id name email')
    .lean();
  const usersByEmail = new Map(users.map((u) => [u.email.toLowerCase(), u]));

  let addedCount = 0;
  let skippedCount = 0;
  const addedInvites = [];

  for (const email of cleanEmails) {
    const u = usersByEmail.get(email);

    const existing = await MeetingInvite.findOne({
      meetingId: meeting._id,
      email,
    }).lean();
    if (existing) {
      skippedCount++;
      continue;
    }

    const token = randomToken(24);
    const code = shortCode(7);

    const invite = await MeetingInvite.create({
      meetingId: meeting._id,
      userId: u?._id || null,
      email,
      name: u?.name || '',
      token,
      shortCode: code,
      rsvp: 'invited',
      channel: 'email',
    });

    if (u) {
      await MeetingParticipant.updateOne(
        { meetingId: meeting._id, userId: u._id },
        {
          $setOnInsert: {
            meetingId: meeting._id,
            userId: u._id,
            isHost: false,
            role: 'participant',
          },
        },
        { upsert: true }
      );
    }

    const joinUrl = `${env.appUrl}/join/${token}`;
    emailService
      .sendMeetingInvite({
        to: email,
        recipientName: u?.name || '',
        meetingTitle: meeting.title,
        hostName: req.user.name,
        scheduledAt: meeting.scheduledAt.toISOString(),
        durationMin: meeting.durationMin,
        joinUrl,
      })
      .catch((e) =>
        logger.warn('meetingInviteController.addInvites: email failed', {
          err: e.message,
          to: email,
        })
      );

    addedInvites.push({
      _id: invite._id,
      email,
      name: u?.name || '',
      userId: u?._id ? String(u._id) : null,
      rsvp: 'invited',
      createdAt: invite.createdAt,
    });

    addedCount++;
  }

  if (addedCount > 0) {
    broadcast(meeting._id, 'invites:added', {
      meetingId: String(meeting._id),
      added: addedInvites,
    });
  }

  return created(
    res,
    { added: addedCount, skipped: skippedCount, invites: addedInvites },
    `Invited ${addedCount} participant(s)`
  );
});

// ─── DELETE /meetings/:id/invites/:inviteId — remove ─
const removeInvite = asyncHandler(async (req, res) => {
  const meeting = await loadMeetingAsHost(req);

  if (!isValidObjectId(req.params.inviteId)) {
    throw ApiError.badRequest('Invalid inviteId');
  }

  const invite = await MeetingInvite.findOne({
    _id: req.params.inviteId,
    meetingId: meeting._id,
  });

  if (!invite) throw ApiError.notFound('Invite not found');

  // Also remove the MeetingParticipant if exists
  if (invite.userId) {
    await MeetingParticipant.deleteOne({
      meetingId: meeting._id,
      userId: invite.userId,
      isHost: false,
    }).catch(() => {});
  }

  await MeetingInvite.deleteOne({ _id: invite._id });

  broadcast(meeting._id, 'invites:removed', {
    meetingId: String(meeting._id),
    inviteId: String(invite._id),
    email: invite.email,
    userId: invite.userId ? String(invite.userId) : null,
  });

  return ok(res, { removed: true }, 'Invite removed');
});

// ─── GET /meetings/invited-to — meetings I'm invited to ─
const listMyInvites = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
  const skip = (page - 1) * limit;

  const q = String(req.query.q || '').trim();
  const statusFilter = req.query.status; // 'scheduled' | 'live' | 'ended'

  // Find invites for this user (by userId OR email)
  const user = await User.findById(req.user.id).select('email').lean();
  if (!user) throw ApiError.unauthorized('User not found');

  const orConditions = [{ userId: req.user.id }];
  if (user.email) orConditions.push({ email: user.email.toLowerCase() });

  const invites = await MeetingInvite.find({ $or: orConditions })
    .populate({
      path: 'meetingId',
      select:
        'title description hostId scheduledAt startedAt endedAt durationMin status courseId settings',
      populate: [
        { path: 'hostId', select: 'name email avatarUrl' },
        { path: 'courseId', select: 'title slug' },
      ],
    })
    .sort({ createdAt: -1 })
    .lean();

  // Filter out invites whose meeting is deleted
  const valid = invites.filter((i) => i.meetingId);

  // Filter by search (meeting id or name)
  let filtered = valid;
  if (q) {
    const lowerQ = q.toLowerCase();
    filtered = filtered.filter((i) => {
      const m = i.meetingId;
      return (
        String(m._id).toLowerCase().includes(lowerQ) ||
        String(m.title || '').toLowerCase().includes(lowerQ)
      );
    });
  }

  // Filter by status
  if (statusFilter) {
    filtered = filtered.filter((i) => i.meetingId.status === statusFilter);
  }

  // Paginate
  const total = filtered.length;
  const pages = Math.ceil(total / limit) || 0;
  const paginated = filtered.slice(skip, skip + limit);

  const shaped = paginated.map((i) => {
    const m = i.meetingId;
    return {
      invite: {
        _id: i._id,
        rsvp: i.rsvp,
        joinedAt: i.joinedAt,
        createdAt: i.createdAt,
      },
      meeting: {
        _id: m._id,
        title: m.title,
        description: m.description,
        status: m.status,
        scheduledAt: m.scheduledAt,
        startedAt: m.startedAt,
        endedAt: m.endedAt,
        durationMin: m.durationMin,
        host: m.hostId
          ? {
              _id: m.hostId._id,
              name: m.hostId.name,
              email: m.hostId.email,
              avatarUrl: m.hostId.avatarUrl,
            }
          : null,
        course: m.courseId
          ? { _id: m.courseId._id, title: m.courseId.title }
          : null,
        settings: m.settings,
      },
    };
  });

  return ok(res, shaped, 'OK', { page, limit, total, pages });
});

module.exports = {
  listInvites,
  addInvites,
  removeInvite,
  listMyInvites,
};