import axios from 'axios';
import { authStore } from '@/lib/auth';

const API_BASE = '/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

export function setAuthToken(token) {
  if (token) api.defaults.headers.common.Authorization = `Bearer ${token}`;
  else delete api.defaults.headers.common.Authorization;
}

let refreshPromise = null;
let onUnauthorized = () => {
  authStore.clear();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('tvetgrid:unauthorized'));
  }
};

export function setupInterceptors(opts = {}) {
  if (opts.onUnauthorized) onUnauthorized = opts.onUnauthorized;
}

api.interceptors.request.use(
  (cfg) => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      cfg.headers['X-Request-Id'] = crypto.randomUUID();
    }
    if (!cfg.skipAuth) {
      const token = authStore.getAccessToken();
      if (token) cfg.headers.Authorization = `Bearer ${token}`;
    }
    return cfg;
  },
  (err) => Promise.reject(normalizeError(err))
);

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const status = error.response?.status;
    const code = error.response?.data?.code;
    const original = error.config;

    if (!original) return Promise.reject(normalizeError(error));

    const url = original.url || '';
    const isAuthEndpoint =
      url.includes('/auth/login') || url.includes('/auth/refresh');

    if (
      status === 401 &&
      !original._retry &&
      !isAuthEndpoint &&
      (code === 'TOKEN_EXPIRED' || !code)
    ) {
      original._retry = true;
      try {
        if (!refreshPromise) {
          const refreshToken = authStore.getRefreshToken();
          if (!refreshToken) throw new Error('No refresh token');
          refreshPromise = axios
            .post(`${API_BASE}/client/auth/refresh`, { refreshToken })
            .then((r) => {
              const payload = r?.data?.data || r?.data;
              const accessToken = payload?.accessToken;
              if (!accessToken) throw new Error('No access token');
              authStore.setSession(accessToken, refreshToken, authStore.getUser());
              return accessToken;
            })
            .finally(() => {
              refreshPromise = null;
            });
        }
        const newToken = await refreshPromise;
        original.headers = original.headers || {};
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch (refreshErr) {
        onUnauthorized();
        return Promise.reject(normalizeError(refreshErr));
      }
    }

    if (status === 401) onUnauthorized();
    return Promise.reject(normalizeError(error));
  }
);

export function normalizeError(error) {
  if (error && typeof error === 'object' && error.raw !== undefined) {
    return error;
  }

  const res = error?.response;
  const data = res?.data;

  const code =
    data?.code ||
    data?.error?.code ||
    (res?.status ? `HTTP_${res.status}` : 'NETWORK_ERROR');

  const message =
    data?.error ||
    data?.message ||
    data?.error?.message ||
    error?.message ||
    'Something went wrong';

  return {
    status: res?.status ?? 0,
    code,
    message: typeof message === 'string' ? message : 'Request failed',
    details: data?.details ?? null,
    isNetwork: !res,
    isServer: (res?.status ?? 0) >= 500,
    isForbidden: res?.status === 403,
    isNotFound: res?.status === 404,
    isValidation: code === 'VALIDATION_001',
    raw: error,
  };
}

export default api;