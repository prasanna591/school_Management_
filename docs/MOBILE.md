# Mobile Application Reference

**App:** `@smartschool/mobile` — Expo 52 + React Native 0.76 + TypeScript.
**Run:** `npx expo start` · **API base:** `EXPO_PUBLIC_API_BASE` (default `/api/v1`).

**Scale:** 5 navigators · 41 screens · 19 config-driven resource modules · 2 Jest suites.

---

## 1. Stack and structure

| Concern | Choice |
|---|---|
| Runtime | Expo 52 / React Native 0.76.9 |
| Navigation | React Navigation 6 — native stack, drawer, bottom tabs |
| Icons | `lucide-react-native` 1.57 |
| Graphics | `react-native-svg` 15.8, `expo-linear-gradient` 14 |
| Media | `expo-image-picker` 16, `expo-image-manipulator` 13 |
| Motion | `react-native-reanimated` 3.16, `react-native-gesture-handler` 2.20 |
| Realtime | `socket.io-client` 4.8 |
| Safe areas | `react-native-safe-area-context` 4.12 |
| Validation | `@smartschool/shared` Zod schemas |
| Tests | Jest 29 + `@testing-library/react-native` 12 + `jest-expo` |

```
apps/mobile/src/
├── App.tsx                    # providers + RootNavigator
├── theme.ts                   # colour, spacing, radius, typography tokens
├── navigation/
│   ├── routes.ts              # every route name, grouped by surface
│   ├── navItems.ts            # 46 nav entries + grouping + icons
│   ├── RootNavigator.tsx      # auth gate
│   ├── AuthNavigator.tsx      # signed-out stack
│   ├── PublicNavigator.tsx    # marketing stack
│   ├── MainNavigator.tsx      # authenticated drawer
│   └── MainTabs.tsx           # bottom tab host
├── screens/
│   ├── auth/                  # 1 screen
│   ├── public/                # 8 screens + shared sections module
│   ├── admin/                 # 10 screens
│   ├── teacher/               # 12 screens
│   └── parent/                # 10 screens
├── components/                # 17 components (13 top-level + 4 in sub-folders)
└── lib/                       # 20 modules
```

### 1.1 Provider stack

```
App.tsx
└── SafeAreaProvider
    └── AuthProvider           # session restore, sign-in/out, token refresh
        └── SettingsProvider   # school settings (currency, timezone)
            └── RealtimeProvider  # socket, unread counter
                └── RootNavigator
```

### 1.2 Root navigator

`RootNavigator` shows a full-screen `ActivityIndicator` while the session is being
restored, then branches:

- **No session → `AuthNavigator`** — welcome screen, public marketing stack, and one
  sign-in screen per portal.
- **Session → `MainNavigator`** — the role-filtered drawer.

The session restore is capped at **8 seconds** (`SESSION_RESTORE_TIMEOUT_MS`) so an
unreachable API cannot leave the user on a loading screen.

---

## 2. Navigation

### 2.1 Public stack (`AuthNavigator`)

| Route | Screen | Purpose |
|---|---|---|
| `welcome` | `WelcomeScreen` | Branded welcome with Login / Register actions (469 lines — gradient hero, feature highlights) |
| `public` | `PublicNavigator` | Nested marketing stack |
| `login-admin` | `LoginScreen portal="admin"` | Admin sign-in → `POST /auth/login/admin` |
| `login-teacher` | `LoginScreen portal="teacher"` | Teacher sign-in → `POST /auth/login/teacher` |
| `login-parent` | `LoginScreen portal="parent"` | Parent sign-in → `POST /auth/login/parent` |
| `login-student` | `LoginScreen portal="student"` | Student sign-in → `POST /auth/login/student` |

### 2.2 Marketing stack (`PublicNavigator`)

| Route | Screen |
|---|---|
| `public-home` | `PublicHomeScreen` |
| `public-about` | `PublicAboutScreen` |
| `public-features` | `PublicFeaturesScreen` |
| `public-modules` | `PublicModulesScreen` |
| `public-plans` | `PublicPlansScreen` |
| `public-faq` | `PublicFaqScreen` |
| `public-contact` | `PublicContactScreen` |

Each is wrapped in a `ScrollView` (React Navigation has no scroll container of its own)
and every page except the home screen exposes a **Sign in** action in the header.

