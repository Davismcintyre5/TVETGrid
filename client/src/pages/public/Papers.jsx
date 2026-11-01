import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import {
  HiDocumentText,
  HiDownload,
  HiClock,
  HiSearch,
  HiFilter,
} from 'react-icons/hi';
import {
  Card,
  Button,
  SearchBar,
  Select,
  Input,
  Spinner,
  EmptyState,
  Pagination,
  Badge,
} from '@/components/ui';
import { papersApi, coursesApi } from '@/api';
import { downloadFromUrl } from '@/utils/download';
import { useToast } from '@/context/ToastContext';

function PaperRow({ paper, onDownload }) {
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
          {paper.questionCount > 0 && <span>{paper.questionCount} questions</span>}
        </div>
      </div>
      <Button
        size="sm"
        variant="primary"
        icon={<HiDownload className="w-3.5 h-3.5" />}
        onClick={() => onDownload(paper)}
        disabled={!paper.downloadUrl}
        title={paper.downloadUrl ? 'Download PDF' : 'No PDF available'}
        className="shrink-0"
      >
        <span className="hidden sm:inline">Download</span>
      </Button>
    </div>
  );
}

export default function Papers() {
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToast();

  const [search, setSearch] = useState('');
  const [courseId, setCourseId] = useState(searchParams.get('courseId') || '');
  const [subjectId, setSubjectId] = useState(searchParams.get('subjectId') || '');
  const [year, setYear] = useState('');
  const [page, setPage] = useState(1);
  const [downloading, setDownloading] = useState(null);

  // Sync URL params
  useEffect(() => {
    const params = {};
    if (courseId) params.courseId = courseId;
    if (subjectId) params.subjectId = subjectId;
    setSearchParams(params, { replace: true });
  }, [courseId, subjectId, setSearchParams]);

  // Fetch courses for filter dropdown
  const coursesQuery = useQuery({
    queryKey: ['papers', 'courses-filter'],
    queryFn: () => coursesApi.listPublic({ limit: 100 }),
    staleTime: 5 * 60 * 1000,
  });

  // Fetch subjects for the selected course only
  const subjectsQuery = useQuery({
    queryKey: ['papers', 'subjects-filter', courseId],
    queryFn: () => coursesApi.listPublicSubjects(courseId),
    enabled: !!courseId,
    staleTime: 5 * 60 * 1000,
  });

  // Reset subject when course changes
  useEffect(() => {
    setSubjectId('');
  }, [courseId]);

  // Fetch papers with all filters
  const papersQuery = useQuery({
    queryKey: ['papers', 'public', { search, courseId, subjectId, year, page }],
    queryFn: () =>
      papersApi.listPublic({
        q: search || undefined,
        courseId: courseId || undefined,
        subjectId: subjectId || undefined,
        year: year || undefined,
        page,
        limit: 20,
      }),
  });

  const courseOptions = [
    { value: '', label: 'All courses' },
    ...(coursesQuery.data?.data || []).map((c) => ({ value: c._id, label: c.title })),
  ];

  const subjectOptions = [
    { value: '', label: courseId ? 'All subjects' : 'Select a course first' },
    ...(subjectsQuery.data?.data || subjectsQuery.data || []).map((s) => ({
      value: s._id,
      label: s.name,
    })),
  ];

  const items = papersQuery.data?.data || [];
  const meta = papersQuery.data?.meta || { page: 1, pages: 1, total: 0 };

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

  const handleCourseChange = (value) => {
    setCourseId(value);
    setPage(1);
  };

  const handleSubjectChange = (value) => {
    setSubjectId(value);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Past Papers</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          {meta.total} paper{meta.total !== 1 ? 's' : ''}
          {courseId && ' · filtered'}
        </p>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex items-center gap-2 mb-3">
          <HiFilter className="w-4 h-4 text-[var(--text-muted)]" />
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
            onChange={(e) => handleCourseChange(e.target.value)}
            options={courseOptions}
          />
          <Select
            value={subjectId}
            onChange={(e) => handleSubjectChange(e.target.value)}
            options={subjectOptions}
            disabled={!courseId}
          />
          <Input
            type="number"
            value={year}
            onChange={(e) => {
              setYear(e.target.value);
              setPage(1);
            }}
            placeholder="Year (e.g. 2024)"
          />
        </div>

        {/* Active filter badges */}
        {(courseId || subjectId || year || search) && (
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <span className="text-xs text-[var(--text-muted)]">Active:</span>
            {courseId && (
              <Badge variant="info">
                {courseOptions.find((c) => c.value === courseId)?.label}
                <button
                  onClick={() => handleCourseChange('')}
                  className="ml-1 hover:text-[var(--danger-text)]"
                  aria-label="Clear course filter"
                >
                  ×
                </button>
              </Badge>
            )}
            {subjectId && (
              <Badge variant="info">
                {subjectOptions.find((s) => s.value === subjectId)?.label}
                <button
                  onClick={() => handleSubjectChange('')}
                  className="ml-1 hover:text-[var(--danger-text)]"
                  aria-label="Clear subject filter"
                >
                  ×
                </button>
              </Badge>
            )}
            {year && (
              <Badge variant="info">
                {year}
                <button
                  onClick={() => {
                    setYear('');
                    setPage(1);
                  }}
                  className="ml-1 hover:text-[var(--danger-text)]"
                  aria-label="Clear year filter"
                >
                  ×
                </button>
              </Badge>
            )}
            {search && (
              <Badge variant="info">
                "{search}"
                <button
                  onClick={() => {
                    setSearch('');
                    setPage(1);
                  }}
                  className="ml-1 hover:text-[var(--danger-text)]"
                  aria-label="Clear search"
                >
                  ×
                </button>
              </Badge>
            )}
            <button
              onClick={() => {
                setCourseId('');
                setSubjectId('');
                setYear('');
                setSearch('');
                setPage(1);
              }}
              className="text-xs text-[var(--brand-primary)] hover:underline ml-2"
            >
              Clear all
            </button>
          </div>
        )}
      </Card>

      {/* List */}
      <Card padding={false}>
        {papersQuery.isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={<HiSearch className="w-6 h-6" />}
            title="No papers found"
            description="Try a different search or filter."
            action={{
              label: 'Clear filters',
              onClick: () => {
                setCourseId('');
                setSubjectId('');
                setYear('');
                setSearch('');
                setPage(1);
              },
            }}
          />
        ) : (
          <div>
            {items.map((p) => (
              <PaperRow
                key={p._id}
                paper={p}
                onDownload={downloading === p._id ? () => {} : handleDownload}
              />
            ))}
          </div>
        )}
      </Card>

      {/* Pagination */}
      {meta.pages > 1 && (
        <Pagination page={meta.page} totalPages={meta.pages} onPageChange={setPage} />
      )}
    </div>
  );
}