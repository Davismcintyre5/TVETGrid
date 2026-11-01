import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { HiAcademicCap, HiDocumentText, HiBookOpen, HiCheck } from 'react-icons/hi2';
import { Card, Button, Spinner, Badge, SearchBar } from '@/components/ui';
import { coursesApi } from '@/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { parseApiError } from '@/utils/parseApiError';

export default function Courses() {
  const navigate = useNavigate();
  const toast = useToast();
  const { user, setUser } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [switching, setSwitching] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['courses', 'all'],
    queryFn: async () => {
      const res = await coursesApi.list({ limit: 100 });
      return res?.data || res;
    },
  });

  const courses = Array.isArray(data) ? data : data?.data || [];
  const filtered = search
    ? courses.filter((c) =>
        `${c.title} ${c.subject || ''} ${c.syllabusCode || ''}`
          .toLowerCase()
          .includes(search.toLowerCase())
      )
    : courses;

  const setPreferred = async (courseId) => {
    setSwitching(courseId);
    try {
      await coursesApi.setPreferredCourse(courseId);
      if (user) setUser({ ...user, preferredCourseId: courseId });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['papers'] });
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      toast.success('Course switched');
      navigate('/app');
    } catch (err) {
      toast.error(parseApiError(err).message);
    } finally {
      setSwitching(null);
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
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Courses</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            {filtered.length} course{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="w-full sm:w-72">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search courses..."
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <p className="text-sm text-[var(--text-muted)] text-center py-8">
            No courses found.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => {
            const isPreferred = String(user?.preferredCourseId) === String(c._id);
            return (
              <Card key={c._id}>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="w-11 h-11 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--brand-primary)] shrink-0">
                    <HiAcademicCap className="w-5 h-5" />
                  </div>
                  {isPreferred && (
                    <Badge variant="success" dot>
                      Current
                    </Badge>
                  )}
                </div>

                <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1">
                  {c.title}
                </h3>
                {c.subject && (
                  <p className="text-xs text-[var(--text-muted)] mb-3">{c.subject}</p>
                )}

                <div className="flex items-center gap-3 text-xs text-[var(--text-muted)] mb-4">
                  <span className="inline-flex items-center gap-1">
                    <HiDocumentText className="w-3.5 h-3.5" />
                    {c.paperCount || 0} papers
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <HiBookOpen className="w-3.5 h-3.5" />
                    {c.noteCount || 0} notes
                  </span>
                </div>

                <div className="flex gap-2">
                  {isPreferred ? (
                    <>
                      <Button size="sm" variant="outline" to="/app/papers" fullWidth>
                        Papers
                      </Button>
                      <Button size="sm" variant="outline" to="/app/notes" fullWidth>
                        Notes
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      variant="primary"
                      fullWidth
                      onClick={() => setPreferred(c._id)}
                      loading={switching === c._id}
                    >
                      Switch to this
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}