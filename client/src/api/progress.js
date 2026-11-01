import api from './axios';

export async function getOverview() {
  const res = await api.get('/client/progress');
  return res.data;
}

export async function getRevisionQueue(params = {}) {
  const res = await api.get('/client/progress/revision', { params });
  return res.data;
}