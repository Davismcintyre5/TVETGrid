import api from './axios';

export async function lookup(token) {
  const res = await api.get(`/client/join/${token}`);
  return res.data;
}

export async function join({ token, guestName, guestEmail, guestPhone }) {
  const res = await api.post(`/client/join/${token}`, {
    guestName,
    guestEmail,
    guestPhone,
  });
  return res.data;
}