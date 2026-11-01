import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  HiAcademicCap,
  HiDocumentText,
  HiBookOpen,
  HiArrowRight,
  HiSparkles,
  HiChevronDown,
  HiCheckCircle,
  HiOutlineQuestionMarkCircle,
} from 'react-icons/hi2';
import { HiSparkles as HiSparklesSolid } from 'react-icons/hi';
import { Button, Card, Spinner, Badge } from '@/components/ui';
import { coursesApi, papersApi } from '@/api';
import { useBranding } from '@/context/BrandingContext';

function StatCard({ label, value, icon: Icon, hint }) {
  return (
    <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-[var(--bg-tertiary)]">
      <div className="w-10 h-10 rounded-lg bg-[var(--bg-primary)] flex items-center justify-center text-[var(--brand-primary)] shrink-0">
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-[var(--text-primary)] leading-tight">{value}</p>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">{label}</p>
        {hint && <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{hint}</p>}
      </div>
    </div>
  );
}

function CourseTile({ course }) {
  return (
    <Link
      to={`/papers?courseId=${course._id}`}
      className="group block bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl p-5 hover:border-[var(--brand-primary)] hover:shadow-[var(--shadow-md)] transition-all h-full"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="w-10 h-10 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--brand-primary)]">
          <HiAcademicCap className="w-5 h-5" />
        </div>
        {course.syllabusCode && (
          <span className="text-xs font-mono text-[var(--text-muted)]">{course.syllabusCode}</span>
        )}
      </div>
      <h3 className="text-base font-semibold text-[var(--text-primary)] group-hover:text-[var(--brand-primary)] transition-colors line-clamp-1">
        {course.title}
      </h3>
      {course.subject && (
        <p className="text-xs text-[var(--text-muted)] mt-1">{course.subject}</p>
      )}
      {course.description && (
        <p className="text-sm text-[var(--text-secondary)] mt-3 line-clamp-2">{course.description}</p>
      )}
      <div className="flex items-center gap-3 mt-4 text-xs text-[var(--text-muted)]">
        <span>{course.paperCount || 0} papers</span>
        <span>·</span>
        <span>{course.noteCount || 0} notes</span>
      </div>
    </Link>
  );
}

function PaperRow({ paper }) {
  const label =
    paper.title ||
    `${paper.subject?.name || 'Paper'} · ${paper.year}${
      paper.paperNo ? ` · Paper ${paper.paperNo}` : ''
    }`;

  return (
    <Link
      to={`/papers?courseId=${paper.course?._id || ''}`}
      className="flex items-center gap-3 py-3 border-b border-[var(--border-color)] last:border-0 hover:bg-[var(--bg-secondary)] -mx-4 px-4 transition-colors"
    >
      <div className="w-8 h-8 rounded bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--brand-primary)] shrink-0">
        <HiDocumentText className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--text-primary)] truncate">{label}</p>
        <p className="text-xs text-[var(--text-muted)] truncate">
          {paper.course?.title} · {paper.year} · {paper.totalMarks} marks
        </p>
      </div>
      <HiArrowRight className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
    </Link>
  );
}

