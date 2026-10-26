const { z } = require('zod');
const Meeting = require('../../models/client/Meeting');
const MeetingInvite = require('../../models/client/MeetingInvite');
const ApiError = require('../../utils/ApiError');
const ApiResponse = require('../../utils/ApiResponse');
const paginate = require('../../utils/paginate');
const { MEETING_STATUS } = require('../../utils/constants');

const oid = z.string().regex(/^[0-9a-f]{24}$/i);
const idSchema = z.object({ id: oid });

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  status: z.enum(Object.values(MEETING_STATUS)).optional(),
  hostId: oid.optional(),
});

async function list(req, res, next) {
  try {
    const q = listQuerySchema.parse(req.query);
    const { page, limit, skip } = paginate.build(q);
    const filter = {};
    if (q.status) filter.status = q.status;
    if (q.hostId) filter.hostId = q.hostId;
    const [items, total] = await Promise.all([
      Meeting.find(filter).sort({ scheduledAt: -1 }).skip(skip).limit(limit).lean(),
      Meeting.countDocuments(filter),
    ]);
    return ApiResponse.ok(res, items, 'OK', paginate.meta({ page, limit, total }));
  } catch (err) { next(err); }
}

async function getById(req, res, next) {
  try {
    const { id } = idSchema.parse(req.params);
    const meeting = await Meeting.findById(id).lean();
    if (!meeting) throw ApiError.notFound('Meeting not found');
    const invites = await MeetingInvite.find({ meetingId: id }).lean();
    return ApiResponse.ok(res, { ...meeting, invites });
  } catch (err) { next(err); }
}

async function attendance(req, res, next) {
  try {
    const { id } = idSchema.parse(req.params);
    const invites = await MeetingInvite.find({ meetingId: id })
      .select('email phone name rsvp joinedAt leftAt')
      .lean();
    const attended = invites.filter((i) => !!i.joinedAt).length;
    return ApiResponse.ok(res, { total: invites.length, attended, invites });
  } catch (err) { next(err); }
}

async function recording(req, res, next) {
  try {
    const { id } = idSchema.parse(req.params);
    const meeting = await Meeting.findById(id).select('title recordingUrl endedAt').lean();
    if (!meeting) throw ApiError.notFound('Meeting not found');
    return ApiResponse.ok(res, meeting);
  } catch (err) { next(err); }
}

module.exports = { list, getById, attendance, recording };