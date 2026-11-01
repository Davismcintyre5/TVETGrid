import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  HiArrowLeft,
  HiUserPlus,
  HiXMark,
  HiMagnifyingGlass,
  HiEnvelope,
  HiTrash,
  HiCheckCircle,
  HiClock,
  HiXCircle,
  HiOutlineExclamationTriangle,
} from 'react-icons/hi2';
import {
  Card,
  Button,
  Input,
  Spinner,
  Avatar,
  Badge,
  EmptyState,
} from '@/components/ui';
import { meetingsApi } from '@/api';
import { useSocket } from '@/context/SocketContext';
import { useToast } from '@/context/ToastContext';
import { formatDate, formatDateTime } from '@/utils/formatDate';
import { parseApiError } from '@/utils/parseApiError';

function rsvpVariant(rsvp) {
  if (rsvp === 'attended') return 'success';
  if (rsvp === 'accepted') return 'info';
  if (rsvp === 'declined') return 'danger';
  if (rsvp === 'expired') return 'default';
  return 'warning';
}

function rsvpLabel(rsvp) {
  if (rsvp === 'attended') return 'Attended';
  if (rsvp === 'accepted') return 'Accepted';
  if (rsvp === 'declined') return 'Declined';
  if (rsvp === 'expired') return 'Expired';
  return 'Invited';
}

