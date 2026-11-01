import api from './axios';

// ─── Public (no auth) ────────────────────────────────
export async function listPublic(params = {}) {
  const res = await api.get('/public/courses', { params, skipAuth: true });
  return res.data;
}

export async function getPublic(id) {
  const res = await api.get(`/public/courses/${id}`, { skipAuth: true });
  return res.data;
}

export async function listPublicSubjects(courseId) {
  const res = await api.get(`/public/courses/${courseId}/subjects`, { skipAuth: true });
  return res.data;
}

// ─── Authenticated (client) ──────────────────────────
export async function list(params = {}) {
  const res = await api.get('/client/courses', { params });
  return res.data;
}

export async function getMine() {
  const res = await api.get('/client/courses/mine');
  return res.data;
}

export async function chooseCourse(courseId) {
  const res = await api.post('/client/courses/choose', { courseId });
  return res.data;
}

export async function setPreferredCourse(courseId) {
  const res = await api.patch('/client/courses/preferred', { courseId });
  return res.data;
}

export async function get(id) {
  const res = await api.get(`/client/courses/${id}`);
  return res.data;
}

export async function listSubjects(courseId) {
  const res = await api.get(`/client/courses/${courseId}/subjects`);
  return res.data;
}