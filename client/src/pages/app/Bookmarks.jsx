import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  HiBookmark,
  HiArrowDownTray,
  HiTrash,
  HiMagnifyingGlass,
} from 'react-icons/hi2';
import { Card, Button, Spinner, EmptyState, Pagination } from '@/components/ui';
import { bookmarksApi } from '@/api';
import { useToast } from '@/context/ToastContext';
import { downloadFromUrl } from '@/utils/download';
import { formatDate } from '@/utils/formatDate';

export default function Bookmarks() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [removing, setRemoving] = useState(null);
  const [downloading, setDownloading] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['bookmarks', page],
    queryFn: async () => {
      const res = await bookmarksApi.list({ page, limit: 20 });
      return res?.data || res;
    },
  });

  const items = data?.data || data || [];
  const meta = data?.meta || { page: 1, pages: 1, total: 0 };

  const removeBookmark = async (paperId) => {
    setRemoving(paperId);
    try {
      await bookmarksApi.remove(paperId);
      queryClient.invalidateQueries({ queryKey: ['bookmarks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Bookmark removed');
    } catch (err) {
      toast.error('Could not remove bookmark');
    } finally {
      setRemoving(null);
    }
  };

  const download = async (paper) => {
    if (!paper.downloadUrl) {
      toast.error('No PDF available');
      return;
    }
    setDownloading(paper._id);
    try {
      await downloadFromUrl(paper.downloadUrl, paper.fileName || `paper-${paper.year}.pdf`);
      toast.success('Download started');
    } catch (err) {
      toast.error('Download failed');
    } finally {
      setDownloading(null);
    }
  };

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
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Bookmarks</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          {meta.total} saved paper{meta.total !== 1 ? 's' : ''}
        </p>
      </div>

      {items.length === 0 ? (
        <Card>
          <EmptyState
            icon={<HiMagnifyingGlass className="w-6 h-6" />}
            title="No bookmarks yet"
            description="Save papers to revisit them quickly."
            action={{ label: 'Browse papers', onClick: () => (window.location.href = '/app/papers') }}
          />
        </Card>
      ) : (
        <>
          <Card padding={false}>
            {items.map((b) => (
              <div
                key={b._id}
                className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--bg-secondary)] border-b border-[var(--border-color)] last:border-0 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--brand-primary)] shrink-0">
                  <HiBookmark className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                    {b.paper?.title ||
                      `${b.paper?.subject?.name || 'Paper'} · ${b.paper?.year || ''}`}
                  </p>
                  <p className="text-xs text-[var(--text-muted)] truncate">
                    {b.paper?.course?.title}
                    {b.paper?.year ? ` · ${b.paper.year}` : ''}
                    {b.createdAt ? ` · saved ${formatDate(b.createdAt)}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    icon={<HiArrowDownTray className="w-3.5 h-3.5" />}
                    onClick={() => download(b.paper)}
                    loading={downloading === b.paper._id}
                    disabled={!b.paper?.downloadUrl}
                    title={b.paper?.downloadUrl ? 'Download' : 'No PDF'}
                  >
                    <span className="hidden sm:inline">Download</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeBookmark(b.paperId)}
                    loading={removing === b.paperId}
                    title="Remove bookmark"
                  >
                    <HiTrash className="w-3.5 h-3.5 text-[var(--danger-text)]" />
                  </Button>
                </div>
              </div>
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