import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  HiArrowLeft,
  HiCheckCircle,
  HiXCircle,
  HiOutlineExclamationTriangle,
} from 'react-icons/hi2';
import { Card, Badge, Spinner } from '@/components/ui';
import { attemptsApi } from '@/api';
import { formatDateTime } from '@/utils/formatDate';

export default function AttemptDetail() {
  const { id } = useParams();

  const { data, isLoading, error } = useQuery({
    queryKey: ['attempt', id],
    queryFn: async () => {
      const res = await attemptsApi.get(id);
      return res?.data || res;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-md mx-auto py-20 text-center">
        <HiOutlineExclamationTriangle className="w-10 h-10 mx-auto text-[var(--danger-text)] mb-3" />
        <p className="text-sm text-[var(--danger-text)] mb-4">
          Could not load attempt.
        </p>
        <Link
          to="/app/attempts"
          className="text-sm text-[var(--brand-primary)] hover:underline"
        >
          Back to attempts
        </Link>
      </div>
    );
  }

  const pct = data.percentage || 0;
  const scoreVariant =
    pct >= 70 ? 'success' : pct >= 40 ? 'warning' : 'danger';
  const correctCount = (data.answers || []).filter((a) => a.correct).length;
  const total = (data.answers || []).length;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link
        to="/app/attempts"
        className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      >
        <HiArrowLeft className="w-4 h-4" />
        Back to attempts
      </Link>

      {/* Summary */}
      <Card>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-[var(--text-primary)]">
              {data.paper?.title || `Paper ${data.paper?.year || ''}`}
            </h1>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              {data.course?.title ? `${data.course.title} · ` : ''}
              {data.submittedAt ? formatDateTime(data.submittedAt) : ''}
            </p>
          </div>
          <Badge variant={scoreVariant} dot className="text-sm">
            {pct}%
          </Badge>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-5 pt-5 border-t border-[var(--border-color)]">
          <div>
            <p className="text-xs text-[var(--text-muted)]">Score</p>
            <p className="text-lg font-bold text-[var(--text-primary)]">
              {data.score}/{data.totalMarks}
            </p>
          </div>
          <div>
            <p className="text-xs text-[var(--text-muted)]">Correct</p>
            <p className="text-lg font-bold text-[var(--success-text)]">
              {correctCount}
            </p>
          </div>
          <div>
            <p className="text-xs text-[var(--text-muted)]">Wrong</p>
            <p className="text-lg font-bold text-[var(--danger-text)]">
              {total - correctCount}
            </p>
          </div>
        </div>
      </Card>

      {/* Per-question breakdown */}
      <Card title="Question breakdown" padding={false}>
        {total === 0 ? (
          <p className="text-sm text-[var(--text-muted)] text-center py-8">
            No answers submitted.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--border-color)]">
            {(data.answers || []).map((a, i) => (
              <li key={a.qid || i} className="px-4 py-4">
                <div className="flex items-start gap-3">
                  <div className="shrink-0 mt-0.5">
                    {a.correct ? (
                      <HiCheckCircle className="w-5 h-5 text-[var(--success-text)]" />
                    ) : (
                      <HiXCircle className="w-5 h-5 text-[var(--danger-text)]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono text-[var(--text-muted)] mb-1">
                      Q{i + 1} · {a.marks} mark{a.marks !== 1 ? 's' : ''}
                    </p>
                    <p className="text-sm text-[var(--text-primary)] mb-2">
                      {a.stem || 'Question'}
                    </p>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <div
                        className={`px-2 py-1 rounded ${
                          a.correct
                            ? 'bg-[var(--success-bg)] text-[var(--success-text)]'
                            : 'bg-[var(--danger-bg)] text-[var(--danger-text)]'
                        }`}
                      >
                        Your answer: {a.chosen || '—'}
                      </div>
                      {!a.correct && a.correctAnswer && (
                        <div className="px-2 py-1 rounded bg-[var(--success-bg)] text-[var(--success-text)]">
                          Correct: {a.correctAnswer}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}