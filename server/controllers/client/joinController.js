const MeetingInvite = require('../../models/client/MeetingInvite');
const Meeting = require('../../models/client/Meeting');
const User = require('../../models/client/User');
const ApiError = require('../../utils/ApiError');
const { ok } = require('../../utils/ApiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const { isValidObjectId } = require('../../utils/validateObjectId');
const { mintJoinToken, createRoom, url: livekitUrl } = require('../../config/livekit');

const lookup = asyncHandler(async (req, res) => {
  const invite = await MeetingInvite.findOne({ token: req.params.token })
    .populate({
      path: 'meetingId',
      select: 'title hostId scheduledAt durationMin status settings',
      populate: { path: 'hostId', select: 'name email' },
    })
    .lean();

  if (!invite || !invite.meetingId) throw ApiError.notFound('Invite not found');

  const meeting = invite.meetingId;
  if (meeting.status === 'ended') throw ApiError.badRequest('Meeting has ended');

  return ok(res, {
    meetingTitle: meeting.title,
    hostName: meeting.hostId?.name || 'Host',
    scheduledAt: meeting.scheduledAt,
    durationMin: meeting.durationMin,
    status: meeting.status,
    requiresRegistration: !invite.userId,
    inviteId: String(invite._id),
  });
});

const join = asyncHandler(async (req, res) => {
  const invite = await MeetingInvite.findOne({ token: req.params.token });
  if (!invite) throw ApiError.notFound('Invite not found');

  const meeting = await Meeting.findById(invite.meetingId);
  if (!meeting) throw ApiError.notFound('Meeting not found');
  if (meeting.status === 'ended') throw ApiError.badRequest('Meeting has ended');

  let identity, displayName;
  if (req.user) {
    identity = String(req.user.id);
    displayName = req.user.name;
    invite.userId = req.user.id;
  } else {
    const { guestName, guestEmail } = req.body || {};
    if (!guestName || !guestEmail) {
      throw ApiError.badRequest('guestName and guestEmail required', 'VALIDATION_001');
    }
    identity = `guest-${invite._id}-${Date.now()}`;
    displayName = guestName;
  }

  invite.rsvp = 'accepted';
  invite.joinedAt = new Date();
  await invite.save();

  await createRoom(meeting.roomName);

  const token = await mintJoinToken({
    roomId: meeting.roomName,
    identity,
    name: displayName,
    ttlSeconds: 3600,
    canPublish: !meeting.settings?.muteAll,
    canPublishVideo: !meeting.settings?.videoOffAll,
    canPublishData: true,
    isHost: false,
  });

  return ok(
    res,
    {
      meetingId: String(meeting._id),
      token,
      url: livekitUrl,
      roomName: meeting.roomName,
      inviteId: String(invite._id),
    },
    'Joined'
  );
});

module.exports = { lookup, join };