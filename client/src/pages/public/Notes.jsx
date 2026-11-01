import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import {
  HiBookOpen,
  HiDownload,
  HiDocumentText,
  HiSearch,
  HiFilter,
} from 'react-icons/hi';
import {
  Card,
  Button,
  SearchBar,
  Select,
  Spinner,
  EmptyState,
  Pagination,
  Badge,
  Modal,
} from '@/components/ui';
import { notesApi, coursesApi } from '@/api';
import { downloadFromUrl } from '@/utils/download';
import { formatBytes } from '@/utils/formatBytes';
import { useToast } from '@/context/ToastContext';

function NoteCard({ note, onOpen, onDownload }) {
  return (
    <div className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl p-5 hover:border-[var(--brand-primary)] hover:shadow-[var(--shadow-md)] transition-all flex flex-col">
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

      <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mb-4">
        <HiDocumentText className="w-3.5 h-3.5" />
        {note.fileCount || 0} file{note.fileCount !== 1 ? 's' : ''}
        {note.hasContent && (
          <span className="text-[var(--brand-primary)] font-medium ml-auto">Has notes</span>
        )}
      </div>

      <div className="mt-auto flex gap-2">
        <Button
          size="sm"
          variant="outline"
          fullWidth
          onClick={() => onOpen(note)}
        >
          View
        </Button>
        {note.fileCount > 0 && (
          <Button
            size="sm"
            variant="primary"
            icon={<HiDownload className="w-3.5 h-3.5" />}
            onClick={() => onDownload(note)}
            title="Download files"
          >
            <span className="hidden sm:inline">Download</span>
          </Button>
        )}
      </div>
    </div>
  );
}

function NoteDrawer({ note, onClose, onDownload }) {
  if (!note) return null;

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
                    icon={<HiDownload className="w-3.5 h-3.5" />}
                    onClick={() =>
                      onDownload(f.url, f.fileName || `note-file-${i + 1}`)
                    }
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
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToast();

  const [search, setSearch] = useState('');
  const [courseId, setCourseId] = useState(searchParams.get('courseId') || '');
  const [subjectId, setSubjectId] = useState(searchParams.get('subjectId') || '');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const params = {};
    if (courseId) params.courseId = courseId;
    if (subjectId) params.subjectId = subjectId;
    setSearchParams(params, { replace: true });
  }, [courseId, subjectId, setSearchParams]);

  const coursesQuery = useQuery({
    queryKey: ['notes', 'courses-filter'],
    queryFn: () => coursesApi.listPublic({ limit: 100 }),
    staleTime: 5 * 60 * 1000,
  });

  const subjectsQuery = useQuery({
    queryKey: ['notes', 'subjects-filter', courseId],
    queryFn: () => coursesApi.listPublicSubjects(courseId),
    enabled: !!courseId,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    setSubjectId('');
  }, [courseId]);

  const notesQuery = useQuery({
    queryKey: ['notes', 'public', { search, courseId, subjectId, page }],
    queryFn: () =>
      notesApi.listPublic({
        q: search || undefined,
        courseId: courseId || undefined,
        subjectId: subjectId || undefined,
        page,
        limit: 12,
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

  const items = notesQuery.data?.data || [];
  const meta = notesQuery.data?.meta || { page: 1, pages: 1, total: 0 };

  const openNote = async (note) => {
    try {
      const res = await notesApi.getPublic(note._id);
      setSelected(res?.data || res);
    } catch {
      setSelected(note);
    }
  };

  const handleNoteDownload = async (note) => {
    try {
      const res = await notesApi.getPublic(note._id);
      const full = res?.data || res;
      const files = full.files || [];
      if (files.length === 0) {
        toast.error('No files in this note');
        return;
      }
      for (const f of files) {
        await downloadFromUrl(f.url, f.fileName || 'note-file');
      }
      toast.success(`Downloaded ${files.length} file${files.length > 1 ? 's' : ''}`);
    } catch (err) {
      toast.error(err.message || 'Download failed');
    }
  };

  const handleFileDownload = async (url, fileName) => {
    try {
      await downloadFromUrl(url, fileName);
      toast.success('Download started');
    } catch (err) {
      toast.error(err.message || 'Download failed');
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
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Study Notes</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          {meta.total} note{meta.total !== 1 ? 's' : ''}
          {courseId && ' · filtered'}
        </p>
      </div>

      <Card>
        <div className="flex items-center gap-2 mb-3">
          <HiFilter className="w-4 h-4 text-[var(--text-muted)]" />
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
            onChange={(e) => handleCourseChange(e.target.value)}
            options={courseOptions}
          />
          <Select
            value={subjectId}
            onChange={(e) => handleSubjectChange(e.target.value)}
            options={subjectOptions}
            disabled={!courseId}
          />
        </div>

        {(courseId || subjectId || search) && (
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <span className="text-xs text-[var(--text-muted)]">Active:</span>
            {courseId && (
              <Badge variant="info">
                {courseOptions.find((c) => c.value === courseId)?.label}
                <button
                  onClick={() => handleCourseChange('')}
                  className="ml-1 hover:text-[var(--danger-text)]"
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
                >
                  ×
                </button>
              </Badge>
            )}
            <button
              onClick={() => {
                setCourseId('');
                setSubjectId('');
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

      {notesQuery.isLoading ? (
        <div className="flex justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : items.length === 0 ? (
        <Card>
          <EmptyState
            icon={<HiSearch className="w-6 h-6" />}
            title="No notes found"
            description="Try a different search or filter."
            action={{
              label: 'Clear filters',
              onClick: () => {
                setCourseId('');
                setSubjectId('');
                setSearch('');
                setPage(1);
              },
            }}
          />
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((n) => (
              <NoteCard
                key={n._id}
                note={n}
                onOpen={openNote}
                onDownload={handleNoteDownload}
              />
            ))}
          </div>
          {meta.pages > 1 && (
            <Pagination page={meta.page} totalPages={meta.pages} onPageChange={setPage} />
          )}
        </>
      )}

      <NoteDrawer
        note={selected}
        onClose={() => setSelected(null)}
        onDownload={handleFileDownload}
      />
    </div>
  );
}