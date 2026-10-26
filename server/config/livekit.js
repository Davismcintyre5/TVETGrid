const { RoomServiceClient, AccessToken } = require('livekit-server-sdk');
const env = require('./env');

const roomService = new RoomServiceClient(env.livekit.url, env.livekit.apiKey, env.livekit.apiSecret);

async function createRoom(roomId, { emptyTimeout = 600, maxParticipants = 100 } = {}) {
  return roomService.createRoom({ name: roomId, emptyTimeout, maxParticipants });
}

async function deleteRoom(roomId) {
  try { await roomService.deleteRoom(roomId); } catch (err) { if (err?.status !== 404) throw err; }
}

async function listParticipants(roomId) {
  return roomService.listParticipants(roomId);
}

async function mintJoinToken({ roomId, identity, name, ttlSeconds = 3600, canPublish = true }) {
  const at = new AccessToken(env.livekit.apiKey, env.livekit.apiSecret, {
    identity,
    name: name || identity,
    ttl: ttlSeconds,
  });
  at.addGrant({
    roomJoin: true,
    room: roomId,
    canPublish,
    canSubscribe: true,
    canPublishData: true,
  });
  return at.toJwt();
}

module.exports = { roomService, createRoom, deleteRoom, listParticipants, mintJoinToken, url: env.livekit.url };