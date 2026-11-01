const env = require('./env');

function normalizePhone(phone, countryCode = env.whatsapp.defaultCountryCode) {
  let p = String(phone).replace(/\D/g, '');
  if (p.startsWith('0')) p = countryCode + p.slice(1);
  if (!p.startsWith(countryCode) && p.length <= 10) p = countryCode + p;
  return p;
}

function buildWhatsAppLink(phone, text, countryCode) {
  const p = normalizePhone(phone, countryCode);
  const q = encodeURIComponent(text || '');
  return `https://wa.me/${p}${q ? `?text=${q}` : ''}`;
}

let cloudClient = null;
if (env.whatsapp.mode === 'cloud') {
  const axios = require('axios');
  cloudClient = axios.create({
    baseURL: `https://graph.facebook.com/v20.0/${env.whatsapp.phoneNumberId}`,
    timeout: 15000,
    headers: {
      Authorization: `Bearer ${env.whatsapp.cloudApiToken}`,
      'Content-Type': 'application/json',
    },
  });
}

async function sendTemplate({ to, templateName, languageCode = 'en', components }) {
  if (!cloudClient) {
    const err = new Error('WhatsApp Cloud API not configured (WHATSAPP_MODE != cloud)');
    err.code = 'WA_NOT_CONFIGURED';
    throw err;
  }
  const { data } = await cloudClient.post('/messages', {
    messaging_product: 'whatsapp',
    to: normalizePhone(to),
    type: 'template',
    template: { name: templateName, language: { code: languageCode }, components },
  });
  return data;
}

module.exports = { buildWhatsAppLink, normalizePhone, sendTemplate, mode: env.whatsapp.mode };