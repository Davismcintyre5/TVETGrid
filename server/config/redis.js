const Redis = require('ioredis');
const env = require('./env');
const logger = require('../utils/logger');

let client = null;

function getClient() {
  if (!env.redis.enabled) {
    logger.warn('REDIS_ENABLED=false — Redis is disabled. BullMQ, Socket.IO adapter, and rate limiting will not work.');
    return null;
  }
  if (!client) {
    client = new Redis(env.redis.url, {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
      lazyConnect: false,
    });
    client.on('connect', () => logger.info('Redis connected'));
    client.on('error', (err) => logger.error('Redis error', { err: err.message }));
    client.on('reconnecting', () => logger.warn('Redis reconnecting'));
  }
  return client;
}

function createRedisConnection() {
  if (!env.redis.enabled) return null;
  return new Redis(env.redis.url, { maxRetriesPerRequest: null });
}

async function disconnectRedis() {
  if (client) {
    await client.quit();
    client = null;
    logger.info('Redis disconnected');
  }
}

module.exports = { getClient, createRedisConnection, disconnectRedis };