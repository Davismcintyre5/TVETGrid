import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  HiBars3,
  HiSun,
  HiMoon,
  HiUser,
  HiBookmark,
  HiChartBar,
  HiArrowPath,
  HiArrowRightStartOnRectangle,
  HiArrowRight,
  HiChevronDown,
  HiOutlineExclamationTriangle,
} from 'react-icons/hi2';
import { Logo, Avatar } from '@/components/ui';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

export default function AppHeader({ onMenuClick }) {
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  const { user, logout } = useAuth();
  const toast = useToast();

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const isDark = theme === 'dark';

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    toast.success('Signed out');
    navigate('/login', { replace: true });
  };

  const items = [
    { to: '/app/profile', label: 'Profile', icon: HiUser },
    { to: '/app/bookmarks', label: 'Bookmarks', icon: HiBookmark },
    { to: '/app/attempts', label: 'Attempts', icon: HiChartBar },
    { to: '/app/progress', label: 'Progress', icon: HiArrowPath },
  ];

  return (
    <header className="sticky top-0 z-30 bg-[var(--bg-primary)]/95 backdrop-blur border-b border-[var(--border-color)]">
      <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
        <div className="h-16 flex items-center gap-3 sm:gap-4">
          <button
            type="button"
            onClick={onMenuClick}
            className="md:hidden p-2 -ml-1 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--sidebar-hover)] shrink-0"
            aria-label="Open menu"
          >
            <HiBars3 className="w-6 h-6" />
          </button>

          <Logo size="md" />

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={toggle}
              className="p-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--text-primary)]"
              aria-label={isDark ? 'Switch to light' : 'Switch to dark'}
            >
              {isDark ? <HiSun className="w-5 h-5" /> : <HiMoon className="w-5 h-5" />}
            </button>

            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-lg hover:bg-[var(--sidebar-hover)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
              >
                <Avatar
                  name={user?.name || ''}
                  src={user?.avatarUrl}
                  size="sm"
                  className="shrink-0"
                />
                <div className="hidden sm:block text-left min-w-0">
                  <p className="text-base font-semibold text-[var(--text-primary)] truncate max-w-[140px]">
                    {user?.name || 'Account'}
                  </p>
                  <p className="text-sm text-[var(--text-secondary)] truncate max-w-[140px] leading-tight">
                    {user?.email || ''}
                  </p>
                </div>
                <HiChevronDown className="hidden sm:block w-5 h-5 text-[var(--text-muted)] shrink-0" />
              </button>

              {menuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-full mt-2 w-64 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl shadow-[var(--shadow-lg)] overflow-hidden animate-fade-in"
                >
                  <div className="px-4 py-3 border-b border-[var(--border-color)] flex items-center gap-3">
                    <Avatar
                      name={user?.name || ''}
                      src={user?.avatarUrl}
                      size="md"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-base font-semibold text-[var(--text-primary)] truncate">
                        {user?.name || 'Account'}
                      </p>
                      <p className="text-sm text-[var(--text-secondary)] truncate">
                        {user?.email || ''}
                      </p>
                    </div>
                  </div>

                  {user && !user.emailVerified && (
                    <div className="px-4 py-2.5 bg-[var(--warning-bg)] border-b border-[var(--warning-border)]">
                      <Link
                        to="/verify"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2 text-sm font-medium text-[var(--warning-text)]"
                      >
                        <HiOutlineExclamationTriangle className="w-4 h-4 shrink-0" />
                        <span className="flex-1">Verify your email</span>
                        <HiArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  )}

                  <nav className="py-1">
                    {items.map(({ to, label, icon: Icon }) => (
                      <Link
                        key={to}
                        to={to}
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 text-base font-medium text-[var(--text-secondary)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--text-primary)]"
                      >
                        <Icon className="w-5 h-5 shrink-0" />
                        {label}
                      </Link>
                    ))}
                  </nav>

                  <div className="border-t border-[var(--border-color)] py-1">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-3 text-base font-medium text-[var(--danger-text)] hover:bg-[var(--danger-bg)]"
                    >
                      <HiArrowRightStartOnRectangle className="w-5 h-5 shrink-0" />
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}