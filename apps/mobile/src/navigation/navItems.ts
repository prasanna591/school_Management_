import { getPermissionsForRole, Permission, Role } from '@smartschool/shared';
import type { IconName } from '../components/Icon';
import { ROUTES } from './routes';

/**
 * One entry of the authenticated sidebar. `route` is the React Navigation route
 * name shown for the entry, and `params` carries the target when the entry
 * points inside the bottom-tab host (`tabs`) or at a config-driven resource.
 */
export interface NavItem {
  key: string;
  label: string;
  route: string;
  params?: Record<string, unknown>;
  permission?: Permission;
  /** When set, the role must hold at least one of these permissions. */
  anyPermission?: readonly Permission[];
  /** When set, only these roles see the item (used for portal-only pages). */
  roles?: readonly Role[];
  /**
   * When set, these roles never see the item even though they hold the
   * permission — used to hide generic modules in favour of the dedicated
   * role-scoped equivalents (e.g. `teacher-*` for teachers), mirroring the web
   * sidebar's `excludeRoles`.
   */
  excludeRoles?: readonly Role[];
}

/** Convenience: a module that opens inside the bottom-tab navigator. */
function tab(screen: string): Pick<NavItem, 'route' | 'params'> {
  return { route: ROUTES.admin.tabs, params: { screen } };
}

/** Convenience: a config-driven module list (see `lib/resources.ts`). */
function resource(key: string): Pick<NavItem, 'route' | 'params'> {
  return { route: ROUTES.admin.resource, params: { key } };
}

