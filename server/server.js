require('dotenv').config();

const http = require('http');
const express = require('express');

const env = require('./config/env');
const { connectDB, disconnectDB } = require('./config/db');
const { getClient, disconnectRedis } = require('./config/redis');
const { initSocket } = require('./config/socket');
const { startKeepAlive, stopKeepAlive } = require('./config/keepAlive');
const logger = require('./utils/logger');

const requestId = require('./middleware/global/requestId');
const requestLogger = require('./middleware/global/requestLogger');
const corsMw = require('./middleware/global/cors');
const helmetMw = require('./middleware/global/helmet');
const bodyParser = require('./middleware/global/bodyParser');
const globalRateLimiter = require('./middleware/global/rateLimiter');
const notFound = require('./middleware/global/notFound');
const errorHandler = require('./middleware/global/errorHandler');

const STARTED_AT = Date.now();
let isShuttingDown = false;
let schedulersRegistered = false;

function buildApp() {
  const app = express();
  app.set('trust proxy', 1);

  app.use(requestId);
  app.use(requestLogger);
  app.use(corsMw);
  app.use(helmetMw);
  app.use(bodyParser);
  app.use(globalRateLimiter);

  app.get('/', (req, res) => {
    res.status(200).json({
      success: true,
      message: `${env.appName} API`,
      version: '1.0.0',
      env: env.nodeEnv,
      docs: '/api',
      health: '/health',
    });
  });

  app.get('/api', (req, res) => {
    res.status(200).json({
      success: true,
      message: `${env.appName} API root`,
      version: '1.0.0',
      endpoints: {
        health: '/health',
        auth: '/api/auth',
        site: '/api/site',
        join: '/api/join',
        admin: '/api/admin',
      },
    });
  });

  app.get('/health', (req, res) => {
    res.status(200).json({
      success: true,
      status: isShuttingDown ? 'shutting_down' : 'ok',
      app: env.appName,
      env: env.nodeEnv,
      uptimeSeconds: Math.floor((Date.now() - STARTED_AT) / 1000),
      timestamp: new Date().toISOString(),
    });
  });

  try {
    app.use('/api', require('./routes'));
    logger.info('Routes mounted');
  } catch (err) {
    if (err.code === 'MODULE_NOT_FOUND') {
      logger.warn(`Routes not mounted: ${err.message}`);
    } else {
      throw err;
    }
  }

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

async function startBackgroundWork() {
  if (!env.redis.enabled) {
    logger.error('Redis is required for background work (REDIS_ENABLED=false)');
    throw new Error('Redis required');
  }

  try {
    const { registerAllSchedulers } = require('./schedulers');
    await registerAllSchedulers();
    schedulersRegistered = true;
    logger.info('Schedulers registered');
  } catch (err) {
    if (err.code === 'MODULE_NOT_FOUND') {
      logger.warn('schedulers/index.js not found — skipping scheduler registration');
    } else {
      throw err;
    }
  }
}

async function stopBackgroundWork() {
  if (schedulersRegistered) {
    try {
      const { stopAllSchedulers } = require('./schedulers');
      if (typeof stopAllSchedulers === 'function') await stopAllSchedulers();
    } catch (e) { logger.error('Schedulers stop failed', { err: e.message }); }
  }
}

async function start() {
  try {
    await connectDB();
    if (env.redis.enabled) {
      const redis = getClient();
      if (redis) await redis.ping();
    } else {
      logger.warn('Redis disabled — background work will not run');
    }

    await startBackgroundWork();

    const app = buildApp();
    const httpServer = http.createServer(app);
    initSocket(httpServer);

    httpServer.listen(env.port, () => {
      logger.info(`${env.appName} API listening on :${env.port} (${env.nodeEnv})`);
      logger.info(`Health: ${env.apiUrl}/health`);

      startKeepAlive();
    });

    const shutdown = async (signal) => {
      if (isShuttingDown) return;
      isShuttingDown = true;
      logger.info(`${signal} received — starting graceful shutdown`);

      stopKeepAlive();

      const forceTimer = setTimeout(() => {
        logger.error('Forced exit after 20s');
        process.exit(1);
      }, 20000);
      forceTimer.unref();

      httpServer.close(async (err) => {
        if (err) logger.error('HTTP server close error', { err: err.message });
        else logger.info('HTTP server closed');

        try { await stopBackgroundWork(); } catch (e) { logger.error('Background stop failed', { err: e.message }); }
        try { await disconnectRedis(); } catch (e) { logger.error('Redis disconnect failed', { err: e.message }); }
        try { await disconnectDB(); } catch (e) { logger.error('Mongo disconnect failed', { err: e.message }); }

        clearTimeout(forceTimer);
        logger.info('Shutdown complete');
        process.exit(0);
      });

      setTimeout(() => {
        logger.warn('Closing idle connections');
        httpServer.closeIdleConnections?.();
      }, 5000).unref();
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    process.on('unhandledRejection', (reason) => {
      logger.error('Unhandled rejection', { reason: reason?.message || String(reason) });
    });
    process.on('uncaughtException', (err) => {
      logger.error('Uncaught exception', { err: err.message, stack: err.stack });
      shutdown('uncaughtException');
    });
  } catch (err) {
    logger.error('Boot failed', { err: err.message, stack: err.stack });
    process.exit(1);
  }
}

start();