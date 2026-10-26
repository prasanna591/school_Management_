# Web Application Reference

**App:** `@smartschool/web` — React 18 + Vite 6 + TypeScript + React Router 6.
**Dev URL:** `http://localhost:5173` · **API base:** `/api/v1` (proxied to `localhost:4000`).

**Scale:** 50 routes across the public site, admin console, teacher portal and parent
portal · 32 generic resource screens · 55 page components · 20 test files.

---

## 1. Stack and structure

| Concern | Choice |
|---|---|
| Framework | React 18.3 with Vite 6 |
| Routing | `react-router-dom` 6.28 (`BrowserRouter`) |
| Charts | `recharts` 3.10 |
| Realtime | `socket.io-client` 4.8 |
| Spreadsheets | `xlsx` 0.18 (timetable import/export) |
| Icons | `lucide-react` 1.57 |
| Validation | `@smartschool/shared` Zod schemas |
| Tests | Vitest 2.1 |

```
apps/web/src/
├── App.tsx                 # route table
├── main.tsx                # entry point
├── nav.ts                  # navigation catalogue + role filter
├── resources.tsx           # 32 generic resource definitions
├── components/             # shared UI (22 components + 5 vehicle sub-components)
├── lib/                    # hooks, API client, form engine, realtime (23 modules)
├── pages/                  # 44 custom pages
│   ├── public/             # marketing site
│   ├── teacher/            # teacher portal
│   └── parent/             # parent portal
└── styles/                 # global CSS
```

### 1.1 Provider stack

`App.tsx` nests providers in this order — each depends on the ones above it:

```
BrowserRouter
└── ErrorBoundary          # catches render errors, shows a recovery screen
    └── AuthProvider       # session, login/logout, token refresh
        └── SettingsProvider    # school settings (currency, timezone, branding)
            └── RealtimeProvider  # socket lifecycle, live notifications
                └── Routes
```

### 1.2 Two route trees

| Tree | Layout | Access |
|---|---|---|
| **Public** | `PublicLayout` | Anyone, no auth |
| **Protected** | `ProtectedLayout` → `Layout` | Signed-in users; `Layout` renders the sidebar, header and notification bell |

`ProtectedLayout` redirects unauthenticated visitors to `/login` and preserves the intended
destination so the user lands back where they were after signing in.

---

## 2. Routing map

### 2.1 Public site (`/site`)

| Route | Page | Contents |
|---|---|---|
| `/site` | `PublicHomePage` | Hero — "Everyday school work, handled in one place"; a day-in-the-life walkthrough; a closer look at the modules; a closing CTA. |
| `/site/about` | `PublicAboutPage` | "Software that fits the school day"; why it is built this way; four principles; the people in a school. |
| `/site/features` | `PublicFeaturesPage` | "The day-to-day work, handled properly"; feature cards with a path to try it with own data. |
| `/site/modules` | `PublicModulesPage` | "Switch on the parts your school needs"; a module for every team (academics, people, finance, transport, library, communication). |
| `/site/plans` | `PublicPlansPage` | "Plans that grow with the school"; what never changes; how schools usually start. |
| `/site/faq` | `PublicFaqPage` | "Questions, answered"; grouped question-and-answer sections. |
| `/site/contact` | `PublicContactPage` | "Book a demo, or ask us anything"; a contact form that posts to `POST /contact`. |

All seven pages share `PublicSite.css` and the section primitives in
`pages/public/sections.tsx`. The public site is entirely static — it never calls the API
except for the contact form.

### 2.2 Authentication

| Route | Page | Behaviour |
|---|---|---|
| `/login` | `LoginPage` (admin portal) | Email + password → `POST /auth/login/admin` |
| `/login/teacher` | `TeacherLoginPage` | → `POST /auth/login/teacher` |
| `/login/parent` | `ParentLoginPage` | → `POST /auth/login/parent` |

The login screen is shared across the three portals with a portal switcher. Wrong portal
returns `401 This account cannot sign in through this portal`.

### 2.3 Admin / staff console