export default function MeetingInvites() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { getMeetingSocket } = useSocket();

  const [inviteEmails, setInviteEmails] = useState('');
  const [emailList, setEmailList] = useState([]);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(null);
  const [search, setSearch] = useState('');

  const invitesQuery = useQuery({
    queryKey: ['meeting', id, 'invites'],
    queryFn: async () => {
      const res = await meetingsApi.listInvites(id);
      return res?.data || res;
    },
    enabled: !!id,
  });

  // Subscribe to socket updates for this meeting's invites
  useEffect(() => {
    if (!id) return;
    const socket = getMeetingSocket();
    if (!socket) return;

    socket.emit('invites:subscribe', { meetingId: id });

    const refresh = () => {
      queryClient.invalidateQueries({ queryKey: ['meeting', id, 'invites'] });
    };

    socket.on('invites:added', refresh);
    socket.on('invites:removed', refresh);

    return () => {
      socket.emit('invites:unsubscribe', { meetingId: id });
      socket.off('invites:added', refresh);
      socket.off('invites:removed', refresh);
    };
  }, [id, getMeetingSocket, queryClient]);

  const data = invitesQuery.data;
  const invites = data?.invites || [];
  const meeting = data?.meeting;
  const counts = data?.counts || { total: 0, invited: 0, accepted: 0, declined: 0 };

  const filtered = search
    ? invites.filter((i) => {
        const q = search.toLowerCase();
        return (
          String(i.email || '').toLowerCase().includes(q) ||
          String(i.name || '').toLowerCase().includes(q)
        );
      })
    : invites;

  const addEmail = () => {
    const email = inviteEmails.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Enter a valid email');
      return;
    }
    if (emailList.includes(email)) {
      toast.error('Already added');
      return;
    }
    setEmailList([...emailList, email]);
    setInviteEmails('');
  };

  const removeEmail = (email) => {
    setEmailList(emailList.filter((e) => e !== email));
  };

  const submitInvites = async () => {
    if (emailList.length === 0) {
      toast.error('Add at least one email');
      return;
    }
    setSaving(true);
    try {
      const res = await meetingsApi.addInvites(id, emailList);
      const payload = res?.data || res;
      toast.success(
        `Invited ${payload.added || emailList.length}${
          payload.skipped ? ` · ${payload.skipped} skipped` : ''
        }`
      );
      setEmailList([]);
      setInviteEmails('');
      queryClient.invalidateQueries({ queryKey: ['meeting', id, 'invites'] });
    } catch (err) {
      toast.error(parseApiError(err).message);
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (inviteId, email) => {
    setRemoving(inviteId);
    try {
      await meetingsApi.removeInvite(id, inviteId);
      toast.success(`Removed ${email}`);
      queryClient.invalidateQueries({ queryKey: ['meeting', id, 'invites'] });
    } catch (err) {
      toast.error(parseApiError(err).message);
    } finally {
      setRemoving(null);
    }
  };

  if (invitesQuery.isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (invitesQuery.isError || !data) {
    return (
      <div className="max-w-md mx-auto py-20 text-center">
        <HiOutlineExclamationTriangle className="w-10 h-10 mx-auto text-[var(--danger-text)] mb-3" />
        <p className="text-sm text-[var(--danger-text)] mb-4">
          {parseApiError(invitesQuery.error).message || 'Could not load invites'}
        </p>
        <Button to="/meetings" variant="outline">
          Back to meetings
        </Button>
      </div>
    );
  }

  const isEnded = meeting?.status === 'ended' || meeting?.status === 'cancelled';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link
        to="/meetings"
        className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      >
        <HiArrowLeft className="w-4 h-4" />
        Back to meetings
      </Link>

      {/* Meeting header */}
      <Card>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold text-[var(--text-primary)] truncate">
              {meeting?.title || 'Meeting'}
            </h1>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              {meeting?.scheduledAt ? formatDateTime(meeting.scheduledAt) : ''}
              {meeting?.durationMin ? ` · ${meeting.durationMin} min` : ''}
            </p>
          </div>
          <Badge
            variant={
              meeting?.status === 'live'
                ? 'danger'
                : meeting?.status === 'scheduled'
                ? 'info'
                : 'default'
            }
            dot
          >
            {meeting?.status ? meeting.status.charAt(0).toUpperCase() + meeting.status.slice(1) : 'Unknown'}
          </Badge>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-[var(--border-color)]">
          <div>
            <p className="text-xs text-[var(--text-muted)]">Total</p>
            <p className="text-lg font-bold text-[var(--text-primary)]">
              {counts.total}
            </p>
          </div>
          <div>
            <p className="text-xs text-[var(--text-muted)]">Invited</p>
            <p className="text-lg font-bold text-[var(--warning-text)]">
              {counts.invited}
            </p>
          </div>
          <div>
            <p className="text-xs text-[var(--text-muted)]">Accepted</p>
            <p className="text-lg font-bold text-[var(--success-text)]">
              {counts.accepted}
            </p>
          </div>
          <div>
            <p className="text-xs text-[var(--text-muted)]">Declined</p>
            <p className="text-lg font-bold text-[var(--danger-text)]">
              {counts.declined}
            </p>
          </div>
        </div>
      </Card>

      {/* Add invites */}
      {!isEnded && (
        <Card title="Invite more people">
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  value={inviteEmails}
                  onChange={(e) => setInviteEmails(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addEmail();
                    }
                  }}
                  placeholder="email@example.com"
                  iconLeft={<HiEnvelope className="w-4 h-4" />}
                />
              </div>
              <Button
                variant="outline"
                onClick={addEmail}
                icon={<HiUserPlus className="w-4 h-4" />}
              >
                Add
              </Button>
            </div>

            {emailList.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {emailList.map((email) => (
                  <div
                    key={email}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg-tertiary)] text-sm"
                  >
                    <span className="text-[var(--text-primary)]">{email}</span>
                    <button
                      type="button"
                      onClick={() => removeEmail(email)}
                      className="text-[var(--text-muted)] hover:text-[var(--danger-text)]"
                    >
                      <HiXMark className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end">
              <Button
                onClick={submitInvites}
                loading={saving}
                disabled={emailList.length === 0}
              >
                Send {emailList.length || ''} invite{emailList.length !== 1 ? 's' : ''}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Invites list */}
      <Card
        title={`Invites (${invites.length})`}
        actions={
          invites.length > 0 ? (
            <div className="w-full sm:w-64">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by email or name..."
                iconLeft={<HiMagnifyingGlass className="w-4 h-4" />}
              />
            </div>
          ) : null
        }
        padding={false}
      >
        {filtered.length === 0 ? (
          <EmptyState
            icon={<HiEnvelope className="w-6 h-6" />}
            title={invites.length === 0 ? 'No invites yet' : 'No matches'}
            description={
              invites.length === 0
                ? 'Add emails above to invite participants.'
                : 'Try a different search.'
            }
          />
        ) : (
          <ul className="divide-y divide-[var(--border-color)]">
            {filtered.map((inv) => (
              <li key={inv._id} className="flex items-center gap-3 px-4 py-3">
                <Avatar name={inv.name || inv.email} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                    {inv.name || inv.email}
                  </p>
                  <p className="text-xs text-[var(--text-muted)] truncate">
                    {inv.email}
                    {inv.createdAt ? ` · ${formatDate(inv.createdAt)}` : ''}
                  </p>
                </div>
                <Badge variant={rsvpVariant(inv.rsvp)} dot>
                  {rsvpLabel(inv.rsvp)}
                </Badge>
                {!isEnded && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRemove(inv._id, inv.email)}
                    loading={removing === inv._id}
                    title="Remove invite"
                  >
                    <HiTrash className="w-4 h-4 text-[var(--danger-text)]" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}