### 2.3 Bottom tabs (`MainTabs`)

| Tab | Route | Screen | Gate |
|---|---|---|---|
| Dashboard | `admin-dashboard` | `AdminDashboardScreen` | `REPORT_READ`, not `TEACHER` |
| Dashboard | `student-portal` | `StudentHomeScreen` | `STUDENT` role |
| Academics | `academics` | `AcademicsScreen` | shown when the role has ≥ 1 academic module |
| Notifications | `notifications` | `AdminNotificationsScreen` | `NOTIFICATION_READ`, live unread badge |
| Profile | `profile` | `AdminProfileScreen` | always available |

The tab bar is sized manually (`58 + insets.bottom`) so the labels clear Android's
navigation bar; the unread badge shows `99+` past 99.

`AcademicsScreen` is a searchable index of the academic modules the signed-in role is
allowed to open. It reuses `academicNavForRole()`, so the hub and the drawer can never
drift apart.

### 2.4 Drawer (`MainNavigator`)

The drawer's initial route is `drawerInitialRouteForRole(user.role)` — the teacher
portal for teachers, the parent portal for parents, the tab host for everyone else.
Its content is custom: a profile header (avatar, name, role), the grouped navigation, and
a sign-out button that confirms with an `Alert`.

### 2.5 Drawer groups

| Group | Items |
|---|---|
| **Overview** | Dashboard, My Dashboard (teacher), My Children (parent), My Dashboard (student) |
| **My Child** | Attendance, Homework, Timetable, Results, Syllabus, Fees & invoices, Teachers, Transport, Announcements |
| **Teaching** | My Classes, My Students, Attendance, Assignments, Marks & Grades, Homework, Lesson Plans, Messages, Timetable |
| **Academics** | Student Details, Student Marks, Classes, Sections, Subjects, Attendance, Homework, Lesson Plans, Learning Content, Timetable |
| **My School** | Attendance, Homework, Timetable, Results, My Profile (student) |
| **School Operations** | Vehicle Details, Admissions, Messages |
| **Account** | My Profile, Notifications, Profile, Settings |
| **More** | Any permitted module not in the sections above |

The `academics` tab is deliberately omitted from the drawer (`PRIMARY_TAB_KEYS`) so the
menu never duplicates a destination already one tap away.

### 2.6 Nav filtering

`navItems.ts` declares **46 navigation entries** with `permission`, `anyPermission`, `roles` and
`excludeRoles` gates, exactly mirroring the web sidebar. `navForRole(role)` applies them
in order:

1. `roles` allow-list
2. `excludeRoles` deny-list
3. `permission` check
4. `anyPermission` check (at least one)

`NAV_ICONS` maps every key to a `lucide-react-native` icon.

---

## 3. Screens

### 3.1 Auth (1)

| Screen | Purpose |
|---|---|
| `LoginScreen` | Email + password, one variant per portal. Portal-specific copy, error states for "wrong portal" and "invalid credentials", a "Contact your school administrator to reset your password" hint, and a link to explore the public site. |

### 3.2 Public (8)

| Screen | Purpose |
|---|---|
| `WelcomeScreen` | Branded gradient hero, Login / Register, product highlights |
| `PublicHomeScreen` | Marketing home — hero, module highlights, CTA |
| `PublicAboutScreen` | About the product |
| `PublicFeaturesScreen` | Feature list |
| `PublicModulesScreen` | Module catalogue |
| `PublicPlansScreen` | Pricing plans ("Most popular" highlighted plan) |
| `PublicFaqScreen` | FAQ |
| `PublicContactScreen` | Contact form → `POST /contact`, with a "Thank you — your message is on its way" confirmation state and a "Talk to a human" option |

`screens/public/sections.tsx` holds the shared long-form section primitives so the mobile
marketing pages reuse the same content model as the web site.

### 3.3 Admin (10)