| Route | Page | Purpose |
|---|---|---|
| `/` | `HomeRoute` → `UniversityDashboardPage` | Role-aware landing. Admins with `REPORT_READ` land on the university dashboard; teachers are redirected to `/teacher`; parents to `/parent`. |
| `/resource/:key` | `ResourceListPage` | Generic list/CRUD screen for any of the 32 resources (`/resource/students`, `/resource/teachers`, …) |
| `/resource/vehicle` | `VehicleDetailsPage` | Fleet cockpit: vehicles, routes, drivers, subscriptions (separate from the generic list) |
| `/class-roster` | `ClassRosterPage` | Students assigned to each class, with teacher and count columns |
| `/attendance/mark` | `AttendanceMarkPage` | Mark daily attendance for one section, student by student |
| `/attendance/tracker` | `AttendanceTrackerPage` | Daily status plus monthly / term attendance percentages |
| `/exams/marks` | `ExamMarksPage` | Record subject marks for every student in an exam |
| `/report-cards` | `ReportCardsPage` | Subject-wise result cards built from recorded marks |
| `/reports` | `ReportsPage` | Attendance, finance and enrollment insights |
| `/fee-desk` | `FeeDeskPage` | Fee collection, outstanding balances and defaulters |
| `/timetable` | `TimetablePage` | Weekly class schedule by section, with bulk import |
| `/library/loans` | `LibraryLoansPage` | Issue and return books, tracking availability and fines |
| `/invoices/new` | `InvoiceCreatePage` | Issue an invoice with one or more fee items |
| `/payments/new` | `PaymentCreatePage` | Apply a payment against an invoice |
| `/messages` | `MessagesPage` | Realtime conversation list and thread view |
| `/notifications` | `NotificationsPage` | Notification feed with read/unread state |
| `/requests` | `MyRequestsPage` | Raise and track certificate and service requests |
| `/settings` | `SettingsPage` | Currency, timezone, contact details for the school |
| `/profile` | `ProfilePage` | The signed-in user's own account details |
| `*` | `NotFoundPage` | 404 screen |
| — | `ForbiddenPage` | 403 screen (rendered by `RequireRole` on denial) |

### 2.4 Teacher portal (`/teacher/*`)

| Route | Page | Purpose |
|---|---|---|
| `/teacher` | `TeacherPortalPage` | Teaching overview: today's classes, sections, attendance and pending work |
| `/teacher/classes` | `TeacherClassesPage` | "My Classes" — the sections the teacher is allocated to |
| `/teacher/students` | `TeacherStudentsPage` | "My Students" — students enrolled in those sections |
| `/teacher/attendance` | `TeacherAttendancePage` | Attendance across the sections taught |
| `/teacher/assignments` | `TeacherAssignmentsPage` | Class–subject allocations with a summary strip |
| `/teacher/marks` | `TeacherMarksPage` | Exam results for the classes taught |
| `/teacher/homework` | `TeacherHomeworkPage` | Homework assigned to the teacher's classes |
| `/teacher/timetable` | `TeacherTimetablePage` | Weekly grid of the teacher's own classes |
| `/teacher/messages` | `TeacherMessagesPage` | Teacher-scoped messaging |
| `/teacher/notifications` | `TeacherNotificationsPage` | Teacher-scoped notifications |
| `/teacher/profile` | `TeacherProfilePage` | Teaching profile and account details |

All eleven `/teacher/*` routes sit behind `<RequireRole roles={[Role.TEACHER]} />`, so a
non-teacher hitting the URL is routed to `ForbiddenPage`.

Shared helpers: `teacher/teacherScope.tsx` (resolves the teacher's sections, subjects and
students from `GET /teachers/me`) and `teacher/teacherWidgets.tsx` (reusable stat cards).

### 2.5 Parent portal (`/parent/*`)

