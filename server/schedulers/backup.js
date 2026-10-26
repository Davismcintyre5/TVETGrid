const { Queue, Worker } = require('bullmq');
const { createRedisConnection, getClient } = require('../config/redis');
const logger = require('../utils/logger');
const env = require('../config/env');
const BackupSettings = require('../models/admin/BackupSettings');
const Backup = require('../models/admin/Backup');
const backupService = require('../services/backupService');
const emailService = require('../services/emailService');

const QUEUE_NAME = 'scheduler-backup';
const LOCK_KEY = 'scheduler:backup:running';
const LOCK_TTL_SECONDS = 3600;

let queue = null;
let worker = null;

async function acquireLock() {
  const redis = getClient();
  if (!redis) return true;
  const ok = await redis.set(LOCK_KEY, String(Date.now()), 'EX', LOCK_TTL_SECONDS, 'NX');
  return ok === 'OK';
}

async function releaseLock() {
  const redis = getClient();
  if (!redis) return;
  try { await redis.del(LOCK_KEY); } catch { /* ignore */ }
}

function shouldRunForFrequency(settings, now = new Date()) {
  const freq = settings.frequency || 'daily';
  if (freq === 'daily') return true;
  if (freq === 'weekly') return now.getUTCDay() === (settings.dayOfWeek ?? 0);
  if (freq === 'monthly') return now.getUTCDate() === (settings.dayOfMonth ?? 1);
  return true;
}

async function notify(settings, template, data) {
  if (!settings.emailOnCompletion) return;
  const recipients = (settings.notifyEmails || []).filter(Boolean);
  for (const to of recipients) {
    try {
      await emailService.sendEmail({ to, template, data });
    } catch (err) {
      logger.warn('backup: notify failed', { to, err: err.message });
    }
  }
}

async function handler() {
  const start = Date.now();
  const settings = await BackupSettings.findOne({ singleton: 'main' }).lean();

  if (!settings) {
    logger.info('backup: skipped (no settings doc)');
    return { skipped: 'no-settings' };
  }
  if (!settings.autoEnabled) {
    logger.info('backup: skipped (autoEnabled=false)');
    return { skipped: 'disabled' };
  }
  if (!shouldRunForFrequency(settings)) {
    logger.info('backup: skipped (frequency gate)', { frequency: settings.frequency });
    return { skipped: 'frequency' };
  }

  const gotLock = await acquireLock();
  if (!gotLock) {
    logger.warn('backup: skipped (another backup running)');
    return { skipped: 'locked' };
  }

  let record = null;
  let failed = null;

  try {
    record = await backupService.runBackup({ type: 'scheduled' });
    logger.info('backup: completed', {
      id: String(record._id),
      size: record.size,
      docs: record.documentsCount,
    });
  } catch (err) {
    failed = err;
    logger.error('backup: failed', { err: err.message });
  }

  try {
    if (failed) {
      await notify(settings, 'backupFailed', {
        error: failed.message,
        at: new Date().toISOString(),
      });
    } else {
      await notify(settings, 'backupCompleted', {
        fileName: record.fileName,
        size: record.size,
        collections: record.collections,
        documentsCount: record.documentsCount,
        downloadUrl: `${env.adminUrl}/backups/${record._id}`,
      });
    }

    await BackupSettings.updateOne(
      { singleton: 'main' },
      {
        $set: {
          lastRunAt: new Date(),
          lastRunStatus: failed ? 'failed' : 'success',
          lastBackupId: record?._id || null,
        },
      }
    );

    if (settings.retentionDays) {
      const pruned = await backupService.pruneOld({ retentionDays: settings.retentionDays });
      logger.info('backup: pruned', pruned);
    }
  } catch (postErr) {
    logger.error('backup: post-run bookkeeping failed', { err: postErr.message });
  } finally {
    await releaseLock();
  }

  logger.info('Scheduler done: backup', { ok: !failed, ms: Date.now() - start });
  return { ok: !failed, backupId: record?._id ? String(record._id) : null };
}

async function register() {
  if (!env.redis.enabled) {
    logger.warn('backup: skipped (Redis disabled)');
    return;
  }
  queue = new Queue(QUEUE_NAME, { connection: createRedisConnection() });
  worker = new Worker(QUEUE_NAME, handler, {
    connection: createRedisConnection(),
    concurrency: 1,
  });

  await queue.add('tick', {}, {
    jobId: 'backup-cron',
    repeat: { pattern: '0 3 * * *', tz: 'UTC' },
    removeOnComplete: 50,
    removeOnFail: 50,
  });

  logger.info('Scheduler registered: backup (daily 03:00 UTC, frequency-gated)');
}

async function stop() {
  if (worker) { await worker.close(); worker = null; }
  if (queue) { await queue.close(); queue = null; }
  await releaseLock();
}

module.exports = { register, stop, handler, QUEUE_NAME };