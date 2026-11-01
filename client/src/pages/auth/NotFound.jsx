import { Link } from 'react-router-dom';
import { HiOutlineQuestionMarkCircle } from 'react-icons/hi2';
import { HiArrowLeft, HiHome } from 'react-icons/hi';
import { Button } from '@/components/ui';

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center py-12 px-4">
      <div className="text-center max-w-md">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-muted)] mb-6">
          <HiOutlineQuestionMarkCircle className="w-10 h-10" />
        </div>

        <p className="text-sm font-mono text-[var(--text-muted)] mb-2">404</p>

        <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
          Page not found
        </h1>

        <p className="text-sm text-[var(--text-secondary)] mb-8">
          The page you&rsquo;re looking for doesn&rsquo;t exist or may have been moved.
        </p>

        <div className="flex items-center justify-center gap-2 flex-wrap">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--brand-primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <HiHome className="w-4 h-4" />
            Back to home
          </Link>
          <button
            type="button"
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--border-color)] text-[var(--text-secondary)] text-sm font-medium hover:bg-[var(--bg-secondary)] transition-colors"
          >
            <HiArrowLeft className="w-4 h-4" />
            Go back
          </button>
        </div>

        <div className="mt-8 pt-6 border-t border-[var(--border-color)]">
          <p className="text-xs text-[var(--text-muted)] mb-3">
            Looking for something specific?
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap text-sm">
            <Link
              to="/courses"
              className="text-[var(--brand-primary)] hover:underline"
            >
              Courses
            </Link>
            <span className="text-[var(--text-muted)]">·</span>
            <Link
              to="/papers"
              className="text-[var(--brand-primary)] hover:underline"
            >
              Past Papers
            </Link>
            <span className="text-[var(--text-muted)]">·</span>
            <Link
              to="/notes"
              className="text-[var(--brand-primary)] hover:underline"
            >
              Notes
            </Link>
            <span className="text-[var(--text-muted)]">·</span>
            <Link
              to="/help"
              className="text-[var(--brand-primary)] hover:underline"
            >
              Help
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}