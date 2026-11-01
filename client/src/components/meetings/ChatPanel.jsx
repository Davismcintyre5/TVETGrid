import { useEffect, useRef, useState } from 'react';
import {
  HiPaperAirplane,
  HiCheck,
  HiOutlineClock,
  HiOutlineExclamationTriangle,
} from 'react-icons/hi2';
import { Button, Avatar } from '@/components/ui';
import { useSocket } from '@/context/SocketContext';
import { useAuth } from '@/context/AuthContext';

function formatTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function ChatPanel({ meetingId, disabled, displayName = 'Guest', userAvatar = null }) {
  const { getMeetingSocket } = useSocket();
  const { user } = useAuth();

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);

  const myId = user?.id || user?._id;

  useEffect(() => {
    if (!meetingId) return;
    const socket = getMeetingSocket();
    if (!socket) return;

    const onMessage = (msg) => {
      setMessages((prev) => {
        // Avoid duplicate if the message ID already exists (from ACK + broadcast)
        if (msg.id && prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    };

    socket.on('chat:message', onMessage);

    return () => {
      socket.off('chat:message', onMessage);
    };
  }, [meetingId, getMeetingSocket]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  const send = async () => {
    if (!input.trim() || disabled || sending) return;
    const socket = getMeetingSocket();
    if (!socket || !socket.connected) return;

    const text = input.trim();
    const tempId = `pending-${Date.now()}`;

    // Optimistically add as pending
    const pending = {
      id: tempId,
      userId: myId,
      name: displayName || user?.name || 'You',
      avatarUrl: userAvatar || user?.avatarUrl || null,
      message: text,
      ts: new Date().toISOString(),
      pending: true,
    };
    setMessages((prev) => [...prev, pending]);
    setInput('');
    setSending(true);

    socket.emit(
      'chat:send',
      {
        meetingId,
        message: text,
        name: displayName || user?.name || 'You',
        avatarUrl: userAvatar || user?.avatarUrl || null,
      },
      (response) => {
        setSending(false);
        if (response?.ok) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === tempId ? { ...m, id: response.id, pending: false } : m
            )
          );
        } else {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === tempId ? { ...m, pending: false, failed: true } : m
            )
          );
        }
      }
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-3 space-y-3" ref={listRef}>
        {messages.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)] text-center py-4">
            No messages yet
          </p>
        ) : (
          messages.map((m) => {
            const isMe = m.userId === myId;
            return (
              <div
                key={m.id}
                className={`flex gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
              >
                <Avatar
                  name={m.name}
                  src={m.avatarUrl}
                  size="sm"
                  className="shrink-0 mt-1"
                />
                <div
                  className={`flex flex-col min-w-0 max-w-[80%] ${
                    isMe ? 'items-end' : 'items-start'
                  }`}
                >
                  <div
                    className={`flex items-center gap-1.5 mb-0.5 ${
                      isMe ? 'flex-row-reverse' : ''
                    }`}
                  >
                    <span className="text-[11px] font-medium text-[var(--text-secondary)]">
                      {isMe ? 'You' : m.name}
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)]">
                      {formatTime(m.ts)}
                    </span>
                  </div>
                  <div
                    className={`px-3 py-1.5 rounded-lg text-sm break-words ${
                      m.failed
                        ? 'bg-[var(--danger-bg)] text-[var(--danger-text)] border border-[var(--danger-border)]'
                        : isMe
                        ? 'bg-[var(--brand-primary)] text-white'
                        : 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]'
                    }`}
                  >
                    {m.message}
                  </div>
                  <div className="text-[9px] mt-0.5 h-3 flex items-center gap-1">
                    {m.pending && (
                      <>
                        <HiOutlineClock className="w-2.5 h-2.5 text-[var(--text-muted)]" />
                        <span className="text-[var(--text-muted)]">Sending…</span>
                      </>
                    )}
                    {m.failed && (
                      <>
                        <HiOutlineExclamationTriangle className="w-2.5 h-2.5 text-[var(--danger-text)]" />
                        <span className="text-[var(--danger-text)]">Failed</span>
                      </>
                    )}
                    {isMe && !m.pending && !m.failed && (
                      <>
                        <HiCheck className="w-2.5 h-2.5 text-[var(--text-muted)]" />
                        <span className="text-[var(--text-muted)]">Sent</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="p-3 border-t border-[var(--border-color)]">
        {disabled ? (
          <p className="text-xs text-[var(--text-muted)] text-center">
            Chat is disabled by host
          </p>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
              placeholder="Type a message..."
              maxLength={2000}
              disabled={sending}
              className="flex-1 px-3 py-2 rounded-lg text-sm bg-[var(--input-bg)] text-[var(--text-primary)] border border-[var(--input-border)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/20 disabled:opacity-60"
            />
            <Button
              size="sm"
              onClick={send}
              disabled={!input.trim() || sending}
              loading={sending}
            >
              <HiPaperAirplane className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}