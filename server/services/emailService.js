const emailTemplates = require('../templates/emailTemplates');
const { getSettings } = require('../utils/getSettings');
const { sendEmail: hdmSendEmail } = require('../config/hdmBridge');
const queueService = require('./queueService');
const logger = require('../utils/logger');

const SUBJECTS = {
  verifyEmail:         () => 'Verify your email',
  welcome:             (d) => `Welcome to TVETGrid${d?.name ? `, ${d.name}` : ''}`,
  passwordReset:       () => 'Reset your password',
  passwordChanged:     () => 'Your password was changed',
  newLogin:            () => 'New login detected',
  accountDisabled:     () => 'Your account has been disabled',
  roleChanged:         (d) => `Your role changed to ${d?.newRole || 'a new role'}`,
  adminWelcome:        () => 'Your admin account is ready',
  meetingInvite:       (d) => `Invite: ${d?.meetingTitle || 'Live session'}`,
  meetingReminder:     (d) => `Starts in ${d?.minutesUntil || 15} min: ${d?.meetingTitle || 'Live session'}`,
  meetingStarted:      (d) => `Live now: ${d?.meetingTitle || 'Live session'}`,
  meetingCancelled:    (d) => `Cancelled: ${d?.meetingTitle || 'Live session'}`,
  meetingRescheduled:  (d) => `Rescheduled: ${d?.meetingTitle || 'Live session'}`,
  recordingReady:      (d) => `Recording ready: ${d?.meetingTitle || 'Live session'}`,
  meetingSummary:      (d) => `Summary: ${d?.meetingTitle || 'Live session'}`,
  backupCompleted:     () => 'Backup completed',
  backupFailed:        () => 'Backup failed',
  backupSent:          () => 'Backup file',
  restoreCompleted:    () => 'Restore completed',
  contactForm:         () => 'New contact message',
  contactAck:          () => 'We received your message',
  adminAudit:          (d) => `Admin action: ${d?.action || 'recorded'}`,
  systemAlert:         (d) => `System alert: ${d?.title || 'Alert'}`,
  providerQuota:       (d) => `Provider alert: ${d?.provider || 'HDM'}`,
};

