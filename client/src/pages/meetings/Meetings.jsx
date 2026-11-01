import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  HiVideoCamera,
  HiPlus,
  HiCalendarDays,
  HiClock,
  HiArrowRight,
  HiPlay,
  HiShieldCheck,
  HiPencil,
  HiTrash,
  HiXMark,
  HiMagnifyingGlass,
  HiEnvelope,
} from 'react-icons/hi2';
import {
  Card,
  Button,
  Spinner,
  EmptyState,
  Badge,
  Tabs,
  Modal,
  Input,
  Avatar,
  SearchBar,
} from '@/components/ui';
import { meetingsApi } from '@/api';
import { useToast } from '@/context/ToastContext';
import { formatDateTime } from '@/utils/formatDate';
import { parseApiError } from '@/utils/parseApiError';

const TABS = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'live', label: 'Live' },
  { key: 'ended', label: 'Past' },
];

function MeetingCard({
  meeting,
  isHost,
  onJoin,
  onStart,
  onEdit,
  onCancel,
  onViewInvites,
  starting,
}) {
  const isLive = meeting.status === 'live';
  const isScheduled = meeting.status === 'scheduled';
  const isEnded = meeting.status === 'ended' || meeting.status === 'cancelled';

  return (
    <Card>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="w-11 h-11 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--brand-primary)] shrink-0">
            <HiVideoCamera className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="text-base font-semibold text-[var(--text-primary)] truncate">
                {meeting.title}
              </h3>
              {isHost && (
                <span
                  title="You host this meeting"
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[var(--warning-bg)] text-[var(--warning-text)] text-[10px] font-medium shrink-0"
                >
                  <HiShieldCheck className="w-3 h-3" />
                  Host
                </span>
              )}
            </div>
            <p className="text-xs text-[var(--text-muted)] truncate">
              {meeting.course?.title || 'General'}
            </p>
          </div>
        </div>
        <Badge
          variant={isLive ? 'danger' : isScheduled ? 'info' : 'default'}
          dot
          className={isLive ? 'animate-pulse' : ''}
        >
          {isLive ? 'Live' : isScheduled ? 'Scheduled' : 'Ended'}
        </Badge>
      </div>

      <div className="flex items-center gap-3 text-xs text-[var(--text-muted)] mb-3 flex-wrap">
        <span className="inline-flex items-center gap-1">
          <HiCalendarDays className="w-3.5 h-3.5" />
          {formatDateTime(meeting.scheduledAt)}
        </span>
        {meeting.durationMin && (
          <span className="inline-flex items-center gap-1">
            <HiClock className="w-3.5 h-3.5" />
            {meeting.durationMin} min
          </span>
        )}
      </div>

      {meeting.host && (
        <div className="flex items-center gap-2 pb-3 mb-3 border-b border-[var(--border-color)]">
          <Avatar name={meeting.host.name} src={meeting.host.avatarUrl} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-[var(--text-primary)] truncate">
              {meeting.host.name}
              {isHost && ' (you)'}
            </p>
            <p className="text-[10px] text-[var(--text-muted)]">Host</p>
          </div>
        </div>
      )}

      <div className="flex gap-2 mb-2">
        {isEnded ? (
          <Button size="sm" variant="outline" fullWidth disabled>
            Ended
          </Button>
        ) : isLive ? (
          <Button
            size="sm"
            variant="danger"
            fullWidth
            onClick={() => onJoin(meeting)}
            icon={<HiArrowRight className="w-3.5 h-3.5" />}
          >
            Join now
          </Button>
        ) : isHost ? (
          <>
            <Button
              size="sm"
              variant="primary"
              fullWidth
              onClick={() => onStart(meeting)}
              loading={starting === meeting._id}
              icon={<HiPlay className="w-3.5 h-3.5" />}
            >
              Start now
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onJoin(meeting)}
              title="Open room"
            >
              Open
            </Button>
          </>
        ) : (
          <Button
            size="sm"
            variant="primary"
            fullWidth
            onClick={() => onJoin(meeting)}
            icon={<HiArrowRight className="w-3.5 h-3.5" />}
          >
            Open room
          </Button>
        )}
      </div>

      {isHost && !isEnded && (
        <div className="flex items-center gap-1 pt-2 border-t border-[var(--border-color)]">
          <button
            type="button"
            onClick={() => onViewInvites(meeting)}
            className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--sidebar-hover)]"
          >
            <HiEnvelope className="w-3.5 h-3.5" />
            Invites
          </button>
          <button
            type="button"
            onClick={() => onEdit(meeting)}
            className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--sidebar-hover)]"
          >
            <HiPencil className="w-3.5 h-3.5" />
            Edit
          </button>
          <button
            type="button"
            onClick={() => onCancel(meeting)}
            className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded text-xs font-medium text-[var(--danger-text)] hover:bg-[var(--danger-bg)]"
          >
            <HiTrash className="w-3.5 h-3.5" />
            Cancel
          </button>
        </div>
      )}
    </Card>
  );
}

