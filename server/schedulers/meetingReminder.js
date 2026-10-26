const { Queue, Worker } = require('bullmq');
const { createRedisConnection } = require('../config/redis');
const logger = require('../utils/logger');
const env = require('../config/env');
const Meeting = require('../models/client/Meeting');
const MeetingInvite = require('../models/client/MeetingInvite');
const emailService = require('../services/emailService');
const smsService = require('../services/smsService');
const { MEETING_STATUS, INVITE_RSVP } = require('../utils/constants');

const QUEUE_NAME = 'scheduler-meetingReminder';

let queue = null;
let worker = null;

async function handler() {
  const start = Date.now();
  const now = new Date();
  const from = new Date(now.getTime() + 10 * 60 * 1000);
  const to = new Date(now.getTime() + 20 * 60 * 1000);

  const meetings = await Meeting.find({
    status: MEETING_STATUS.SCHEDULED,
    scheduledAt: { $gte: from, $lte: to },
  }).lean();

  let sent = 0;

  for (const m of meetings) {
    const minutesUntil = Math.max(1, Math.round((new Date(m.scheduledAt) - now) / 60000));

    const invites = await MeetingInvite.find({
      meetingId: m._id,
      reminderSentAt: null,
      rsvp: { $ne: INVITE_RSVP.DECLINED },
    });

    for (const inv of invites) {
      const joinUrl = inv.shortCode
        ? `${env.appUrl}/j/${inv.shortCode}`
        : `${env.appUrl}/join/${inv.token}`;

      if (inv.email) {
        await emailService.sendEmail({
          to: inv.email,
          template: 'meetingReminder',
          data: {
            recipientName: inv.name,
            meetingTitle: m.title,
            minutesUntil,
            joinUrl,
          },
        }).catch((e) => logger.warn('meetingReminder: email failed', { err: e.message }));
      }

      if (inv.phone) {
        await smsService.sendSms({
          to: inv.phone,
          template: 'meetingReminder',
          data: { meetingTitle: m.title, minutesUntil, joinUrl },
        }).catch((e) => logger.warn('meetingReminder: sms failed', { err: e.message }));
      }

      inv.reminderSentAt = new Date();
      await inv.save();
      sent++;
    }
  }

  logger.info('Scheduler done: meetingReminder', { sent, ms: Date.now() - start });
  return { sent };
}

async function register() {
  if (!env.redis.enabled) {
    logger.warn('meetingReminder: skipped (Redis disabled)');
    return;
  }
  queue = new Queue(QUEUE_NAME, { connection: createRedisConnection() });
  worker = new Worker(QUEUE_NAME, handler, {
    connection: createRedisConnection(),
    concurrency: 1,
  });

  await queue.add('tick', {}, {
    jobId: 'meeting-reminder-cron',
    repeat: { pattern: '*/5 * * * *', tz: 'UTC' },
    removeOnComplete: 100,
    removeOnFail: 100,
  });

  logger.info('Scheduler registered: meetingReminder (every 5 min)');
}

async function stop() {
  if (worker) { await worker.close(); worker = null; }
  if (queue) { await queue.close(); queue = null; }
}

module.exports = { register, stop, handler, QUEUE_NAME };