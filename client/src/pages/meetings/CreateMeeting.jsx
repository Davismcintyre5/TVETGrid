import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  HiArrowLeft,
  HiCalendarDays,
  HiClock,
  HiUserPlus,
  HiXMark,
  HiMagnifyingGlass,
} from 'react-icons/hi2';
import { Card, Button, Input } from '@/components/ui';
import { meetingsApi, coursesApi } from '@/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { parseApiError } from '@/utils/parseApiError';

export default function CreateMeeting() {
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const defaultStart = (() => {
    const dt = new Date(Date.now() + 60 * 60 * 1000);
    dt.setMinutes(0, 0, 0);
    return dt.toISOString().slice(0, 16);
  })();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scheduledAt, setScheduledAt] = useState(defaultStart);
  const [durationMin, setDurationMin] = useState(60);
  const [courseId, setCourseId] = useState(user?.preferredCourseId || '');
  const [invitees, setInvitees] = useState([]);
  const [inviteSearch, setInviteSearch] = useState('');
  const [creating, setCreating] = useState(false);

  const coursesQuery = useQuery({
    queryKey: ['create-meeting', 'courses'],
    queryFn: async () => {
      const res = await coursesApi.list({ limit: 100 });
      return res?.data || res;
    },
    staleTime: 5 * 60 * 1000,
  });

  const courses = Array.isArray(coursesQuery.data)
    ? coursesQuery.data
    : coursesQuery.data?.data || [];

  const courseOptions = [
    { value: '', label: 'No course (general)' },
    ...courses.map((c) => ({ value: c._id, label: c.title })),
  ];

  const handleAddInvitee = () => {
    const email = inviteSearch.trim().toLowerCase();
    if (!email) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Enter a valid email');
      return;
    }
    if (invitees.includes(email)) {
      toast.error('Already added');
      return;
    }
    setInvitees([...invitees, email]);
    setInviteSearch('');
  };

  const removeInvitee = (email) => {
    setInvitees(invitees.filter((e) => e !== email));
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (!scheduledAt) {
      toast.error('Start time is required');
      return;
    }

    const dt = new Date(scheduledAt);
    if (Number.isNaN(dt.getTime())) {
      toast.error('Invalid date/time');
      return;
    }
    if (dt.getTime() < Date.now() - 60_000) {
      toast.error('Start time must be in the future');
      return;
    }

    setCreating(true);
    try {
      const res = await meetingsApi.create({
        title: title.trim(),
        description: description.trim() || undefined,
        courseId: courseId || undefined,
        scheduledAt: dt.toISOString(),
        durationMin: Number(durationMin) || 60,
        invitees,
      });

      const created = res?.data || res;
      queryClient.invalidateQueries({ queryKey: ['meetings'] });

      toast.success('Meeting created — start it when you\'re ready');

      if (created?._id) {
        navigate('/meetings', { replace: true });
      } else {
        navigate('/meetings', { replace: true });
      }
    } catch (err) {
      toast.error(parseApiError(err).message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link
        to="/meetings"
        className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      >
        <HiArrowLeft className="w-4 h-4" />
        Back to meetings
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          Create meeting
        </h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Schedule a live session with your students
        </p>
      </div>

      <Card title="Meeting details">
        <div className="space-y-4">
          <Input
            label="Title *"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Chapter 3 revision"
          />

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Optional"
              className="w-full px-3 py-2 rounded-lg text-sm bg-[var(--input-bg)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] border border-[var(--input-border)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/20"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <Input
                label="Start time *"
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                iconLeft={<HiCalendarDays className="w-4 h-4" />}
              />
            </div>
            <Input
              label="Duration (min)"
              type="number"
              min={5}
              max={300}
              value={durationMin}
              onChange={(e) => setDurationMin(Number(e.target.value) || 60)}
              iconLeft={<HiClock className="w-4 h-4" />}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Course
            </label>
            <select
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm bg-[var(--input-bg)] text-[var(--text-primary)] border border-[var(--input-border)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/20"
            >
              {courseOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      <Card title="Invite participants">
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                value={inviteSearch}
                onChange={(e) => setInviteSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddInvitee();
                  }
                }}
                placeholder="student@example.com"
                iconLeft={<HiMagnifyingGlass className="w-4 h-4" />}
              />
            </div>
            <Button
              variant="outline"
              onClick={handleAddInvitee}
              icon={<HiUserPlus className="w-4 h-4" />}
            >
              Add
            </Button>
          </div>

          {invitees.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {invitees.map((email) => (
                <div
                  key={email}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg-tertiary)] text-sm"
                >
                  <span className="text-[var(--text-primary)]">{email}</span>
                  <button
                    type="button"
                    onClick={() => removeInvitee(email)}
                    className="text-[var(--text-muted)] hover:text-[var(--danger-text)]"
                  >
                    <HiXMark className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[var(--text-muted)]">
              Invitees receive an email with a join link. You can also add them later.
            </p>
          )}
        </div>
      </Card>

      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={() => navigate('/meetings')}
          disabled={creating}
        >
          Cancel
        </Button>
        <Button onClick={handleCreate} loading={creating}>
          Create meeting
        </Button>
      </div>
    </div>
  );
}