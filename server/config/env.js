require('dotenv').config();

const errors = [];
const fail = (msg) => errors.push(msg);

const req = (name) => {
  const v = process.env[name];
  if (v === undefined || v === '') { fail(`Missing required env: ${name}`); return ''; }
  return v.trim();
};
const opt = (name, def = '') => {
  const v = process.env[name];
  return (v === undefined || v.trim() === '') ? def : v.trim();
};
const bool = (name, def = false) => {
  const v = opt(name, String(def));
  if (v === 'true') return true;
  if (v === 'false') return false;
  fail(`${name} must be "true" or "false", got "${v}"`);
  return def;
};
const num = (name, def) => {
  const v = opt(name, String(def));
  const n = Number(v);
  if (Number.isNaN(n)) { fail(`${name} must be a number, got "${v}"`); return def; }
  return n;
};
const int = (name, def, { min, max } = {}) => {
  const n = num(name, def);
  if (!Number.isInteger(n)) { fail(`${name} must be an integer, got "${n}"`); return def; }
  if (min !== undefined && n < min) fail(`${name} must be >= ${min}`);
  if (max !== undefined && n > max) fail(`${name} must be <= ${max}`);
  return n;
};
const url = (name) => {
  const v = req(name);
  if (v) { try { new URL(v); } catch { fail(`${name} must be a valid URL, got "${v}"`); } }
  return v;
};
const email = (name) => {
  const v = req(name);
  if (v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) fail(`${name} must be a valid email, got "${v}"`);
  return v;
};
const oneOf = (name, allowed, def) => {
  const v = opt(name, def);
  if (!allowed.includes(v)) fail(`${name} must be one of [${allowed.join(', ')}], got "${v}"`);
  return v;
};

const nodeEnv = oneOf('NODE_ENV', ['development', 'staging', 'production', 'test'], 'development');
const isProd = nodeEnv === 'production';
const port = int('PORT', 5000, { min: 1, max: 65535 });
const apiUrl = url('API_URL');
const appUrl = url('APP_URL');
const adminUrl = url('ADMIN_URL');
const appName = opt('APP_NAME', 'TVETGrid');

const corsRaw = opt('CORS_ORIGINS', '');
const corsOrigins = corsRaw
  ? corsRaw.split(',').map((s) => s.trim()).filter(Boolean)
  : [appUrl, adminUrl];

const jwtSecret = req('JWT_SECRET');
const jwtRefreshSecret = req('JWT_REFRESH_SECRET');
const jwtAccessTtl = opt('JWT_ACCESS_TTL', '15m');
const jwtRefreshTtl = opt('JWT_REFRESH_TTL', '7d');

if (jwtSecret && jwtSecret.length < 32) fail('JWT_SECRET must be at least 32 chars');
if (jwtRefreshSecret && jwtRefreshSecret.length < 32) fail('JWT_REFRESH_SECRET must be at least 32 chars');
if (jwtSecret && jwtSecret === jwtRefreshSecret) fail('JWT_SECRET and JWT_REFRESH_SECRET must differ');