| Screen | Route | Purpose |
|---|---|---|
| `AdminDashboardScreen` | `admin-dashboard` | The university dashboard (752 lines): stat cards, attendance, fee collection, marks trend, admissions, activity feed, quick actions, "View Details" / "View All" deep links, and a "Try again" error state. |
| `AcademicsScreen` | `academics` | Searchable hub of academic modules |
| `AdminNotificationsScreen` | `notifications` | Notification feed with "Mark read", "Mark all read" and "Delete" |
| `AdminMessagesScreen` | `messages` | Conversation list and thread view |
| `AdminProfileScreen` | `profile` | Account details and **Logout** |
| `AdminSettingsScreen` | `settings` | School details, timezone, currency |
| `StudentDetailsScreen` | `student-details` | Student directory with detail drill-down |
| `MarkManagementScreen` | `mark-management` | Exam + subject marks review and entry; flags "This exam is not linked to a class level" and shows per-student "Recorded" state |
| `ResourceListScreen` | `resource` | Generic config-driven list; the module key arrives as a route param |
| `InfoScreen` | `info` | Small informational page (About, Help, change-password notice) |

### 3.4 Teacher (12)

| Screen | Route | Purpose |
|---|---|---|
| `TeacherPortalScreen` | `teacher-portal` | Teaching overview: today's classes, pinned items, quick links to the full timetable |
| `TeacherClassesScreen` | `teacher-classes` | The sections the teacher is allocated to, with subjects per section ("No subjects assigned" empty state) |
| `TeacherStudentsScreen` | `teacher-students` | Students across those sections, with roll numbers |
| `TeacherAttendanceScreen` | `teacher-attendance` | Attendance summary for the teacher's own sections |
| `TeacherAttendanceMarkScreen` | `attendance-mark` | The attendance register editor — one student per row, status control, "Jump to today", "All present", "Recorded" confirmation (659 lines) |
| `TeacherAssignmentsScreen` | `teacher-assignments` | Class–subject allocations |
| `TeacherMarksScreen` | `teacher-marks` | Marks & grades for the teacher's classes: student table, subject-wise average, average by exam over time (834 lines) |
| `TeacherHomeworkScreen` | `teacher-homework` | Homework authored by the teacher |
| `TeacherLessonPlanScreen` | `teacher-lesson-plans` | Lesson plans; read-only when created by another teacher (685 lines) |
| `TeacherTimetableScreen` | `teacher-timetable` | Weekly grid of the teacher's own classes |
| `TeacherMessagesScreen` | `teacher-messages` | Threaded messaging with a student picker scoped to the teacher's sections ("No students are assigned to your sections yet.") |
| `TeacherProfileScreen` | `teacher-profile` | Employment profile and account details |

Shared helpers: `components/teacher/teacherUi.tsx` (617 lines of teacher-specific cards
and rows), `components/teacher/teacherForm.tsx` (teacher form controls), and
`components/teacher/TeacherTimetableViews.tsx` (week grid + day list).

### 3.5 Parent (10)

| Screen | Route | Purpose |
|---|---|---|
| `ParentPortalScreen` | `parent-portal` | Children at a glance, with per-child attendance, results, invoices and homework |
| `ParentAttendanceScreen` | `parent-attendance` | Daily and monthly attendance history for the child |
| `ParentHomeworkScreen` | `parent-homework` | Homework assigned to the child's section |
| `ParentTimetableScreen` | `parent-timetable` | The child's weekly timetable |
| `ParentResultsScreen` | `parent-results` | Published exam marks |
| `ParentSyllabusScreen` | `parent-syllabus` | Syllabus units and completion status |
| `ParentInvoicesScreen` | `parent-invoices` | Invoices plus a payments list |
| `ParentTeachersScreen` | `parent-teachers` | The child's teachers with a **Message** action that opens a thread to that teacher |
| `ParentNoticesScreen` | `parent-notices` | School announcements |
| `ParentVehicleScreen` | `parent-vehicle` | Transport subscription, route, assigned vehicle ("No vehicle has been assigned to this route yet."), driver and route stops |

`components/ParentChildShell.tsx` is the shared child-picker shell, and
`components/parent/parentUi.tsx` (924 lines) holds the parent-specific cards.

All parent data comes from the scoped `/parents/me/children/:studentId/*` endpoints, so a
parent can never read another family's data.

### 3.6 Student (6)

| Screen | Route | Purpose |
|---|---|---|
| `StudentHomeScreen` | `student-portal` | Student overview: name, class, attendance stat card and quick links |
| `StudentAttendanceScreen` | `student-attendance` | Daily and monthly attendance history for the student |
| `StudentHomeworkScreen` | `student-homework` | Homework assigned to the student's section, with submission status |
| `StudentTimetableScreen` | `student-timetable` | The student's weekly timetable, grouped by day |
| `StudentResultsScreen` | `student-results` | Published exam marks for the student |
| `StudentProfileScreen` | `student-profile` | Student profile, admission/roll details and linked guardian |

