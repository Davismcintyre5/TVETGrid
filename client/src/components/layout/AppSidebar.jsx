import { NavLink } from 'react-router-dom';
import {
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
} from 'react-icons/hi2';

const PRIMARY = [
  { to: '/app', label: 'Dashboard', icon: HiHome, exact: true },
  { to: '/app/courses', label: 'Courses', icon: HiAcademicCap },
  { to: '/app/papers', label: 'Past Papers', icon: HiDocumentText },
  { to: '/app/notes', label: 'Notes', icon: HiBookOpen },
];

const SECONDARY = [
  { to: '/ai', label: 'AI Tutor', icon: HiSparkles },
  { to: '/meetings', label: 'Meetings', icon: HiVideoCamera, exact: true },
  { to: '/meetings/invited-to', label: 'My Invites', icon: HiEnvelope },
];

const PERSONAL = [
  { to: '/app/bookmarks', label: 'Bookmarks', icon: HiBookmark },
  { to: '/app/attempts', label: 'Attempts', icon: HiChartBar },
  { to: '/app/progress', label: 'Progress', icon: HiArrowPath },
  { to: '/app/profile', label: 'Profile', icon: HiUser },
];

function NavItem({ to, label, icon: Icon, exact }) {
  return (
    <NavLink
      to={to}
      end={exact}
      className={({ isActive }) =>
        [
          'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
          isActive
            ? 'bg-[var(--sidebar-hover)] text-[var(--brand-primary)]'
            : 'text-[var(--text-secondary)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--text-primary)]',
        ].join(' ')
      }
    >
      <Icon className="w-5 h-5 shrink-0" />
      <span className="truncate">{label}</span>
    </NavLink>
  );
}

export default function AppSidebar() {
  return (
    <aside className="hidden md:flex flex-col w-60 shrink-0 border-r border-[var(--border-color)] bg-[var(--bg-primary)] min-h-[calc(100vh-4rem)] sticky top-16 self-start overflow-y-auto">
      <nav className="flex flex-col gap-1 p-3">
        {PRIMARY.map((item) => (
          <NavItem key={item.to} {...item} />
        ))}
      </nav>

      <div className="mx-3 border-t border-[var(--border-color)]" />

      <nav className="flex flex-col gap-1 p-3">
        {SECONDARY.map((item) => (
          <NavItem key={item.to} {...item} />
        ))}
      </nav>

      <div className="mx-3 border-t border-[var(--border-color)]" />

      <nav className="flex flex-col gap-1 p-3">
        {PERSONAL.map((item) => (
          <NavItem key={item.to} {...item} />
        ))}
      </nav>
    </aside>
  );
}