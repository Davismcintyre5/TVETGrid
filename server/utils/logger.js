const env = require('../config/env');

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const COLORS = { error: '\x1b[31m', warn: '\x1b[33m', info: '\x1b[36m', debug: '\x1b[90m' };
const RESET = '\x1b[0m';

const minLevel = env.isProd ? 'info' : 'debug';

function ts() {
  return new Date().toISOString();
}

function write(level, msg, meta) {
  if (LEVELS[level] > LEVELS[minLevel]) return;
  const base = `[${ts()}] ${level.toUpperCase()}`;
  const line = meta
    ? `${base} ${msg} ${JSON.stringify(meta)}`
    : `${base} ${msg}`;
  if (env.isProd) {
    console.log(line);
  } else {
    console.log(`${COLORS[level]}${line}${RESET}`);
  }
}

module.exports = {
  error: (msg, meta) => write('error', msg, meta),
  warn:  (msg, meta) => write('warn',  msg, meta),
  info:  (msg, meta) => write('info',  msg, meta),
  debug: (msg, meta) => write('debug', msg, meta),
};