const { z } = require('zod');
const AnalyticsDaily = require('../../models/admin/AnalyticsDaily');
const Attempt = require('../../models/client/Attempt');
const MeetingInvite = require('../../models/client/MeetingInvite');
const ApiResponse = require('../../utils/ApiResponse');

const rangeSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  scope: z.enum(['global', 'course', 'paper']).optional(),
});

function buildRange(q) {
  const filter = {};
  if (q.from) filter.date = { ...(filter.date || {}), $gte: q.from };
  if (q.to) filter.date = { ...(filter.date || {}), $lte: q.to };
  if (q.scope) filter.scope = q.scope;
  return filter;
}

async function attempts(req, res, next) {
  try {
    const q = rangeSchema.parse(req.query);
    const filter = buildRange(q);
    const items = await AnalyticsDaily.find({ ...filter, scope: 'global' }).sort({ date: -1 }).limit(90).lean();
    const live = await Attempt.countDocuments({ submittedAt: { $gte: new Date(Date.now() - 30 * 86400000) } });
    return ApiResponse.ok(res, { items, last30Days: live });
  } catch (err) { next(err); }
}

async function mastery(req, res, next) {
  try {
    const q = rangeSchema.parse(req.query);
    const filter = buildRange(q);
    const items = await AnalyticsDaily.find({ ...filter, scope: 'global' })
      .select('date mastery')
      .sort({ date: -1 })
      .limit(90)
      .lean();
    return ApiResponse.ok(res, { items });
  } catch (err) { next(err); }
}

async function attendance(req, res, next) {
  try {
    const q = rangeSchema.parse(req.query);
    const filter = buildRange(q);
    const items = await AnalyticsDaily.find({ ...filter, scope: 'global' })
      .select('date meetingsScheduled meetingsHeld invitesSent invitesAttended')
      .sort({ date: -1 })
      .limit(90)
      .lean();
    return ApiResponse.ok(res, { items });
  } catch (err) { next(err); }
}

async function invites(req, res, next) {
  try {
    const total = await MeetingInvite.countDocuments();
    const attended = await MeetingInvite.countDocuments({ joinedAt: { $ne: null } });
    const byChannel = await MeetingInvite.aggregate([
      { $unwind: '$channels' },
      { $group: { _id: '$channels', count: { $sum: 1 } } },
    ]);
    return ApiResponse.ok(res, { total, attended, byChannel });
  } catch (err) { next(err); }
}

module.exports = { attempts, mastery, attendance, invites };