All student data comes from the scoped `/students/me/*` endpoints, so a student can never read
another student's records. Results are shown only for published exams.

---

## 4. Config-driven resource modules

`lib/resources.ts` declares **19 modules**. Each config carries a `key`, `title`,
`subtitle`, `path`, `icon`, `searchable` flag and a list of columns (each column is a
label plus a getter that tolerates several response shapes).

| # | Key | Title | API path | Columns | Search |
|---|---|---|---|---|---|
| 1 | `audit-logs` | Recent Activity | `/audit-logs` | Action, Entity, User, When | — (endpoint has no `search`) |
| 2 | `vehicles` | Vehicle Details | `/vehicles` | Plate, Model, Capacity, Status | ✓ |
| 3 | `exam-results` | Student Marks | `/exam-results` | Student, Exam, Marks, Grade | ✓ |
| 4 | `exams` | Mark Management | `/exams` | Exam, Type, Date | ✓ |
| 5 | `classes` | Classes and Sections | `/classes` | Class, Level, Sections, Students | ✓ |
| 6 | `sections` | Sections | `/sections` | Section, Class, Students | ✓ |
| 7 | `class-roster` | Class Roster | `/classes/roster` | Class, Level, Sections, Teacher, Students | — |
| 8 | `subjects` | Subjects | `/subjects` | Subject, Code, Credits | ✓ |
| 9 | `attendances` | Attendance | `/attendances` | Date, Student, Section, Status | — |
| 10 | `homework` | Homework | `/homework` | Title, Subject, Section, Teacher, Due | ✓ |
| 11 | `lesson-plans` | Lesson Plans | `/lesson-plans` | Title, Subject, Class, Planned, Status | ✓ |
| 12 | `learning-content` | Learning Content | `/learning-content` | Title, Type, Subject, Class, Created | ✓ |
| 13 | `timetable` | Timetable | `/timetable` | Day, Time, Subject, Section, Teacher, Room | — |
| 14 | `admissions` | Admissions | `/admissions` | Applicant, Guardian, Phone, Class, Status | ✓ |
| 15 | `service-requests` | Requests | `/service-requests` | Requester, Type, Title, Status | ✓ |
| 16 | `teachers` | Teacher Details | `/teachers` | Teacher, Employee No, Email, Status | ✓ |
| 17 | `guardians` | Parent Details | `/guardians` | Name, Phone, Email, Children | ✓ |
| 18 | `books` | Books | `/books` | Title, Author, ISBN, Copies | ✓ |
| 19 | `invoices` | Fee Desk | `/invoices` | Invoice No, Student, Total, Balance, Status | ✓ |

`resourceConfig(key)` resolves a module by key; `ResourceListScreen` renders it with the
shared `DataList` component (pull-to-refresh, paging, empty and error states).

The mobile app is **read-mostly for these modules** — the generic list is for browsing.
Creation and editing happen on the dedicated screens (marks entry, attendance marking,
messages, settings, profile).

---

## 5. Shared components

| Component | Purpose |
|---|---|
| `Layout` | Screen chrome — header, scroll container, bottom inset handling, toaster |
| `ui.tsx` | Buttons, cards, chips, badges, `PageHeader`, `EmptyState`, loaders, "Try again" |
| `DataList.tsx` | Generic paged list with search field, pull-to-refresh, empty/error states |
| `Charts.tsx` | SVG chart primitives (bars, lines, rings) for the dashboard |
| `TimetableViews.tsx` | Week grid / day list renderers (admin) |
| `Icon.tsx` | Icon registry over `lucide-react-native` |
| `illustrations.tsx` | Inline SVG illustrations for empty states |
| `NotificationBell.tsx` | Bell with the live unread count |
| `RealtimeProvider.tsx` | Socket lifecycle, event bus, unread counter |
| `Toaster.tsx` | Toast notifications with a dismiss action |
| `ErrorBoundary.tsx` | Render-error boundary ("Something went wrong") |
| `StatusBarTone.tsx` | Status-bar colour per surface |
| `ParentChildShell.tsx` | Shared child picker for the parent portal |
| `parent/parentUi.tsx` | Parent-specific cards and rows |
| `teacher/teacherUi.tsx` | Teacher-specific cards and rows |
| `teacher/teacherForm.tsx` | Teacher-specific form controls |
| `teacher/TeacherTimetableViews.tsx` | Teacher week grid and day list |

