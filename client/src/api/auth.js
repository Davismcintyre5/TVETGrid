import api from './axios';

export async function register(data) {
  const res = await api.post('/client/auth/register', data, { skipAuth: true });
  return res.data;
}

export async function verifyByToken(token) {
  const res = await api.post(
    '/client/auth/verify-token',
    { token },
    { skipAuth: true }
  );
  return res.data;
}

export async function verifyByCode({ email, code }) {
  const res = await api.post(
    '/client/auth/verify-code',
    { email, code },
    { skipAuth: true }
  );
  return res.data;
}

export async function resendVerification({ email }) {
  const res = await api.post(
    '/client/auth/resend-verification',
    { email },
    { skipAuth: true }
  );
  return res.data;
}

export async function login(email, password) {
  const res = await api.post(
    '/client/auth/login',
    { email, password },
    { skipAuth: true }
  );
  return res.data;
}

export async function refresh(refreshToken) {
  const res = await api.post(
    '/client/auth/refresh',
    { refreshToken },
    { skipAuth: true }
  );
  return res.data;
}

export async function logout() {
  const res = await api.post('/client/auth/logout');
  return res.data;
}

export async function me() {
  const res = await api.get('/client/auth/me');
  return res.data;
}

export async function changePassword({ currentPassword, newPassword }) {
  const res = await api.patch('/client/auth/password', {
    currentPassword,
    newPassword,
  });
  return res.data;
}

export async function forgotPassword({ email }) {
  const res = await api.post(
    '/client/auth/forgot-password',
    { email },
    { skipAuth: true }
  );
  return res.data;
}

export async function resetPassword({ email, code, newPassword }) {
  const res = await api.post(
    '/client/auth/reset-password',
    { email, code, newPassword },
    { skipAuth: true }
  );
  return res.data;
}