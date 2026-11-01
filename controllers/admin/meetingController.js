const Meeting = require('../../models/client/Meeting');
const MeetingInvite = require('../../models/client/MeetingInvite');
const User = require('../../models/client/User');
const ApiError = require('../../utils/ApiError');
const { ok } = require('../../utils/ApiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const { build, meta } = require('../../utils/paginate');
const { isValidObjectId } = require('../../utils/validateObjectId');

async function findMeetingOr404(id) {
  if (!isValidObjectId(id)) throw ApiError.badRequest('Invalid id', 'VALIDATION_001');
  const meeting = await Meeting.findById(id)
    .populate('hostId', 'name email')
    .populate('courseId', 'title slug');
  if (!meeting) throw ApiError.notFound('Meeting not found');
  return meeting;
}

const list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = build(req.query);
  const filter = {};

  if (req.query.status) filter.status = req.query.status;
  if (req.query.courseId && isValidObjectId(req.query.courseId)) {
    filter.courseId = req.query.courseId;
  }
  if (req.query.hostId && isValidObjectId(req.query.hostId)) {
    filter.hostId = req.query.hostId;
  }

  const [items, total] = await Promise.all([
    Meeting.find(filter)
      .populate('hostId', 'name email')
      .populate('courseId', 'title slug')
      .sort({ scheduledAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Meeting.countDocuments(filter),
  ]);

  const shaped = items.map((m) => ({
    _id: m._id,
    title: m.title,
    status: m.status,
    scheduledAt: m.scheduledAt,
    startedAt: m.startedAt,
    endedAt: m.endedAt,
    recordingUrl: m.recordingUrl,
    host: m.hostId ? { name: m.hostId.name, email: m.hostId.email } : null,
    course: m.courseId ? { _id: m.courseId._id, title: m.courseId.title } : null,
  }));

  return ok(res, shaped, 'OK', meta({ page, limit, total }));
});

const getOne = asyncHandler(async (req, res) => {
  const meeting = await findMeetingOr404(req.params.id);
  const m = meeting.toObject();

  return ok(res, {
    _id: m._id,
    title: m.title,
    description: m.description,
    status: m.status,
    scheduledAt: m.scheduledAt,
    startedAt: m.startedAt,
    endedAt: m.endedAt,
    recordingUrl: m.recordingUrl,
    host: m.hostId ? { name: m.hostId.name, email: m.hostId.email } : null,
    course: m.courseId ? { _id: m.courseId._id, title: m.courseId.title } : null,
  });
});

const attendance = asyncHandler(async (req, res) => {
  const meeting = await findMeetingOr404(req.params.id);
  const invites = await MeetingInvite.find({ meetingId: meeting._id })
    .sort({ createdAt: 1 })
    .lean();

  const total = invites.length;
  const attended = invites.filter((i) => i.rsvp === 'attended' || i.joinedAt).length;

  const shaped = invites.map((i) => ({
    name: i.name,
    email: i.email,
    phone: i.phone,
    rsvp: i.rsvp,
    joinedAt: i.joinedAt,
    leftAt: i.leftAt,
  }));

  return ok(res, { invites: shaped, total, attended });
});

const recording = asyncHandler(async (req, res) => {
  const meeting = await findMeetingOr404(req.params.id);
  if (!meeting.recordingUrl) {
    throw ApiError.notFound('No recording available for this meeting', 'RECORDING_NOT_FOUND');
  }
  return ok(res, {
    recordingUrl: meeting.recordingUrl,
    title: meeting.title,
    endedAt: meeting.endedAt,
  });
});

module.exports = { list, getOne, attendance, recording };