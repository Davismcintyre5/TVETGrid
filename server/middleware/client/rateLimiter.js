const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const env = require('../../config/env');
const { getClient } = require('../../config/redis');

function buildStore() {
  if (!env.redis.enabled) return undefined;
  const client = getClient();
  if (!client) return undefined;
  return new RedisStore({ sendCommand: (...args) => client.call(...args), prefix: 'rl:client:' });
}

module.exports = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip,
  store: buildStore(),
  message: { success: false, error: 'Too many requests', code: 'RATE_LIMITED' },
});