function stripHtml(html) {
  return String(html || '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

async function deliver({ to, template, data }) {
  if (!emailTemplates[template]) throw new Error(`Email template not found: ${template}`);
  const settings = await getSettings();
  const html = emailTemplates[template]({ ...data, settings });
  const text = stripHtml(html);
  const subjectFn = SUBJECTS[template] || (() => settings.appName);
  const subject = subjectFn(data);
  const res = await hdmSendEmail({ to, subject, htmlBody: html, textBody: text });
  return { success: true, messageId: res.messageId, status: res.status };
}

async function dispatch({ to, template, data, inline = false }) {
  if (!to) {
    logger.warn(`emailService: no recipient for ${template}`);
    return { success: false, reason: 'no-recipient' };
  }
  if (inline) {
    try { return await deliver({ to, template, data }); }
    catch (e) { logger.error(`emailService: inline ${template} failed`, { err: e.message }); return { success: false, error: e.message }; }
  }
  try {
    const job = await queueService.enqueue('email.send', { to, template, data });
    return { success: true, jobId: job.id, queued: true };
  } catch (err) {
    logger.warn(`emailService: queue failed for ${template}, sending inline`, { err: err.message });
    try { return await deliver({ to, template, data }); }
    catch (e) { logger.error(`emailService: inline ${template} failed`, { err: e.message }); return { success: false, error: e.message }; }
  }
}

// ── Auth ────────────────────────────────────────────

function sendVerifyEmail({ to, name, verifyUrl, inline }) {
  return dispatch({ to, template: 'verifyEmail', data: { name, verifyUrl }, inline });
}

function sendWelcome({ to, name, loginUrl, inline }) {
  return dispatch({ to, template: 'welcome', data: { name, loginUrl }, inline });
}

function sendPasswordReset({ to, name, resetUrl, expiresMin, inline }) {
  return dispatch({ to, template: 'passwordReset', data: { name, resetUrl, expiresMin }, inline });
}

function sendPasswordChanged({ to, name, ip, userAgent, changedAt, inline }) {
  return dispatch({ to, template: 'passwordChanged', data: { name, ip, userAgent, changedAt }, inline });
}

function sendNewLogin({ to, name, ip, userAgent, at, inline }) {
  return dispatch({ to, template: 'newLogin', data: { name, ip, userAgent, at }, inline });
}

function sendAccountDisabled({ to, name, reason, inline }) {
  return dispatch({ to, template: 'accountDisabled', data: { name, reason }, inline });
}

function sendRoleChanged({ to, name, oldRole, newRole, inline }) {
  return dispatch({ to, template: 'roleChanged', data: { name, oldRole, newRole }, inline });
}

function sendAdminWelcome({ to, name, email, temporaryPassword, loginUrl, inline }) {
  return dispatch({ to, template: 'adminWelcome', data: { name, email, temporaryPassword, loginUrl }, inline });
}

// ── Meetings ────────────────────────────────────────

function sendMeetingInvite({ to, recipientName, meetingTitle, hostName, scheduledAt, durationMin, joinUrl, courseName, inline }) {
  return dispatch({ to, template: 'meetingInvite', data: { recipientName, meetingTitle, hostName, scheduledAt, durationMin, joinUrl, courseName }, inline });
}

function sendMeetingReminder({ to, recipientName, meetingTitle, minutesUntil, joinUrl, inline }) {
  return dispatch({ to, template: 'meetingReminder', data: { recipientName, meetingTitle, minutesUntil, joinUrl }, inline });
}

function sendMeetingStarted({ to, recipientName, meetingTitle, joinUrl, inline }) {
  return dispatch({ to, template: 'meetingStarted', data: { recipientName, meetingTitle, joinUrl }, inline });
}

function sendMeetingCancelled({ to, recipientName, meetingTitle, reason, inline }) {
  return dispatch({ to, template: 'meetingCancelled', data: { recipientName, meetingTitle, reason }, inline });
}

function sendMeetingRescheduled({ to, recipientName, meetingTitle, oldTime, newTime, joinUrl, inline }) {
  return dispatch({ to, template: 'meetingRescheduled', data: { recipientName, meetingTitle, oldTime, newTime, joinUrl }, inline });
}

function sendRecordingReady({ to, recipientName, meetingTitle, recordingUrl, inline }) {
  return dispatch({ to, template: 'recordingReady', data: { recipientName, meetingTitle, recordingUrl }, inline });
}

function sendMeetingSummary({ to, hostName, meetingTitle, totalInvited, attended, durationMin, inline }) {
  return dispatch({ to, template: 'meetingSummary', data: { hostName, meetingTitle, totalInvited, attended, durationMin }, inline });
}

// ── Backups ─────────────────────────────────────────

function sendBackupCompleted({ to, fileName, size, collections, documentsCount, downloadUrl, inline }) {
  return dispatch({ to, template: 'backupCompleted', data: { fileName, size, collections, documentsCount, downloadUrl }, inline });
}

function sendBackupFailed({ to, error, at, inline }) {
  return dispatch({ to, template: 'backupFailed', data: { error, at }, inline });
}

function sendBackupSent({ to, fileName, size, downloadUrl, note, inline }) {
  return dispatch({ to, template: 'backupSent', data: { fileName, size, downloadUrl, note }, inline });
}

function sendRestoreCompleted({ to, backupFileName, restoreStatus, inline }) {
  return dispatch({ to, template: 'restoreCompleted', data: { backupFileName, restoreStatus }, inline });
}

// ── Site ────────────────────────────────────────────

function sendContactForm({ to, name, email, message, inline }) {
  return dispatch({ to, template: 'contactForm', data: { name, email, message }, inline });
}

function sendContactAck({ to, name, inline }) {
  return dispatch({ to, template: 'contactAck', data: { name }, inline });
}

// ── Ops ─────────────────────────────────────────────

function sendAdminAudit({ to, adminName, action, method, path, status, ip, at, inline }) {
  return dispatch({ to, template: 'adminAudit', data: { adminName, action, method, path, status, ip, at }, inline });
}

function sendSystemAlert({ to, title, severity, message, inline }) {
  return dispatch({ to, template: 'systemAlert', data: { title, severity, message }, inline });
}

function sendProviderQuota({ to, provider, code, error, at, inline }) {
  return dispatch({ to, template: 'providerQuota', data: { provider, code, error, at }, inline });
}

queueService.registerHandler('email.send', async (payload) => deliver(payload));

module.exports = {
  sendVerifyEmail,
  sendWelcome,
  sendPasswordReset,
  sendPasswordChanged,
  sendNewLogin,
  sendAccountDisabled,
  sendRoleChanged,
  sendAdminWelcome,
  sendMeetingInvite,
  sendMeetingReminder,
  sendMeetingStarted,
  sendMeetingCancelled,
  sendMeetingRescheduled,
  sendRecordingReady,
  sendMeetingSummary,
  sendBackupCompleted,
  sendBackupFailed,
  sendBackupSent,
  sendRestoreCompleted,
  sendContactForm,
  sendContactAck,
  sendAdminAudit,
  sendSystemAlert,
  sendProviderQuota,
  deliver,
};