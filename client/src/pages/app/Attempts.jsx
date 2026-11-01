import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  HiChartBar,
  HiArrowRight,
  HiMagnifyingGlass,
} from 'react-icons/hi2';
import { Card, Badge, Spinner, EmptyState, Pagination } from '@/components/ui';
import { attemptsApi } from '@/api';
import { formatDateTime } from '@/utils/formatDate';

function scoreVariant(pct) {
  if (pct >= 70) return 'success';
  if (pct >= 40) return 'warning';
  return 'danger';
}

export default function Attempts() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['attempts', page],
    queryFn: async () => {
      const res = await attemptsApi.list({ page, limit: 20 });
      return res?.data || res;
    },
  });

  const items = data?.data || data || [];
  const meta = data?.meta || { page: 1, pages: 1, total: 0 };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">My Attempts</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          {meta.total} attempt{meta.total !== 1 ? 's' : ''}
        </p>
      </div>

      {items.length === 0 ? (
        <Card>
          <EmptyState
            icon={<HiMagnifyingGlass className="w-6 h-6" />}
            title="No attempts yet"
            description="Start a practice paper to track your progress."
            action={{ label: 'Browse papers', onClick: () => (window.location.href = '/app/papers') }}
          />
        </Card>
      ) : (
        <>
          <Card padding={false}>
            {items.map((a) => (
              <Link
                key={a._id}
                to={`/app/attempts/${a._id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--bg-secondary)] border-b border-[var(--border-color)] last:border-0 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--brand-primary)] shrink-0">
                  <HiChartBar className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                    {a.paper?.title || `Paper ${a.paper?.year || ''}`}
                  </p>
                  <p className="text-xs text-[var(--text-muted)] truncate">
                    {a.course?.title ? `${a.course.title} · ` : ''}
                    {a.submittedAt ? formatDateTime(a.submittedAt) : ''}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">
                      {a.score}/{a.totalMarks}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {a.percentage}%
                    </p>
                  </div>
                  <Badge variant={scoreVariant(a.percentage)} dot>
                    {a.percentage >= 70
                      ? 'Pass'
                      : a.percentage >= 40
                      ? 'Fair'
                      : 'Retry'}
                  </Badge>
                  <HiArrowRight className="w-4 h-4 text-[var(--text-muted)]" />
                </div>
              </Link>
            ))}
          </Card>
          {meta.pages > 1 && (
            <Pagination page={meta.page} totalPages={meta.pages} onPageChange={setPage} />
          )}
        </>
      )}
    </div>
  );
}