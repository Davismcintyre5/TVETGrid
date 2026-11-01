const { RoomServiceClient, AccessToken } = require('livekit-server-sdk');
const env = require('./env');

const roomService = new RoomServiceClient(
  env.livekit.url,
  env.livekit.apiKey,
  env.livekit.apiSecret
);

async function createRoom(roomId, { emptyTimeout = 600, maxParticipants = 100 } = {}) {
  try {
    return await roomService.createRoom({
      name: roomId,
      emptyTimeout,
      maxParticipants,
    });
  } catch (err) {
    // Room may already exist (409) — that's fine
    if (err?.status !== 409 && err?.code !== 'ALREADY_EXISTS') throw err;
    return null;
  }
}

async function deleteRoom(roomId) {
  try {
    await roomService.deleteRoom(roomId);
  } catch (err) {
    if (err?.status !== 404) throw err;
  }
}

async function listParticipants(roomId) {
  return roomService.listParticipants(roomId);
}

async function removeParticipant(roomId, identity) {
  try {
    await roomService.removeParticipant(roomId, identity);
  } catch (err) {
    if (err?.status !== 404) throw err;
  }
}

async function mintJoinToken({
  roomId,
  identity,
  name,
  ttlSeconds = 3600,
  canPublish = true,
  canPublishVideo = true,
  canPublishData = true,
  canSubscribe = true,
  isHost = false,
}) {
  const at = new AccessToken(env.livekit.apiKey, env.livekit.apiSecret, {
    identity,
    name: name || identity,
    ttl: ttlSeconds,
  });

  at.addGrant({
    roomJoin: true,
    room: roomId,
    roomAdmin: isHost,
    canPublish,
    canPublishVideo,
    canPublishData,
    canSubscribe,
    canUpdateOwnMetadata: true,
  });

  return await at.toJwt();
}

module.exports = {
  roomService,
  createRoom,
  deleteRoom,
  listParticipants,
  removeParticipant,
  mintJoinToken,
  url: env.livekit.url,
};