const smsTemplates = require('../templates/smsTemplates');
const { getSettings } = require('../utils/getSettings');
const { sendSms: hdmSendSms } = require('../config/hdmBridge');
const queueService = require('./queueService');
const phone = require('../utils/phone');
const env = require('../config/env');
const logger = require('../utils/logger');

async function deliver({ to, template, data }) {
  if (!env.hdmBridge.smsEnabled) {
    logger.info(`smsService: skipped (SMS_ENABLED=false)`, { template });
    return { success: true, skipped: true };
  }
  if (!smsTemplates[template]) throw new Error(`SMS template not found: ${template}`);
  const settings = await getSettings();
  const content = smsTemplates[template]({ ...data, settings });
  const normalized = phone.normalize(to, env.whatsapp.defaultCountryCode);
  if (!normalized) throw new Error('Invalid phone number');
  const res = await hdmSendSms({ to: normalized, content });
  return { success: true, messageId: res.messageId, status: res.status, creditsUsed: res.creditsUsed };
}

async function dispatch({ to, template, data, inline = false }) {
  if (!to) {
    logger.warn(`smsService: no recipient for ${template}`);
    return { success: false, reason: 'no-recipient' };
  }
  if (inline) {
    try { return await deliver({ to, template, data }); }
    catch (e) { logger.error(`smsService: inline ${template} failed`, { err: e.message }); return { success: false, error: e.message }; }
  }
  try {
    const job = await queueService.enqueue('sms.send', { to, template, data });
    return { success: true, jobId: job.id, queued: true };
  } catch (err) {
    logger.warn(`smsService: queue failed for ${template}, sending inline`, { err: err.message });
    try { return await deliver({ to, template, data }); }
    catch (e) { logger.error(`smsService: inline ${template} failed`, { err: e.message }); return { success: false, error: e.message }; }
  }
}

function sendVerifyEmail({ to, code, expiresMin, inline }) {
  return dispatch({ to, template: 'verifyEmail', data: { code, expiresMin }, inline });
}

function sendPasswordReset({ to, code, expiresMin, inline }) {
  return dispatch({ to, template: 'passwordReset', data: { code, expiresMin }, inline });
}

function sendPasswordChanged({ to, inline }) {
  return dispatch({ to, template: 'passwordChanged', data: {}, inline });
}

function sendNewLogin({ to, ip, inline }) {
  return dispatch({ to, template: 'newLogin', data: { ip }, inline });
}

function sendAccountDisabled({ to, inline }) {
  return dispatch({ to, template: 'accountDisabled', data: {}, inline });
}

function sendMeetingInvite({ to, meetingTitle, scheduledAt, joinUrl, inline }) {
  return dispatch({ to, template: 'meetingInvite', data: { meetingTitle, scheduledAt, joinUrl }, inline });
}

function sendMeetingReminder({ to, meetingTitle, minutesUntil, joinUrl, inline }) {
  return dispatch({ to, template: 'meetingReminder', data: { meetingTitle, minutesUntil, joinUrl }, inline });
}

function sendMeetingStarted({ to, meetingTitle, joinUrl, inline }) {
  return dispatch({ to, template: 'meetingStarted', data: { meetingTitle, joinUrl }, inline });
}

function sendMeetingCancelled({ to, meetingTitle, inline }) {
  return dispatch({ to, template: 'meetingCancelled', data: { meetingTitle }, inline });
}

function sendRecordingReady({ to, meetingTitle, recordingUrl, inline }) {
  return dispatch({ to, template: 'recordingReady', data: { meetingTitle, recordingUrl }, inline });
}

queueService.registerHandler('sms.send', async (payload) => deliver(payload));

module.exports = {
  sendVerifyEmail,
  sendPasswordReset,
  sendPasswordChanged,
  sendNewLogin,
  sendAccountDisabled,
  sendMeetingInvite,
  sendMeetingReminder,
  sendMeetingStarted,
  sendMeetingCancelled,
  sendRecordingReady,
  deliver,
};