| Route | Page | Purpose |
|---|---|---|
| `/parent` | `ParentPortalPage` | "Parent Dashboard" — children at a glance, per-child attendance, results, invoices and upcoming homework |
| `/parent/attendance` | `ParentAttendancePage` | Daily and monthly attendance history for the child |
| `/parent/homework` | `ParentHomeworkPage` | Assignments set for the child's section |
| `/parent/timetable` | `ParentTimetablePage` | The child's weekly class schedule |
| `/parent/results` | `ParentResultsPage` | Published exam marks for the child |
| `/parent/syllabus` | `ParentSyllabusPage` | "Syllabus & Notes" — what the class is covering |
| `/parent/invoices` | `ParentInvoicesPage` | The child's fee invoices and payments |
| `/parent/teachers` | `ParentTeachersPage` | Teachers assigned to the child's class, with contact actions |
| `/parent/announcements` | `ParentAnnouncementsPage` | Notices and circulars published by the school |
| `/parent/vehicle` | `ParentVehiclePage` | The child's transport subscription, route, vehicle and driver |

All ten routes sit behind `<RequireRole roles={[Role.PARENT]} />`. `parent/ParentChildPage.tsx`
is the shared child-detail shell used across the portal. Every data call goes through the
`/parents/me/children/:studentId/*` endpoints, so a parent can never load another family's
child.

---

## 3. Navigation

`nav.ts` exports a single `NAV_ITEMS` catalogue of **48 entries**. Each item has a `key`,
`label`, `path` and optionally a `permission`, a `roles` allow-list, or an `excludeRoles`
deny-list. `navForRole(role)` filters the catalogue:

1. Drop items whose `roles` list excludes the current role.
2. Drop items whose `excludeRoles` list includes the current role.
3. Keep items whose `permission` the role holds.

`excludeRoles` exists so generic admin screens (e.g. `/resource/students`) stay hidden from
teachers, who get the purpose-built `/teacher/*` equivalents instead.

### 3.1 Sidebar groups

`Layout.tsx` regroups the filtered items into sections:

| Group | Items |
|---|---|
| *(top, ungrouped)* | Dashboard, Vehicle Details, My Children, My Requests, Teacher Dashboard |
| **Teaching** | My Classes, My Students, Attendance, Assignments, Marks & Grades, Homework, Timetable |
| **My Child** | Attendance, Homework, Timetable, Results, Syllabus, Invoices, Teachers, Announcements, Vehicle |
| **Academics** | Student Details, Student Marks, Mark, Class, Sections, Class Roster, Subject, Attendance, Homework, Lesson Plans, Learning Content, Timetable |
| **People** | Admissions, Requests, Teacher Details, Parent Details |
| **Operations** | Books, Finance, Fee Desk |
| **Reports** | Reports, Report Cards |
| **Communication** | Notifications, Messages |
| **My Space** | Messages, Notifications, My Profile |
| **System** | Settings |

The Teaching, My Child and My Space groups contain only role-restricted items, so they
disappear entirely for roles that cannot see them.

### 3.2 Route guards

| Guard | Behaviour |
|---|---|
| `ProtectedLayout` | Redirects to `/login` when there is no session; restores the target route afterwards |
| `RequireRole` | Renders `ForbiddenPage` when the role is not in the allow-list |
| `canAccessPath(role, pathname)` | Client-side check used before navigation; resolves `/resource/:key` against the resource's permission |
| `defaultPathForRole(role)` | `TEACHER → /teacher`, `PARENT → /parent`, `REPORT_READ → /`, `NOTIFICATION_READ → /notifications`, else `/profile` |

---

## 4. Resource screens

`resources.tsx` defines **32 resources**. Each one is a declarative config:

```ts
interface ResourceConfig {
  key: string;                    // URL segment under /resource/
  label: string;                  // page + table title
  apiPath: string;                // REST base path
  permission: Permission;         // read permission
  searchable?: boolean;           // show the search box
  columns: Column[];             // table columns + cell renderers
  createPermission?: Permission;  // defaults to `permission`
  updatePermission?: Permission;
  deletePermission?: Permission;
  deletable?: boolean;            // show the delete action
  createHref?: string;            // link to a bespoke create screen
  form?: { create?: FormSpec; edit?: FormSpec };
  rowActions?: { toggleActive?, resetPassword?, photo? };
}
```

`ResourceListPage` renders any of them: toolbar (search + create), table, pagination, and
row actions (edit, delete, toggle active, reset password, photo). Forms are generated from
`FieldDef` arrays and validated with the shared Zod schema before submission.

### 4.1 Complete resource table