export const NAV_ITEMS: NavItem[] = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    ...tab(ROUTES.admin.dashboard),
    permission: Permission.REPORT_READ,
    excludeRoles: [Role.TEACHER],
  },
  {
    key: 'academics',
    label: 'Academics',
    ...tab(ROUTES.admin.academics),
  },
  {
    key: 'teacher-portal',
    label: 'My Dashboard',
    ...tab(ROUTES.teacher.portal),
    roles: [Role.TEACHER],
  },
  {
    key: 'parent-portal',
    label: 'My Children',
    ...tab(ROUTES.parent.portal),
    roles: [Role.PARENT],
  },
  {
    key: 'vehicle-details',
    label: 'Vehicle Details',
    ...resource('vehicles'),
    permission: Permission.TRANSPORT_READ,
  },
  {
    key: 'student-details',
    label: 'Student Details',
    route: ROUTES.admin.students,
    permission: Permission.STUDENT_READ,
    excludeRoles: [Role.TEACHER],
  },
  {
    key: 'student-marks',
    label: 'Student Marks',
    ...resource('exam-results'),
    permission: Permission.RESULT_READ,
    excludeRoles: [Role.TEACHER],
  },
  {
    key: 'mark',
    label: 'Mark Management',
    route: ROUTES.admin.marks,
    // Needs the exam list plus result access. Admins have `result:read` only
    // (read-only view); teachers and super admins also hold `result:manage`.
    permission: Permission.EXAM_READ,
    anyPermission: [Permission.RESULT_READ, Permission.RESULT_MANAGE],
    excludeRoles: [Role.TEACHER],
  },
  {
    key: 'admissions',
    label: 'Admissions',
    ...resource('admissions'),
    permission: Permission.ADMISSION_READ,
  },
  {
    key: 'requests',
    label: 'Requests',
    ...resource('service-requests'),
    permission: Permission.REQUEST_READ,
  },
  {
    key: 'teacher-details',
    label: 'Teacher Details',
    ...resource('teachers'),
    permission: Permission.TEACHER_MANAGE,
  },
  {
    key: 'parent-details',
    label: 'Parent Details',
    ...resource('guardians'),
    permission: Permission.PARENT_READ,
  },
  {
    key: 'class',
    label: 'Classes',
    ...resource('classes'),
    permission: Permission.CLASS_READ,
    excludeRoles: [Role.TEACHER],
  },
  {
    key: 'sections',
    label: 'Sections',
    ...resource('sections'),
    permission: Permission.CLASS_READ,
    excludeRoles: [Role.TEACHER],
  },
  {
    key: 'class-roster',
    label: 'Class Roster',
    ...resource('class-roster'),
    permission: Permission.CLASS_READ,
    excludeRoles: [Role.TEACHER],
  },
  {
    key: 'subject',
    label: 'Subjects',
    ...resource('subjects'),
    permission: Permission.SUBJECT_READ,
    excludeRoles: [Role.TEACHER],
  },
  {
    key: 'attendance',
    label: 'Attendance',
    ...resource('attendances'),
    permission: Permission.ATTENDANCE_READ,
    excludeRoles: [Role.TEACHER],
  },
  {
    key: 'homework',
    label: 'Homework',
    ...resource('homework'),
    permission: Permission.HOMEWORK_READ,
    excludeRoles: [Role.TEACHER],
  },
  {
    key: 'lesson-plans',
    label: 'Lesson Plans',
    ...resource('lesson-plans'),
    permission: Permission.LESSON_READ,
    // Teachers get the scoped `teacher-lesson-plans` page instead, so the
    // school-wide resource module is hidden from them — same pattern as the
    // other teacher-replaced modules above.
    excludeRoles: [Role.TEACHER],
  },
  {
    key: 'learning-content',
    label: 'Learning Content',
    ...resource('learning-content'),
    permission: Permission.CONTENT_READ,
  },
  {
    key: 'books',
    label: 'Books',
    ...resource('books'),
    permission: Permission.LIBRARY_READ,
  },
  {
    key: 'fee-desk',
    label: 'Fee Desk',
    ...resource('invoices'),
    permission: Permission.INVOICE_READ,
  },
  {
    key: 'timetable',
    label: 'Timetable',
    ...resource('timetable'),
    permission: Permission.TIMETABLE_READ,
    excludeRoles: [Role.TEACHER],
  },
  {
    key: 'notifications',
    label: 'Notifications',
    ...tab(ROUTES.admin.notifications),
    permission: Permission.NOTIFICATION_READ,
  },
  {
    key: 'messages',
    label: 'Messages',
    route: ROUTES.admin.messages,
    permission: Permission.MESSAGE_READ,
    // Teachers get the scoped `teacher-messages` page instead.
    excludeRoles: [Role.TEACHER],
  },
  {
    key: 'profile',
    label: 'Profile',
    ...tab(ROUTES.admin.profile),
    // Teachers get the dedicated employment profile instead (`teacher-profile`),
    // mirroring the web sidebar's "My Profile" entry.
    excludeRoles: [Role.TEACHER],
  },
  {
    key: 'settings',
    label: 'Settings',
    route: ROUTES.admin.settings,
    permission: Permission.SCHOOL_READ,
  },

  /* ---------------------------------------------------------------------- */
  /* Teacher-only, role-scoped pages. These replace the generic modules a      */
  /* teacher would otherwise be shown; the generic equivalents above are       */
  /* hidden with `excludeRoles: [Role.TEACHER]`, exactly like the web sidebar. */
  /* ---------------------------------------------------------------------- */
  {
    key: 'teacher-classes',
    label: 'My Classes',
    ...tab(ROUTES.teacher.classes),
    roles: [Role.TEACHER],
  },
  {
    key: 'teacher-students',
    label: 'My Students',
    route: ROUTES.teacher.students,
    roles: [Role.TEACHER],
    permission: Permission.STUDENT_READ,
  },
  {
    key: 'teacher-attendance',
    label: 'Attendance',
    ...tab(ROUTES.teacher.attendance),
    roles: [Role.TEACHER],
    permission: Permission.ATTENDANCE_READ,
  },
  {
    key: 'teacher-assignments',
    label: 'Assignments',
    route: ROUTES.teacher.assignments,
    roles: [Role.TEACHER],
  },
  {
    key: 'teacher-marks',
    label: 'Marks & Grades',
    route: ROUTES.teacher.marks,
    roles: [Role.TEACHER],
    permission: Permission.RESULT_READ,
  },
  {
    key: 'teacher-homework',
    label: 'Homework',
    route: ROUTES.teacher.homework,
    roles: [Role.TEACHER],
    permission: Permission.HOMEWORK_READ,
  },
  {
    key: 'teacher-lesson-plans',
    label: 'Lesson Plans',
    route: ROUTES.teacher.lessonPlans,
    roles: [Role.TEACHER],
    permission: Permission.LESSON_READ,
  },
  {
    key: 'teacher-messages',
    label: 'Messages',
    ...tab(ROUTES.teacher.messages),
    roles: [Role.TEACHER],
    permission: Permission.MESSAGE_READ,
  },
  {
    key: 'teacher-timetable',
    label: 'Timetable',
    route: ROUTES.teacher.timetable,
    roles: [Role.TEACHER],
    permission: Permission.TIMETABLE_READ,
  },
  {
    key: 'teacher-profile',
    label: 'My Profile',
    route: ROUTES.teacher.profile,
    roles: [Role.TEACHER],
  },
  // --- Parent portal -------------------------------------------------------
  // Every entry is parent-only and reads the scoped /parents/me/children/*
  // endpoints, so a parent can never reach another family's data. The
  // `Overview` entry already exists above as `parent-portal` ("My Children").
  {
    key: 'parent-attendance',
    label: 'Attendance',
    ...tab(ROUTES.parent.attendance),
    roles: [Role.PARENT],
  },
  {
    key: 'parent-homework',
    label: 'Homework',
    ...tab(ROUTES.parent.homework),
    roles: [Role.PARENT],
  },
  {
    key: 'parent-timetable',
    label: 'Timetable',
    route: ROUTES.parent.timetable,
    roles: [Role.PARENT],
  },
  {
    key: 'parent-results',
    label: 'Results',
    route: ROUTES.parent.results,
    roles: [Role.PARENT],
  },
  {
    key: 'parent-syllabus',
    label: 'Syllabus',
    route: ROUTES.parent.syllabus,
    roles: [Role.PARENT],
  },
  {
    key: 'parent-invoices',
    label: 'Fees & invoices',
    ...tab(ROUTES.parent.invoices),
    roles: [Role.PARENT],
  },
  {
    key: 'parent-teachers',
    label: 'Teachers',
    route: ROUTES.parent.teachers,
    roles: [Role.PARENT],
  },
  {
    key: 'parent-notices',
    label: 'Announcements',
    route: ROUTES.parent.notices,
    roles: [Role.PARENT],
  },
  {
    key: 'parent-vehicle',
    label: 'Transport',
    route: ROUTES.parent.vehicle,
    roles: [Role.PARENT],
  },
  {
    key: 'account',
    label: 'My account',
    route: ROUTES.account,
    roles: [Role.PARENT],
  },
];