---

## 6. Library modules (`src/lib`)

| Module | Purpose |
|---|---|
| `api.ts` | Fetch wrapper, `ApiError`, `ListMeta`, bearer token, refresh-and-retry |
| `auth.tsx` | `AuthProvider`, `useAuth`, session restore with an 8 s timeout, sign-in/out |
| `settings.tsx` | School settings context (currency, timezone) |
| `realtime.ts` / `socket.ts` | Socket client, typed events, reconnect |
| `permissions.ts` | `can(role, permission)` |
| `routing.ts` | `defaultRouteForRole`, `drawerInitialRouteForRole`, `isTabRoute` |
| `resources.ts` | The 19 module configs and `resourceConfig()` |
| `form.ts` | Field definitions and shared Zod validation |
| `options.ts` | Async option loaders |
| `useAsync.ts` | Data-fetching hook with loading/error/refetch |
| `useReveal.ts` | Staggered reveal animation helper |
| `format.ts` | Dates, currency, `humanize`, `initials` |
| `attendanceTracker.ts` | Attendance aggregation and indicator bands |
| `examMarks.ts` | Grade derivation, percentage, pass/fail |
| `messages.ts` | Conversation threading |
| `timetable.ts` | Slot maths and week assembly |
| `teacherScope.ts` | Resolves the teacher's sections, subjects and students |
| `activities.ts` | Activity-feed building |
| `publicContent.ts` | Marketing content model |

---

## 7. Design system

`theme.ts` is the single source of truth for tokens.

| Token group | Values |
|---|---|
| Surfaces | `background #f4f2fb`, `surface #ffffff`, `surfaceMuted #f6f4fd` |
| Brand | `primary #6d28d9`, `primaryDark #4c1d95`, `primaryLight #ede9fe`, `primarySoft #f5f3ff` |
| Gradient | `['#7c3aed', '#5b21b6']` — welcome banner and hero surfaces |
| Text | `text #1e293b`, `textMuted #64748b`, `textFaint #94a3b8` |
| Borders | `border #ece9f6`, `borderStrong #ded9f0` |
| Semantic | `success #15803d`, `warning #b45309`, `danger #b91c1c`, `info #6d28d9` (each with a `*Soft` tint) |
| Teacher navy | `navy #0b1b3a`, `navyDeep #061027`, `navySurface #12264d`, `navyBorder #1e3a6b` — mirrors the web teacher dashboard's `data-theme="navy"` |

The teacher portal uses the navy palette; every other surface uses the violet brand
palette. Radii, spacing and typography scales live alongside the colours in the same file.

---

## 8. Behaviour notes

| Topic | Rule |
|---|---|
| Session | The access token lives in memory; the refresh token is stored by the platform (secure store) and sent as a cookie. A 401 triggers one refresh + retry. |
| Session restore | Capped at 8 s, then the sign-in flow is shown regardless of outcome. |
| Role landing | `TEACHER → teacher-portal`, `PARENT → parent-portal`, `REPORT_READ → admin-dashboard`, `NOTIFICATION_READ → notifications`, else `profile`. |
| Permissions | The drawer, tabs and Academics hub all derive from the same `navForRole()` filter, so a hidden module cannot be reached by any other path. The API re-checks everything. |
| Realtime | One socket per session; the Notifications tab badge and the bell update live. |
| Media | `expo-image-picker` for selection, `expo-image-manipulator` for resizing before upload. |
| Empty states | Every list has a designed empty state (illustration + message), never a blank screen. |
| Errors | Error boundaries catch render errors; async errors show an inline "Try again" affordance. |

---

## 9. Testing

| Suite | Coverage |
|---|---|
| `__tests__/WelcomeScreen.test.tsx` | Welcome screen renders its actions and routes correctly |
| `__tests__/LoginScreen.test.tsx` | Login form validation, submission and error handling per portal |

Run with `npm test` (Jest + `jest-expo` preset). `npm run typecheck` runs `tsc --noEmit`.
