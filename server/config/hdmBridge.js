const axios = require('axios');
const env = require('./env');

const client = axios.create({
  baseURL: env.hdmBridge.apiUrl,
  timeout: env.hdmBridge.timeoutMs,
  headers: {
    Authorization: `Bearer ${env.hdmBridge.apiKey}`,
    'Content-Type': 'application/json',
  },
});

async function sendEmail({ to, subject, htmlBody, textBody, replyTo, templateId }) {
  const { data } = await client.post('/emails/send', {
    from: env.hdmBridge.fromEmail,
    fromName: env.hdmBridge.fromName,
    to, subject, htmlBody, textBody, replyTo, templateId,
  });
  return data;
}

async function sendSms({ to, content, sender, type = 'transactional' }) {
  if (!env.hdmBridge.smsEnabled) {
    return { success: true, skipped: true, reason: 'SMS_ENABLED=false' };
  }
  if (content && content.length > 160) {
    const err = new Error(`SMS content exceeds 160 chars (${content.length})`);
    err.code = 'SMS_TOO_LONG';
    throw err;
  }
  const { data } = await client.post('/sms/send', {
    to: to.replace(/^\+/, ''),
    content,
    sender: sender || env.hdmBridge.smsSender,
    type,
  });
  return data;
}

async function getEmailStatus(messageId) {
  const { data } = await client.get(`/emails/status/${messageId}`);
  return data;
}

module.exports = { client, sendEmail, sendSms, getEmailStatus };