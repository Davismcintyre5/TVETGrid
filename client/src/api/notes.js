import api from './axios';

export async function listPublic(params = {}) {
  const res = await api.get('/public/notes', { params, skipAuth: true });
  return res.data;
}

export async function getPublic(id) {
  const res = await api.get(`/public/notes/${id}`, { skipAuth: true });
  return res.data;
}

export async function list(params = {}) {
  const res = await api.get('/client/notes', { params });
  return res.data;
}

export async function get(id) {
  const res = await api.get(`/client/notes/${id}`);
  return res.data;
}