| # | Key | Label | API path | Read perm | Write perms | Search | Columns | Extra |
|---|---|---|---|---|---|---|---|---|
| 1 | `users` | Users | `/users` | `USER_READ` | `USER_CREATE` / `USER_UPDATE` / `USER_DELETE` | ✓ | Email, Role, Active, Last login | create + edit form |
| 2 | `students` | Students | `/students` | `STUDENT_READ` | `STUDENT_CREATE` / `STUDENT_UPDATE` / `STUDENT_DELETE` | ✓ | Admission No, Roll No, Gender, Status | photo row action |
| 3 | `admissions` | Admissions | `/admissions` | `ADMISSION_READ` | `ADMISSION_MANAGE` | ✓ | Applicant, Guardian, Phone, Class, Status, Source, Follow-up | — |
| 4 | `service-requests` | Requests | `/service-requests` | `REQUEST_READ` | `REQUEST_MANAGE` | ✓ | Requester, Type, Title, Student, Status, Resolved | — |
| 5 | `guardians` | Parents | `/guardians` | `PARENT_READ` | `PARENT_MANAGE` | ✓ | Phone, Email, Children, Active | toggle active, reset password |
| 6 | `teachers` | Teachers | `/teachers` | `TEACHER_MANAGE` | `TEACHER_MANAGE` | ✓ | Employee No, Email, Class, Status, Active | toggle active, reset password |
| 7 | `classes` | Class Levels | `/classes` | `CLASS_READ` | `CLASS_MANAGE` | — | Order | — |
| 8 | `sections` | Sections | `/sections` | `CLASS_READ` | `CLASS_MANAGE` | — | Class, Students | — |
| 9 | `subjects` | Subjects | `/subjects` | `SUBJECT_READ` | `SUBJECT_MANAGE` | — | Code, Credits | — |
| 10 | `academic-years` | Academic Years | `/academic-years` | `ACADEMIC_READ` | `ACADEMIC_MANAGE` | — | Start, End, Current | — |
| 11 | `terms` | Terms | `/terms` | `ACADEMIC_READ` | `ACADEMIC_MANAGE` | — | Academic Year, Start, End, Current | — |
| 12 | `teacher-assignments` | Teacher Assignments | `/teacher-assignments` | `TEACHER_READ` | create `TEACHER_MANAGE`, delete `TEACHER_MANAGE` | — | Teacher, Subject, Class, Section, Academic year | create-only |
| 13 | `class-subjects` | Class Subjects | `/class-subjects` | `CLASS_READ` | create `CLASS_MANAGE`, delete `CLASS_MANAGE` | — | Class, Subject | create-only |
| 14 | `attendances` | Attendance | `/attendances` | `ATTENDANCE_READ` | mark `ATTENDANCE_MARK`, edit/delete `ATTENDANCE_MANAGE` | — | Date, Section, Status | — |
| 15 | `exams` | Exams | `/exams` | `EXAM_READ` | `EXAM_MANAGE` | — | Type, Date | — |
| 16 | `exam-results` | Exam Results | `/exam-results` | `RESULT_READ` | `RESULT_MANAGE` | — | Exam, Marks, Grade | — |
| 17 | `homework` | Homework | `/homework` | `HOMEWORK_READ` | `HOMEWORK_MANAGE` | ✓ | Title, Subject, Section, Due, Submissions | — |
| 18 | `lesson-plans` | Lesson Plans | `/lesson-plans` | `LESSON_READ` | `LESSON_MANAGE` | ✓ | Title, Subject, Class, Section, Planned, Status | — |
| 19 | `learning-content` | Learning Content | `/learning-content` | `CONTENT_READ` | `CONTENT_MANAGE` | ✓ | Title, Type, Subject, Class, Tags, Created | — |
| 20 | `fee-categories` | Fee Categories | `/fees/categories` | `FEE_READ` | `FEE_MANAGE` | — | Frequency | — |
| 21 | `fee-structures` | Fee Structures | `/fees/structures` | `FEE_READ` | `FEE_MANAGE` | — | Amount, Frequency | — |
| 22 | `invoices` | Invoices | `/invoices` | `INVOICE_READ` | `INVOICE_MANAGE` | ✓ | Invoice No, Total, Balance, Status | create → `/invoices/new` |
| 23 | `payments` | Payments | `/payments` | `PAYMENT_READ` | `PAYMENT_MANAGE` | — | Amount, Method, Invoice, Paid at | create → `/payments/new` |
| 24 | `books` | Books | `/books` | `LIBRARY_READ` | `LIBRARY_MANAGE` | ✓ | Title, Author, ISBN, Copies | — |
| 25 | `book-loans` | Book Loans | `/book-loans` | `LOAN_READ` | `LOAN_MANAGE` | — | Book, Status, Due | — |
| 26 | `vehicles` | Vehicles | `/vehicles` | `TRANSPORT_READ` | `TRANSPORT_MANAGE` | — | Plate, Model, Capacity, Status | — |
| 27 | `transport-routes` | Routes | `/transport-routes` | `TRANSPORT_READ` | `TRANSPORT_MANAGE` | — | Code, Fare, Description | — |
| 28 | `route-stops` | Route Stops | `/route-stops` | `TRANSPORT_READ` | `TRANSPORT_MANAGE` | — | Route, Sequence, Pickup, Drop | — |
| 29 | `transport-subscriptions` | Subscriptions | `/transport-subscriptions` | `TRANSPORT_READ` | `TRANSPORT_MANAGE` | — | Route, Status, Start | — |
| 30 | `notices` | Notices | `/notices` | `NOTICE_READ` | `NOTICE_MANAGE` | ✓ | Title, Pinned, Published, Expires | — |
| 31 | `audit-logs` | Audit Logs | `/audit-logs` | `AUDIT_READ` | read-only | — | Action, Entity, Entity ID, When | not deletable |
| 32 | `schools` | Schools | `/schools` | `SCHOOL_READ` | update `SCHOOL_UPDATE` | — | Code, Currency, Timezone | edit-only |