const mongodbUri = req('MONGODB_URI');
if (mongodbUri && !/^mongodb(\+srv)?:\/\//.test(mongodbUri)) fail('MONGODB_URI must start with mongodb:// or mongodb+srv://');

const redisEnabled = bool('REDIS_ENABLED', true);
const redisUrl = opt('REDIS_URL', '');
if (redisEnabled) {
  if (!redisUrl) fail('REDIS_URL is required when REDIS_ENABLED=true');
  else if (!/^rediss?:\/\//.test(redisUrl)) fail('REDIS_URL must start with redis:// or rediss://');
}
if (isProd && !redisEnabled) fail('REDIS_ENABLED=false is not allowed in production');

const cloudinary = {
  cloudName: req('CLOUDINARY_CLOUD_NAME'),
  apiKey: req('CLOUDINARY_API_KEY'),
  apiSecret: req('CLOUDINARY_API_SECRET'),
  folder: opt('CLOUDINARY_UPLOAD_FOLDER', 'tvetgrid'),
};

const hdmBridge = {
  apiKey: req('HDM_API_KEY'),
  apiUrl: url('HDM_API_URL'),
  fromEmail: email('HDM_FROM_EMAIL'),
  fromName: opt('HDM_FROM_NAME', appName),
  smsSender: opt('HDM_SMS_SENDER', 'TVETGRID'),
  timeoutMs: int('HDM_TIMEOUT_MS', 15000, { min: 1000, max: 60000 }),
  smsEnabled: bool('SMS_ENABLED', true),
};
if (hdmBridge.apiKey && !hdmBridge.apiKey.startsWith('hdm_')) fail('HDM_API_KEY must start with "hdm_"');
if (hdmBridge.smsSender && hdmBridge.smsSender.length > 11) fail('HDM_SMS_SENDER must be <= 11 chars');

const hdmAi = {
  apiKey: req('HDM_AI_API_KEY'),
  apiUrl: url('HDM_AI_API_URL'),
  model: opt('HDM_AI_MODEL', 'HDM Nova'),
  timeoutMs: int('HDM_AI_TIMEOUT_MS', 30000, { min: 1000, max: 120000 }),
  temperature: num('HDM_AI_TEMPERATURE', 0.7),
  maxTokens: int('HDM_AI_MAX_TOKENS', 1024, { min: 1, max: 32000 }),
};
if (hdmAi.temperature < 0 || hdmAi.temperature > 1) fail('HDM_AI_TEMPERATURE must be between 0 and 1');

const whatsapp = {
  mode: oneOf('WHATSAPP_MODE', ['link', 'cloud'], 'link'),
  cloudApiToken: opt('WHATSAPP_CLOUD_API_TOKEN', ''),
  phoneNumberId: opt('WHATSAPP_PHONE_NUMBER_ID', ''),
  defaultCountryCode: opt('WHATSAPP_DEFAULT_COUNTRY_CODE', '254'),
};
if (whatsapp.mode === 'cloud') {
  if (!whatsapp.cloudApiToken) fail('WHATSAPP_CLOUD_API_TOKEN is required when WHATSAPP_MODE=cloud');
  if (!whatsapp.phoneNumberId) fail('WHATSAPP_PHONE_NUMBER_ID is required when WHATSAPP_MODE=cloud');
}

const livekit = {
  url: req('LIVEKIT_URL'),
  apiKey: req('LIVEKIT_API_KEY'),
  apiSecret: req('LIVEKIT_API_SECRET'),
};

const keepAlive = {
  enabled: bool('KEEP_ALIVE_ENABLED', false),
  verbose: bool('KEEP_ALIVE_VERBOSE', false),
};

if (isProd) {
  if (jwtSecret.startsWith('change-me')) fail('JWT_SECRET is still the placeholder — set a real secret in production');
  if (jwtRefreshSecret.startsWith('change-me')) fail('JWT_REFRESH_SECRET is still the placeholder — set a real secret in production');
}

if (errors.length) {
  console.error('\n✖ Environment validation failed:\n');
  errors.forEach((e) => console.error(`  • ${e}`));
  console.error('\nFix .env and restart.\n');
  process.exit(1);
}

module.exports = Object.freeze({
  nodeEnv, isProd, port,
  apiUrl, appUrl, adminUrl, appName,
  corsOrigins,
  jwt: { secret: jwtSecret, refreshSecret: jwtRefreshSecret, accessTtl: jwtAccessTtl, refreshTtl: jwtRefreshTtl },
  mongodbUri,
  redis: { enabled: redisEnabled, url: redisUrl },
  cloudinary,
  hdmBridge,
  hdmAi,
  whatsapp,
  livekit,
  keepAlive,
});