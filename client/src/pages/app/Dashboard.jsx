import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  HiDocumentText,
  HiBookOpen,
  HiBookmark,
  HiChartBar,
  HiArrowPath,
  HiVideoCamera,
  HiArrowRight,
  HiAcademicCap,
  HiOutlineExclamationTriangle,
} from 'react-icons/hi2';
import { Card, Button, Spinner, Badge } from '@/components/ui';
import { dashboardApi } from '@/api';
import { useAuth } from '@/context/AuthContext';
import { formatDateTime } from '@/utils/formatDate';

function labelForStatus(s) {
  if (!s) return 'Unknown';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function StatCard({ label, value, icon: Icon, to, hint }) {
  const Wrapper = to ? Link : 'div';
  return (
    <Wrapper
      to={to}
      className="block bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl p-4 hover:border-[var(--brand-primary)] transition-colors"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="w-10 h-10 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--brand-primary)]">
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <p className="text-2xl font-bold text-[var(--text-primary)]">{value}</p>
      <p className="text-xs text-[var(--text-muted)] mt-0.5">{label}</p>
      {hint && <p className="text-[10px] text-[var(--text-muted)] mt-1">{hint}</p>}
    </Wrapper>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard', 'overview'],
    queryFn: async () => {
      const res = await dashboardApi.getOverview();
      return res?.data || res;
    },
    retry: 1,
  });

  useEffect(() => {
    if (data && !data.preferredCourse) {
      navigate('/app/choose-course', { replace: true });
    }
  }, [data, navigate]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <p className="text-sm text-[var(--danger-text)] text-center py-8">
          Could not load dashboard: {error.message}
        </p>
      </Card>
    );
  }

  if (!data) return null;

  const { preferredCourse, stats, upcomingMeetings } = data;

  if (!preferredCourse) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            Hi, {user?.name?.split(' ')[0] || 'there'} 👋
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Welcome back. Here&apos;s your study overview.
          </p>
        </div>
        {!data.user?.emailVerified && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--warning-bg)] text-[var(--warning-text)] text-sm border border-[var(--warning-border)]">
            <HiOutlineExclamationTriangle className="w-4 h-4 shrink-0" />
            <span>Email not verified</span>
            <Link to="/verify" className="underline font-medium ml-1">
              Verify
            </Link>
          </div>
        )}
      </div>

      {/* Preferred course card */}
      <Card>
        <div className="flex items-start gap-4 flex-wrap">
          <div className="w-14 h-14 rounded-xl bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--brand-primary)] shrink-0">
            <HiAcademicCap className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs uppercase tracking-wide text-[var(--text-muted)] mb-1">
              Your course
            </p>
            <h2 className="text-lg font-bold text-[var(--text-primary)] truncate">
              {preferredCourse.title}
            </h2>
            <div className="flex items-center gap-3 text-sm text-[var(--text-secondary)] mt-1 flex-wrap">
              {preferredCourse.subject && <span>{preferredCourse.subject}</span>}
              {preferredCourse.syllabusCode && (
                <>
                  <span>·</span>
                  <span className="font-mono text-xs">{preferredCourse.syllabusCode}</span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/app/choose-course')}
            >
              Switch course
            </Button>
            <Button
              variant="primary"
              size="sm"
              to="/app/papers"
              icon={<HiDocumentText className="w-4 h-4" />}
            >
              Open papers
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-5 pt-5 border-t border-[var(--border-color)]">
          <Link
            to="/app/papers"
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors"
          >
            <HiDocumentText className="w-5 h-5 text-[var(--brand-primary)]" />
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">
                {preferredCourse.paperCount || 0} papers
              </p>
              <p className="text-xs text-[var(--text-muted)]">Practice exams</p>
            </div>
          </Link>
          <Link
            to="/app/notes"
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors"
          >
            <HiBookOpen className="w-5 h-5 text-[var(--brand-primary)]" />
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">
                {preferredCourse.noteCount || 0} notes
              </p>
              <p className="text-xs text-[var(--text-muted)]">Study material</p>
            </div>
          </Link>
        </div>
      </Card>

      {/* Stats */}
      <div>
        <h2 className="text-base font-semibold text-[var(--text-primary)] mb-3">
          Your progress
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <StatCard
            label="Bookmarks"
            value={stats.bookmarks}
            icon={HiBookmark}
            to="/app/bookmarks"
          />
          <StatCard
            label="Attempts"
            value={stats.attempts}
            icon={HiChartBar}
            to="/app/attempts"
          />
          <StatCard
            label="Due revision"
            value={stats.dueRevision}
            icon={HiArrowPath}
            to="/app/progress"
            hint={stats.dueRevision > 0 ? 'Questions waiting' : 'All caught up'}
          />
        </div>
      </div>

      {/* Upcoming meetings */}
      <div>
        <div className="flex items-center justify-between gap-4 mb-3">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">
            Upcoming meetings
          </h2>
          <Link
            to="/meetings"
            className="text-sm font-medium text-[var(--brand-primary)] hover:underline inline-flex items-center gap-1"
          >
            View all
            <HiArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {upcomingMeetings?.length > 0 ? (
          <Card padding={false}>
            {upcomingMeetings.map((m) => (
              <Link
                key={m._id}
                to={`/meetings/${m._id}`}
                className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border-color)] last:border-0 hover:bg-[var(--bg-secondary)] transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--brand-primary)] shrink-0">
                  <HiVideoCamera className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                    {m.title}
                  </p>
                  <p className="text-xs text-[var(--text-muted)] truncate">
                    {m.course ? `${m.course} · ` : ''}
                    {formatDateTime(m.scheduledAt)}
                  </p>
                </div>
                <Badge
                  variant={
                    m.status === 'live'
                      ? 'danger'
                      : m.status === 'scheduled'
                      ? 'info'
                      : 'default'
                  }
                  dot
                  className={m.status === 'live' ? 'animate-pulse' : ''}
                >
                  {labelForStatus(m.status)}
                </Badge>
              </Link>
            ))}
          </Card>
        ) : (
          <Card>
            <p className="text-sm text-[var(--text-muted)] text-center py-6">
              No upcoming meetings.
            </p>
          </Card>
        )}
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-base font-semibold text-[var(--text-primary)] mb-3">
          Quick actions
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Link
            to="/ai"
            className="p-4 rounded-xl bg-[var(--bg-tertiary)] hover:opacity-90 transition-opacity"
          >
            <p className="text-sm font-medium text-[var(--text-primary)]">Ask AI tutor</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">24/7 help</p>
          </Link>
          <Link
            to="/app/papers"
            className="p-4 rounded-xl bg-[var(--bg-tertiary)] hover:opacity-90 transition-opacity"
          >
            <p className="text-sm font-medium text-[var(--text-primary)]">Practice paper</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">Test yourself</p>
          </Link>
          <Link
            to="/app/progress"
            className="p-4 rounded-xl bg-[var(--bg-tertiary)] hover:opacity-90 transition-opacity"
          >
            <p className="text-sm font-medium text-[var(--text-primary)]">Revision</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">{stats.dueRevision} due</p>
          </Link>
          <Link
            to="/app/profile"
            className="p-4 rounded-xl bg-[var(--bg-tertiary)] hover:opacity-90 transition-opacity"
          >
            <p className="text-sm font-medium text-[var(--text-primary)]">Profile</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">Manage account</p>
          </Link>
        </div>
      </div>
    </div>
  );
}