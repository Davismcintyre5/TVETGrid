const { DEFAULTS } = require('../utils/getSettings');

const MAX_LEN = 160;

function trim(text) {
  const s = String(text || '').replace(/\s+/g, ' ').trim();
  if (s.length <= MAX_LEN) return s;
  return s.slice(0, MAX_LEN - 1) + '…';
}

function appName(settings) {
  return (settings && settings.appName) || DEFAULTS.appName;
}

function verifyEmail({ code, expiresMin, settings }) {
  return trim(`${appName(settings)}: Your verification code is ${code}. Expires in ${expiresMin || 15} min. Do not share.`);
}

function passwordReset({ code, expiresMin, settings }) {
  return trim(`${appName(settings)}: Password reset code: ${code}. Expires in ${expiresMin || 15} min. If not you, ignore.`);
}

function passwordChanged({ settings }) {
  return trim(`${appName(settings)}: Your password was changed. If this was not you, contact support immediately.`);
}

function newLogin({ ip, settings }) {
  return trim(`${appName(settings)}: New login detected${ip ? ` from ${ip}` : ''}. If this was not you, change your password now.`);
}

function accountDisabled({ settings }) {
  return trim(`${appName(settings)}: Your account has been disabled. Contact support for help.`);
}

function meetingInvite({ meetingTitle, scheduledAt, joinUrl, settings }) {
  return trim(`${appName(settings)}: Invited to "${meetingTitle}" on ${scheduledAt}. Join: ${joinUrl}`);
}

function meetingReminder({ meetingTitle, minutesUntil, joinUrl, settings }) {
  return trim(`${appName(settings)}: "${meetingTitle}" starts in ${minutesUntil} min. Join: ${joinUrl}`);
}

function meetingStarted({ meetingTitle, joinUrl, settings }) {
  return trim(`${appName(settings)}: "${meetingTitle}" is live now. Join: ${joinUrl}`);
}

function meetingCancelled({ meetingTitle, settings }) {
  return trim(`${appName(settings)}: "${meetingTitle}" has been cancelled. Check the app for details.`);
}

function recordingReady({ meetingTitle, recordingUrl, settings }) {
  return trim(`${appName(settings)}: Recording of "${meetingTitle}" is ready. Watch: ${recordingUrl}`);
}

module.exports = {
  verifyEmail,
  passwordReset,
  passwordChanged,
  newLogin,
  accountDisabled,
  meetingInvite,
  meetingReminder,
  meetingStarted,
  meetingCancelled,
  recordingReady,
  MAX_LEN,
};