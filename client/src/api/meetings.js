import api from './axios';

export async function list(params = {}) {
  const res = await api.get('/client/meetings', { params });
  return res.data;
}

export async function get(id) {
  const res = await api.get(`/client/meetings/${id}`);
  return res.data;
}

export async function create(data) {
  const res = await api.post('/client/meetings', data);
  return res.data;
}

export async function update(id, data) {
  const res = await api.patch(`/client/meetings/${id}`, data);
  return res.data;
}

export async function start(id) {
  const res = await api.post(`/client/meetings/${id}/start`);
  return res.data;
}

export async function cancel(id) {
  const res = await api.post(`/client/meetings/${id}/cancel`);
  return res.data;
}

export async function invite(id, invitees) {
  const res = await api.post(`/client/meetings/${id}/invite`, { invitees });
  return res.data;
}

export async function join(id) {
  const res = await api.post(`/client/meetings/${id}/join`);
  return res.data;
}

export async function leave(id) {
  const res = await api.post(`/client/meetings/${id}/leave`);
  return res.data;
}

export async function listParticipants(id) {
  const res = await api.get(`/client/meetings/${id}/participants`);
  return res.data;
}

export async function updateSettings(id, settings) {
  const res = await api.patch(`/client/meetings/${id}/settings`, settings);
  return res.data;
}

export async function muteAll(id) {
  const res = await api.post(`/client/meetings/${id}/mute-all`);
  return res.data;
}

export async function unmuteAll(id) {
  const res = await api.post(`/client/meetings/${id}/unmute-all`);
  return res.data;
}

export async function muteParticipant(meetingId, userId) {
  const res = await api.post(
    `/client/meetings/${meetingId}/participants/${userId}/mute`
  );
  return res.data;
}

export async function unmuteParticipant(meetingId, userId) {
  const res = await api.post(
    `/client/meetings/${meetingId}/participants/${userId}/unmute`
  );
  return res.data;
}

export async function removeParticipant(meetingId, userId) {
  const res = await api.post(
    `/client/meetings/${meetingId}/participants/${userId}/remove`
  );
  return res.data;
}

export async function end(id) {
  const res = await api.post(`/client/meetings/${id}/end`);
  return res.data;
}

export async function listInvites(meetingId) {
  const res = await api.get(`/client/meetings/${meetingId}/invites`);
  return res.data;
}

export async function addInvites(meetingId, invitees) {
  const res = await api.post(`/client/meetings/${meetingId}/invites`, {
    invitees,
  });
  return res.data;
}

export async function removeInvite(meetingId, inviteId) {
  const res = await api.delete(
    `/client/meetings/${meetingId}/invites/${inviteId}`
  );
  return res.data;
}

export async function listMyInvites(params = {}) {
  const res = await api.get('/client/meetings/invited-to', { params });
  return res.data;
}

export async function search(params = {}) {
  const res = await api.get('/client/meetings', { params });
  return res.data;
}