export function can(role: Role, permission: Permission): boolean {
  return getPermissionsForRole(role).includes(permission);
}

export function navForRole(role: Role): NavItem[] {
  return NAV_ITEMS.filter((item) => {
    if (item.roles && !item.roles.includes(role)) return false;
    if (item.excludeRoles && item.excludeRoles.includes(role)) return false;
    if (item.permission && !can(role, item.permission)) return false;
    if (item.anyPermission && !item.anyPermission.some((permission) => can(role, permission))) {
      return false;
    }
    return true;
  });
}

/** Icon shown next to each sidebar entry, matching the web app's sidebar. */
export const NAV_ICONS: Record<string, IconName> = {
  dashboard: 'dashboard',
  academics: 'subject',
  'teacher-portal': 'home',
  'teacher-classes': 'class',
  'teacher-students': 'students',
  'teacher-attendance': 'attendance',
  'teacher-assignments': 'subject',
  'teacher-marks': 'marks',
  'teacher-homework': 'homework',
  'teacher-lesson-plans': 'lesson-plan',
  'teacher-messages': 'messages',
  'teacher-timetable': 'timetable',
  'teacher-profile': 'teacher',
  'parent-portal': 'home',
  'parent-attendance': 'attendance',
  'parent-homework': 'homework',
  'parent-timetable': 'timetable',
  'parent-results': 'marks',
  'parent-invoices': 'finance',
  'parent-syllabus': 'subject',
  'parent-teachers': 'teacher',
  'parent-notices': 'bell',
  'parent-vehicle': 'bus',
  'vehicle-details': 'bus',
  'student-details': 'students',
  admissions: 'admissions',
  requests: 'requests',
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
  profile: 'user',
  account: 'user',
  settings: 'settings',
  reports: 'reports',
};

