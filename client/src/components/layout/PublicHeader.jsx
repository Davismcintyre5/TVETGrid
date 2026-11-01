import { useState, useRef, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  HiBars3,
  HiXMark,
  HiSun,
  HiMoon,
  HiHome,
  HiAcademicCap,
  HiDocumentText,
  HiBookOpen,
  HiArrowRight,
  HiArrowRightOnRectangle,
} from 'react-icons/hi2';
import { Logo, Button, Avatar } from '@/components/ui';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { authStore } from '@/lib/auth';

const NAV = [
  { to: '/', label: 'Home', icon: HiHome, exact: true },
  { to: '/courses', label: 'Courses', icon: HiAcademicCap },
  { to: '/papers', label: 'Papers', icon: HiDocumentText },
  { to: '/notes', label: 'Notes', icon: HiBookOpen },
];

function navClass({ isActive }) {
  return [
    'relative text-base font-medium transition-colors px-4 py-2 rounded-lg',
    isActive
      ? 'text-[var(--brand-primary)] bg-[var(--sidebar-hover)]'
      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--sidebar-hover)]',
  ].join(' ');
}

export default function PublicHeader() {
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  const { isAuthenticated, user, logout } = useAuth();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  const isDark = theme === 'dark';

  // Token-based check — works even if AuthContext hasn't finished loading
  const hasToken = !!authStore.getAccessToken();

  useEffect(() => {
    const handleClick = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    };
    const handleKey = (e) => {
      if (e.key === 'Escape') {
        setMobileOpen(false);
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, []);

  const handleLogout = async () => {
    setUserMenuOpen(false);
    setMobileOpen(false);
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="sticky top-0 z-30 bg-[var(--bg-primary)]/95 backdrop-blur border-b border-[var(--border-color)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="h-16 flex items-center gap-3">
          {/* Left: mobile menu + logo */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              className="md:hidden p-2 -ml-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--sidebar-hover)]"
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? (
                <HiXMark className="w-6 h-6" />
              ) : (
                <HiBars3 className="w-6 h-6" />
              )}
            </button>
            
            {/* The Logo component now renders the large text next to the icon */}
            <Logo size="md" />
          </div>

          {/* Center nav */}
          <nav className="hidden md:flex flex-1 justify-center items-center gap-2">
            {NAV.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.exact} className={navClass}>
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* Right: actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 ml-auto md:ml-0 shrink-0">
            <button
              type="button"
              onClick={toggle}
              className="p-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--text-primary)]"
              aria-label={isDark ? 'Switch to light' : 'Switch to dark'}
            >
              {isDark ? <HiSun className="w-5 h-5" /> : <HiMoon className="w-5 h-5" />}
            </button>

            {hasToken ? (
              // ─── Authenticated (or token exists) ─────
              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate('/app')}
                  icon={<HiArrowRight className="w-4 h-4" />}
                >
                  <span className="hidden sm:inline text-sm font-semibold">Launch App</span>
                  <span className="sm:hidden text-sm font-semibold">App</span>
                </Button>

                {isAuthenticated && user && (
                  <div className="relative hidden sm:block" ref={userMenuRef}>
                    <button
                      type="button"
                      onClick={() => setUserMenuOpen((v) => !v)}
                      className="rounded-full hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-primary)]"
                      aria-haspopup="menu"
                      aria-expanded={userMenuOpen}
                      aria-label="Account menu"
                    >
                      <Avatar name={user.name} src={user.avatarUrl} size="md" />
                    </button>

                    {userMenuOpen && (
                      <div
                        role="menu"
                        className="absolute right-0 top-full mt-2 w-64 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl shadow-[var(--shadow-lg)] overflow-hidden animate-fade-in z-40"
                      >
                        <div className="px-4 py-3 border-b border-[var(--border-color)] flex items-center gap-3">
                          <Avatar name={user.name} src={user.avatarUrl} size="md" />
                          <div className="min-w-0">
                            <p className="text-base font-semibold text-[var(--text-primary)] truncate">
                              {user.name}
                            </p>
                            <p className="text-sm text-[var(--text-secondary)] truncate">
                              {user.email}
                            </p>
                          </div>
                        </div>
                        <nav className="py-1">
                          <Link
                            to="/app"
                            onClick={() => setUserMenuOpen(false)}
                            className="block px-4 py-2.5 text-base font-medium text-[var(--text-secondary)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--text-primary)]"
                          >
                            Dashboard
                          </Link>
                          <Link
                            to="/app/profile"
                            onClick={() => setUserMenuOpen(false)}
                            className="block px-4 py-2.5 text-base font-medium text-[var(--text-secondary)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--text-primary)]"
                          >
                            Profile
                          </Link>
                          <Link
                            to="/app/meetings"
                            onClick={() => setUserMenuOpen(false)}
                            className="block px-4 py-2.5 text-base font-medium text-[var(--text-secondary)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--text-primary)]"
                          >
                            Meetings
                          </Link>
                        </nav>
                        <div className="border-t border-[var(--border-color)] py-1">
                          <button
                            type="button"
                            onClick={handleLogout}
                            className="w-full flex items-center gap-2 px-4 py-2.5 text-base font-medium text-[var(--danger-text)] hover:bg-[var(--danger-bg)]"
                          >
                            <HiArrowRightOnRectangle className="w-5 h-5" />
                            Logout
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              // ─── Not authenticated — show auth buttons ─
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/login')}
                  className="hidden sm:inline-flex text-sm font-semibold"
                >
                  Login
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate('/register')}
                >
                  <span className="hidden sm:inline text-sm font-semibold">Register</span>
                  <span className="sm:hidden text-sm font-semibold">Sign up</span>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile nav drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t border-[var(--border-color)] bg-[var(--bg-primary)]">
          <nav className="px-4 py-3 flex flex-col gap-1">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.exact}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  [
                    'flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium',
                    isActive
                      ? 'bg-[var(--sidebar-hover)] text-[var(--brand-primary)]'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--sidebar-hover)]',
                  ].join(' ')
                }
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </NavLink>
            ))}

            {hasToken ? (
              <div className="pt-3 mt-2 border-t border-[var(--border-color)] flex flex-col gap-2">
                <Button
                  variant="primary"
                  size="md"
                  fullWidth
                  onClick={() => {
                    setMobileOpen(false);
                    navigate('/app');
                  }}
                  icon={<HiArrowRight className="w-4 h-4" />}
                >
                  Launch App
                </Button>
                {isAuthenticated && user && (
                  <div className="flex items-center gap-3 px-3 py-3">
                    <Avatar name={user.name} src={user.avatarUrl} size="md" />
                    <div className="min-w-0 flex-1">
                      <p className="text-base font-semibold text-[var(--text-primary)] truncate">
                        {user.name}
                      </p>
                      <p className="text-sm text-[var(--text-secondary)] truncate">
                        {user.email}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="p-2 rounded text-[var(--danger-text)] hover:bg-[var(--danger-bg)]"
                      aria-label="Logout"
                    >
                      <HiArrowRightOnRectangle className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="pt-3 mt-2 border-t border-[var(--border-color)] flex flex-col gap-2">
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => {
                    setMobileOpen(false);
                    navigate('/login');
                  }}
                >
                  Login
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => {
                    setMobileOpen(false);
                    navigate('/register');
                  }}
                >
                  Register
                </Button>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}