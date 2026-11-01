const { Queue, Worker } = require('bullmq');
const { createRedisConnection } = require('../config/redis');
const logger = require('../utils/logger');
const env = require('../config/env');
const MeetingInvite = require('../models/client/MeetingInvite');
const AuditLog = require('../models/admin/AuditLog');
const User = require('../models/client/User');
const { INVITE_RSVP } = require('../utils/constants');

const QUEUE_NAME = 'scheduler-cleanup';

let queue = null;
let worker = null;

async function handler() {
  const start = Date.now();
  const cutoff24h = new Date(Date.now() - 24 * 3600 * 1000);
  const cutoff7d = new Date(Date.now() - 7 * 86400 * 1000);
  const cutoff90d = new Date(Date.now() - 90 * 86400 * 1000);

  const expiredInvites = await MeetingInvite.updateMany(
    { rsvp: INVITE_RSVP.INVITED, createdAt: { $lt: cutoff24h } },
    { $set: { rsvp: INVITE_RSVP.EXPIRED } }
  );

  const oldAudit = await AuditLog.deleteMany({ at: { $lt: cutoff90d } });

  const unverified = await User.deleteMany({
    emailVerified: false,
    createdAt: { $lt: cutoff7d },
  });

  logger.info('Scheduler done: cleanup', {
    expiredInvites: expiredInvites.modifiedCount,
    auditDeleted: oldAudit.deletedCount,
    unverifiedDeleted: unverified.deletedCount,
    ms: Date.now() - start,
  });

  return {
    expiredInvites: expiredInvites.modifiedCount,
    auditDeleted: oldAudit.deletedCount,
    unverifiedDeleted: unverified.deletedCount,
  };
}

async function register() {
  if (!env.redis.enabled) {
    logger.warn('cleanup: skipped (Redis disabled)');
    return;
  }
  queue = new Queue(QUEUE_NAME, { connection: createRedisConnection() });
  worker = new Worker(QUEUE_NAME, handler, {
    connection: createRedisConnection(),
    concurrency: 1,
  });

  await queue.add('tick', {}, {
    jobId: 'cleanup-cron',
    repeat: { pattern: '0 */6 * * *', tz: 'UTC' },
    removeOnComplete: 50,
    removeOnFail: 50,
  });

  logger.info('Scheduler registered: cleanup (every 6h)');
}

async function stop() {
  if (worker) { await worker.close(); worker = null; }
  if (queue) { await queue.close(); queue = null; }
}

module.exports = { register, stop, handler, QUEUE_NAME };