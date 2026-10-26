const { Queue, Worker } = require('bullmq');
const { createRedisConnection } = require('../config/redis');
const logger = require('../utils/logger');
const env = require('../config/env');
const Attempt = require('../models/client/Attempt');
const Progress = require('../models/client/Progress');
const Meeting = require('../models/client/Meeting');
const MeetingInvite = require('../models/client/MeetingInvite');
const User = require('../models/client/User');
const Course = require('../models/admin/Course');
const Paper = require('../models/admin/Paper');
const AnalyticsDaily = require('../models/admin/AnalyticsDaily');

const QUEUE_NAME = 'scheduler-analyticsRollup';

let queue = null;
let worker = null;

function dayKey(d) {
  return new Date(d).toISOString().slice(0, 10);
}

function rangeFor(yesterday) {
  const start = new Date(yesterday);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

async function computeGlobal({ start, end }) {
  const attempts = await Attempt.countDocuments({ submittedAt: { $gte: start, $lt: end } });

  const avgAgg = await Attempt.aggregate([
    { $match: { submittedAt: { $gte: start, $lt: end } } },
    { $group: { _id: null, avg: { $avg: '$score' } } },
  ]);

  const activeUsers = await User.countDocuments({ lastLoginAt: { $gte: start, $lt: end } });
  const newUsers = await User.countDocuments({ createdAt: { $gte: start, $lt: end } });
  const meetingsScheduled = await Meeting.countDocuments({ scheduledAt: { $gte: start, $lt: end } });
  const meetingsHeld = await Meeting.countDocuments({ endedAt: { $gte: start, $lt: end } });
  const invitesSent = await MeetingInvite.countDocuments({ createdAt: { $gte: start, $lt: end } });
  const invitesAttended = await MeetingInvite.countDocuments({ joinedAt: { $gte: start, $lt: end } });

  const masteryAgg = await Progress.aggregate([
    {
      $group: {
        _id: null,
        red: { $sum: { $cond: [{ $lt: ['$mastery', 40] }, 1, 0] } },
        amber: { $sum: { $cond: [{ $and: [{ $gte: ['$mastery', 40] }, { $lt: ['$mastery', 70] }] }, 1, 0] } },
        green: { $sum: { $cond: [{ $gte: ['$mastery', 70] }, 1, 0] } },
      },
    },
  ]);

  return {
    attempts,
    avgScore: avgAgg[0]?.avg || 0,
    activeUsers,
    newUsers,
    meetingsScheduled,
    meetingsHeld,
    invitesSent,
    invitesAttended,
    mastery: {
      red: masteryAgg[0]?.red || 0,
      amber: masteryAgg[0]?.amber || 0,
      green: masteryAgg[0]?.green || 0,
    },
  };
}

async function handler() {
  const start = Date.now();
  const yesterday = new Date();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const date = dayKey(yesterday);
  const { start: s, end: e } = rangeFor(yesterday);

  const global = await computeGlobal({ start: s, end: e });
  await AnalyticsDaily.updateOne(
    { scope: 'global', scopeId: null, date },
    { $set: { ...global, date, scope: 'global', scopeId: null } },
    { upsert: true }
  );

  const courses = await Course.find({ isPublished: true }).select('_id').lean();
  for (const c of courses) {
    const paperIds = await Paper.find({ courseId: c._id }).distinct('_id');
    const attempts = await Attempt.countDocuments({
      paperId: { $in: paperIds },
      submittedAt: { $gte: s, $lt: e },
    });
    const avgAgg = await Attempt.aggregate([
      { $match: { paperId: { $in: paperIds }, submittedAt: { $gte: s, $lt: e } } },
      { $group: { _id: null, avg: { $avg: '$score' } } },
    ]);
    await AnalyticsDaily.updateOne(
      { scope: 'course', scopeId: c._id, date },
      { $set: { date, scope: 'course', scopeId: c._id, attempts, avgScore: avgAgg[0]?.avg || 0 } },
      { upsert: true }
    );
  }

  const cutoff = new Date(Date.now() - 365 * 86400 * 1000);
  await AnalyticsDaily.deleteMany({ createdAt: { $lt: cutoff } });

  logger.info('Scheduler done: analyticsRollup', {
    date,
    courses: courses.length,
    ms: Date.now() - start,
  });
  return { date, courses: courses.length };
}

async function register() {
  if (!env.redis.enabled) {
    logger.warn('analyticsRollup: skipped (Redis disabled)');
    return;
  }
  queue = new Queue(QUEUE_NAME, { connection: createRedisConnection() });
  worker = new Worker(QUEUE_NAME, handler, {
    connection: createRedisConnection(),
    concurrency: 1,
  });

  await queue.add('tick', {}, {
    jobId: 'analytics-rollup-cron',
    repeat: { pattern: '0 4 * * *', tz: 'UTC' },
    removeOnComplete: 50,
    removeOnFail: 50,
  });

  logger.info('Scheduler registered: analyticsRollup (daily 04:00 UTC)');
}

async function stop() {
  if (worker) { await worker.close(); worker = null; }
  if (queue) { await queue.close(); queue = null; }
}

module.exports = { register, stop, handler, QUEUE_NAME };