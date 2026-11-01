import { useEffect, useState } from 'react';
import { useSocket } from '@/context/SocketContext';

const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '👏', '🎉', '🙌'];

export default function ReactionsPanel({ meetingId, disabled }) {
  const { getMeetingSocket } = useSocket();
  const [floating, setFloating] = useState([]);

  useEffect(() => {
    if (!meetingId) return;
    const socket = getMeetingSocket();
    if (!socket) return;

    const onReaction = (r) => {
      const id = `${Date.now()}-${Math.random()}`;
      setFloating((prev) => [...prev, { ...r, id }]);
      setTimeout(() => {
        setFloating((prev) => prev.filter((f) => f.id !== id));
      }, 3000);
    };

    socket.on('reaction:received', onReaction);

    return () => socket.off('reaction:received', onReaction);
  }, [meetingId, getMeetingSocket]);

  const react = (emoji) => {
    if (disabled) return;
    const socket = getMeetingSocket();
    if (!socket || !socket.connected) return;
    socket.emit('reaction:send', { meetingId, emoji });
  };

  return (
    <>
      <div className="fixed bottom-32 right-6 pointer-events-none z-40">
        {floating.map((f) => (
          <div
            key={f.id}
            className="text-4xl animate-slide-in-up mb-2"
            style={{ animationDuration: '3s' }}
          >
            {f.emoji}
          </div>
        ))}
      </div>

      <div className="p-3">
        <p className="text-xs text-[var(--text-muted)] mb-2">
          {disabled ? 'Reactions are disabled by host' : 'Tap to react'}
        </p>
        <div className="grid grid-cols-4 gap-1">
          {EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => react(e)}
              disabled={disabled}
              className="w-full aspect-square rounded-lg hover:bg-[var(--sidebar-hover)] text-2xl disabled:opacity-40 flex items-center justify-center"
            >
              {e}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}