const { Queue, Worker } = require('bullmq');
const { createRedisConnection } = require('../config/redis');
const env = require('../config/env');
const logger = require('../utils/logger');

const QUEUE_NAME = 'notifications';

let queue = null;
let worker = null;
const handlers = new Map();

function registerHandler(name, fn) {
  handlers.set(name, fn);
}

function getQueue() {
  if (!queue) {
    queue = new Queue(QUEUE_NAME, { connection: createRedisConnection() });
  }
  return queue;
}

async function enqueue(name, payload, opts = {}) {
  if (!env.redis.enabled) {
    throw new Error('Redis disabled — cannot enqueue notification');
  }
  const q = getQueue();
  return q.add(name, payload, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: 1000,
    removeOnFail: 1000,
    ...opts,
  });
}

function loadAllHandlers() {
  require('./emailService');
  require('./smsService');
  require('./aiService');
  logger.info('queueService: handlers registered', { count: handlers.size });
}

async function startWorker() {
  if (!env.redis.enabled) {
    logger.warn('queueService: worker skipped (Redis disabled)');
    return null;
  }
  if (worker) return worker;

  loadAllHandlers();

  worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      const fn = handlers.get(job.name);
      if (!fn) throw new Error(`No handler for job "${job.name}"`);
      return fn(job.data, job);
    },
    {
      connection: createRedisConnection(),
      concurrency: 5,
    }
  );

  worker.on('completed', (job) => {
    logger.info(`queueService: job done ${job.name}`, { jobId: job.id });
  });
  worker.on('failed', (job, err) => {
    logger.error(`queueService: job failed ${job?.name}`, {
      jobId: job?.id,
      err: err.message,
    });
  });

  logger.info('queueService: worker started');
  return worker;
}

async function stopWorker() {
  if (worker) {
    await worker.close();
    worker = null;
  }
  if (queue) {
    await queue.close();
    queue = null;
  }
}

module.exports = {
  QUEUE_NAME,
  enqueue,
  registerHandler,
  startWorker,
  stopWorker,
  getQueue,
};