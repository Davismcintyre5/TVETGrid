import api from './axios';

export async function submit({ paperId, answers }) {
  const res = await api.post('/client/attempts', { paperId, answers });
  return res.data;
}

export async function list(params = {}) {
  const res = await api.get('/client/attempts', { params });
  return res.data;
}

export async function get(id) {
  const res = await api.get(`/client/attempts/${id}`);
  return res.data;
}