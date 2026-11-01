import api from './axios';

export async function listForMeeting(meetingId) {
  const res = await api.get(`/client/meetings/${meetingId}/invites`);
  return res.data;
}

export async function rsvp(meetingId, inviteId, status) {
  const res = await api.patch(`/client/meetings/${meetingId}/invites/${inviteId}`, {
    rsvp: status,
  });
  return res.data;
}