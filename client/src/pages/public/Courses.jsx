import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { HiAcademicCap, HiDocumentText, HiBookOpen } from 'react-icons/hi';
import {
  Card,
  SearchBar,
  Spinner,
  EmptyState,
  Pagination,
  Badge,
  Button,
} from '@/components/ui';
import { coursesApi } from '@/api';

function CourseCard({ course }) {
  return (
    <Card>
      <div className="flex items-start gap-3 mb-3">
        <div className="w-11 h-11 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--brand-primary)] shrink-0">
          <HiAcademicCap className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-[var(--text-primary)] truncate">
            {course.title}
          </h3>
          {course.syllabusCode && (
            <p className="text-xs font-mono text-[var(--text-muted)]">{course.syllabusCode}</p>
          )}
        </div>
      </div>

      {course.subject && (
        <Badge variant="info" className="mb-3">{course.subject}</Badge>
      )}

      {course.description && (
        <p className="text-sm text-[var(--text-secondary)] mb-4 line-clamp-3">
          {course.description}
        </p>
      )}

      <div className="flex items-center gap-4 text-xs text-[var(--text-muted)] mb-4">
        <span className="inline-flex items-center gap-1">
          <HiDocumentText className="w-3.5 h-3.5" />
          {course.paperCount || 0} papers
        </span>
        <span className="inline-flex items-center gap-1">
          <HiBookOpen className="w-3.5 h-3.5" />
          {course.noteCount || 0} notes
        </span>
      </div>

      <Button
        to={`/papers?courseId=${course._id}`}
        variant="outline"
        size="sm"
        fullWidth
      >
        View papers
      </Button>
    </Card>
  );
}

export default function Courses() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['courses', 'public', { search, page }],
    queryFn: () => coursesApi.listPublic({ q: search, page, limit: 12 }),
  });

  const items = data?.data || [];
  const meta = data?.meta || { page: 1, pages: 1, total: 0 };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Courses</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            {meta.total} course{meta.total !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="w-full sm:w-80">
          <SearchBar
            value={search}
            onChange={(v) => { setSearch(v); setPage(1); }}
            placeholder="Search courses..."
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : items.length === 0 ? (
        <Card>
          <EmptyState
            icon={<HiAcademicCap className="w-6 h-6" />}
            title="No courses found"
            description="Try a different search term."
          />
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((c) => (
              <CourseCard key={c._id} course={c} />
            ))}
          </div>
          {meta.pages > 1 && (
            <Pagination page={meta.page} totalPages={meta.pages} onPageChange={setPage} />
          )}
        </>
      )}
    </div>
  );
}