export default function Meetings() {
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState('upcoming');
  const [search, setSearch] = useState('');
  const [editOpen, setEditOpen] = useState({ open: false, meeting: null });
  const [cancelOpen, setCancelOpen] = useState({ open: false, meeting: null });
  const [starting, setStarting] = useState(null);
  const [editForm, setEditForm] = useState({
    title: '',
    scheduledAt: '',
    durationMin: 60,
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const meetingsQuery = useQuery({
    queryKey: ['meetings', 'list', search],
    queryFn: async () => {
      const res = await meetingsApi.list({
        limit: 100,
        q: search || undefined,
      });
      return res?.data || res;
    },
    staleTime: 30 * 1000,
  });

  const meetings = Array.isArray(meetingsQuery.data)
    ? meetingsQuery.data
    : meetingsQuery.data?.data || [];

  const filtered = meetings.filter((m) => {
    if (tab === 'upcoming')
      return m.status === 'scheduled' || m.status === 'live';
    if (tab === 'live') return m.status === 'live';
    if (tab === 'ended')
      return m.status === 'ended' || m.status === 'cancelled';
    return true;
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['meetings'] });
  };

  const handleJoin = (meeting) => navigate(`/meetings/${meeting._id}`);
  const handleViewInvites = (meeting) =>
    navigate(`/meetings/${meeting._id}/invites`);

  const handleStart = async (meeting) => {
    setStarting(meeting._id);
    try {
      await meetingsApi.start(meeting._id);
      toast.success('Meeting started');
      invalidate();
      navigate(`/meetings/${meeting._id}`);
    } catch (err) {
      toast.error(parseApiError(err).message);
    } finally {
      setStarting(null);
    }
  };

  const openEdit = (meeting) => {
    const dt = new Date(meeting.scheduledAt);
    const iso = !Number.isNaN(dt.getTime())
      ? new Date(dt.getTime() - dt.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16)
      : '';
    setEditForm({
      title: meeting.title || '',
      scheduledAt: iso,
      durationMin: meeting.durationMin || 60,
    });
    setEditOpen({ open: true, meeting });
  };

  const submitEdit = async () => {
    if (!editForm.title.trim()) {
      toast.error('Title required');
      return;
    }
    setSavingEdit(true);
    try {
      await meetingsApi.update(editOpen.meeting._id, {
        title: editForm.title.trim(),
        scheduledAt: editForm.scheduledAt
          ? new Date(editForm.scheduledAt).toISOString()
          : undefined,
        durationMin: Number(editForm.durationMin) || 60,
      });
      toast.success('Meeting updated');
      setEditOpen({ open: false, meeting: null });
      invalidate();
    } catch (err) {
      toast.error(parseApiError(err).message);
    } finally {
      setSavingEdit(false);
    }
  };

  const submitCancel = async () => {
    setCancelling(true);
    try {
      await meetingsApi.cancel(cancelOpen.meeting._id);
      toast.success('Meeting cancelled');
      setCancelOpen({ open: false, meeting: null });
      invalidate();
    } catch (err) {
      toast.error(parseApiError(err).message);
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            Meetings
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            {meetings.length} meeting{meetings.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button icon={<HiPlus className="w-4 h-4" />} to="/meetings/create">
          New meeting
        </Button>
      </div>

      <Card>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder="Search meetings by name or ID..."
            />
          </div>
          <Button
            variant="outline"
            size="md"
            onClick={() => navigate('/meetings/invited-to')}
            icon={<HiEnvelope className="w-4 h-4" />}
            className="shrink-0"
          >
            My Invites
          </Button>
        </div>
      </Card>

      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {meetingsQuery.isLoading ? (
        <div className="flex justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={
              search ? (
                <HiMagnifyingGlass className="w-6 h-6" />
              ) : (
                <HiVideoCamera className="w-6 h-6" />
              )
            }
            title={
              search
                ? 'No meetings match your search'
                : tab === 'upcoming'
                ? 'No upcoming meetings'
                : tab === 'live'
                ? 'No live meetings'
                : 'No past meetings'
            }
            description={
              search
                ? 'Try a different search term.'
                : tab === 'upcoming'
                ? 'Create one to get started.'
                : 'Check back later.'
            }
            action={
              search
                ? { label: 'Clear search', onClick: () => setSearch('') }
                : tab === 'upcoming'
                ? {
                    label: 'Create meeting',
                    onClick: () => navigate('/meetings/create'),
                  }
                : undefined
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((m) => (
            <MeetingCard
              key={m._id}
              meeting={m}
              isHost={m.isHost}
              onJoin={handleJoin}
              onStart={handleStart}
              onEdit={openEdit}
              onCancel={(meeting) => setCancelOpen({ open: true, meeting })}
              onViewInvites={handleViewInvites}
              starting={starting}
            />
          ))}
        </div>
      )}

      <Modal
        open={editOpen.open}
        onClose={() => setEditOpen({ open: false, meeting: null })}
        title="Edit meeting"
        size="md"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setEditOpen({ open: false, meeting: null })}
              disabled={savingEdit}
            >
              Cancel
            </Button>
            <Button onClick={submitEdit} loading={savingEdit}>
              Save changes
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Title"
            value={editForm.title}
            onChange={(e) =>
              setEditForm({ ...editForm, title: e.target.value })
            }
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Start"
              type="datetime-local"
              value={editForm.scheduledAt}
              onChange={(e) =>
                setEditForm({ ...editForm, scheduledAt: e.target.value })
              }
            />
            <Input
              label="Duration (min)"
              type="number"
              min={5}
              value={editForm.durationMin}
              onChange={(e) =>
                setEditForm({
                  ...editForm,
                  durationMin: Number(e.target.value) || 60,
                })
              }
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={cancelOpen.open}
        onClose={() => setCancelOpen({ open: false, meeting: null })}
        title="Cancel meeting?"
        size="sm"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setCancelOpen({ open: false, meeting: null })}
              disabled={cancelling}
            >
              Keep meeting
            </Button>
            <Button variant="danger" onClick={submitCancel} loading={cancelling}>
              Cancel meeting
            </Button>
          </>
        }
      >
        <p className="text-sm text-[var(--text-secondary)]">
          <strong>{cancelOpen.meeting?.title}</strong> will be cancelled.
          Participants will no longer be able to join.
        </p>
      </Modal>
    </div>
  );
}