import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  HiVideoCamera,
  HiCalendarDays,
  HiClock,
  HiMagnifyingGlass,
  HiArrowRight,
  HiXCircle,
} from 'react-icons/hi2';
import {
  Card,
  Button,
  Input,
  Spinner,
  EmptyState,
  Badge,
  Tabs,
  Avatar,
} from '@/components/ui';
import { meetingsApi } from '@/api';
import { formatDateTime, relativeTime } from '@/utils/formatDate';

const STATUS_TABS = [
  { key: '', label: 'All' },
  { key: 'scheduled', label: 'Upcoming' },
  { key: 'live', label: 'Live' },
  { key: 'ended', label: 'Past' },
];

function statusVariant(status) {
  if (status === 'live') return 'danger';
  if (status === 'scheduled') return 'info';
  return 'default';
}

function statusLabel(status) {
  if (status === 'live') return 'Live';
  if (status === 'scheduled') return 'Scheduled';
  if (status === 'ended') return 'Ended';
  if (status === 'cancelled') return 'Cancelled';
  return status;
}

export default function MyInvites() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const invitesQuery = useQuery({
    queryKey: ['meetings', 'invited-to', { search, status, page }],
    queryFn: async () => {
      const res = await meetingsApi.listMyInvites({
        q: search || undefined,
        status: status || undefined,
        page,
        limit: 20,
      });
      return res?.data || res;
    },
    staleTime: 30 * 1000,
  });

  const data = invitesQuery.data;
  const items = Array.isArray(data) ? data : data?.data || [];
  const meta = data?.meta || { page: 1, pages: 1, total: items.length };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          My Invites
        </h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Meetings you&apos;ve been invited to
        </p>
      </div>

      {/* Search + filters */}
      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by meeting name or ID..."
            iconLeft={<HiMagnifyingGlass className="w-4 h-4" />}
          />
        </div>
        <div className="mt-3">
          <Tabs
            tabs={STATUS_TABS}
            active={status}
            onChange={(k) => {
              setStatus(k);
              setPage(1);
            }}
          />
        </div>
      </Card>

      {invitesQuery.isLoading ? (
        <div className="flex justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : items.length === 0 ? (
        <Card>
          <EmptyState
            icon={<HiVideoCamera className="w-6 h-6" />}
            title="No invites"
            description={
              search || status
                ? 'Try a different search or filter.'
                : 'When someone invites you to a meeting, it will appear here.'
            }
            action={
              search || status
                ? {
                    label: 'Clear filters',
                    onClick: () => {
                      setSearch('');
                      setStatus('');
                      setPage(1);
                    },
                  }
                : undefined
            }
          />
        </Card>
      ) : (
        <>
          <div className="space-y-3">
            {items.map((item) => {
              const m = item.meeting;
              const inv = item.invite;
              const isLive = m?.status === 'live';
              const isEnded = m?.status === 'ended' || m?.status === 'cancelled';

              return (
                <Card key={inv?._id || m?._id}>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="w-11 h-11 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--brand-primary)] shrink-0">
                        <HiVideoCamera className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base font-semibold text-[var(--text-primary)] truncate">
                          {m?.title || 'Meeting'}
                        </h3>
                        <p className="text-xs text-[var(--text-muted)] truncate">
                          {m?.course?.title || 'General'}
                        </p>
                      </div>
                    </div>
                    <Badge variant={statusVariant(m?.status)} dot className={isLive ? 'animate-pulse' : ''}>
                      {statusLabel(m?.status)}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-[var(--text-muted)] mb-3 flex-wrap">
                    <span className="inline-flex items-center gap-1">
                      <HiCalendarDays className="w-3.5 h-3.5" />
                      {m?.scheduledAt ? formatDateTime(m.scheduledAt) : '—'}
                    </span>
                    {m?.durationMin && (
                      <span className="inline-flex items-center gap-1">
                        <HiClock className="w-3.5 h-3.5" />
                        {m.durationMin} min
                      </span>
                    )}
                    {m?.scheduledAt && m.status === 'scheduled' && (
                      <span className="text-[var(--text-secondary)]">
                        ({relativeTime(m.scheduledAt)})
                      </span>
                    )}
                  </div>

                  {m?.host && (
                    <div className="flex items-center gap-2 pb-3 mb-3 border-b border-[var(--border-color)]">
                      <Avatar name={m.host.name} src={m.host.avatarUrl} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-[var(--text-primary)] truncate">
                          {m.host.name}
                        </p>
                        <p className="text-[10px] text-[var(--text-muted)]">Host</p>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    {isEnded ? (
                      <Button size="sm" variant="outline" fullWidth disabled>
                        Ended
                      </Button>
                    ) : isLive ? (
                      <Button
                        size="sm"
                        variant="danger"
                        fullWidth
                        onClick={() => navigate(`/meetings/${m._id}`)}
                        icon={<HiArrowRight className="w-3.5 h-3.5" />}
                      >
                        Join now
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="primary"
                        fullWidth
                        onClick={() => navigate(`/meetings/${m._id}`)}
                      >
                        Open room
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>

          {meta.pages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                Previous
              </Button>
              <span className="text-sm text-[var(--text-secondary)]">
                Page {meta.page} of {meta.pages}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= meta.pages}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}