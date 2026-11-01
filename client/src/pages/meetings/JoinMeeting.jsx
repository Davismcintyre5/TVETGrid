import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  HiOutlineExclamationTriangle,
  HiVideoCamera,
  HiCalendarDays,
  HiClock,
  HiUser,
  HiArrowRight,
} from 'react-icons/hi2';
import { Card, Button, Input, Spinner, Badge } from '@/components/ui';
import { joinApi } from '@/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { formatDateTime } from '@/utils/formatDate';
import { parseApiError } from '@/utils/parseApiError';

export default function JoinMeeting() {
  const { token } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { isAuthenticated, user } = useAuth();

  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');

  const lookupQuery = useQuery({
    queryKey: ['join', 'lookup', token],
    queryFn: async () => {
      const res = await joinApi.lookup(token);
      return res?.data || res;
    },
    enabled: !!token,
    retry: 0,
  });

  // ─── Guest join ──────────────────────────────────
  const handleJoinAsGuest = async (e) => {
    e.preventDefault();
    setError('');

    if (!guestName.trim()) {
      setError('Your name is required');
      return;
    }
    if (!guestEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail)) {
      setError('A valid email is required');
      return;
    }

    setJoining(true);
    try {
      const res = await joinApi.join({
        token,
        guestName: guestName.trim(),
        guestEmail: guestEmail.trim().toLowerCase(),
        guestPhone: guestPhone.trim() || undefined,
      });

      const payload = res?.data || res;
      if (!payload?.meetingId || !payload?.token) {
        throw new Error('Invalid join response from server');
      }

      sessionStorage.setItem(
        `guestJoin:${payload.meetingId}`,
        JSON.stringify({
          token: payload.token,
          url: payload.url,
          roomName: payload.roomName,
          meetingTitle: lookupQuery.data?.meetingTitle || 'Meeting',
          displayName: guestName.trim(),
          inviteId: payload.inviteId,
        })
      );

      toast.success('Joining meeting...');
      navigate(`/guest-meeting/${payload.meetingId}?guest=1`);   // ← public route
    } catch (err) {
      setError(parseApiError(err).message);
    } finally {
      setJoining(false);
    }
  };

  // ─── Authenticated join ──────────────────────────
  const handleJoinAsUser = async () => {
    setError('');
    setJoining(true);
    try {
      const res = await joinApi.join({ token });
      const payload = res?.data || res;
      if (!payload?.meetingId || !payload?.token) {
        throw new Error('Invalid join response from server');
      }

      toast.success('Joining meeting...');
      navigate(`/meetings/${payload.meetingId}`);   // ← protected route, user is authed
    } catch (err) {
      setError(parseApiError(err).message);
    } finally {
      setJoining(false);
    }
  };

  // ─── Loading ─────────────────────────────────────
  if (lookupQuery.isLoading) {
    return (
      <Card>
        <div className="flex justify-center py-10">
          <Spinner size="lg" />
        </div>
      </Card>
    );
  }

  // ─── Lookup error ────────────────────────────────
  if (lookupQuery.isError || !lookupQuery.data) {
    const msg =
      parseApiError(lookupQuery.error).message ||
      'This invite link is invalid or has expired.';
    return (
      <Card>
        <div className="text-center py-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[var(--danger-bg)] text-[var(--danger-text)] mb-4">
            <HiOutlineExclamationTriangle className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold text-[var(--text-primary)] mb-2">
            Invite not available
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mb-6 max-w-sm mx-auto">
            {msg}
          </p>
          <Button to="/" variant="outline">
            Back to home
          </Button>
        </div>
      </Card>
    );
  }

  const data = lookupQuery.data;

  if (data.status === 'ended') {
    return (
      <Card>
        <div className="text-center py-6">
          <h1 className="text-xl font-bold text-[var(--text-primary)] mb-2">
            Meeting ended
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mb-6">
            This meeting has already finished.
          </p>
          <Button to="/" variant="outline">
            Back to home
          </Button>
        </div>
      </Card>
    );
  }

  if (data.status === 'cancelled') {
    return (
      <Card>
        <div className="text-center py-6">
          <h1 className="text-xl font-bold text-[var(--text-primary)] mb-2">
            Meeting cancelled
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mb-6">
            The host has cancelled this meeting.
          </p>
          <Button to="/" variant="outline">
            Back to home
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[var(--bg-tertiary)] text-[var(--brand-primary)] mb-4">
          <HiVideoCamera className="w-7 h-7" />
        </div>
        <p className="text-xs uppercase tracking-wide text-[var(--text-muted)] mb-1">
          You&apos;re invited to
        </p>
        <h1 className="text-xl font-bold text-[var(--text-primary)] mb-3">
          {data.meetingTitle}
        </h1>
        <div className="flex items-center justify-center gap-3 text-xs text-[var(--text-muted)] flex-wrap">
          <span className="inline-flex items-center gap-1">
            <HiUser className="w-3.5 h-3.5" />
            {data.hostName}
          </span>
          {data.scheduledAt && (
            <span className="inline-flex items-center gap-1">
              <HiCalendarDays className="w-3.5 h-3.5" />
              {formatDateTime(data.scheduledAt)}
            </span>
          )}
          {data.durationMin && (
            <span className="inline-flex items-center gap-1">
              <HiClock className="w-3.5 h-3.5" />
              {data.durationMin} min
            </span>
          )}
        </div>
        {data.status === 'live' && (
          <Badge variant="danger" dot className="mt-3 animate-pulse">
            Live now
          </Badge>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-[var(--danger-bg)] text-[var(--danger-text)] text-sm border border-[var(--danger-border)]">
          {error}
        </div>
      )}

      {isAuthenticated && user ? (
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)]">
            <p className="text-sm text-[var(--text-secondary)]">
              You&apos;re signed in as{' '}
              <strong className="text-[var(--text-primary)]">{user.name}</strong>
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-1">{user.email}</p>
          </div>
          <Button
            variant="primary"
            fullWidth
            size="lg"
            onClick={handleJoinAsUser}
            loading={joining}
            icon={<HiArrowRight className="w-4 h-4" />}
          >
            Join meeting
          </Button>
        </div>
      ) : (
        <form onSubmit={handleJoinAsGuest} className="space-y-4">
          <div className="p-3 rounded-lg bg-[var(--info-bg)] text-[var(--info-text)] text-xs border border-[var(--info-border)]">
            Joining as a guest. Already have an account?{' '}
            <Link
              to={`/login?redirect=${encodeURIComponent(`/join/${token}`)}`}
              className="underline font-medium"
            >
              Log in
            </Link>
          </div>

          <Input
            label="Your name *"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            placeholder="Full name"
            required
          />
          <Input
            label="Your email *"
            type="email"
            value={guestEmail}
            onChange={(e) => setGuestEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
          <Input
            label="Phone (optional)"
            type="tel"
            value={guestPhone}
            onChange={(e) => setGuestPhone(e.target.value)}
            placeholder="For meeting reminders"
          />

          <Button
            type="submit"
            variant="primary"
            fullWidth
            size="lg"
            loading={joining}
            icon={<HiArrowRight className="w-4 h-4" />}
          >
            Join as guest
          </Button>
        </form>
      )}
    </Card>
  );
}