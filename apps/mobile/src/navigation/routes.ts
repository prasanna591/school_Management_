/**
 * Route definitions for the mobile app.
 *
 * The route names mirror the paths the web app uses, adapted to React
 * Navigation's naming. Together they describe every screen the app can show
 * and which roles may open them.
 */
export const ROUTES = {
  /** Shared account page for roles without a dedicated profile tab. */
  account: 'account',
  public: {
    welcome: 'welcome',
    home: 'public-home',
    about: 'public-about',
    features: 'public-features',
    modules: 'public-modules',
    plans: 'public-plans',
    faq: 'public-faq',
    contact: 'public-contact',
    login: 'login-admin',
    loginTeacher: 'login-teacher',
    loginParent: 'login-parent',
  },
  admin: {
    /** The bottom-tab host that wraps Dashboard / Academics / Notifications / Profile. */
    tabs: 'tabs',
    dashboard: 'admin-dashboard',
    academics: 'academics',
    notifications: 'notifications',
    messages: 'messages',
    settings: 'settings',
    profile: 'profile',
    students: 'student-details',
    /** Exam + subject marks review/entry (Mark Management). */
    marks: 'mark-management',
    /** Generic, config-driven list screen (module key passed as a route param). */
    resource: 'resource',
    /** Small informational page (About, Help, Change password notice). */
    info: 'info',
  },
  teacher: {
    portal: 'teacher-portal',
    /** My Classes — the sections the teacher is allocated. */
    classes: 'teacher-classes',
    /** My Students — students across the teacher's sections. */
    students: 'teacher-students',
    /** Attendance summary for the teacher's own sections. */
    attendance: 'teacher-attendance',
    /** Attendance register editor (shared `/attendance/mark` equivalent). */
    attendanceMark: 'attendance-mark',
    /** Class–subject teaching allocations. */
    assignments: 'teacher-assignments',
    /** Exam results for the teacher's class levels. */
    marks: 'teacher-marks',
    /** Homework authored by the teacher. */
    homework: 'teacher-homework',
    /** Lesson plans authored/managed by the teacher. */
    lessonPlans: 'teacher-lesson-plans',
    /** Weekly grid + day-by-day teaching timetable. */
    timetable: 'teacher-timetable',
    /** Teacher employment profile. */
    profile: 'teacher-profile',
    /** Messages for the signed-in teacher. */
    messages: 'teacher-messages',
  },
  parent: {
    portal: 'parent-portal',
    timetable: 'parent-timetable',
    results: 'parent-results',
    invoices: 'parent-invoices',
    homework: 'parent-homework',
    vehicle: 'parent-vehicle',
    attendance: 'parent-attendance',
    syllabus: 'parent-syllabus',
    teachers: 'parent-teachers',
    notices: 'parent-notices',
  },
} as const;

export type Route =
  | typeof ROUTES.account
  | (typeof ROUTES.public)[keyof (typeof ROUTES.public)]
  | (typeof ROUTES.admin)[keyof (typeof ROUTES.admin)]
  | (typeof ROUTES.teacher)[keyof (typeof ROUTES.teacher)]
  | (typeof ROUTES.parent)[keyof (typeof ROUTES.parent)];

export const LOGIN_ROUTES = {
  admin: ROUTES.public.login,
  teacher: ROUTES.public.loginTeacher,
  parent: ROUTES.public.loginParent,
} as const;
