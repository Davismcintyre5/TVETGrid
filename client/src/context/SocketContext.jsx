import { createContext, useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import { io } from 'socket.io-client';
import { authStore } from '@/lib/auth';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const aiRef = useRef(null);
  const meetingRef = useRef(null);

  const getSocket = useCallback((namespace, ref) => {
    const token = authStore.getAccessToken();
    if (!token) return null;
    if (ref.current && ref.current.connected) return ref.current;
    if (ref.current) ref.current.disconnect();
    ref.current = io(namespace, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      autoConnect: true,
    });
    return ref.current;
  }, []);

  const getAiSocket = useCallback(() => getSocket('/ai', aiRef), [getSocket]);
  const getMeetingSocket = useCallback(() => getSocket('/meeting', meetingRef), [getSocket]);

  const disconnectAll = useCallback(() => {
    if (aiRef.current) {
      aiRef.current.disconnect();
      aiRef.current = null;
    }
    if (meetingRef.current) {
      meetingRef.current.disconnect();
      meetingRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) disconnectAll();
  }, [isAuthenticated, disconnectAll]);

  useEffect(() => () => disconnectAll(), [disconnectAll]);

  const value = useMemo(
    () => ({ getAiSocket, getMeetingSocket, disconnectAll }),
    [getAiSocket, getMeetingSocket, disconnectAll]
  );

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used inside SocketProvider');
  return ctx;
}