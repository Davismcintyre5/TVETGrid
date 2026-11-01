import { useLocation } from 'react-router-dom';
import { HiOutlineSparkles } from 'react-icons/hi';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui';

export default function ComingSoon() {
  const location = useLocation();

  return (
    <div className="min-h-[50vh] flex items-center justify-center py-16 px-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center">
          <HiOutlineSparkles className="w-8 h-8 text-[var(--brand-primary)]" />
        </div>

        <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
          Coming soon
        </h1>

        <p className="text-sm text-[var(--text-secondary)] mb-2">
          This page is being built.
        </p>

        <p className="text-xs text-[var(--text-muted)] font-mono mb-6">
          {location.pathname}
        </p>

        <div className="flex items-center justify-center gap-2">
          <Button variant="secondary" size="sm" to="/">
            Back to home
          </Button>
          <Button variant="primary" size="sm" to="/app">
            Go to dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}