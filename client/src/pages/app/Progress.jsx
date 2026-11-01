import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  HiAcademicCap,
  HiArrowPath,
  HiArrowRight,
  HiMagnifyingGlass,
} from 'react-icons/hi2';
import { Card, Badge, Spinner, EmptyState } from '@/components/ui';
import { progressApi } from '@/api';
import { formatDate, relativeTime } from '@/utils/formatDate';

function MasteryBar({ red = 0, amber = 0, green = 0 }) {
  const total = red + amber + green;
  if (total === 0) {
    return (
      <div className="w-full h-2 rounded-full bg-[var(--bg-tertiary)]" />
    );
  }
  const rPct = (red / total) * 100;
  const aPct = (amber / total) * 100;
  const gPct = (green / total) * 100;

  return (
    <div className="w-full h-2 rounded-full overflow-hidden flex bg-[var(--bg-tertiary)]">
      {rPct > 0 && (
        <div style={{ width: `${rPct}%` }} className="bg-[var(--danger-text)]" />
      )}
      {aPct > 0 && (
        <div style={{ width: `${aPct}%` }} className="bg-[var(--warning-text)]" />
      )}
      {gPct > 0 && (
        <div style={{ width: `${gPct}%` }} className="bg-[var(--success-text)]" />
      )}
    </div>
  );
}

function masteryVariant(m) {
  if (m >= 70) return 'success';
  if (m >= 40) return 'warning';
  return 'danger';
}

function masteryLabel(m) {
  if (m >= 70) return 'Mastered';
  if (m >= 40) return 'Learning';
  return 'Needs work';
}

export default function Progress() {
  const overviewQuery = useQuery({
    queryKey: ['progress', 'overview'],
    queryFn: async () => {
      const res = await progressApi.getOverview();
      return res?.data || res;
    },
  });

  const revisionQuery = useQuery({
    queryKey: ['progress', 'revision'],
    queryFn: async () => {
      const res = await progressApi.getRevisionQueue({ limit: 20 });
      return res?.data || res;
    },
  });

  const overview = Array.isArray(overviewQuery.data) ? overviewQuery.data : [];
  const revision = Array.isArray(revisionQuery.data) ? revisionQuery.data : [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Progress</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Track your mastery and revision queue
        </p>
      </div>

      {/* Mastery by course */}
      <div>
        <h2 className="text-base font-semibold text-[var(--text-primary)] mb-3">
          Mastery by course
        </h2>

        {overviewQuery.isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : overview.length === 0 ? (
          <Card>
            <EmptyState
              icon={<HiAcademicCap className="w-6 h-6" />}
              title="No progress yet"
              description="Practice some papers to start tracking mastery."
              action={{ label: 'Browse papers', onClick: () => (window.location.href = '/app/papers') }}
            />
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {overview.map((c) => (
              <Card key={c.courseId || 'general'}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold text-[var(--text-primary)] truncate">
                      {c.courseTitle}
                    </h3>
                    <p className="text-xs text-[var(--text-muted)]">
                      {c.totalQuestions} question{c.totalQuestions !== 1 ? 's' : ''} tracked
                    </p>
                  </div>
                  <Badge variant={masteryVariant(c.avgMastery)} dot>
                    {c.avgMastery}%
                  </Badge>
                </div>

                <MasteryBar red={c.red} amber={c.amber} green={c.green} />

                <div className="flex items-center gap-3 mt-2 text-xs text-[var(--text-muted)]">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[var(--danger-text)]" />
                    {c.red} needs work
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[var(--warning-text)]" />
                    {c.amber} learning
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[var(--success-text)]" />
                    {c.green} mastered
                  </span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Revision queue */}
      <div>
        <div className="flex items-center justify-between gap-4 mb-3">
          <div>
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              Revision queue
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Questions due for review
            </p>
          </div>
          {revision.length > 0 && (
            <Badge variant="info">{revision.length} due</Badge>
          )}
        </div>

        {revisionQuery.isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : revision.length === 0 ? (
          <Card>
            <EmptyState
              icon={<HiArrowPath className="w-6 h-6" />}
              title="All caught up!"
              description="No questions are due for revision right now."
            />
          </Card>
        ) : (
          <Card padding={false}>
            {revision.map((r, i) => (
              <Link
                key={`${r.questionId}-${i}`}
                to={r.paperId ? `/app/papers` : '/app/papers'}
                className="flex items-start gap-3 px-4 py-3 hover:bg-[var(--bg-secondary)] border-b border-[var(--border-color)] last:border-0 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--brand-primary)] shrink-0">
                  <HiArrowPath className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[var(--text-primary)] line-clamp-2">
                    {r.stem || 'Question'}
                  </p>
                  <p className="text-xs text-[var(--text-muted)] mt-1 truncate">
                    {r.paperTitle || 'Paper'}
                    {r.courseTitle ? ` · ${r.courseTitle}` : ''}
                    {r.nextReviewAt
                      ? ` · due ${relativeTime(r.nextReviewAt)}`
                      : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={masteryVariant(r.mastery)}>
                    {masteryLabel(r.mastery)}
                  </Badge>
                  <HiArrowRight className="w-4 h-4 text-[var(--text-muted)]" />
                </div>
              </Link>
            ))}
          </Card>
        )}
      </div>
    </div>
  );
}