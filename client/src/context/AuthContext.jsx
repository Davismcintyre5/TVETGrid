import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from 'react';
import { authApi } from '@/api';
import { authStore } from '@/lib/auth';

const AuthContext = createContext(null);

const initialState = {
  status: 'idle',
  user: authStore.getUser(),
  accessToken: authStore.getAccessToken(),
  refreshToken: authStore.getRefreshToken(),
  error: null,
};

function reducer(state, action) {
  switch (action.type) {
    case 'LOADING':
      return { ...state, status: 'loading', error: null };
    case 'AUTHENTICATED':
      return {
        ...state,
        status: 'authenticated',
        user: action.user,
        accessToken: action.accessToken,
        refreshToken: action.refreshToken,
        error: null,
      };
    case 'UNAUTHENTICATED':
      return {
        ...state,
        status: 'unauthenticated',
        user: null,
        accessToken: null,
        refreshToken: null,
        error: null,
      };
    case 'UPDATE_USER':
      return { ...state, user: action.user };
    case 'ERROR':
      return {
        ...state,
        status: 'unauthenticated',
        user: null,
        accessToken: null,
        refreshToken: null,
        error: action.error,
      };
    default:
      return state;
  }
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const applySession = useCallback((payload) => {
    const { accessToken, refreshToken, user } = payload;
    authStore.setSession(accessToken, refreshToken, user);
    dispatch({
      type: 'AUTHENTICATED',
      accessToken,
      refreshToken,
      user,
    });
  }, []);

  const login = useCallback(
    async (email, password) => {
      dispatch({ type: 'LOADING' });
      try {
        const res = await authApi.login(email, password);
        const payload = res?.data || res;
        if (!payload?.accessToken) throw new Error('Missing access token');
        applySession(payload);
        return payload;
      } catch (err) {
        dispatch({ type: 'ERROR', error: err });
        throw err;
      }
    },
    [applySession]
  );

  const register = useCallback(async (data) => {
    dispatch({ type: 'LOADING' });
    try {
      const res = await authApi.register(data);
      const payload = res?.data || res;
      dispatch({ type: 'UNAUTHENTICATED' });
      return payload;
    } catch (err) {
      dispatch({ type: 'ERROR', error: err });
      throw err;
    }
  }, []);

  const verifyByToken = useCallback(async (token) => {
    const res = await authApi.verifyByToken(token);
    return res?.data || res;
  }, []);

  const verifyByCode = useCallback(async ({ email, code }) => {
    const res = await authApi.verifyByCode({ email, code });
    return res?.data || res;
  }, []);

  const resendVerification = useCallback(async ({ email }) => {
    const res = await authApi.resendVerification({ email });
    return res?.data || res;
  }, []);

  const logout = useCallback(async () => {
    try {
      if (authStore.getAccessToken()) {
        await authApi.logout();
      }
    } catch {
      /* ignore */
    } finally {
      authStore.clear();
      dispatch({ type: 'UNAUTHENTICATED' });
    }
  }, []);

  const refresh = useCallback(async () => {
    const token = authStore.getRefreshToken();
    if (!token) throw new Error('No refresh token');

    const res = await authApi.refresh(token);
    const payload = res?.data || res;
    if (!payload?.accessToken) throw new Error('No access token');

    let user = state.user;
    try {
      const meRes = await authApi.me();
      user = meRes?.data || meRes;
    } catch {
      /* ignore */
    }

    authStore.setSession(payload.accessToken, token, user);
    dispatch({
      type: 'AUTHENTICATED',
      accessToken: payload.accessToken,
      refreshToken: token,
      user,
    });

    return payload.accessToken;
  }, [state.user]);

  const me = useCallback(async () => {
    const res = await authApi.me();
    const user = res?.data || res;
    authStore.setSession(
      authStore.getAccessToken(),
      authStore.getRefreshToken(),
      user
    );
    dispatch({ type: 'UPDATE_USER', user });
    return user;
  }, []);

  const setUser = useCallback((user) => {
    authStore.setSession(
      authStore.getAccessToken(),
      authStore.getRefreshToken(),
      user
    );
    dispatch({ type: 'UPDATE_USER', user });
  }, []);

  useEffect(() => {
    const token = authStore.getAccessToken();
    if (!token) {
      dispatch({ type: 'UNAUTHENTICATED' });
      return;
    }

    dispatch({ type: 'LOADING' });
    authApi
      .me()
      .then((res) => {
        const user = res?.data || res;
        authStore.setSession(token, authStore.getRefreshToken(), user);
        dispatch({
          type: 'AUTHENTICATED',
          accessToken: token,
          refreshToken: authStore.getRefreshToken(),
          user,
        });
      })
      .catch(() => {
        authStore.clear();
        dispatch({ type: 'UNAUTHENTICATED' });
      });
  }, []);

  useEffect(() => {
    const handler = () => {
      authStore.clear();
      dispatch({ type: 'UNAUTHENTICATED' });
    };
    window.addEventListener('tvetgrid:unauthorized', handler);
    return () => window.removeEventListener('tvetgrid:unauthorized', handler);
  }, []);

  const value = useMemo(
    () => ({
      status: state.status,
      user: state.user,
      isAuthenticated: state.status === 'authenticated',
      isVerified: !!state.user?.emailVerified,
      isLoading: state.status === 'loading' || state.status === 'idle',
      error: state.error,
      login,
      register,
      verifyByToken,
      verifyByCode,
      resendVerification,
      logout,
      refresh,
      me,
      setUser,
    }),
    [
      state,
      login,
      register,
      verifyByToken,
      verifyByCode,
      resendVerification,
      logout,
      refresh,
      me,
      setUser,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}