/** The academic module keys shown on the Academics hub. */
export const ACADEMIC_MODULE_KEYS = [
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
] as const;

/** Sidebar sections, grouped the way the reference design lays them out. */
const NAV_SECTIONS: { title: string | null; keys: string[] }[] = [
  {
    title: 'Overview',
    keys: ['dashboard', 'teacher-portal', 'parent-portal'],
  },
  {
    // Parent-only section. Other roles never hold these keys, so their drawers
    // are unchanged and the section simply disappears for them.
    title: 'My Child',
    keys: [
      'parent-attendance',
      'parent-homework',
      'parent-timetable',
      'parent-results',
      'parent-syllabus',
      'parent-invoices',
      'parent-teachers',
      'parent-vehicle',
      'parent-notices',
    ],
  },
  {
    // Teacher-only. The section is skipped for every other role because none
    // of its keys survive `navForRole`, so admin/parent drawers are unchanged.
    title: 'Teaching',
    keys: [
      'teacher-classes',
      'teacher-students',
      'teacher-attendance',
      'teacher-assignments',
      'teacher-marks',
      'teacher-homework',
      'teacher-lesson-plans',
      'teacher-messages',
      'teacher-timetable',
    ],
  },
  {
    title: 'Academics',
    keys: [
      'student-details',
      'student-marks',
      'class',
      'sections',
      'subject',
      'attendance',
      'homework',
      'lesson-plans',
      'learning-content',
      'timetable',
    ],
  },
  {
    title: 'School Operations',
    keys: ['vehicle-details', 'admissions', 'messages'],
  },
  {
    title: 'Account',
    keys: ['teacher-profile', 'notifications', 'profile', 'account', 'settings'],
  },
];

/**
 * Entries that are also primary bottom tabs. They stay out of the drawer so the
 * menu never duplicates a tab the user already has one tap away.
 */
const PRIMARY_TAB_KEYS = new Set<string>([
  'dashboard',
  'teacher-portal',
  'parent-portal',
  'academics',
  'teacher-classes',
  'teacher-attendance',
  'teacher-messages',
  'parent-attendance',
  'parent-homework',
  'parent-invoices',
  'notifications',
  'profile',
]);

export interface NavGroup {
  title: string | null;
  items: NavItem[];
}

/** The academic modules the signed-in role may open (for the Academics hub). */
export function academicNavForRole(role: Role): NavItem[] {
  const keys = new Set<string>(ACADEMIC_MODULE_KEYS);
  return navForRole(role).filter((item) => keys.has(item.key));
}

/** Group the role's nav items into sidebar sections; leftovers under "More". */
export function groupNav(items: NavItem[]): NavGroup[] {
  const remaining = new Map(items.map((item) => [item.key, item]));
  // Never repeat a primary bottom-tab destination inside the drawer.
  PRIMARY_TAB_KEYS.forEach((key) => remaining.delete(key));
  const groups: NavGroup[] = [];

  for (const section of NAV_SECTIONS) {
    const groupItems = section.keys
      .map((key) => remaining.get(key))
      .filter((item): item is NavItem => Boolean(item));
    groupItems.forEach((item) => remaining.delete(item.key));
    if (groupItems.length > 0) {
      groups.push({ title: section.title, items: groupItems });
    }
  }

  // Any permitted module that is not part of the four main sections stays
  // reachable under "More" so no role loses access to an existing feature.
  if (remaining.size > 0) {
    groups.push({ title: 'More', items: [...remaining.values()] });
  }
  return groups;
}
