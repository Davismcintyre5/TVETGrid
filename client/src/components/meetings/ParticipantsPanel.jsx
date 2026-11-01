import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { HiOutlineUserMinus } from 'react-icons/hi2';
import { Button, Avatar, Badge, Spinner } from '@/components/ui';
import { meetingsApi } from '@/api';
import { useToast } from '@/context/ToastContext';
import { parseApiError } from '@/utils/parseApiError';

export default function ParticipantsPanel({
  meetingId,
  isHost,
  liveParticipants = [],
}) {
  const toast = useToast();
  const [tab, setTab] = useState('live');
  const [removing, setRemoving] = useState(null);

  const invitedQuery = useQuery({
    queryKey: ['meeting', meetingId, 'invited'],
    queryFn: async () => {
      const res = await meetingsApi.listParticipants(meetingId);
      return res?.data || res;
    },
    enabled: tab === 'invited',
  });

  const handleRemove = async (userId) => {
    if (!isHost) return;
    setRemoving(userId);
    try {
      await meetingsApi.removeParticipant(meetingId, userId);
      toast.success('Participant removed');
    } catch (err) {
      toast.error(parseApiError(err).message);
    } finally {
      setRemoving(null);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex border-b border-[var(--border-color)]">
        <button
          type="button"
          onClick={() => setTab('live')}
          className={`flex-1 px-3 py-2 text-sm font-medium border-b-2 ${
            tab === 'live'
              ? 'border-[var(--brand-primary)] text-[var(--brand-primary)]'
              : 'border-transparent text-[var(--text-secondary)]'
          }`}
        >
          In meeting ({liveParticipants.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('invited')}
          className={`flex-1 px-3 py-2 text-sm font-medium border-b-2 ${
            tab === 'invited'
              ? 'border-[var(--brand-primary)] text-[var(--brand-primary)]'
              : 'border-transparent text-[var(--text-secondary)]'
          }`}
        >
          Invited
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {tab === 'live' ? (
          liveParticipants.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)] text-center py-4">
              No one in the meeting yet
            </p>
          ) : (
            <ul className="space-y-1">
              {liveParticipants.map((p) => (
                <li
                  key={p.identity}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-[var(--sidebar-hover)]"
                >
                  <Avatar name={p.name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate flex items-center gap-1">
                      {p.name}
                      {p.isLocal && (
                        <span className="text-[10px] text-[var(--text-muted)]">(you)</span>
                      )}
                      {p.isHost && (
                        <Badge variant="warning" className="ml-1">Host</Badge>
                      )}
                    </p>
                  </div>
                  {isHost && !p.isHost && !p.isLocal && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemove(p.identity)}
                      loading={removing === p.identity}
                      title="Remove from meeting"
                    >
                      <HiOutlineUserMinus className="w-4 h-4 text-[var(--danger-text)]" />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )
        ) : invitedQuery.isLoading ? (
          <div className="flex justify-center py-4">
            <Spinner />
          </div>
        ) : (invitedQuery.data || []).length === 0 ? (
          <p className="text-xs text-[var(--text-muted)] text-center py-4">
            No invitees
          </p>
        ) : (
          <ul className="space-y-1">
            {(invitedQuery.data || []).map((p) => (
              <li
                key={p.userId}
                className="flex items-center gap-2 p-2 rounded-lg"
              >
                <Avatar name={p.name} src={p.avatarUrl} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-[var(--text-primary)] truncate flex items-center gap-1">
                    {p.name || 'User'}
                    {p.isHost && (
                      <Badge variant="warning" className="ml-1">Host</Badge>
                    )}
                  </p>
                  <p className="text-xs text-[var(--text-muted)] truncate">
                    {p.email}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}