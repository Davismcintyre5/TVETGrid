const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const env = require('./env');
const { createRedisConnection } = require('./redis');
const logger = require('../utils/logger');

let io = null;

function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: env.corsOrigins, credentials: true },
    path: '/socket.io',
  });

  if (env.redis.enabled) {
    const pub = createRedisConnection();
    const sub = pub.duplicate();
    io.adapter(createAdapter(pub, sub));
    logger.info('Socket.IO Redis adapter enabled');
  } else {
    logger.warn('Socket.IO running without Redis adapter (single instance only)');
  }

  io.on('connection', (socket) => {
    logger.info('Socket connected', { id: socket.id });
    socket.on('disconnect', () => logger.info('Socket disconnected', { id: socket.id }));
  });

  return io;
}

function getIO() {
  if (!io) throw new Error('Socket.IO not initialized — call initSocket(httpServer) first');
  return io;
}

module.exports = { initSocket, getIO };