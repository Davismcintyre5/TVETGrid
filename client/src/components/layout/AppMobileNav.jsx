import { useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  HiXMark,
  HiHome,
  HiAcademicCap,
  HiDocumentText,
  HiBookOpen,
  HiSparkles,
  HiVideoCamera,
  HiEnvelope,
  HiBookmark,
  HiChartBar,
  HiArrowPath,
  HiUser,
  HiArrowRightOnRectangle,
  HiSun,
  HiMoon,
} from 'react-icons/hi2';
import { Logo, Avatar } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';

const SECTIONS = [
  {
    items: [
      { to: '/app', label: 'Dashboard', icon: HiHome, exact: true },
      { to: '/app/courses', label: 'Courses', icon: HiAcademicCap },
      { to: '/app/papers', label: 'Past Papers', icon: HiDocumentText },
      { to: '/app/notes', label: 'Notes', icon: HiBookOpen },
    ],
  },
  {
    items: [
      { to: '/ai', label: 'AI Tutor', icon: HiSparkles },
      { to: '/meetings', label: 'Meetings', icon: HiVideoCamera, exact: true },
      { to: '/meetings/invited-to', label: 'My Invites', icon: HiEnvelope },
    ],
  },
  {
    items: [
      { to: '/app/bookmarks', label: 'Bookmarks', icon: HiBookmark },
      { to: '/app/attempts', label: 'Attempts', icon: HiChartBar },
      { to: '/app/progress', label: 'Progress', icon: HiArrowPath },
      { to: '/app/profile', label: 'Profile', icon: HiUser },
    ],
  },
];

function NavItem({ to, label, icon: Icon, exact, onNavigate }) {
  return (
    <NavLink
      to={to}
      end={exact}
      onClick={onNavigate}
      className={({ isActive }) =>
        [
          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
          isActive
            ? 'bg-[var(--sidebar-hover)] text-[var(--brand-primary)]'
            : 'text-[var(--text-secondary)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--text-primary)]',
        ].join(' ')
      }
    >
      <Icon className="w-5 h-5 shrink-0" />
      {label}
    </NavLink>
  );
}

export default function AppMobileNav({ open, onClose }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const toast = useToast();
  const isDark = theme === 'dark';

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  const handleLogout = async () => {
    onClose();
    await logout();
    toast.success('Signed out');
    navigate('/login', { replace: true });
  };

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        role="dialog"
        aria-modal="true"
        className={[
          'fixed top-0 left-0 z-50 h-full w-72 max-w-[85vw] flex flex-col',
          'bg-[var(--bg-primary)] border-r border-[var(--border-color)]',
          'transform transition-transform duration-200 ease-out',
          open ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)] shrink-0">
          <Logo size="md" />
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--sidebar-hover)]"
            aria-label="Close menu"
          >
            <HiXMark className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {SECTIONS.map((section, idx) => (
            <div key={idx}>
              {idx > 0 && <div className="my-2 border-t border-[var(--border-color)]" />}
              {section.items.map((item) => (
                <NavItem key={item.to} {...item} onNavigate={onClose} />
              ))}
            </div>
          ))}
        </nav>

        <div className="border-t border-[var(--border-color)] p-3 space-y-3 shrink-0">
          <div className="flex items-center justify-between px-1">
            <span className="text-sm text-[var(--text-secondary)]">Theme</span>
            <button
              type="button"
              onClick={toggle}
              className="flex items-center gap-2 text-sm text-[var(--text-primary)] px-2 py-1 rounded-lg hover:bg-[var(--sidebar-hover)]"
            >
              {isDark ? <HiSun className="w-4 h-4" /> : <HiMoon className="w-4 h-4" />}
              {isDark ? 'Light' : 'Dark'}
            </button>
          </div>

          {user && (
            <div className="border-t border-[var(--border-color)] pt-3">
              <Link
                to="/app/profile"
                onClick={onClose}
                className="flex items-center gap-2 px-1 mb-2 hover:bg-[var(--sidebar-hover)] rounded-lg p-1"
              >
                <Avatar name={user.name} src={user.avatarUrl} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                    {user.name}
                  </p>
                  <p className="text-xs text-[var(--text-muted)] truncate">
                    {user.email}
                  </p>
                </div>
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[var(--danger-text)] hover:bg-[var(--danger-bg)]"
              >
                <HiArrowRightOnRectangle className="w-4 h-4" />
                Logout
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}