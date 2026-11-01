const crypto = require('crypto');
const Meeting = require('../../models/client/Meeting');
const MeetingParticipant = require('../../models/client/MeetingParticipant');
const MeetingInvite = require('../../models/client/MeetingInvite');
const User = require('../../models/client/User');
const Course = require('../../models/admin/Course');
const ApiError = require('../../utils/ApiError');
const { ok, created } = require('../../utils/ApiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const { build, meta } = require('../../utils/paginate');
const { isValidObjectId } = require('../../utils/validateObjectId');
const { MEETING_STATUS } = require('../../utils/constants');
const { randomToken, shortCode } = require('../../utils/generateToken');
const {
  createRoom,
  deleteRoom,
  removeParticipant: removeFromLiveKit,
  mintJoinToken,
  url: livekitUrl,
} = require('../../config/livekit');
const { getIO } = require('../../config/socket');
const emailService = require('../../services/emailService');
const logger = require('../../utils/logger');
const env = require('../../config/env');

const SLUG = () =>
  `meeting-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

function broadcast(meetingId, event, payload) {
  try {
    const io = getIO();
    io.of('/meeting').to(`meeting:${meetingId}`).emit(event, payload);
  } catch (e) {
    logger.warn('meetingController: broadcast failed', {
      event,
      err: e.message,
    });
  }
}

async function loadMeetingAsHost(req) {
  if (!isValidObjectId(req.params.id)) throw ApiError.badRequest('Invalid id');
  const meeting = await Meeting.findById(req.params.id);
  if (!meeting) throw ApiError.notFound('Meeting not found');
  if (String(meeting.hostId) !== String(req.user.id)) {
    throw ApiError.forbidden('Only the host can perform this action');
  }
  return meeting;
}

const list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = build(req.query);
  const status = req.query.status;
  const q = String(req.query.q || '').trim();

  const invites = await MeetingParticipant.find({
    userId: req.user.id,
    removedAt: null,
  })
    .select('meetingId')
    .lean();
  const invitedIds = invites.map((i) => i.meetingId);

  const filter = {
    $or: [{ hostId: req.user.id }, { _id: { $in: invitedIds } }],
  };
  if (status) filter.status = status;

  if (q) filter.title = { $regex: q, $options: 'i' };

  let [items, total] = await Promise.all([
    Meeting.find(filter)
      .populate('hostId', 'name email avatarUrl')
      .populate('courseId', 'title slug')
      .sort({ scheduledAt: -1 })
      .skip(q ? 0 : skip)
      .limit(q ? 500 : limit)
      .lean(),
    Meeting.countDocuments(filter),
  ]);

  if (q) {
    const lowerQ = q.toLowerCase();
    items = items.filter(
      (m) =>
        String(m._id).toLowerCase().includes(lowerQ) ||
        String(m.title || '').toLowerCase().includes(lowerQ)
    );
    total = items.length;
    items = items.slice(skip, skip + limit);
  }

  const shaped = items.map((m) => ({
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
    isHost: String(m.hostId?._id) === String(req.user.id),
    settings: m.settings,
  }));

  return ok(res, shaped, 'OK', meta({ page, limit, total }));
});

const getOne = asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.id)) throw ApiError.badRequest('Invalid id');
  const m = await Meeting.findById(req.params.id)
    .populate('hostId', 'name email avatarUrl')
    .populate('courseId', 'title slug')
    .lean();
  if (!m) throw ApiError.notFound('Meeting not found');

  const isHost = String(m.hostId?._id) === String(req.user.id);
  const isInvited = await MeetingParticipant.findOne({
    meetingId: m._id,
    userId: req.user.id,
    removedAt: null,
  }).lean();

  if (!isHost && !isInvited && !m.settings?.allowGuestJoin) {
    throw ApiError.forbidden('You are not invited to this meeting');
  }

  return ok(res, {
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
    isHost,
    settings: m.settings,
  });
});

const create = asyncHandler(async (req, res) => {
  const { title, description, courseId, scheduledAt, durationMin, invitees } =
    req.body || {};

  if (!title || !String(title).trim()) throw ApiError.badRequest('Title required');
  if (!scheduledAt) throw ApiError.badRequest('scheduledAt required');

  const dt = new Date(scheduledAt);
  if (Number.isNaN(dt.getTime())) throw ApiError.badRequest('Invalid scheduledAt');

  if (courseId) {
    if (!isValidObjectId(courseId)) throw ApiError.badRequest('Invalid courseId');
    const course = await Course.findById(courseId).lean();
    if (!course) throw ApiError.notFound('Course not found');
  }

  const roomName = SLUG();

  const meeting = await Meeting.create({
    title: String(title).trim(),
    description: description || '',
    courseId: courseId || null,
    hostId: req.user.id,
    scheduledAt: dt,
    durationMin: durationMin || 60,
    roomName,
    status: MEETING_STATUS.SCHEDULED,
    settings: {},
  });

  await MeetingParticipant.create({
    meetingId: meeting._id,
    userId: req.user.id,
    isHost: true,
    role: 'host',
  });

  let invitedCount = 0;
  if (Array.isArray(invitees) && invitees.length > 0) {
    const cleanEmails = invitees
      .map((e) => String(e || '').toLowerCase().trim())
      .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));

    if (cleanEmails.length > 0) {
      const users = await User.find({
        email: { $in: cleanEmails },
        isActive: true,
      })
        .select('_id name email')
        .lean();
      const usersByEmail = new Map(users.map((u) => [u.email.toLowerCase(), u]));

      for (const email of cleanEmails) {
        const u = usersByEmail.get(email);
        const token = randomToken(24);
        const code = shortCode(7);

        try {
          await MeetingInvite.updateOne(
            { meetingId: meeting._id, email },
            {
              $setOnInsert: {
                meetingId: meeting._id,
                userId: u?._id || null,
                email,
                name: u?.name || '',
                token,
                shortCode: code,
                rsvp: 'invited',
                channel: 'email',
              },
            },
            { upsert: true }
          );
        } catch (err) {
          logger.warn('meetingController.create: invite upsert failed', {
            err: err.message,
            email,
          });
          continue;
        }

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

        emailService
          .sendMeetingInvite({
            to: email,
            recipientName: u?.name || '',
            meetingTitle: meeting.title,
            hostName: req.user.name,
            scheduledAt: dt.toISOString(),
            durationMin: meeting.durationMin,
            joinUrl: `${env.appUrl}/join/${token}`,
          })
          .catch((e) =>
            logger.warn('meetingController.create: invite email failed', {
              err: e.message,
              to: email,
            })
          );

        invitedCount++;
      }
    }
  }

  return created(
    res,
    { ...meeting.toObject(), invitedCount },
    'Meeting created'
  );
});

const update = asyncHandler(async (req, res) => {
  const meeting = await loadMeetingAsHost(req);

  if (meeting.status === MEETING_STATUS.ENDED) {
    throw ApiError.badRequest('Cannot edit an ended meeting');
  }

  const { title, description, scheduledAt, durationMin } = req.body || {};

  if (typeof title === 'string' && title.trim()) meeting.title = title.trim();
  if (typeof description === 'string') meeting.description = description;

  if (scheduledAt) {
    const dt = new Date(scheduledAt);
    if (Number.isNaN(dt.getTime())) throw ApiError.badRequest('Invalid scheduledAt');
    meeting.scheduledAt = dt;
  }

  if (durationMin !== undefined) {
    const d = Number(durationMin);
    if (d > 0) meeting.durationMin = d;
  }

  await meeting.save();
  return ok(res, meeting.toObject(), 'Meeting updated');
});

const start = asyncHandler(async (req, res) => {
  const meeting = await loadMeetingAsHost(req);

  if (meeting.status === MEETING_STATUS.ENDED) {
    throw ApiError.badRequest('Meeting has ended', 'MEETING_ENDED');
  }
  if (meeting.status === MEETING_STATUS.CANCELLED) {
    throw ApiError.badRequest('Meeting was cancelled', 'MEETING_CANCELLED');
  }
  if (meeting.status === MEETING_STATUS.LIVE) {
    return ok(res, meeting.toObject(), 'Meeting already live');
  }

  meeting.status = MEETING_STATUS.LIVE;
  meeting.startedAt = meeting.startedAt || new Date();
  await meeting.save();

  await createRoom(meeting.roomName).catch((err) =>
    logger.warn('meetingController.start: createRoom failed', { err: err.message })
  );

  broadcast(meeting._id, 'meeting:started', {
    meetingId: String(meeting._id),
    startedAt: meeting.startedAt,
  });

  return ok(res, meeting.toObject(), 'Meeting started');
});

const cancel = asyncHandler(async (req, res) => {
  const meeting = await loadMeetingAsHost(req);

  meeting.status = MEETING_STATUS.CANCELLED;
  meeting.endedAt = new Date();
  await meeting.save();

  await deleteRoom(meeting.roomName).catch(() => {});

  broadcast(meeting._id, 'meeting:cancelled', {
    meetingId: String(meeting._id),
  });

  return ok(res, meeting.toObject(), 'Meeting cancelled');
});

const invite = asyncHandler(async (req, res) => {
  const meeting = await loadMeetingAsHost(req);

  const invitees = Array.isArray(req.body?.invitees) ? req.body.invitees : [];
  const cleanEmails = invitees
    .map((e) => String(e || '').toLowerCase().trim())
    .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));

  if (cleanEmails.length === 0) {
    return ok(res, { invited: 0, skipped: 0 }, 'No valid emails');
  }

  const users = await User.find({
    email: { $in: cleanEmails },
    isActive: true,
  })
    .select('_id name email')
    .lean();
  const usersByEmail = new Map(users.map((u) => [u.email.toLowerCase(), u]));

  let invitedCount = 0;
  let skippedCount = 0;

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

    await MeetingInvite.create({
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

    emailService
      .sendMeetingInvite({
        to: email,
        recipientName: u?.name || '',
        meetingTitle: meeting.title,
        hostName: req.user.name,
        scheduledAt: meeting.scheduledAt.toISOString(),
        durationMin: meeting.durationMin,
        joinUrl: `${env.appUrl}/join/${token}`,
      })
      .catch((e) =>
        logger.warn('meetingController.invite: email failed', {
          err: e.message,
          to: email,
        })
      );

    invitedCount++;
  }

  return ok(
    res,
    { invited: invitedCount, skipped: skippedCount },
    `Invited ${invitedCount} participant(s)`
  );
});

const join = asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.id)) throw ApiError.badRequest('Invalid id');

  const meeting = await Meeting.findById(req.params.id);
  if (!meeting) throw ApiError.notFound('Meeting not found');

  if (meeting.status === MEETING_STATUS.ENDED) {
    throw ApiError.badRequest('Meeting has ended', 'MEETING_ENDED');
  }
  if (meeting.status === MEETING_STATUS.CANCELLED) {
    throw ApiError.badRequest('Meeting was cancelled', 'MEETING_CANCELLED');
  }

  const userId = req.user.id;
  const isHost = String(meeting.hostId) === String(userId);

  const existing = await MeetingParticipant.findOne({
    meetingId: meeting._id,
    userId,
  });

  if (existing?.removedAt) {
    throw ApiError.forbidden(
      'You were removed from this meeting',
      'REMOVED_FROM_MEETING'
    );
  }

  if (meeting.settings?.locked && !existing && !isHost) {
    throw ApiError.forbidden('Meeting is locked', 'MEETING_LOCKED');
  }

  if (!isHost && !existing && !meeting.settings?.allowGuestJoin) {
    throw ApiError.forbidden('You are not invited to this meeting');
  }

  if (meeting.status === MEETING_STATUS.SCHEDULED) {
    throw ApiError.badRequest(
      isHost
        ? 'Click "Start meeting" to begin'
        : 'Meeting has not started yet. Waiting for the host.',
      'MEETING_NOT_STARTED'
    );
  }

  const participant = await MeetingParticipant.findOneAndUpdate(
    { meetingId: meeting._id, userId },
    {
      $setOnInsert: {
        meetingId: meeting._id,
        userId,
        joinedAt: new Date(),
        isHost,
        role: isHost ? 'host' : 'participant',
      },
      $set: {
        leftAt: null,
        isMutedByHost: !!meeting.settings?.muteAll && !isHost,
        isVideoBlockedByHost: !!meeting.settings?.videoOffAll && !isHost,
      },
    },
    { upsert: true, new: true }
  );

  await createRoom(meeting.roomName).catch((err) =>
    logger.warn('meetingController.join: createRoom failed', { err: err.message })
  );

  const canPublish = isHost || !participant.isMutedByHost;
  const canPublishVideo = isHost || !meeting.settings?.videoOffAll;

  const token = await mintJoinToken({
    roomId: meeting.roomName,
    identity: String(userId),
    name: req.user.name,
    ttlSeconds: 3600,
    canPublish,
    canPublishVideo,
    canPublishData: true,
    isHost,
  });

  broadcast(meeting._id, 'participant:joined', {
    userId: String(userId),
    name: req.user.name,
    isHost,
  });

  return ok(
    res,
    {
      token,
      url: livekitUrl,
      roomName: meeting.roomName,
      meeting: {
        _id: meeting._id,
        title: meeting.title,
        scheduledAt: meeting.scheduledAt,
        status: meeting.status,
        hostId: String(meeting.hostId),
      },
      participant: {
        _id: participant._id,
        isHost,
        isMutedByHost: participant.isMutedByHost,
        isVideoBlockedByHost: participant.isVideoBlockedByHost,
      },
      settings: meeting.settings,
    },
    'Join token issued'
  );
});

const leave = asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.id)) throw ApiError.badRequest('Invalid id');
  const meeting = await Meeting.findById(req.params.id);
  if (!meeting) throw ApiError.notFound('Meeting not found');

  await MeetingParticipant.updateOne(
    { meetingId: meeting._id, userId: req.user.id },
    { $set: { leftAt: new Date(), socketId: null } }
  );

  const activeCount = await MeetingParticipant.countDocuments({
    meetingId: meeting._id,
    leftAt: null,
    removedAt: null,
  });

  if (activeCount === 0 && String(meeting.hostId) === String(req.user.id)) {
    meeting.status = MEETING_STATUS.ENDED;
    meeting.endedAt = new Date();
    await meeting.save();

    broadcast(meeting._id, 'meeting:ended', {
      meetingId: String(meeting._id),
    });
  }

  broadcast(meeting._id, 'participant:left', {
    userId: String(req.user.id),
  });

  return ok(res, { left: true }, 'Left meeting');
});

const updateSettings = asyncHandler(async (req, res) => {
  const meeting = await loadMeetingAsHost(req);

  const allowed = [
    'muteAll',
    'videoOffAll',
    'chatDisabled',
    'reactionsDisabled',
    'locked',
    'allowGuestJoin',
  ];

  if (!meeting.settings) meeting.settings = {};

  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      meeting.settings[key] = !!req.body[key];
    }
  }

  await meeting.save();

  if (req.body.muteAll !== undefined) {
    await MeetingParticipant.updateMany(
      { meetingId: meeting._id, leftAt: null, isHost: false },
      { $set: { isMutedByHost: !!req.body.muteAll } }
    );
  }
  if (req.body.videoOffAll !== undefined) {
    await MeetingParticipant.updateMany(
      { meetingId: meeting._id, leftAt: null, isHost: false },
      { $set: { isVideoBlockedByHost: !!req.body.videoOffAll } }
    );
  }

  broadcast(meeting._id, 'settings:update', {
    settings: meeting.settings,
  });

  return ok(res, meeting.settings, 'Settings updated');
});

const muteAll = asyncHandler(async (req, res) => {
  const meeting = await loadMeetingAsHost(req);

  meeting.settings.muteAll = true;
  await meeting.save();

  await MeetingParticipant.updateMany(
    { meetingId: meeting._id, leftAt: null, isHost: false },
    { $set: { isMutedByHost: true } }
  );

  broadcast(meeting._id, 'settings:update', {
    settings: meeting.settings,
    action: 'muteAll',
  });

  broadcast(meeting._id, 'host:mute-all', {
    byHost: String(req.user.id),
  });

  return ok(res, meeting.settings, 'All muted');
});

const unmuteAll = asyncHandler(async (req, res) => {
  const meeting = await loadMeetingAsHost(req);

  if (meeting.settings?.muteAll) {
    meeting.settings.muteAll = false;
    await meeting.save();
  }

  await MeetingParticipant.updateMany(
    { meetingId: meeting._id, leftAt: null, isHost: false },
    { $set: { isMutedByHost: false } }
  );

  broadcast(meeting._id, 'settings:update', {
    settings: meeting.settings,
    action: 'unmuteAll',
  });

  broadcast(meeting._id, 'host:unmute-all', {
    byHost: String(req.user.id),
  });

  return ok(res, meeting.settings, 'All unmuted');
});

const muteParticipant = asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.participantId)) {
    throw ApiError.badRequest('Invalid participantId');
  }

  const meeting = await loadMeetingAsHost(req);

  const participant = await MeetingParticipant.findOne({
    meetingId: meeting._id,
    userId: req.params.participantId,
  });
  if (!participant) throw ApiError.notFound('Participant not found');
  if (participant.isHost) throw ApiError.forbidden('Cannot mute the host');

  participant.isMutedByHost = true;
  await participant.save();

  broadcast(meeting._id, 'host:mute', {
    userId: String(participant.userId),
    byHost: String(req.user.id),
  });

  return ok(res, { muted: true }, 'Participant muted');
});

const unmuteParticipant = asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.participantId)) {
    throw ApiError.badRequest('Invalid participantId');
  }

  const meeting = await loadMeetingAsHost(req);

  const participant = await MeetingParticipant.findOne({
    meetingId: meeting._id,
    userId: req.params.participantId,
  });
  if (!participant) throw ApiError.notFound('Participant not found');

  participant.isMutedByHost = false;
  await participant.save();

  broadcast(meeting._id, 'host:unmute', {
    userId: String(participant.userId),
    byHost: String(req.user.id),
  });

  return ok(res, { unmuted: true }, 'Participant unmuted');
});

const removeParticipant = asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.participantId)) {
    throw ApiError.badRequest('Invalid participantId');
  }

  const meeting = await loadMeetingAsHost(req);

  const participant = await MeetingParticipant.findOne({
    meetingId: meeting._id,
    userId: req.params.participantId,
  });
  if (!participant) throw ApiError.notFound('Participant not found');
  if (participant.isHost) throw ApiError.forbidden('Cannot remove the host');

  participant.removedAt = new Date();
  participant.removedBy = req.user.id;
  participant.leftAt = new Date();
  await participant.save();

  await removeFromLiveKit(meeting.roomName, String(participant.userId)).catch(
    () => {}
  );

  broadcast(meeting._id, 'participant:removed', {
    userId: String(participant.userId),
    removedBy: String(req.user.id),
  });

  return ok(res, { removed: true }, 'Participant removed');
});

const endMeeting = asyncHandler(async (req, res) => {
  const meeting = await loadMeetingAsHost(req);

  meeting.status = MEETING_STATUS.ENDED;
  meeting.endedAt = new Date();
  await meeting.save();

  await MeetingParticipant.updateMany(
    { meetingId: meeting._id, leftAt: null },
    { $set: { leftAt: new Date() } }
  );

  await deleteRoom(meeting.roomName).catch(() => {});

  broadcast(meeting._id, 'meeting:ended', {
    meetingId: String(meeting._id),
  });

  return ok(res, { ended: true }, 'Meeting ended');
});

const listParticipants = asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.id)) throw ApiError.badRequest('Invalid id');
  const meeting = await Meeting.findById(req.params.id).lean();
  if (!meeting) throw ApiError.notFound('Meeting not found');

  const isHost = String(meeting.hostId) === String(req.user.id);
  const isInvited = await MeetingParticipant.findOne({
    meetingId: meeting._id,
    userId: req.user.id,
  }).lean();
  if (!isHost && !isInvited) throw ApiError.forbidden('Not invited');

  const items = await MeetingParticipant.find({
    meetingId: meeting._id,
    leftAt: null,
    removedAt: null,
  })
    .populate('userId', 'name email avatarUrl role')
    .lean();

  return ok(
    res,
    items.map((p) => ({
      userId: String(p.userId?._id),
      name: p.userId?.name,
      email: p.userId?.email,
      avatarUrl: p.userId?.avatarUrl,
      isHost: p.isHost,
      isMutedByHost: p.isMutedByHost,
      isVideoBlockedByHost: p.isVideoBlockedByHost,
      joinedAt: p.joinedAt,
    }))
  );
});

module.exports = {
  list,
  getOne,
  create,
  update,
  start,
  cancel,
  invite,
  join,
  leave,
  updateSettings,
  muteAll,
  unmuteAll,
  muteParticipant,
  unmuteParticipant,
  removeParticipant,
  endMeeting,
  listParticipants,
};