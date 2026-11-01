import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { HiAcademicCap, HiDocumentText, HiBookOpen } from 'react-icons/hi2';
import { Card, Button, Spinner, Badge } from '@/components/ui';
import { coursesApi } from '@/api';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import { parseApiError } from '@/utils/parseApiError';

export default function ChooseCourse() {
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { setUser, user } = useAuth();
  const [saving, setSaving] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['courses', 'all-for-picker'],
    queryFn: async () => {
      const res = await coursesApi.list({ limit: 100 });
      return res?.data || res;
    },
    staleTime: 5 * 60 * 1000,
  });

  const courses = Array.isArray(data) ? data : data?.data || [];

  const choose = async (course) => {
    setSaving(course._id);
    try {
      const res = await coursesApi.chooseCourse(course._id);
      const payload = res?.data || res;

      if (user) {
        setUser({
          ...user,
          courseIds: [...(user.courseIds || []), course._id],
          preferredCourseId: course._id,
        });
      }

      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['papers'] });
      queryClient.invalidateQueries({ queryKey: ['notes'] });

      toast.success(`Now studying ${payload.course?.title || course.title}`);
      navigate('/app', { replace: true });
    } catch (err) {
      toast.error(parseApiError(err).message);
    } finally {
      setSaving(null);
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
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[var(--bg-tertiary)] text-[var(--brand-primary)] mb-4">
          <HiAcademicCap className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Choose your course</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-2 max-w-md mx-auto">
          Pick the course you&apos;re studying. We&apos;ll show you papers, notes and content
          for this course. You can switch anytime.
        </p>
      </div>

      {courses.length === 0 ? (
        <Card>
          <p className="text-sm text-[var(--text-muted)] text-center py-8">
            No courses available yet. Check back soon.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {courses.map((c) => (
            <Card key={c._id}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="w-11 h-11 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--brand-primary)] shrink-0">
                  <HiAcademicCap className="w-5 h-5" />
                </div>
                {c.syllabusCode && (
                  <span className="text-xs font-mono text-[var(--text-muted)]">
                    {c.syllabusCode}
                  </span>
                )}
              </div>

              <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1">
                {c.title}
              </h3>
              {c.subject && (
                <Badge variant="info" className="mb-3">{c.subject}</Badge>
              )}

              {c.description && (
                <p className="text-sm text-[var(--text-secondary)] mb-3 line-clamp-2">
                  {c.description}
                </p>
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

              <Button
                variant="primary"
                size="sm"
                fullWidth
                onClick={() => choose(c)}
                loading={saving === c._id}
              >
                Select this course
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}