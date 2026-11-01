import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import AppHeader from './AppHeader';
import AppSidebar from './AppSidebar';
import AppMobileNav from './AppMobileNav';

export default function AppLayout() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <AppHeader onMenuClick={() => setMobileOpen(true)} />

      <div className="flex-1 flex">
        <AppSidebar />

        <main className="flex-1 min-w-0">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
            <Outlet />
          </div>
        </main>
      </div>

      <AppMobileNav open={mobileOpen} onClose={() => setMobileOpen(false)} />
    </div>
  );
}