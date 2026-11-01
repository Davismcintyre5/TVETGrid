import api from './axios';

export async function add(paperId) {
  const res = await api.post('/client/bookmarks', { paperId });
  return res.data;
}

export async function list(params = {}) {
  const res = await api.get('/client/bookmarks', { params });
  return res.data;
}

export async function remove(paperId) {
  const res = await api.delete(`/client/bookmarks/${paperId}`);
  return res.data;
}