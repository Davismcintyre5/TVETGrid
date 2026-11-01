import { useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { HiArrowLeft } from 'react-icons/hi';
import { Logo } from '@/components/ui';
import { useBranding } from '@/context/BrandingContext';

export default function AuthLayout() {
  const location = useLocation();
  const { branding } = useBranding();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-secondary)] text-[var(--text-primary)]">
      <header className="p-4 sm:p-6 flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <HiArrowLeft className="w-4 h-4" />
          <span>Back to home</span>
        </Link>
        <Logo size="sm" showText={false} linkTo={null} />
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
              {branding?.appName || 'TVETGrid'}
            </h1>
          </div>
          <div className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl shadow-[var(--shadow-md)] p-6 sm:p-8">
            <Outlet />
          </div>
        </div>
      </main>

      {branding?.supportEmail && (
        <footer className="text-center text-xs text-[var(--text-muted)] px-4 py-6">
          Need help?{' '}
          <a
            href={`mailto:${branding.supportEmail}`}
            className="text-[var(--brand-primary)] hover:underline"
          >
            {branding.supportEmail}
          </a>
        </footer>
      )}
    </div>
  );
}