**Notes**
- Resource 6 (`teachers`) uses `TEACHER_MANAGE` as its *read* permission, so teachers who hold
  only `TEACHER_READ` cannot open the staff-facing teacher list.
- Resources 12 and 13 are create/delete only — their backend routes expose no update.
- Resources 31 and 32 have no create form; audit logs are immutable and schools are created
  by the platform itself.

---

## 5. Custom pages in detail

### 5.1 University dashboard (`/`)

`UniversityDashboardPage.tsx` (700 lines) is the admin landing screen. It composes the
platform-level view of a school:

- Header with academic-year and month pickers that re-scope every widget.
- Stat cards: student count, teacher count, staff count, classes, sections.
- Attendance today + attendance overall with the same indicator bands the backend uses
  (good ≥ 85 %, warning ≥ 75 %, else critical).
- Fee collection card: billed, collected, outstanding and collection rate.
- Average marks by month (recharts line chart).
- Open service requests and recent admissions.
- Quick actions: jump straight to attendance marking, fee desk, marks entry, admissions.
- Activity feed of recent school activity.

### 5.2 Attendance marking (`/attendance/mark`)

Class → section → date picker, then one row per student with a status control
(`PRESENT` / `ABSENT` / `LATE` / `EXCUSED` / `HALF_DAY`) and a remark field. Writes a single
`POST /attendances` per student. Students who are not in the selected section are rejected by
the backend with `400 Student is not in the selected section`.

### 5.3 Attendance tracker (`/attendance/tracker`)

Class + section (or student) + month/term selector, showing daily status and the aggregated
monthly/term percentage with the good/warning/critical indicator. Reads
`GET /attendances/summary`.

### 5.4 Exam marks entry (`/exams/marks`)

Exam + subject picker, then an editable grid of every student in the class with the mark
input, live percentage and derived grade. Saves via `POST /exam-results`, which upserts on
`(examId, studentId, subjectId)`.

### 5.5 Report cards (`/report-cards`)

Subject-wise result cards built from recorded marks. Reads
`GET /exam-results/report-card`, and supports the student-level and class-level views.

### 5.6 Reports (`/reports`)

Tabs over the report endpoints — attendance, fees, enrollment and joinings — each rendered as
a table plus charts.

### 5.7 Fee desk (`/fee-desk`)

