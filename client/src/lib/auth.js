import { storage } from '@/utils/storage';

const ACCESS_KEY = 'accessToken';
const REFRESH_KEY = 'refreshToken';
const USER_KEY = 'user';

export const authStore = {
  getAccessToken() {
    return storage.get(ACCESS_KEY, null);
  },

  getRefreshToken() {
    return storage.get(REFRESH_KEY, null);
  },

  getUser() {
    return storage.get(USER_KEY, null);
  },

  setSession(accessToken, refreshToken, user) {
    if (accessToken) storage.set(ACCESS_KEY, accessToken);
    if (refreshToken) storage.set(REFRESH_KEY, refreshToken);
    if (user) storage.set(USER_KEY, user);
  },

  clear() {
    storage.remove(ACCESS_KEY);
    storage.remove(REFRESH_KEY);
    storage.remove(USER_KEY);
  },

  isAuthenticated() {
    return !!storage.get(ACCESS_KEY, null);
  },
};