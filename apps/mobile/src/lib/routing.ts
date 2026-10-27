import { getPermissionsForRole, Permission, type Role } from '@smartschool/shared';

export type RouteName =
  | 'tabs'
  | 'account'
  | 'account-settings'
  | 'admin-dashboard'
  | 'academics'
  | 'student-details'
  | 'mark-management'
  | 'resource'
  | 'info'
  | 'teacher-portal'
  | 'teacher-classes'
  | 'teacher-students'
  | 'teacher-attendance'
  | 'attendance-mark'
  | 'teacher-assignments'
  | 'teacher-marks'
  | 'teacher-homework'
  | 'teacher-timetable'
  | 'teacher-profile'
  | 'teacher-messages'
  | 'parent-portal'
  | 'parent-attendance'
  | 'parent-timetable'
  | 'parent-results'
  | 'parent-invoices'
  | 'parent-homework'
  | 'parent-vehicle'
  | 'parent-syllabus'
  | 'parent-teachers'
  | 'parent-notices'
  | 'student-portal'
  | 'student-timetable'
  | 'student-results'
  | 'student-homework'
  | 'student-attendance'
  | 'student-profile'
  | 'notifications'
  | 'messages'
  | 'settings'
  | 'profile'
  | 'welcome'
  | 'login-admin'
  | 'login-teacher'
  | 'login-parent'
  | 'public-home'
  | 'public-about'
  | 'public-features'
  | 'public-modules'
  | 'public-plans'
  | 'public-faq'
  | 'public-contact';

export const LOGIN_ROUTES = {
  admin: 'login-admin',
  teacher: 'login-teacher',
  parent: 'login-parent',
} satisfies Record<'admin' | 'teacher' | 'parent', RouteName>;

/**
 * Screen names hosted by the authenticated bottom-tab navigator. The drawer
 * embeds this navigator, so any of these names is reached with
 * `navigate('tabs', { screen: <name> })`.
 */
export const TAB_ROUTE_NAMES = [
  'admin-dashboard',
  'teacher-portal',
  'parent-portal',
  'student-portal',
  'student-homework',
  'student-timetable',
  'student-results',
  'student-profile',
  'academics',
  'teacher-classes',
  'teacher-attendance',
  'parent-attendance',
  'parent-homework',
  'teacher-messages',
  'parent-invoices',
  'notifications',
  'profile',
  'account-settings',
] as const;

export type TabRouteName = (typeof TAB_ROUTE_NAMES)[number];

export function isTabRoute(route: RouteName): route is TabRouteName {
  return (TAB_ROUTE_NAMES as readonly string[]).includes(route);
}

/**
 * The best landing route for a role: the dedicated portal for teachers and
 * parents, the dashboard when the role may read reports, otherwise a personal
 * route it is guaranteed to be allowed to see.
 */
export function defaultRouteForRole(role: Role): RouteName {
  if (role === 'TEACHER') return 'teacher-portal';
  if (role === 'PARENT') return 'parent-portal';
  if (role === 'STUDENT') return 'student-portal';
  if (can(role, Permission.REPORT_READ)) return 'admin-dashboard';
  if (can(role, Permission.NOTIFICATION_READ)) return 'notifications';
  return 'profile';
}

function can(role: Role, permission: Permission): boolean {
  return getPermissionsForRole(role).includes(permission);
}