export default function Home() {
  const { branding } = useBranding();

  const coursesQuery = useQuery({
    queryKey: ['home', 'courses'],
    queryFn: () => coursesApi.listPublic({ limit: 3 }),
    staleTime: 5 * 60 * 1000,
  });

  const papersQuery = useQuery({
    queryKey: ['home', 'papers'],
    queryFn: () => papersApi.listPublic({ limit: 5 }),
    staleTime: 5 * 60 * 1000,
  });

  const notesQuery = useQuery({
    queryKey: ['home', 'notes-count'],
    queryFn: () => coursesApi.listPublic({ limit: 1 }),
    staleTime: 5 * 60 * 1000,
  });

  const courses = coursesQuery.data?.data || [];
  const papers = papersQuery.data?.data || [];
  const courseTotal = coursesQuery.data?.meta?.total || 0;
  const paperTotal = papersQuery.data?.meta?.total || 0;

  const noteTotal = courses.reduce((sum, c) => sum + (c.noteCount || 0), 0);

  return (
    <div className="space-y-16">
      {/* ─── Hero ───────────────────────────────────────── */}
      <section className="text-center max-w-3xl mx-auto py-4">
        <Badge variant="info" className="mb-4">
          <HiSparklesSolid className="w-3 h-3" />
          For TVET students
        </Badge>

        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[var(--text-primary)] leading-tight">
          Master your trade with{' '}
          <span className="text-[var(--brand-primary)]">{branding.appName || 'TVETGrid'}</span>
        </h1>

        <p className="text-base sm:text-lg text-[var(--text-secondary)] mt-4 max-w-2xl mx-auto">
          Past papers, study notes and an AI tutor — built for TVET students who want
          to pass their exams and excel in their trade.
        </p>

        <div className="flex items-center justify-center gap-3 mt-8 flex-wrap">
          <Button to="/papers" size="lg" icon={<HiDocumentText className="w-4 h-4" />}>
            Browse Papers
          </Button>
          <Button
            to="/courses"
            variant="outline"
            size="lg"
            icon={<HiAcademicCap className="w-4 h-4" />}
          >
            Explore Courses
          </Button>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-12 max-w-2xl mx-auto">
          <StatCard label="Courses" value={courseTotal} icon={HiAcademicCap} />
          <StatCard label="Papers" value={paperTotal} icon={HiDocumentText} />
          <StatCard label="Notes" value={noteTotal} icon={HiBookOpen} />
        </div>
      </section>

      {/* ─── Featured courses ───────────────────────────── */}
      <section>
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">Featured Courses</h2>
            <p className="text-sm text-[var(--text-muted)] mt-1">Start with what matters most</p>
          </div>
          <Link
            to="/courses"
            className="text-sm font-medium text-[var(--brand-primary)] hover:underline inline-flex items-center gap-1 shrink-0"
          >
            View all
            <HiArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {coursesQuery.isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : courses.length === 0 ? (
          <Card>
            <p className="text-sm text-[var(--text-muted)] text-center py-8">
              No courses published yet.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.map((c) => (
              <CourseTile key={c._id} course={c} />
            ))}
          </div>
        )}
      </section>

      {/* ─── Recent papers ──────────────────────────────── */}
      <section>
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">Recent Papers</h2>
            <p className="text-sm text-[var(--text-muted)] mt-1">Fresh from the archive</p>
          </div>
          <Link
            to="/papers"
            className="text-sm font-medium text-[var(--brand-primary)] hover:underline inline-flex items-center gap-1 shrink-0"
          >
            View all
            <HiArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {papersQuery.isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : papers.length === 0 ? (
          <Card>
            <p className="text-sm text-[var(--text-muted)] text-center py-8">
              No papers published yet.
            </p>
          </Card>
        ) : (
          <Card>
            {papers.map((p) => (
              <PaperRow key={p._id} paper={p} />
            ))}
          </Card>
        )}
      </section>

      {/* ─── Why TVETGrid ───────────────────────────────── */}
      <section>
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">Why students use {branding.appName || 'TVETGrid'}</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              icon: HiDocumentText,
              title: 'Real past papers',
              description:
                'Download official past papers from your course — no more hunting across WhatsApp groups.',
            },
            {
              icon: HiBookOpen,
              title: 'Concise notes',
              description:
                'Cheat sheets, summaries and revision guides written for TVET syllabi — not generic content.',
            },
            {
              icon: HiSparklesSolid,
              title: 'AI tutor',
              description:
                'Ask any question, get step-by-step explanations. Available 24 hours a day.',
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.title}>
                <div className="w-11 h-11 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--brand-primary)] mb-4">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-semibold text-[var(--text-primary)] mb-2">
                  {item.title}
                </h3>
                <p className="text-sm text-[var(--text-secondary)]">{item.description}</p>
              </Card>
            );
          })}
        </div>
      </section>

      {/* ─── AI Tutor CTA ───────────────────────────────── */}
      <section className="rounded-2xl bg-[var(--bg-tertiary)] p-8 sm:p-12 text-center">
        <div className="w-14 h-14 rounded-full bg-[var(--brand-primary)]/10 flex items-center justify-center mx-auto mb-4 text-[var(--brand-primary)]">
          <HiSparklesSolid className="w-7 h-7" />
        </div>
        <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Try the AI Tutor</h2>
        <p className="text-[var(--text-secondary)] mb-6 max-w-xl mx-auto">
          Get instant explanations, practice questions, and step-by-step help on any topic
          — 24 hours a day.
        </p>
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <Button to="/register" size="lg">
            Get started free
          </Button>
          <Button to="/about" variant="outline" size="lg">
            Learn more
          </Button>
        </div>
      </section>

      {/* ─── FAQ ────────────────────────────────────────── */}
      {branding.faq && branding.faq.length > 0 && (
        <section>
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">
              Frequently asked questions
            </h2>
            <p className="text-sm text-[var(--text-muted)] mt-2">
              Quick answers to the most common questions
            </p>
          </div>
          <div className="max-w-2xl mx-auto space-y-3">
            {branding.faq.map((item, i) => (
              <details
                key={i}
                className="group bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg overflow-hidden"
              >
                <summary className="cursor-pointer px-5 py-4 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] flex items-center justify-between gap-3">
                  {item.q}
                  <HiChevronDown className="w-4 h-4 text-[var(--text-muted)] group-open:rotate-180 transition-transform shrink-0" />
                </summary>
                <div className="px-5 pb-4 text-sm text-[var(--text-secondary)] border-t border-[var(--border-color)] pt-4 leading-relaxed">
                  {item.a}
                </div>
              </details>
            ))}
          </div>
          <div className="text-center mt-6">
            <Link
              to="/faq"
              className="text-sm font-medium text-[var(--brand-primary)] hover:underline inline-flex items-center gap-1"
            >
              <HiOutlineQuestionMarkCircle className="w-4 h-4" />
              See all FAQs
              <HiArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      )}

      {/* ─── Final CTA ──────────────────────────────────── */}
      <section className="text-center">
        <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-3">
          Ready to start?
        </h2>
        <p className="text-sm text-[var(--text-secondary)] mb-6 max-w-md mx-auto">
          Create a free account to bookmark papers, track your progress, and study with
          the AI tutor.
        </p>
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <Button to="/register" size="lg" icon={<HiCheckCircle className="w-4 h-4" />}>
            Create free account
          </Button>
          <Button to="/login" variant="outline" size="lg">
            Sign in
          </Button>
        </div>
      </section>
    </div>
  );
}