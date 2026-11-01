import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  HiBookOpen,
  HiDocumentText,
  HiArrowDownTray,
  HiMagnifyingGlass,
  HiFunnel,
  HiArrowRight,
} from 'react-icons/hi2';
import {
  Card,
  Button,
  SearchBar,
  Select,
  Spinner,
  EmptyState,
  Pagination,
  Modal,
} from '@/components/ui';
import { notesApi, coursesApi } from '@/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { downloadFromUrl } from '@/utils/download';
import { formatBytes } from '@/utils/formatBytes';

function NoteCard({ note, onOpen }) {
  return (
    <button
      onClick={() => onOpen(note)}
      className="text-left w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl p-5 hover:border-[var(--brand-primary)] hover:shadow-[var(--shadow-md)] transition-all flex flex-col"
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--brand-primary)] shrink-0">
          <HiBookOpen className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-[var(--text-primary)] truncate">
            {note.title}
          </h3>
          <p className="text-xs text-[var(--text-muted)] truncate">
            {note.course?.title}
            {note.subject?.name ? ` · ${note.subject.name}` : ''}
          </p>
        </div>
      </div>

      {note.description && (
        <p className="text-sm text-[var(--text-secondary)] mb-3 line-clamp-2">
          {note.description}
        </p>
      )}

      <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mt-auto">
        <HiDocumentText className="w-3.5 h-3.5" />
        {note.fileCount || 0} file{note.fileCount !== 1 ? 's' : ''}
        {note.hasContent && (
          <span className="text-[var(--brand-primary)] font-medium ml-auto inline-flex items-center gap-1">
            Read
            <HiArrowRight className="w-3 h-3" />
          </span>
        )}
      </div>
    </button>
  );
}

function NoteDrawer({ note, onClose }) {
  const toast = useToast();
  if (!note) return null;

  const handleFileDownload = async (url, fileName) => {
    try {
      await downloadFromUrl(url, fileName || 'note-file');
      toast.success('Download started');
    } catch (err) {
      toast.error(err.message || 'Download failed');
    }
  };

  return (
    <Modal open={!!note} onClose={onClose} title={note.title} size="xl">
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-[var(--text-muted)]">Course</p>
            <p className="text-[var(--text-primary)]">{note.course?.title || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--text-muted)]">Subject</p>
            <p className="text-[var(--text-primary)]">{note.subject?.name || '—'}</p>
          </div>
        </div>

        {note.description && (
          <p className="text-sm text-[var(--text-secondary)]">{note.description}</p>
        )}

        {note.bodyMd && (
          <div className="border border-[var(--border-color)] rounded-lg p-5 bg-[var(--bg-secondary)]">
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-[var(--text-secondary)] m-0 p-0 bg-transparent">
              {note.bodyMd}
            </pre>
          </div>
        )}

        {note.files?.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-2">
              Files ({note.files.length})
            </h4>
            <div className="space-y-2">
              {note.files.map((f, i) => (
                <div
                  key={f.publicId || i}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)]"
                >
                  <HiDocumentText className="w-4 h-4 text-[var(--brand-primary)] shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[var(--text-primary)] truncate">
                      {f.fileName || `File ${i + 1}`}
                    </p>
                    {f.size && (
                      <p className="text-xs text-[var(--text-muted)]">
                        {formatBytes(f.size)}
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    icon={<HiArrowDownTray className="w-3.5 h-3.5" />}
                    onClick={() => handleFileDownload(f.url, f.fileName)}
                  >
                    Download
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {!note.bodyMd && (!note.files || note.files.length === 0) && (
          <p className="text-sm text-[var(--text-muted)] text-center py-8">
            This note has no content yet.
          </p>
        )}
      </div>
    </Modal>
  );
}

export default function Notes() {
  const { user } = useAuth();
  const toast = useToast();

  const [search, setSearch] = useState('');
  const [courseId, setCourseId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);

  const effectiveCourseId = courseId || '';

  const coursesQuery = useQuery({
    queryKey: ['notes', 'courses-filter'],
    queryFn: async () => {
      const res = await coursesApi.list({ limit: 100 });
      return res?.data || res;
    },
    staleTime: 5 * 60 * 1000,
  });

  const subjectsQuery = useQuery({
    queryKey: ['notes', 'subjects-filter', effectiveCourseId],
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

  const notesQuery = useQuery({
    queryKey: ['notes', 'client', { search, effectiveCourseId, subjectId, page }],
    queryFn: async () => {
      const res = await notesApi.list({
        q: search || undefined,
        courseId: effectiveCourseId || undefined,
        subjectId: subjectId || undefined,
        page,
        limit: 12,
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

  const items = notesQuery.data?.data || notesQuery.data || [];
  const meta = notesQuery.data?.meta || { page: 1, pages: 1, total: 0 };

  const courseOptions = [
    { value: '', label: 'My course' },
    ...courses.map((c) => ({ value: c._id, label: c.title })),
  ];

  const subjectOptions = [
    { value: '', label: 'All subjects' },
    ...subjects.map((s) => ({ value: s._id, label: s.name })),
  ];

  const openNote = async (note) => {
    try {
      const res = await notesApi.get(note._id);
      setSelected(res?.data || res);
    } catch {
      toast.error('Could not load note');
    }
  };

  const clearFilters = () => {
    setSearch('');
    setCourseId('');
    setSubjectId('');
    setPage(1);
  };

  const hasActiveFilters = search || courseId || subjectId;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Study Notes</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          {meta.total} note{meta.total !== 1 ? 's' : ''}
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <SearchBar
            value={search}
            onChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
            placeholder="Search notes..."
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

      {notesQuery.isLoading ? (
        <div className="flex justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : items.length === 0 ? (
        <Card>
          <EmptyState
            icon={<HiMagnifyingGlass className="w-6 h-6" />}
            title="No notes found"
            description={
              hasActiveFilters
                ? 'Try a different search or clear your filters.'
                : 'No notes published for your course yet.'
            }
            action={
              hasActiveFilters
                ? { label: 'Clear filters', onClick: clearFilters }
                : undefined
            }
          />
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((n) => (
              <NoteCard key={n._id} note={n} onOpen={openNote} />
            ))}
          </div>
          {meta.pages > 1 && (
            <Pagination page={meta.page} totalPages={meta.pages} onPageChange={setPage} />
          )}
        </>
      )}

      <NoteDrawer note={selected} onClose={() => setSelected(null)} />
    </div>
  );
}