Collection summary (billed, collected, outstanding, collection rate), a breakdown by class and
status, and the defaulter list. Reads `GET /invoices/fee-desk`.

### 5.8 Timetable (`/timetable`)

Weekly grid by section. `TimetableImportDialog` and `lib/timetableImport.ts` implement the
bulk CSV/SQL import and export (`xlsx` for spreadsheets).

### 5.9 Class roster (`/class-roster`)

Students assigned to each class, with the class teacher and student counts.

### 5.10 Library loans (`/library/loans`)

Issue and return books, tracking available copies, overdue status and fines.

### 5.11 Vehicle details (`/resource/vehicle`)

Fleet cockpit with sections for vehicles, routes, drivers and subscriptions. Uses the
`components/vehicle/` sub-components rather than the generic list.

### 5.12 Invoice & payment creation

`InvoiceCreatePage` builds an invoice from one or more fee items (with discount and due
date). `PaymentCreatePage` applies a payment to a selected invoice and shows the resulting
balance.

### 5.13 Messages (`/messages`)

Conversation list plus thread view with a realtime connection indicator and a "New message"
composer. The composer can target users or roles, or (for teachers) a set of students in
their own classes.

### 5.14 Notifications (`/notifications`)

Filterable notification feed with read/unread state and a "mark all read" action.

### 5.15 My requests (`/requests`)

Parent and student request desk — raise and track certificate and service requests. Reads
`GET /service-requests/me`.

### 5.16 Settings (`/settings`)

School currency, timezone and contact details. Writes `PATCH /schools/:id`.

### 5.17 Profile (`/profile`)

The signed-in user's own account details plus password change.

---

## 6. Shared components

| Component | Purpose |
|---|---|
| `Layout` | Sidebar + header shell, nav grouping, mobile drawer |
| `ProtectedLayout` | Auth gate and post-login redirect |
| `PublicLayout` | Marketing site chrome |
| `RequireRole` | Role allow-list gate → `ForbiddenPage` |
| `ErrorBoundary` | Render-error boundary with a recovery screen |
| `HomeRoute` | Role-aware redirect to the correct landing page |
| `DataTable` | Generic sortable, paginated table used by `ResourceListPage` |
| `Pagination` | Page controls |
| `FormDialog` | Modal form wrapper for create/edit |
| `PhotoDialog` | Photo upload/replace flow |
| `Modal` | Accessible dialog primitive |
| `fields.tsx` | Typed form field renderers (text, select, date, time, number, textarea) |
| `ui.tsx` | Buttons, cards, badges, tables, empty states, loaders |
| `Icon` | Icon wrapper over `lucide-react` |
| `NotificationBell` | Header bell with unread count and live updates |
| `Toaster` | Toast notifications |
| `RealtimeProvider` | Socket lifecycle, event bus, reconnect handling |
| `TimetableViews` | Week grid / list renderers |
| `TimetableImportDialog` | CSV/SQL import UI with row-level error display |
| `JoiningPanel` | Admissions → enrollment funnel panel |
| `StudentEnrollmentPanel` | Enroll a student into a section |
| `illustrations.tsx` | Inline SVG illustrations for empty states and the public site |
| `vehicle/` | Vehicle detail sub-components (`CrudTab`, `DriversTab`, `RoutesTab`, `VehiclesTab`, `VehicleDashboard`) |

---

## 7. Library modules (`src/lib`)

| Module | Purpose |
|---|---|
| `api.ts` | Fetch wrapper: base URL, bearer token, JSON handling, error envelope unwrapping, automatic 401 → refresh → retry |
| `auth.tsx` | `AuthProvider`, `useAuth`, sign-in/out, session persistence |
| `settings.tsx` | School settings context (currency, timezone, branding) |
| `realtime.ts` / `socket.ts` | Socket.io client, typed events, reconnect backoff |
| `permissions.ts` | `can(role, permission)` client-side permission check |
| `routing.ts` | `defaultPathForRole`, `canAccessPath`, route guards |
| `form.ts` | `FieldDef` types, `requiredSchema`, form parsing and validation |
| `options.ts` | Async option loaders (classes, sections, subjects, students…) |
| `useAsync.ts` | Data-fetching hook with loading/error state and refetch |
| `format.ts` | Dates, currency, numbers, `humanize`, `shortId`, relative time |
| `attendance.ts` / `attendanceTracker.ts` | Attendance calculations and indicator bands |
| `examMarks.ts` | Grade derivation, percentage, pass/fail |
| `library.ts` | Loan availability, overdue and fine logic |
| `messages.ts` | Conversation threading and unread reconciliation |
| `timetable.ts` / `timetableImport.ts` | Slot maths, CSV/SQL parse and export |
| `vehicle.ts` | Fleet stats and expiry calculations |
| `university.ts` | University dashboard aggregation and formatting |
| `publicContent.ts` | Public-site content model |
| `activities.ts` | Activity feed building |
| `image.ts` | Base64 image validation and sizing |

