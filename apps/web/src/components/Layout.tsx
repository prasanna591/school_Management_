import { ROLE_LABELS, Role } from '@smartschool/shared';
import { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { initials } from '../lib/format';
import { navForRole, type NavItem } from '../nav';
import { Icon, type IconName } from './Icon';
import { NotificationBell } from './NotificationBell';
import { Toaster } from './Toaster';

const NAV_ICONS: Record<string, IconName> = {
  dashboard: 'dashboard',
  'vehicle-details': 'bus',
  'teacher-portal': 'home',
  'parent-portal': 'home',
  'parent-timetable': 'timetable',
  'parent-results': 'marks',
  'parent-invoices': 'finance',
  'parent-homework': 'homework',
  'parent-vehicle': 'bus',
  'parent-attendance': 'attendance',
  'parent-syllabus': 'subject',
  'parent-teachers': 'teacher',
  'parent-notices': 'bell',
  'teacher-classes': 'class',
  'teacher-students': 'students',
  'teacher-attendance': 'attendance',
  'teacher-assignments': 'subject',
  'teacher-marks': 'marks',
  'teacher-homework': 'homework',
  'teacher-timetable': 'timetable',
  'teacher-messages': 'messages',
  'teacher-notifications': 'bell',
  'teacher-profile': 'user',
  'student-details': 'students',
  admissions: 'admissions',
  requests: 'requests',
  'my-requests': 'requests',
  'student-marks': 'marks',
  mark: 'mark',
  'teacher-details': 'teacher',
  'parent-details': 'parents',
  class: 'class',
  sections: 'sections',
  'class-roster': 'roster',
  subject: 'subject',
  attendance: 'attendance',
  homework: 'homework',
  'lesson-plans': 'lesson-plan',
  'learning-content': 'learning-content',
  books: 'books',
  finance: 'finance',
  'fee-desk': 'finance',
  timetable: 'timetable',
  notifications: 'bell',
  messages: 'messages',
  settings: 'settings',
  reports: 'reports',
  'report-cards': 'reports',
};

const NAV_SECTIONS: { title: string | null; keys: string[] }[] = [
  { title: null, keys: ['dashboard', 'vehicle-details', 'teacher-portal', 'parent-portal', 'my-requests'] },
  {
    // Teacher-only navigation. These keys resolve to role-restricted NAV_ITEMS,
    // so the section stays invisible for every non-teacher role.
    title: 'Teaching',
    keys: [
      'teacher-classes',
      'teacher-students',
      'teacher-attendance',
      'teacher-assignments',
      'teacher-marks',
      'teacher-homework',
      'teacher-timetable',
    ],
  },
  {
    // Parent-only navigation. These keys resolve to role-restricted NAV_ITEMS,
    // so the section stays invisible for every non-parent role.
    title: 'My Child',
    keys: [
      'parent-attendance',
      'parent-homework',
      'parent-timetable',
      'parent-results',
      'parent-syllabus',
      'parent-invoices',
      'parent-teachers',
      'parent-notices',
      'parent-vehicle',
    ],
  },
  {
    title: 'Academics',
    keys: [
      'student-details',
      'student-marks',
      'mark',
      'class',
      'sections',
      'class-roster',
      'subject',
      'attendance',
      'homework',
      'lesson-plans',
      'learning-content',
      'timetable',
    ],
  },
  { title: 'People', keys: ['admissions', 'requests', 'teacher-details', 'parent-details'] },
  { title: 'Operations', keys: ['books', 'finance', 'fee-desk'] },
  { title: 'Reports', keys: ['reports', 'report-cards'] },
  { title: 'Communication', keys: ['notifications', 'messages'] },
  {
    // Teacher account nav (role-restricted items → invisible to other roles).
    title: 'My Space',
    keys: ['teacher-messages', 'teacher-notifications', 'teacher-profile'],
  },
  { title: 'System', keys: ['settings'] },
];

function groupNav(items: NavItem[]): { title: string | null; items: NavItem[] }[] {
  const remaining = new Map(items.map((item) => [item.key, item]));
  const groups: { title: string | null; items: NavItem[] }[] = [];

  for (const section of NAV_SECTIONS) {
    const groupItems = section.keys
      .map((key) => remaining.get(key))
      .filter((item): item is NavItem => Boolean(item));
    groupItems.forEach((item) => remaining.delete(item.key));
    if (groupItems.length > 0) groups.push({ title: section.title, items: groupItems });
  }

  if (remaining.size > 0) groups.push({ title: 'More', items: [...remaining.values()] });
  return groups;
}

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [navOpen, setNavOpen] = useState(false);
  const contentRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setNavOpen(false);
    contentRef.current?.scrollTo({ top: 0 });
  }, [location.pathname]);

  // Every role shares the same navy / teal palette. The `data-theme` attribute
  // is still set for the Teacher ("navy") and Parent ("parent") portals because
  // a few scoped rules in index.css (§2b / §2c) tune their hero and accents; it
  // is cleared on unmount or a role swap.
  const theme = user?.role === Role.TEACHER ? 'navy' : user?.role === Role.PARENT ? 'parent' : null;
  useEffect(() => {
    const root = document.documentElement;
    if (!theme) {
      delete root.dataset.theme;
      return;
    }
    root.dataset.theme = theme;
    return () => {
      delete root.dataset.theme;
    };
  }, [theme]);

  const items = useMemo(() => (user ? navForRole(user.role) : []), [user]);

  if (!user) return null;
  const groups = groupNav(items);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="app-shell">
      <aside className={`sidebar${navOpen ? ' sidebar--open' : ''}`}>
        <div className="brand">
          <span className="brand__mark">PSM</span>
          <span className="brand__text">PSM School Management</span>
        </div>

        <nav className="nav" aria-label="Main navigation">
          {groups.map((group, index) => (
            <div className="nav__section" key={group.title ?? `section-${index}`}>
              {group.title ? <span className="nav__section-label">{group.title}</span> : null}
              {group.items.map((item) => (
                <NavLink
                  key={item.key}
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) => `nav__link${isActive ? ' nav__link--active' : ''}`}
                  onClick={() => setNavOpen(false)}
                >
                  <Icon name={NAV_ICONS[item.key] ?? 'dashboard'} size={18} />
                  <span className="nav__link-label">{item.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar__footer">
          <div className="sidebar__user">
            <span className="avatar">{initials(user.firstName, user.lastName)}</span>
            <div className="sidebar__user-meta">
              <span className="sidebar__user-name">
                {user.firstName} {user.lastName}
              </span>
              <span className="sidebar__user-role">{ROLE_LABELS[user.role]}</span>
            </div>
          </div>
          <button type="button" className="btn btn--ghost btn--block sidebar__logout" onClick={handleLogout}>
            <Icon name="logout" size={16} />
            Sign out
          </button>
        </div>
      </aside>

      {navOpen ? (
        <button
          type="button"
          className="sidebar__backdrop"
          aria-label="Close navigation"
          onClick={() => setNavOpen(false)}
        />
      ) : null}

      <div className="main">
        <header className="topbar">
          <button
            type="button"
            className="topbar__menu"
            aria-label="Toggle navigation"
            aria-expanded={navOpen}
            onClick={() => setNavOpen((open) => !open)}
          >
            <span className="topbar__menu-bar" />
            <span className="topbar__menu-bar" />
            <span className="topbar__menu-bar" />
          </button>
          <div className="topbar__spacer" />
          <NotificationBell />
          <div className="topbar__user">
            <div className="topbar__meta">
              <span className="topbar__name">
                {user.firstName} {user.lastName}
              </span>
              <span className="topbar__role">{ROLE_LABELS[user.role]}</span>
            </div>
            <span className="avatar">{initials(user.firstName, user.lastName)}</span>
          </div>
        </header>
        <main className="content" ref={contentRef}>
          <Outlet />
        </main>
      </div>
      <Toaster />
    </div>
  );
}
