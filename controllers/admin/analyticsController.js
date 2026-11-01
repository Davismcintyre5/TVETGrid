const Attempt = require('../../models/client/Attempt');
const Progress = require('../../models/client/Progress');
const Meeting = require('../../models/client/Meeting');
const MeetingInvite = require('../../models/client/MeetingInvite');
const AnalyticsDaily = require('../../models/admin/AnalyticsDaily');
const ApiError = require('../../utils/ApiError');
const { ok } = require('../../utils/ApiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const { isValidObjectId } = require('../../utils/validateObjectId');

function rangeFromQuery(query, defaultDays = 30) {
  const to = query.to ? new Date(query.to) : new Date();
  const from = query.from
    ? new Date(query.from)
    : new Date(Date.now() - defaultDays * 86400 * 1000);

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    throw ApiError.badRequest('Invalid date range', 'VALIDATION_001');
  }

  from.setUTCHours(0, 0, 0, 0);
  to.setUTCHours(23, 59, 59, 999);

  return { from, to };
}

function dayKey(d) {
  return new Date(d).toISOString().slice(0, 10);
}

const attempts = asyncHandler(async (req, res) => {
  const { from, to } = rangeFromQuery(req.query, 30);
  const scope = req.query.scope || 'global';
  const scopeId = req.query.scopeId || null;

  const match = { submittedAt: { $gte: from, $lte: to } };
  if (scope === 'course' && scopeId && isValidObjectId(scopeId)) {
    match.courseId = new (require('mongoose').Types.ObjectId)(scopeId);
  } else if (scope === 'paper' && scopeId && isValidObjectId(scopeId)) {
    match.paperId = new (require('mongoose').Types.ObjectId)(scopeId);
  }

  const rows = await Attempt.aggregate([
    { $match: match },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$submittedAt' } },
        attempts: { $sum: 1 },
        avgScore: { $avg: '$percentage' },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const items = rows.map((r) => ({ date: r._id, attempts: r.attempts, avgScore: r.avgScore }));

  const since30 = new Date(Date.now() - 30 * 86400 * 1000);
  const last30Days = await Attempt.countDocuments({
    ...match,
    submittedAt: { $gte: since30 },
  });

  return ok(res, { items, last30Days });
});

const mastery = asyncHandler(async (req, res) => {
  const { from, to } = rangeFromQuery(req.query, 30);

  const rows = await AnalyticsDaily.find({
    scope: 'global',
    date: { $gte: dayKey(from), $lte: dayKey(to) },
  })
    .sort({ date: 1 })
    .lean();

  const items = rows.map((r) => ({
    date: r.date,
    mastery: {
      red: r.mastery?.red || 0,
      amber: r.mastery?.amber || 0,
      green: r.mastery?.green || 0,
    },
  }));

  if (!items.length) {
    const agg = await Progress.aggregate([
      {
        $group: {
          _id: null,
          red: { $sum: { $cond: [{ $lt: ['$mastery', 40] }, 1, 0] } },
          amber: {
            $sum: {
              $cond: [
                { $and: [{ $gte: ['$mastery', 40] }, { $lt: ['$mastery', 70] }] },
                1,
                0,
              ],
            },
          },
          green: { $sum: { $cond: [{ $gte: ['$mastery', 70] }, 1, 0] } },
        },
      },
    ]);
    const m = agg[0] || { red: 0, amber: 0, green: 0 };
    items.push({
      date: dayKey(new Date()),
      mastery: { red: m.red, amber: m.amber, green: m.green },
    });
  }

  return ok(res, { items });
});

const attendance = asyncHandler(async (req, res) => {
  const { from, to } = rangeFromQuery(req.query, 30);

  const rows = await AnalyticsDaily.find({
    scope: 'global',
    date: { $gte: dayKey(from), $lte: dayKey(to) },
  })
    .sort({ date: 1 })
    .lean();

  const items = rows.map((r) => ({
    date: r.date,
    meetingsScheduled: r.meetingsScheduled || 0,
    meetingsHeld: r.meetingsHeld || 0,
    invitesSent: r.invitesSent || 0,
    invitesAttended: r.invitesAttended || 0,
  }));

  if (!items.length) {
    const [scheduled, held, invitesSent, invitesAttended] = await Promise.all([
      Meeting.countDocuments({ scheduledAt: { $gte: from, $lte: to } }),
      Meeting.countDocuments({ endedAt: { $gte: from, $lte: to } }),
      MeetingInvite.countDocuments({ createdAt: { $gte: from, $lte: to } }),
      MeetingInvite.countDocuments({ joinedAt: { $gte: from, $lte: to } }),
    ]);
    items.push({
      date: dayKey(new Date()),
      meetingsScheduled: scheduled,
      meetingsHeld: held,
      invitesSent,
      invitesAttended,
    });
  }

  return ok(res, { items });
});

const invites = asyncHandler(async (req, res) => {
  const [total, attended, byChannel] = await Promise.all([
    MeetingInvite.countDocuments(),
    MeetingInvite.countDocuments({ rsvp: 'attended' }),
    MeetingInvite.aggregate([
      { $group: { _id: '$channel', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
  ]);

  return ok(res, { total, attended, byChannel });
});

module.exports = { attempts, mastery, attendance, invites };