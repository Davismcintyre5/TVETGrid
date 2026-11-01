const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const env = require('./env');
const { createRedisConnection } = require('./redis');
const logger = require('../utils/logger');
const { verifyAccess } = require('../utils/tokens');
const MeetingParticipant = require('../models/client/MeetingParticipant');
const Meeting = require('../models/client/Meeting');

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
    socket.on('disconnect', () =>
      logger.info('Socket disconnected', { id: socket.id })
    );
  });

  setupAiNamespace(io);
  setupMeetingNamespace(io);

  return io;
}

function getIO() {
  if (!io) throw new Error('Socket.IO not initialized');
  return io;
}

function setupAiNamespace(io) {
  const nsp = io.of('/ai');

  nsp.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('No token'));
      const payload = verifyAccess(token);
      if (payload.type !== 'user') return next(new Error('Invalid token type'));
      socket.userId = payload.sub;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  nsp.on('connection', (socket) => {
    logger.info('AI socket connected', { userId: socket.userId, id: socket.id });
    socket.on('disconnect', () => {
      logger.info('AI socket disconnected', { userId: socket.userId });
    });
  });
}

function setupMeetingNamespace(io) {
  const nsp = io.of('/meeting');

  nsp.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('No token'));
      const payload = verifyAccess(token);
      if (payload.type !== 'user') return next(new Error('Invalid token type'));
      socket.userId = payload.sub;
      socket.role = payload.role;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  nsp.on('connection', (socket) => {
    logger.info('Meeting socket connected', {
      userId: socket.userId,
      id: socket.id,
    });

    const joinRoom = async (meetingId, ack) => {
      if (!meetingId) {
        if (typeof ack === 'function') ack({ ok: false, error: 'meetingId required' });
        return;
      }

      socket.join(`meeting:${meetingId}`);

      const roomSize = nsp.adapter.rooms.get(`meeting:${meetingId}`)?.size || 0;

      logger.info('Socket joined room', {
        socketId: socket.id,
        userId: socket.userId,
        meetingId,
        roomSize,
      });

      await MeetingParticipant.updateOne(
        { meetingId, userId: socket.userId },
        { $set: { socketId: socket.id } }
      ).catch(() => {});

      if (typeof ack === 'function') ack({ ok: true, roomSize });
    };

    socket.on('meeting:join', ({ meetingId }, ack) => joinRoom(meetingId, ack));
    socket.on('meeting:rejoin', ({ meetingId }, ack) => joinRoom(meetingId, ack));

    socket.on('invites:subscribe', ({ meetingId }) => {
      if (!meetingId) return;
      socket.join(`meeting:${meetingId}`);
    });

    socket.on('invites:unsubscribe', ({ meetingId }) => {
      if (!meetingId) return;
      socket.leave(`meeting:${meetingId}`);
    });

    socket.on('chat:send', async ({ meetingId, message, name, avatarUrl }, ack) => {
      if (!meetingId || !message) {
        if (typeof ack === 'function') ack({ ok: false, error: 'invalid payload' });
        return;
      }

      const meeting = await Meeting.findById(meetingId).select('settings').lean();
      if (meeting?.settings?.chatDisabled) {
        if (typeof ack === 'function') ack({ ok: false, error: 'chat disabled' });
        return;
      }

      const payload = {
        id: `${socket.id}-${Date.now()}`,
        userId: socket.userId,
        name: name || 'User',
        avatarUrl: avatarUrl || null,
        message: String(message).slice(0, 2000),
        ts: new Date().toISOString(),
      };

      nsp.to(`meeting:${meetingId}`).emit('chat:message', payload);

      logger.info('Chat broadcast', {
        meetingId,
        userId: socket.userId,
        roomSize: nsp.adapter.rooms.get(`meeting:${meetingId}`)?.size || 0,
      });

      if (typeof ack === 'function') ack({ ok: true, id: payload.id });
    });

    socket.on('reaction:send', async ({ meetingId, emoji }, ack) => {
      if (!meetingId || !emoji) {
        if (typeof ack === 'function') ack({ ok: false, error: 'invalid payload' });
        return;
      }

      const meeting = await Meeting.findById(meetingId).select('settings').lean();
      if (meeting?.settings?.reactionsDisabled) {
        if (typeof ack === 'function') ack({ ok: false, error: 'reactions disabled' });
        return;
      }

      const payload = {
        userId: socket.userId,
        emoji: String(emoji).slice(0, 8),
        ts: new Date().toISOString(),
      };

      nsp.to(`meeting:${meetingId}`).emit('reaction:received', payload);

      logger.info('Reaction broadcast', {
        meetingId,
        userId: socket.userId,
        emoji: payload.emoji,
        roomSize: nsp.adapter.rooms.get(`meeting:${meetingId}`)?.size || 0,
      });

      if (typeof ack === 'function') ack({ ok: true });
    });

    socket.on('hand:raise', ({ meetingId, raised }, ack) => {
      if (!meetingId) {
        if (typeof ack === 'function') ack({ ok: false, error: 'meetingId required' });
        return;
      }

      const payload = {
        userId: socket.userId,
        raised: !!raised,
        ts: new Date().toISOString(),
      };

      nsp.to(`meeting:${meetingId}`).emit('hand:update', payload);

      logger.info('Hand update broadcast', {
        meetingId,
        userId: socket.userId,
        raised: payload.raised,
        roomSize: nsp.adapter.rooms.get(`meeting:${meetingId}`)?.size || 0,
      });

      if (typeof ack === 'function') ack({ ok: true });
    });

    socket.on('disconnect', async () => {
      await MeetingParticipant.updateMany(
        { socketId: socket.id },
        { $set: { socketId: null } }
      ).catch(() => {});
      logger.info('Meeting socket disconnected', { userId: socket.userId });
    });
  });
}

module.exports = { initSocket, getIO };