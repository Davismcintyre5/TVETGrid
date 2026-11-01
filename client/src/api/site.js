import api from './axios';

export async function getSettings() {
  const res = await api.get('/public/site/settings', { skipAuth: true });
  return res.data;
}

export async function listLegal() {
  const res = await api.get('/public/site/legal', { skipAuth: true });
  return res.data;
}

export async function getLegal(slug) {
  const res = await api.get(`/public/site/legal/${slug}`, { skipAuth: true });
  return res.data;
}