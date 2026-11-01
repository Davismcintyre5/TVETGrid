import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { HiArrowLeft, HiScale } from 'react-icons/hi';
import { Card, Button, Spinner, EmptyState } from '@/components/ui';
import { siteApi } from '@/api';
import { formatDate } from '@/utils/formatDate';

export default function LegalPage() {
  const { slug } = useParams();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['legal', 'page', slug],
    queryFn: async () => {
      const res = await siteApi.getLegal(slug);
      return res?.data || res;
    },
    enabled: !!slug,
  });

  const doc = data || null;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      >
        <HiArrowLeft className="w-4 h-4" />
        Back to home
      </Link>

      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : isError ? (
        <Card>
          <EmptyState
            icon={<HiScale className="w-6 h-6" />}
            title="Document not available"
            description={
              error?.status === 404
                ? "This legal document hasn't been published yet."
                : error?.message || 'Could not load document.'
            }
            action={{ label: 'Back to home', onClick: () => (window.location.href = '/') }}
          />
        </Card>
      ) : doc ? (
        <Card>
          <div className="mb-6 pb-6 border-b border-[var(--border-color)]">
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">{doc.title}</h1>
            <p className="text-xs text-[var(--text-muted)] mt-2">
              Version {doc.version || 1}
              {doc.effectiveAt && ` · Effective ${formatDate(doc.effectiveAt, 'long')}`}
              {doc.updatedAt && ` · Updated ${formatDate(doc.updatedAt, 'medium')}`}
            </p>
          </div>

          <div className="prose-themed">
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-[var(--text-secondary)] m-0 p-0 bg-transparent">
              {doc.bodyMd || 'No content yet.'}
            </pre>
          </div>
        </Card>
      ) : null}
    </div>
  );
}