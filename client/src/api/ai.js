import api from './axios';

export async function chat({ sessionId, question, courseId }) {
  const res = await api.post('/client/ai/chat', { sessionId, question, courseId });
  return res.data;
}

export async function listSessions(params = {}) {
  const res = await api.get('/client/ai/sessions', { params });
  return res.data;
}

export async function getSession(id) {
  const res = await api.get(`/client/ai/sessions/${id}`);
  return res.data;
}