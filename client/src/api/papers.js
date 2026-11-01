import api from './axios';

export async function listPublic(params = {}) {
  const res = await api.get('/public/papers', { params, skipAuth: true });
  return res.data;
}

export async function getPublic(id) {
  const res = await api.get(`/public/papers/${id}`, { skipAuth: true });
  return res.data;
}

export async function list(params = {}) {
  const res = await api.get('/client/papers', { params });
  return res.data;
}

export async function get(id) {
  const res = await api.get(`/client/papers/${id}`);
  return res.data;
}