---

## 8. Design system

- **Palette** — deep navy and teal across every surface; the teacher sign-in sets a scoped
  `data-nav="navy"` attribute so the login hero picks up the same accent tuning as the
  dashboard behind it.
- **Typography** — one sans stack for UI, a tighter scale for headings, tabular numerals for
  money and percentages.
- **Layout** — a fixed sidebar on desktop that becomes a drawer on mobile; content max-width
  with consistent page padding.
- **Status colours** — one semantic colour per state (present/green, absent/red,
  late/amber, excused/slate, half-day/blue) reused by attendance, results, invoices and
  library screens.
- **Accessibility** — semantic landmarks, labelled controls, `aria-label` on icon buttons,
  visible focus rings, keyboard-navigable tables and dialogs.
- **Empty and error states** — every data screen has a designed empty state (with an
  illustration) and a distinct error state; never a blank table.

---

## 9. Behaviour notes

| Topic | Rule |
|---|---|
| Session | The access token is held in memory; the refresh token is an httpOnly cookie. A 401 triggers a single refresh + retry, then a redirect to `/login`. |
| Optimistic UI | Mutations update local state first, then reconcile with the server response; failures raise a toast and refetch. |
| Realtime | `RealtimeProvider` opens one socket per session and dispatches typed events. Notices, invoices, payments, attendance and messages update live in the affected screens. |
| Forms | Client-side validation runs the shared Zod schema before the request; server errors are mapped back onto the offending fields when the error envelope carries `details.issues`. |
| Pagination | Every list screen keeps `page`/`limit` in the URL query string so a filtered view can be shared or bookmarked. |
| Timetable import | CSV/SQL import is all-or-nothing; the dialog shows per-row issues returned by the backend and does not clear the file on failure. |
| Permissions | The UI hides what a role cannot use, but the API re-checks every request — hiding is convenience, not security. |

---

## 10. Testing

20 Vitest files cover the pure logic that is easiest to get wrong:

| Test file | Area |
|---|---|
| `lib/attendance.test.ts` | Attendance counts and percentages |
| `lib/attendanceTracker.test.ts` | Tracker aggregation |
| `lib/examMarks.test.ts` | Grade derivation and pass/fail |
| `lib/form.test.ts` | Form field parsing and validation |
| `lib/format.test.ts` | Date/number/currency formatting |
| `lib/image.test.ts` | Image validation |
| `lib/library.test.ts` | Loan availability and fines |
| `lib/messages.test.ts` | Conversation threading |
| `lib/options.test.ts` | Option loaders |
| `lib/permissions.test.ts` | Permission matrix |
| `lib/publicContent.test.ts` | Public-site content |
| `lib/realtime.test.ts` | Realtime event handling |
| `lib/routing.test.ts` | Route guards and role defaults |
| `lib/timetable.test.ts` | Slot maths |
| `lib/timetableImport.test.ts` | CSV/SQL import parsing |
| `lib/university.test.ts` | Dashboard aggregation |
| `lib/vehicle.test.ts` | Fleet stats and expiry |
| `nav.test.ts` | Navigation filtering per role |
| `resources.test.ts` | Resource config integrity (permissions, columns, forms) |
| `components/ErrorBoundary.test.ts` | Error boundary behaviour |

Run with `npm run test` (Vitest). `npm run build` runs `tsc --noEmit` first, so a type error
fails the build before Vite bundles.
