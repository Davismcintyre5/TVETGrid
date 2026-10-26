const Settings = require('../models/admin/Settings');
const { getClient } = require('../config/redis');
const env = require('../config/env');
const logger = require('./logger');

const CACHE_KEY = 'settings:main';
const CACHE_TTL_SECONDS = 300;

const DEFAULTS = {
  appName: env.appName,
  logoUrl: '',
  supportEmail: 'support@tvetgrid.co.ke',
  supportPhone: '+254700000000',
  contactAddress: '',
  socialLinks: {},
  faq: [],
  featureFlags: {},
};

async function getSettings({ fresh = false } = {}) {
  const redis = env.redis.enabled ? getClient() : null;

  if (!fresh && redis) {
    try {
      const cached = await redis.get(CACHE_KEY);
      if (cached) return { ...DEFAULTS, ...JSON.parse(cached) };
    } catch (err) {
      logger.warn('getSettings: cache read failed', { err: err.message });
    }
  }

  let doc = null;
  try {
    doc = await Settings.findOne({ singleton: 'main' }).lean();
  } catch (err) {
    logger.error('getSettings: db read failed', { err: err.message });
  }

  const merged = { ...DEFAULTS, ...(doc || {}) };
  delete merged._id;
  delete merged.singleton;
  delete merged.__v;
  delete merged.createdAt;
  delete merged.updatedAt;

  if (redis) {
    try {
      await redis.set(CACHE_KEY, JSON.stringify(merged), 'EX', CACHE_TTL_SECONDS);
    } catch (err) {
      logger.warn('getSettings: cache write failed', { err: err.message });
    }
  }

  return merged;
}

async function invalidateSettingsCache() {
  if (!env.redis.enabled) return;
  const redis = getClient();
  if (!redis) return;
  try {
    await redis.del(CACHE_KEY);
  } catch (err) {
    logger.warn('getSettings: cache invalidate failed', { err: err.message });
  }
}

module.exports = { getSettings, invalidateSettingsCache, DEFAULTS, CACHE_KEY };