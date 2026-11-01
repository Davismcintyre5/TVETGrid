import api from './axios';

export async function getOverview() {
  const res = await api.get('/client/dashboard');
  return res.data;
}