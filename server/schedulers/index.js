const logger = require('../utils/logger');

const SCHEDULERS = [
  'meetingReminder',
  'revisionQueueRefresh',
  'backup',
  'cleanup',
  'analyticsRollup',
];

const registered = [];

async function registerAllSchedulers() {
  logger.info('Schedulers: registering...');
  for (const name of SCHEDULERS) {
    try {
      const mod = require(`./${name}`);
      if (typeof mod.register !== 'function') {
        logger.warn(`Scheduler skipped (no register): ${name}`);
        continue;
      }
      await mod.register();
      registered.push({ name, mod });
    } catch (err) {
      if (err.code === 'MODULE_NOT_FOUND') {
        logger.warn(`Scheduler skipped (file not found): ${name}`);
      } else {
        logger.error(`Scheduler failed: ${name}`, { err: err.message });
      }
    }
  }
  logger.info(`Schedulers: ${registered.length}/${SCHEDULERS.length} registered`);
}

async function stopAllSchedulers() {
  for (const { name, mod } of registered) {
    try {
      if (typeof mod.stop === 'function') await mod.stop();
      logger.info(`Scheduler stopped: ${name}`);
    } catch (err) {
      logger.error(`Scheduler stop failed: ${name}`, { err: err.message });
    }
  }
  registered.length = 0;
}

module.exports = { registerAllSchedulers, stopAllSchedulers };