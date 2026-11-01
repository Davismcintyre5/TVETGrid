import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  HiDocumentText,
  HiArrowDownTray,
  HiClock,
  HiMagnifyingGlass,
  HiFunnel,
} from 'react-icons/hi2';
import {
  Card,
  Button,
  SearchBar,
  Select,
  Input,
  Spinner,
  EmptyState,
  Pagination,
} from '@/components/ui';
import { papersApi, coursesApi } from '@/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { downloadFromUrl } from '@/utils/download';

function PaperRow({ paper, onDownload, downloading }) {
  const label =
    paper.title ||
    `${paper.subject?.name || 'Paper'} · ${paper.year}${
      paper.paperNo ? ` · Paper ${paper.paperNo}` : ''
    }`;

  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--bg-secondary)] border-b border-[var(--border-color)] last:border-0 transition-colors">
      <div className="w-10 h-10 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--brand-primary)] shrink-0">
        <HiDocumentText className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--text-primary)] truncate">{label}</p>
        <p className="text-xs text-[var(--text-muted)] truncate">
          {paper.course?.title}
          {paper.subject?.name ? ` · ${paper.subject.name}` : ''}
        </p>
        <div className="flex items-center gap-3 mt-1 text-xs text-[var(--text-muted)]">
          <span>{paper.year}</span>
          {paper.durationMin && (
            <span className="inline-flex items-center gap-1">
              <HiClock className="w-3 h-3" />
              {paper.durationMin}m
            </span>
          )}
          {paper.totalMarks > 0 && <span>{paper.totalMarks} marks</span>}
        </div>
      </div>
      <Button
        size="sm"
        variant="primary"
        icon={<HiArrowDownTray className="w-3.5 h-3.5" />}
        onClick={() => onDownload(paper)}
        disabled={!paper.downloadUrl || downloading === paper._id}
        loading={downloading === paper._id}
        className="shrink-0"
      >
        <span className="hidden sm:inline">Download</span>
      </Button>
    </div>
  );
}

export default function Papers() {
  const { user } = useAuth();
  const toast = useToast();

  const [search, setSearch] = useState('');
  const [courseId, setCourseId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [year, setYear] = useState('');
  const [page, setPage] = useState(1);
  const [downloading, setDownloading] = useState(null);

  const effectiveCourseId = courseId || '';

  const coursesQuery = useQuery({
    queryKey: ['papers', 'courses-filter'],
    queryFn: async () => {
      const res = await coursesApi.list({ limit: 100 });
      return res?.data || res;
    },
    staleTime: 5 * 60 * 1000,
  });

  const subjectsQuery = useQuery({
    queryKey: ['papers', 'subjects-filter', effectiveCourseId],
    queryFn: async () => {
      const res = await coursesApi.listSubjects(effectiveCourseId);
      return res?.data || res;
    },
    enabled: !!effectiveCourseId,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    setSubjectId('');
  }, [effectiveCourseId]);

  const papersQuery = useQuery({
    queryKey: ['papers', 'client', { search, effectiveCourseId, subjectId, year, page }],
    queryFn: async () => {
      const res = await papersApi.list({
        q: search || undefined,
        courseId: effectiveCourseId || undefined,
        subjectId: subjectId || undefined,
        year: year || undefined,
        page,
        limit: 20,
      });
      return res?.data || res;
    },
  });

  const courses = Array.isArray(coursesQuery.data)
    ? coursesQuery.data
    : coursesQuery.data?.data || [];
  const subjects = Array.isArray(subjectsQuery.data)
    ? subjectsQuery.data
    : subjectsQuery.data?.data || [];

  const items = papersQuery.data?.data || papersQuery.data || [];
  const meta = papersQuery.data?.meta || { page: 1, pages: 1, total: 0 };

  const courseOptions = [
    { value: '', label: 'My course' },
    ...courses.map((c) => ({ value: c._id, label: c.title })),
  ];

  const subjectOptions = [
    { value: '', label: 'All subjects' },
    ...subjects.map((s) => ({ value: s._id, label: s.name })),
  ];

  const handleDownload = async (paper) => {
    if (!paper.downloadUrl) {
      toast.error('No PDF available for this paper');
      return;
    }
    setDownloading(paper._id);
    try {
      await downloadFromUrl(
        paper.downloadUrl,
        paper.fileName || `paper-${paper.year}.pdf`
      );
      toast.success('Download started');
    } catch (err) {
      toast.error(err.message || 'Download failed');
    } finally {
      setDownloading(null);
    }
  };

  const clearFilters = () => {
    setSearch('');
    setCourseId('');
    setSubjectId('');
    setYear('');
    setPage(1);
  };

  const hasActiveFilters = search || courseId || subjectId || year;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Past Papers</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          {meta.total} paper{meta.total !== 1 ? 's' : ''}
          {user?.preferredCourseId && !courseId && (
            <span className="ml-1">· from your course</span>
          )}
        </p>
      </div>

      <Card>
        <div className="flex items-center gap-2 mb-3">
          <HiFunnel className="w-4 h-4 text-[var(--text-muted)]" />
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Filters</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <SearchBar
            value={search}
            onChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
            placeholder="Search papers..."
          />
          <Select
            value={courseId}
            onChange={(e) => {
              setCourseId(e.target.value);
              setPage(1);
            }}
            options={courseOptions}
          />
          <Select
            value={subjectId}
            onChange={(e) => {
              setSubjectId(e.target.value);
              setPage(1);
            }}
            options={subjectOptions}
            disabled={!effectiveCourseId}
          />
          <Input
            type="number"
            value={year}
            onChange={(e) => {
              setYear(e.target.value);
              setPage(1);
            }}
            placeholder="Year"
          />
        </div>

        {hasActiveFilters && (
          <div className="mt-3">
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs text-[var(--brand-primary)] hover:underline"
            >
              Clear all filters
            </button>
          </div>
        )}
      </Card>

      <Card padding={false}>
        {papersQuery.isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={<HiMagnifyingGlass className="w-6 h-6" />}
            title="No papers found"
            description={
              hasActiveFilters
                ? 'Try a different search or clear your filters.'
                : 'No papers published for your course yet.'
            }
            action={
              hasActiveFilters
                ? { label: 'Clear filters', onClick: clearFilters }
                : undefined
            }
          />
        ) : (
          <div>
            {items.map((p) => (
              <PaperRow
                key={p._id}
                paper={p}
                onDownload={handleDownload}
                downloading={downloading}
              />
            ))}
          </div>
        )}
      </Card>

      {meta.pages > 1 && (
        <Pagination page={meta.page} totalPages={meta.pages} onPageChange={setPage} />
      )}
    </div>
  );
}