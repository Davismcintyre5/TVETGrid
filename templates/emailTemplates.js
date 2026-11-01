const { DEFAULTS } = require('../utils/getSettings');

function escapeHtml(s) {
  if (s === undefined || s === null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function baseLayout({ settings, title, preheader, content, unsubscribeUrl }) {
  const s = { ...DEFAULTS, ...(settings || {}) };
  const appName = escapeHtml(s.appName);
  const logoUrl = s.logoUrl ? escapeHtml(s.logoUrl) : '';
  const supportEmail = escapeHtml(s.supportEmail);
  const supportPhone = escapeHtml(s.supportPhone);
  const year = new Date().getFullYear();

  const logo = logoUrl
    ? `<img src="${logoUrl}" alt="${appName}" width="120" style="display:block;max-width:120px;height:auto;border:0;outline:none;text-decoration:none;" />`
    : `<span style="font-size:22px;font-weight:700;color:#1E2A78;letter-spacing:0.5px;">${appName}</span>`;

  const unsubscribe = unsubscribeUrl
    ? `<p style="margin:8px 0 0 0;font-size:11px;line-height:16px;color:#9CA3AF;"><a href="${escapeHtml(unsubscribeUrl)}" style="color:#9CA3AF;text-decoration:underline;">Unsubscribe from non-essential emails</a></p>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <meta name="x-apple-disable-message-reformatting" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background-color:#F7F9FC;font-family:Arial,Helvetica,sans-serif;color:#1F2937;">
  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>` : ''}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F7F9FC;padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background-color:#FFFFFF;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
          <tr>
            <td style="padding:28px 32px 12px 32px;border-bottom:2px solid #00C2A8;">
              ${logo}
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              ${content}
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px;background-color:#F7F9FC;border-top:1px solid #E5E7EB;font-size:12px;line-height:18px;color:#6B7280;text-align:center;">
              <p style="margin:0 0 6px 0;">Need help? Contact us at <a href="mailto:${supportEmail}" style="color:#1E2A78;text-decoration:none;">${supportEmail}</a>${supportPhone ? ` or <a href="tel:${supportPhone}" style="color:#1E2A78;text-decoration:none;">${supportPhone}</a>` : ''}.</p>
              <p style="margin:0;">&copy; ${year} ${appName}. All rights reserved.</p>
              ${unsubscribe}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function button(href, label, color = '#1E2A78') {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
    <tr>
      <td align="center" style="background-color:${color};border-radius:6px;">
        <a href="${escapeHtml(href)}" target="_blank" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#FFFFFF;text-decoration:none;border-radius:6px;">${escapeHtml(label)}</a>
      </td>
    </tr>
  </table>`;
}

function h1(text) {
  return `<h1 style="margin:0 0 16px 0;font-size:22px;line-height:28px;color:#1E2A78;font-weight:700;">${escapeHtml(text)}</h1>`;
}

function p(text) {
  return `<p style="margin:0 0 14px 0;font-size:15px;line-height:22px;color:#1F2937;">${text}</p>`;
}

function muted(text) {
  return `<p style="margin:0 0 14px 0;font-size:13px;line-height:20px;color:#6B7280;">${text}</p>`;
}

function divider() {
  return `<hr style="border:0;border-top:1px solid #E5E7EB;margin:24px 0;" />`;
}

function infoTable(rows) {
  const trs = rows.map(([label, value]) =>
    `<tr><td style="padding:4px 12px;"><strong>${escapeHtml(label)}:</strong> ${value}</td></tr>`
  ).join('');
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:16px 0;font-size:14px;line-height:22px;color:#1F2937;background-color:#F7F9FC;border-radius:6px;padding:16px;width:100%;">${trs}</table>`;
}

// ── Auth ────────────────────────────────────────────

function verifyEmail({ name, verifyUrl, settings }) {
  return baseLayout({
    settings,
    title: 'Verify your email',
    preheader: 'Confirm your email to activate your account.',
    content: [
      h1(`Welcome, ${escapeHtml(name)}!`),
      p('Please confirm your email address to activate your account. This link expires in 24 hours.'),
      button(verifyUrl, 'Verify Email', '#00C2A8'),
      muted('If the button does not work, copy and paste this link into your browser:'),
      muted(`<a href="${escapeHtml(verifyUrl)}" style="color:#1E2A78;text-decoration:none;word-break:break-all;">${escapeHtml(verifyUrl)}</a>`),
      divider(),
      muted('If you did not create this account, you can safely ignore this email.'),
    ].join(''),
  });
}

function welcome({ name, loginUrl, settings }) {
  return baseLayout({
    settings,
    title: 'Welcome',
    preheader: 'Your account is ready.',
    content: [
      h1(`Welcome to TVETGrid, ${escapeHtml(name)}!`),
      p('Your email is verified and your account is ready. Start exploring past papers, lessons, notes, and live sessions.'),
      button(loginUrl || '/', 'Open Dashboard'),
      p('Here is what you can do next:'),
      `<ul style="margin:0 0 16px 0;padding-left:20px;font-size:15px;line-height:22px;color:#1F2937;">
        <li>Browse courses and topics</li>
        <li>Practice past papers</li>
        <li>Join live sessions with teachers</li>
        <li>Track your revision progress</li>
      </ul>`,
    ].join(''),
  });
}

function passwordReset({ name, resetUrl, expiresMin, settings }) {
  return baseLayout({
    settings,
    title: 'Reset your password',
    preheader: 'Use this link to reset your password.',
    content: [
      h1('Reset your password'),
      p(`Hi ${escapeHtml(name)}, we received a request to reset your password.`),
      button(resetUrl, 'Reset Password', '#FFB020'),
      muted(`This link expires in ${expiresMin || 30} minutes.`),
      divider(),
      muted('If you did not request this, you can safely ignore this email. Your password will not change.'),
    ].join(''),
  });
}

function passwordChanged({ name, ip, userAgent, changedAt, settings }) {
  return baseLayout({
    settings,
    title: 'Password changed',
    preheader: 'Your password was just changed.',
    content: [
      h1('Your password was changed'),
      p(`Hi ${escapeHtml(name)}, your password was successfully changed.`),
      infoTable([
        ['When', escapeHtml(changedAt || new Date().toISOString())],
        ...(ip ? [['IP', escapeHtml(ip)]] : []),
        ...(userAgent ? [['Device', escapeHtml(userAgent)]] : []),
      ]),
      divider(),
      muted('If this was not you, contact support immediately to secure your account.'),
    ].join(''),
  });
}

function newLogin({ name, ip, userAgent, at, settings }) {
  return baseLayout({
    settings,
    title: 'New login',
    preheader: 'A new login to your account was detected.',
    content: [
      h1('New login detected'),
      p(`Hi ${escapeHtml(name)}, your account was just used to sign in from a new device.`),
      infoTable([
        ['When', escapeHtml(at || new Date().toISOString())],
        ...(ip ? [['IP', escapeHtml(ip)]] : []),
        ...(userAgent ? [['Device', escapeHtml(userAgent)]] : []),
      ]),
      divider(),
      muted('If this was not you, change your password immediately and contact support.'),
    ].join(''),
  });
}

function accountDisabled({ name, reason, settings }) {
  return baseLayout({
    settings,
    title: 'Account disabled',
    preheader: 'Your account has been disabled.',
    content: [
      h1('Your account has been disabled'),
      p(`Hi ${escapeHtml(name)}, your account on TVETGrid has been disabled by an administrator.`),
      reason ? p(`Reason: <strong>${escapeHtml(reason)}</strong>`) : '',
      divider(),
      muted('If you believe this is a mistake, please contact support.'),
    ].join(''),
  });
}

function roleChanged({ name, oldRole, newRole, settings }) {
  return baseLayout({
    settings,
    title: 'Role updated',
    preheader: `Your role changed to ${newRole}.`,
    content: [
      h1('Your role has been updated'),
      p(`Hi ${escapeHtml(name)}, your account role on TVETGrid has changed.`),
      infoTable([
        ['Previous', escapeHtml(oldRole || '-')],
        ['New', escapeHtml(newRole)],
      ]),
      divider(),
      muted('If this was unexpected, contact support.'),
    ].join(''),
  });
}

function adminWelcome({ name, email, temporaryPassword, loginUrl, unsubscribeUrl, settings }) {
  const passwordRow = temporaryPassword
    ? `<tr><td style="padding:4px 12px;"><strong>Temporary password:</strong> <code style="background:#FFFFFF;padding:2px 6px;border-radius:3px;font-family:monospace;">${escapeHtml(temporaryPassword)}</code></td></tr>`
    : `<tr><td style="padding:4px 12px;"><strong>Password:</strong> the one you set during creation</td></tr>`;

  return baseLayout({
    settings,
    title: 'Admin account created',
    preheader: 'Your TVETGrid admin account is ready.',
    unsubscribeUrl,
    content: [
      h1('Admin account created'),
      p(`Hi ${escapeHtml(name)}, an administrator account has been created for you.`),
      `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:16px 0;font-size:14px;line-height:22px;color:#1F2937;background-color:#F7F9FC;border-radius:6px;padding:16px;width:100%;">
        <tr><td style="padding:4px 12px;"><strong>Email:</strong> ${escapeHtml(email)}</td></tr>
        ${passwordRow}
      </table>`,
      button(loginUrl || '/', 'Log In to Admin', '#1E2A78'),
      divider(),
      muted('For security, please change your password after logging in for the first time.'),
    ].join(''),
  });
}

// ── Meetings ────────────────────────────────────────

function meetingInvite({ recipientName, meetingTitle, hostName, scheduledAt, durationMin, joinUrl, courseName, settings }) {
  return baseLayout({
    settings,
    title: 'You are invited',
    preheader: `Invitation to ${meetingTitle}.`,
    content: [
      h1(`You are invited to ${escapeHtml(meetingTitle)}`),
      p(`Hi ${escapeHtml(recipientName || 'there')}, ${escapeHtml(hostName || 'a teacher')} has invited you to a live session.`),
      infoTable([
        ...(courseName ? [['Course', escapeHtml(courseName)]] : []),
        ['When', escapeHtml(scheduledAt)],
        ['Duration', `${escapeHtml(durationMin)} minutes`],
      ]),
      button(joinUrl, 'Join Live Session', '#00C2A8'),
      muted('If the button does not work, copy and paste this link into your browser:'),
      muted(`<a href="${escapeHtml(joinUrl)}" style="color:#1E2A78;text-decoration:none;word-break:break-all;">${escapeHtml(joinUrl)}</a>`),
    ].join(''),
  });
}

function meetingReminder({ recipientName, meetingTitle, minutesUntil, joinUrl, settings }) {
  return baseLayout({
    settings,
    title: 'Reminder',
    preheader: `${meetingTitle} starts in ${minutesUntil} minutes.`,
    content: [
      h1('Session starting soon'),
      p(`Hi ${escapeHtml(recipientName || 'there')}, <strong>${escapeHtml(meetingTitle)}</strong> starts in ${escapeHtml(minutesUntil)} minutes.`),
      button(joinUrl, 'Join Now', '#FFB020'),
      muted('The join link expires after the session ends.'),
    ].join(''),
  });
}

function meetingStarted({ recipientName, meetingTitle, joinUrl, settings }) {
  return baseLayout({
    settings,
    title: 'Session is live',
    preheader: `${meetingTitle} has started.`,
    content: [
      h1('Your session has started'),
      p(`Hi ${escapeHtml(recipientName || 'there')}, <strong>${escapeHtml(meetingTitle)}</strong> is live right now.`),
      button(joinUrl, 'Join Live Session', '#00C2A8'),
    ].join(''),
  });
}

function meetingCancelled({ recipientName, meetingTitle, reason, settings }) {
  return baseLayout({
    settings,
    title: 'Session cancelled',
    preheader: `${meetingTitle} has been cancelled.`,
    content: [
      h1('Session cancelled'),
      p(`Hi ${escapeHtml(recipientName || 'there')}, <strong>${escapeHtml(meetingTitle)}</strong> has been cancelled.`),
      reason ? p(`Reason: ${escapeHtml(reason)}`) : '',
      divider(),
      muted('We apologize for any inconvenience.'),
    ].join(''),
  });
}

function meetingRescheduled({ recipientName, meetingTitle, oldTime, newTime, joinUrl, settings }) {
  return baseLayout({
    settings,
    title: 'Session rescheduled',
    preheader: `${meetingTitle} has been rescheduled.`,
    content: [
      h1('Session rescheduled'),
      p(`Hi ${escapeHtml(recipientName || 'there')}, <strong>${escapeHtml(meetingTitle)}</strong> has a new time.`),
      infoTable([
        ['Old time', escapeHtml(oldTime)],
        ['New time', escapeHtml(newTime)],
      ]),
      button(joinUrl, 'View Session', '#1E2A78'),
    ].join(''),
  });
}

function recordingReady({ recipientName, meetingTitle, recordingUrl, settings }) {
  return baseLayout({
    settings,
    title: 'Recording ready',
    preheader: `Recording of ${meetingTitle} is now available.`,
    content: [
      h1('Recording available'),
      p(`Hi ${escapeHtml(recipientName || 'there')}, the recording of <strong>${escapeHtml(meetingTitle)}</strong> is now available.`),
      button(recordingUrl, 'Watch Recording', '#00C2A8'),
    ].join(''),
  });
}

function meetingSummary({ hostName, meetingTitle, totalInvited, attended, durationMin, settings }) {
  return baseLayout({
    settings,
    title: 'Session summary',
    preheader: `Summary of ${meetingTitle}.`,
    content: [
      h1('Session summary'),
      p(`Hi ${escapeHtml(hostName)}, here is the summary of <strong>${escapeHtml(meetingTitle)}</strong>.`),
      infoTable([
        ['Invited', escapeHtml(totalInvited)],
        ['Attended', escapeHtml(attended)],
        ['Duration', `${escapeHtml(durationMin)} minutes`],
      ]),
    ].join(''),
  });
}

// ── Backups ─────────────────────────────────────────

function backupCompleted({ fileName, size, collections, documentsCount, downloadUrl, unsubscribeUrl, settings }) {
  return baseLayout({
    settings,
    title: 'Backup completed',
    preheader: 'Database backup is ready.',
    unsubscribeUrl,
    content: [
      h1('Backup completed'),
      p('A database backup has completed successfully.'),
      infoTable([
        ['File', escapeHtml(fileName || '-')],
        ['Size', `${escapeHtml(size || 0)} bytes`],
        ['Documents', escapeHtml(documentsCount || 0)],
        ...(collections && collections.length ? [['Collections', escapeHtml(collections.join(', '))]] : []),
      ]),
      downloadUrl ? button(downloadUrl, 'Download Backup', '#00C2A8') : '',
    ].join(''),
  });
}

function backupFailed({ error, at, unsubscribeUrl, settings }) {
  return baseLayout({
    settings,
    title: 'Backup failed',
    preheader: 'A database backup failed.',
    unsubscribeUrl,
    content: [
      h1('Backup failed'),
      p('A scheduled database backup has failed. Immediate attention may be required.'),
      `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:16px 0;font-size:14px;line-height:22px;color:#1F2937;background-color:#FEF2F2;border-radius:6px;padding:16px;width:100%;">
        <tr><td style="padding:4px 12px;"><strong>When:</strong> ${escapeHtml(at || new Date().toISOString())}</td></tr>
        <tr><td style="padding:4px 12px;"><strong>Error:</strong> ${escapeHtml(error || 'Unknown error')}</td></tr>
      </table>`,
    ].join(''),
  });
}

function backupSent({ fileName, size, downloadUrl, note, unsubscribeUrl, settings }) {
  return baseLayout({
    settings,
    title: 'Backup file',
    preheader: 'A backup file has been sent to you.',
    unsubscribeUrl,
    content: [
      h1('Backup file'),
      p('A backup file has been shared with you.'),
      infoTable([
        ['File', escapeHtml(fileName || '-')],
        ['Size', `${escapeHtml(size || 0)} bytes`],
      ]),
      note ? p(`Note: ${escapeHtml(note)}`) : '',
      button(downloadUrl, 'Download Backup', '#00C2A8'),
      muted('This link expires after a short time for security.'),
    ].join(''),
  });
}

function restoreCompleted({ backupFileName, restoreStatus, unsubscribeUrl, settings }) {
  return baseLayout({
    settings,
    title: 'Restore completed',
    preheader: 'Database restore finished.',
    unsubscribeUrl,
    content: [
      h1('Restore completed'),
      p('A database restore operation has finished.'),
      infoTable([
        ['Backup file', escapeHtml(backupFileName || '-')],
        ['Status', escapeHtml(restoreStatus || 'success')],
      ]),
      divider(),
      muted('Verify the app is functioning correctly before re-enabling full traffic.'),
    ].join(''),
  });
}

// ── Site ────────────────────────────────────────────

function contactForm({ name, email, message, settings }) {
  return baseLayout({
    settings,
    title: 'New contact message',
    preheader: 'A visitor sent a message via the website.',
    content: [
      h1('New contact message'),
      infoTable([
        ['Name', escapeHtml(name || '-')],
        ['Email', escapeHtml(email || '-')],
      ]),
      `<div style="margin:16px 0;padding:16px;background-color:#FFFFFF;border:1px solid #E5E7EB;border-radius:6px;font-size:15px;line-height:22px;color:#1F2937;white-space:pre-wrap;">${escapeHtml(message || '')}</div>`,
    ].join(''),
  });
}

function contactAck({ name, unsubscribeUrl, settings }) {
  return baseLayout({
    settings,
    title: 'We received your message',
    preheader: 'Thanks for contacting us.',
    unsubscribeUrl,
    content: [
      h1(`Thanks, ${escapeHtml(name || 'there')}!`),
      p('We received your message and our team will get back to you shortly.'),
      muted('For urgent matters, please call our support line.'),
    ].join(''),
  });
}

// ── Ops ─────────────────────────────────────────────

function adminAudit({ adminName, action, method, path, status, ip, at, unsubscribeUrl, settings }) {
  return baseLayout({
    settings,
    title: 'Admin action',
    preheader: `${adminName || 'Admin'} performed ${action}.`,
    unsubscribeUrl,
    content: [
      h1('Admin action recorded'),
      infoTable([
        ['Admin', escapeHtml(adminName || '-')],
        ['Action', escapeHtml(action)],
        ...(method ? [['Method', escapeHtml(method)]] : []),
        ...(path ? [['Path', escapeHtml(path)]] : []),
        ...(status ? [['Status', escapeHtml(status)]] : []),
        ...(ip ? [['IP', escapeHtml(ip)]] : []),
        ['When', escapeHtml(at || new Date().toISOString())],
      ]),
    ].join(''),
  });
}

function systemAlert({ title, severity, message, unsubscribeUrl, settings }) {
  return baseLayout({
    settings,
    title: 'System alert',
    preheader: title || 'System alert',
    unsubscribeUrl,
    content: [
      h1(`⚠ ${escapeHtml(title || 'System alert')}`),
      p(`Severity: <strong>${escapeHtml(severity || 'info')}</strong>`),
      `<div style="margin:16px 0;padding:16px;background-color:#FEF2F2;border-radius:6px;font-size:14px;line-height:22px;color:#1F2937;white-space:pre-wrap;">${escapeHtml(message || '')}</div>`,
    ].join(''),
  });
}

function providerQuota({ provider, code, error, at, unsubscribeUrl, settings }) {
  return baseLayout({
    settings,
    title: 'Provider alert',
    preheader: `${provider} returned ${code}.`,
    unsubscribeUrl,
    content: [
      h1(`Provider alert: ${escapeHtml(provider || 'HDM')}`),
      p('A third-party provider returned an error that may affect the service.'),
      infoTable([
        ['Provider', escapeHtml(provider || '-')],
        ['Code', escapeHtml(code || '-')],
        ['Error', escapeHtml(error || '-')],
        ['When', escapeHtml(at || new Date().toISOString())],
      ]),
      p('Check the provider dashboard and top up if required.'),
    ].join(''),
  });
}

module.exports = {
  verifyEmail,
  welcome,
  passwordReset,
  passwordChanged,
  newLogin,
  accountDisabled,
  roleChanged,
  adminWelcome,
  meetingInvite,
  meetingReminder,
  meetingStarted,
  meetingCancelled,
  meetingRescheduled,
  recordingReady,
  meetingSummary,
  backupCompleted,
  backupFailed,
  backupSent,
  restoreCompleted,
  contactForm,
  contactAck,
  adminAudit,
  systemAlert,
  providerQuota,
};