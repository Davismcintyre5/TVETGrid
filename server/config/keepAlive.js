const logger = require('../utils/logger');
const env = require('./env');

const FIRST_DELAY_MS = 60 * 1000;
const INTERVAL_MS = 10 * 60 * 1000;
const TIMEOUT_MS = 10 * 1000;

let firstTimer = null;
let intervalTimer = null;

function isEnabled() {
  return env.keepAlive.enabled === true;
}

function isVerbose() {
  return env.keepAlive.verbose === true;
}

async function pingHealth({ forceLog = false } = {}) {
  const base = env.apiUrl || `http://localhost:${env.port}`;
  const url = base.replace(/\/+$/, '') + '/health';
  const started = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, { method: 'GET', signal: controller.signal });
    const duration = Date.now() - started;

    if (!res.ok) {
      logger.warn(`[keepAlive] non-OK ${res.status} ${url} ${duration}ms`);
      return;
    }

    if (isVerbose() || forceLog) {
      logger.info(`[keepAlive] ping OK ${res.status} ${url} ${duration}ms`);
    }
  } catch (err) {
    const duration = Date.now() - started;
    const msg = err.name === 'AbortError' ? `timeout after ${duration}ms` : err.message;
    logger.warn(`[keepAlive] ping failed ${url} ${msg}`);
  } finally {
    clearTimeout(timeout);
  }
}

function startKeepAlive() {
  if (!isEnabled()) {
    logger.info('[keepAlive] Disabled');
    return;
  }

  if (firstTimer || intervalTimer) {
    logger.warn('[keepAlive] Already running');
    return;
  }

  logger.info(`[keepAlive] Enabled firstDelay=${FIRST_DELAY_MS}ms interval=${INTERVAL_MS}ms verbose=${isVerbose()}`);

  firstTimer = setTimeout(() => {
    firstTimer = null;
    pingHealth({ forceLog: true }).catch(() => {});

    intervalTimer = setInterval(() => {
      pingHealth().catch(() => {});
    }, INTERVAL_MS);
    if (intervalTimer.unref) intervalTimer.unref();
  }, FIRST_DELAY_MS);
  if (firstTimer.unref) firstTimer.unref();
}

function stopKeepAlive() {
  if (firstTimer) { clearTimeout(firstTimer); firstTimer = null; }
  if (intervalTimer) { clearInterval(intervalTimer); intervalTimer = null; }
  logger.info('[keepAlive] Stopped');
}

module.exports = { pingHealth, startKeepAlive, stopKeepAlive };