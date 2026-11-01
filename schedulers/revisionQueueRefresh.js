const { Queue, Worker } = require('bullmq');
const { createRedisConnection, getClient } = require('../config/redis');
const logger = require('../utils/logger');
const env = require('../config/env');

const QUEUE_NAME = 'scheduler-revisionQueueRefresh';

let queue = null;
let worker = null;

async function handler() {
  const start = Date.now();
  const redis = getClient();
  if (!redis) {
    logger.warn('revisionQueueRefresh: no Redis');
    return { cleared: 0 };
  }

  let cursor = '0';
  let cleared = 0;
  do {
    const [next, keys] = await redis.scan(cursor, 'MATCH', 'rev:queue:*', 'COUNT', 200);
    cursor = next;
    if (keys.length) {
      await redis.del(...keys);
      cleared += keys.length;
    }
  } while (cursor !== '0');

  logger.info('Scheduler done: revisionQueueRefresh', { cleared, ms: Date.now() - start });
  return { cleared };
}

async function register() {
  if (!env.redis.enabled) {
    logger.warn('revisionQueueRefresh: skipped (Redis disabled)');
    return;
  }
  queue = new Queue(QUEUE_NAME, { connection: createRedisConnection() });
  worker = new Worker(QUEUE_NAME, handler, {
    connection: createRedisConnection(),
    concurrency: 1,
  });

  await queue.add('tick', {}, {
    jobId: 'revision-queue-refresh-cron',
    repeat: { pattern: '0 2 * * *', tz: 'UTC' },
    removeOnComplete: 50,
    removeOnFail: 50,
  });

  logger.info('Scheduler registered: revisionQueueRefresh (daily 02:00 UTC)');
}

async function stop() {
  if (worker) { await worker.close(); worker = null; }
  if (queue) { await queue.close(); queue = null; }
}

module.exports = { register, stop, handler, QUEUE_NAME };