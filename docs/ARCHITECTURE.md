# Architecture

## 1. Monorepo layout

npm workspaces (`apps/*`, `packages/*`). Node ≥ 20.

```
sms/
├── apps/
│   ├── backend/          @smartschool/backend  Express + Prisma + Socket.IO
│   │   ├── prisma/       schema.prisma, migrations/, seed scripts
│   │   ├── scripts/      smoke-exam-result.ts
│   │   ├── src/
│   │   │   ├── app.ts            Express app assembly
│   │   │   ├── index.ts          HTTP + Socket.IO bootstrap, scheduler, shutdown
│   │   │   ├── config/           env.ts, logger.ts
│   │   │   ├── lib/              prisma, socket, realtime, scheduler, audit
│   │   │   ├── middleware/       authenticate, authorize, validate, rateLimit,
│   │   │   │                     auditLogger, errorHandler, notFound
│   │   │   ├── modules/          44 domain modules (routes/controller/service)
│   │   │   ├── routes/index.ts   API router — 44 mounts
│   │   │   └── utils/            jwt, password, pagination, code, duration
│   │   └── tests/                26 Vitest suites
│   │
│   ├── web/              @smartschool/web       React + Vite
│   │   ├── public/site/  marketing images (logo, photos, product shots)
│   │   └── src/
│   │       ├── components/   Layout, ui kit, DataTable, FormDialog, vehicle/*
│   │       ├── lib/          api, auth, settings, permissions, routing, options…
│   │       ├── navigation/   — (routes live in App.tsx + nav.ts)
│   │       ├── pages/        60+ pages (public/, parent/, teacher/)
│   │       └── resources.tsx 32 declarative resource definitions
│   │
│   └── mobile/           @smartschool/mobile    Expo / React Native
│       ├── src/
│       │   ├── components/   Layout, ui, Charts, DataList, realtime, parent/*, teacher/*
│       │   ├── lib/          api, auth, permissions, resources, teacherScope, socket
│       │   ├── navigation/   routes, RootNavigator, AuthNavigator, PublicNavigator,
│       │   │                 MainNavigator (drawer), MainTabs, navItems
│       │   └── screens/      public/, auth/, admin/, teacher/, parent/
│       └── __tests__/        2 Jest suites
│
├── packages/
│   ├── shared/           @smartschool/shared
│   │   └── src/           rbac/, schemas/ (31 files), constants/, types/,
│   │                      grading.ts, results.ts, attendance/, import/
│   └── config/           @smartschool/config    base tsconfig
│
├── docs/                 this documentation set
├── docker-compose.yml    MySQL 8.4
└── .env.example
```

### Package dependency graph

```
@smartschool/shared ──┬──> @smartschool/backend
                      ├──> @smartschool/web
                      └──> @smartschool/mobile
```

`packages/shared` has exactly one runtime dependency: `zod`. It is bundled by **tsup** to
dual ESM + CJS with `.d.ts` and sourcemaps. `@prisma/client` is marked *external* so the
shared package can use the generated Prisma enums without bundling them.

`@smartschool/config/tsconfig.base.json` enforces `strict`, `noUncheckedIndexedAccess`,
`noImplicitOverride`, `noFallthroughCasesInSwitch`, `isolatedModules` and
`verbatimModuleSyntax`.

---

## 2. Backend request pipeline

```
Request
  │
  ├─ helmet            security headers
  ├─ cors              origin allow-list from CORS_ORIGINS
  ├─ compression       gzip/deflate
  ├─ cookie-parser
  ├─ pino-http         structured request logging
  ├─ express-rate-limit  global limiter (RATE_LIMIT_WINDOW_MS / RATE_LIMIT_MAX)
  │
  └─ /api/v1/*  (apiRouter)
       ├─ module router
       │    ├─ validate(schema, 'body'|'query'|'params')   Zod
       │    ├─ authenticate                                  Bearer JWT → req.user
       │    ├─ requirePermission(...perms)  /  requireRole(...roles)
       │    └─ asyncHandler(controller)
       │         └─ service → Prisma
       │
       ├─ auditLogger      records successful mutations
       ├─ errorHandler     ApiError / Prisma → HTTP
       └─ notFound         404 for unmatched routes
```

### Middleware semantics

**`validate(schema, source)`** — runs `schema.safeParse(req[source])`. On failure throws
`ApiError.badRequest('Validation failed', { issues: [{ path, message }] })`. On success it
**replaces** the source object with the parsed (coerced + defaulted) data, so services always
receive typed, normalized input.

**`authenticate`** — requires `Authorization: Bearer <accessToken>`. Verifies the JWT and sets
`req.user = { id, role, schoolId }` decoded from `sub`, `role`, `schoolId`. Failure → `401`.

**`authorize(...roles)`** — role allow-list (OR semantics).
**`requirePermission(...perms)`** — permission check (AND semantics); every listed permission
must be held by the actor's role.

**`auditLogger`** — derives the action from the HTTP method (`POST`→`CREATE`,
`PUT`/`PATCH`→`UPDATE`, `DELETE`→`DELETE`; login is `LOGIN`). **Only successful responses
are audited.** Writes are best-effort: a failure is logged and swallowed so it can never
break the request.

**`rateLimit`** — global limiter plus a stricter `authRateLimiter` applied to every credential
endpoint (`/auth/login*`, `/auth/refresh`, `/auth/change-password`, `/auth/register`).

**`errorHandler`** — maps `ApiError` to its status; maps Prisma `P2002` (unique violation) →
`409`, `P2025` (record not found) → `404`. Stack traces are only included outside production.

---

## 3. Authentication & session model

| Aspect | Detail |
|---|---|
| Access token | JWT, payload `{ sub, role, schoolId, type: 'access' }`, TTL `JWT_ACCESS_EXPIRES_IN` (15m default) |
| Refresh token | JWT `{ sub, jti, type: 'refresh' }`, TTL `JWT_REFRESH_EXPIRES_IN` (7d default) |
| Refresh storage | `RefreshToken` rows in MySQL, stored **hashed** (`hashToken`), with `expiresAt`, `revokedAt`, `userAgent`, `ipAddress` |
| Rotation | Every refresh **rotates**: the used token is revoked and a new pair is issued |
| Password hashing | `bcryptjs`, `BCRYPT_SALT_ROUNDS` (default 12) |
| Login portals | `/auth/login` (any role), `/auth/login/admin`, `/auth/login/teacher`, `/auth/login/parent` — the portal variants enforce a role allow-list |
| Inactive users | Rejected with the same generic `401 Invalid email or password` as an unknown user |
| Change password | Requires the current password; **revokes every refresh token** (forces re-login everywhere) |
| Deactivate user | Sets `isActive=false` and revokes all refresh tokens in one transaction |
| Password reset (admin) | Resets the hash and revokes that user's refresh tokens in one transaction |

### Web session flow

1. `POST /auth/login/{portal}` → stores the access token, keeps the refresh token in an
   httpOnly cookie.
2. On 401, `lib/api.ts` transparently calls `POST /auth/refresh` and retries the request once.
3. `POST /auth/logout` revokes the current refresh token.

### Mobile session flow

Same model, but `lib/api.ts` holds the access token in memory and the refresh token in a
cookie (`credentials: 'include'`). `restoreSession()` runs once at startup with an **8-second
timeout** so an unreachable API drops the user on the welcome screen instead of a spinner.
Every individual request is bounded by a **20-second timeout** and surfaces friendly
`NETWORK_ERROR` / `REQUEST_TIMEOUT` messages.

---

## 4. Multi-tenancy & scoping

Every school-scoped table carries `schoolId`. A per-service helper resolves the scope:

```
resolveSchoolScope(actor, requestedSchoolId?)
  SUPER_ADMIN  → requestedSchoolId ?? undefined   (undefined = cross-school read)
  no schoolId  → 403 "Your account is not linked to a school"
  otherwise    → actor.schoolId   (client-supplied schoolId is silently ignored)
```

Reads compare `record.schoolId !== scope` → `403 Access denied`.
Writes validate referenced entities and return `400 Invalid <entity>`.

### Teacher scoping (`src/modules/teachers/teacher-scope.ts`)

The most important scoping rule. The teacher scope is derived **only from the authenticated
session** — never from a client-supplied `teacherId`:

```
resolveTeacherScope(actor)
  → TeacherProfile (from token subject)
  → TeacherAssignment rows + Section.classTeacherId
  → { profileId, classLevelIds[], sectionIds[], subjectIds[] }
```

Assertions used across modules:

| Assertion | Guards |
|---|---|
| `assertTeacherIdIsSelf` | a teacher may only act as themselves |
| `assertSectionInScope` | section belongs to the teacher |
| `assertClassLevelInScope` | class level belongs to the teacher |
| `assertSubjectInScope` | subject is taught by the teacher |
| `assertStudentInScope` | student is in one of the teacher's sections |
| `assertHomeworkInScope` | homework is in the teacher's scope |
| `homeworkScopeWhere` | Prisma `where` fragment for list queries |

### Parent scoping (`/parents/me/...`)

Parents hold only `notice:read`, `notification:read`, `message:read`. **All** child data is
served exclusively through `/parents/me/children/:studentId/<feature>` endpoints, each of
which verifies that the child is linked to the requesting guardian.

---

## 5. Realtime (Socket.IO)

Attached to the HTTP server in `src/lib/socket.ts`. The handshake authenticates with the
access token; on success the socket joins:

| Room | Pattern | Purpose |
|---|---|---|
| User room | `user:<userId>` | Direct notifications, messages |
| School room | `school:<schoolId>` | School-wide broadcasts |
| Role room | `role:<role>` | Role broadcasts |

### Event catalogue

| Event | Emitted when | Audience |
|---|---|---|
| `connected` | socket authenticates | that socket |
| `notice:created` | a notice is published | `school:<id>` |
| `attendance:marked` | attendance is created or updated | `school:<id>` |
| `homework:assigned` | homework is created | `school:<id>` |
| `invoice:created` | an invoice is issued | `school:<id>` |
| `payment:recorded` | a payment is recorded | `school:<id>` |
| `notification` | a notification is persisted | `user:<id>` |
| `message:created` | a message is sent | each recipient's `user:<id>` room |

Every emit goes through `src/lib/realtime.ts`, which wraps Socket.IO in try/catch — a socket
failure is logged but never fails the HTTP request.

### Client behaviour

Both clients (`apps/web/src/components/RealtimeProvider.tsx`,
`apps/mobile/src/components/RealtimeProvider.tsx`):

- connect only when the user holds `notification:read` or `message:read`;
- keep a live unread counter (capped display at `99+`);
- raise a toast for new notifications (auto-dismiss after 6 s on web);
- bump `version` / `messageVersion` counters so affected screens refetch.

---

## 6. Background scheduler

`src/lib/scheduler.ts` runs a job **every six hours** that flags overdue library loans
(`BORROWED` → `OVERDUE`). Started by `src/index.ts` on boot and stopped during graceful
shutdown.

---

## 7. Notifications & audit

**Notifications** (`notifications.service.ts`) persist a `Notification` row and then push it
over Socket.IO. Shared helpers `notifyUsers(userIds, payload)` and `notifySchool(schoolId,
payload)` are used by attendance (absent/late → guardians), homework, invoices, payments,
notices and messaging.

**Audit** (`src/lib/audit.ts`) writes `AuditLog` rows with actor, action, entity, entityId,
school, payload, IP address and user agent. Read-only API at `/audit-logs` — super admins see
everything, school admins see their own school, anyone else gets `403`.

---

## 8. Reporting engine

`src/modules/reports/reports.service.ts` exposes seven aggregations, all school-scoped and
counting only `ACTIVE` students/teachers:

| Endpoint | Produces |
|---|---|
| `/reports/dashboard` | Head counts, open requests, fee collections, recent admissions |
| `/reports/university` | Management roll-up: overview, students, teachers, exams, role analytics, activity feed, performance trend |
| `/reports/joinings` | Admissions→students over time, split by source, with period-over-period growth % |
| `/reports/attendance` | Class/section/date-range attendance with indicator bands |
| `/reports/fees` | Collection totals by status and method, outstanding balances, ageing |
| `/reports/enrollment` | Per-class enrollment counts and fill rate against section capacity |
| `/reports/report-cards` | Result roll-ups using the shared grading rules |

Growth deltas use `Math.round(((current - previous) / previous) * 100)`; ratios are rounded to
1 decimal.

---

## 9. Domain logic highlights

| Module | Notable rules |
|---|---|
| **Students** | Section capacity is enforced (`400 Section "<name>" is full (n/capacity)`); on a section move the student is excluded from the count. Delete is a soft delete (`status = INACTIVE`). |
| **Attendance** | Unique on `(studentId, date)`. Summary aggregates present/absent/late/excused/half-day; percentage = `(present + late + halfDay×0.5) / total × 100`. Indicators: **good ≥ 85 %**, **warning ≥ 75 %**, else **critical**. ABSENT/LATE triggers a guardian notification. |
| **Results** | Unique on `(examId, studentId, subjectId)` → creates **upsert**. `create` rejects marks > max (400); `update` **clamps** instead. Grade derived from `gradeForPercentage` unless supplied. |
| **Invoices** | `total = max(0, subtotal − discount)`. Bulk `generate` loads the matching `FeeStructure` and **skips students who already have an invoice** for the period. |
| **Payments** | `recomputeInvoice()` sets `amountPaid`, `balance = max(0, total − amountPaid)` and derives status `PAID` / `PARTIALLY_PAID` / `ISSUED`. `CANCELLED` invoices are left untouched. |
| **Library** | One active loan per `(book, borrower)` enforced by a unique `activeKey = "<bookId>:<borrowerId>"` (nulled when the loan closes — MySQL allows multiple NULLs in a unique index). Copy counts move transactionally. |
| **Transport** | Vehicle/driver/route codes are auto-allocated with a retry loop. Route stops are replaced atomically with fresh sequences. A driver assigned to vehicles cannot be deleted. |
| **Timetable** | Import is **all-or-nothing**: every row is pre-validated and the whole file is rejected with a per-row `issues` array if anything fails. |
| **Messaging** | Conversation access is participant-based. `POST /conversations/teachers` enforces that the parent is messaging a teacher who actually teaches their child. |
| **Teachers** | `reset-password` revokes the target's refresh tokens. `remove` is a soft delete (`status = INACTIVE`). |
| **Users** | Only a super admin may create or grant `SUPER_ADMIN`. You cannot deactivate yourself. |

---

## 10. Grading & attendance rules (`packages/shared`)

**Grade bands** (`src/grading.ts`):

| Percentage | Grade |
|---|---|
| ≥ 90 | `A+` |
| ≥ 80 | `A` |
| ≥ 70 | `B` |
| ≥ 60 | `C` |
| ≥ 50 | `D` |
| ≥ 40 | `E` |
| ≥ 0 | `F` |

`percentage()` returns 0 for non-finite input or `maxMarks <= 0`, else rounds to 2 decimals.
`isPass()` compares **absolute marks** against `passingMarks`.

**Report cards** (`src/results.ts`) group results by exam, sort subjects alphabetically,
sort report cards by date descending, and derive an `overall` aggregate across all cards.
Per-subject grade reuses the stored grade when present; the exam-level and overall grades are
always derived from the totals.

**Attendance metrics** (`src/attendance/metrics.ts`) — see §9. Excused/on-leave days remain in
the denominator, so authorised leave still lowers the rate.

---

## 11. Timetable import (`packages/shared/src/import/timetable.ts`)

Supports **CSV** and **SQL** paste, plus parsed rows.

**Modes:** `upsert` (default) and `replace`.

**Canonical fields (9):** `class`, `section`, `subject`, `teacher`, `day`, `startTime`,
`endTime`, `room`, `materials`.

**Header aliases** — headers are lowercased and whitespace/`_`/`-`/`.`/`/` collapsed to single
spaces. Examples:

| Canonical | Accepted headers |
|---|---|
| `class` | class, class name, class level, grade, grade level, standard, form, year group |
| `section` | section, division, batch, group |
| `subject` | subject, subject name, subject code, course, paper |
| `teacher` | teacher, teacher name, teacher code, educator, instructor, lecturer, faculty, staff, employee no |
| `day` | day, day of week, weekday, days |
| `startTime` | start time, start, from, time from, begins, begin |
| `endTime` | end time, end, to, time to, finishes, finish |
| `room` | room, classroom, venue, location, hall |
| `materials` | materials, material, notes, description, topic, remarks |

**Time normalisation** handles `Date`, Excel day fractions (`0 < v < 1`), `HHMM` digits,
12-hour (`9:00 AM`), 24-hour (`HH:MM`, `HH:MM:SS`). **Weekday normalisation** handles
`mon`, `monday`, `tues`, `wed`, `thu`, `thur`, `thurs`, `sat`, `sun`, etc.

**CSV parsing** auto-detects the delimiter (`,` `;` tab `|`) from the header row, supports
quoted fields with `""` escapes, ignores blank lines and `#` comments, and reports a
file-level issue when no recognised columns are found.

**SQL parsing** matches `INSERT INTO <table> (cols) VALUES (...);` (backticks / quoted /
schema-qualified names supported). Every INSERT must list its columns.

**Row validation** (`timetableImportRowSchema`) requires `section`, `subject`, `day`,
`startTime`, `endTime`, and enforces `endTime > startTime`.

---

## 12. Frontend architecture

### Web (`apps/web`)

```
BrowserRouter
└─ ErrorBoundary
   └─ AuthProvider          session, token, refresh
      └─ SettingsProvider   school settings + currency
         └─ RealtimeProvider  socket, unread count, toasts
            └─ Routes
               ├─ PublicLayout     /site/*
               ├─ ProtectedLayout   (auth gate, redirects to /login)
               │  └─ Layout        (sidebar + bell + toaster)
               │     ├─ RequireRole (role gates for /teacher/*, /parent/*)
               │     └─ pages
```

Key shared libraries: `lib/api.ts` (fetch wrapper with 401 refresh-and-retry),
`lib/auth.tsx`, `lib/settings.tsx`, `lib/permissions.ts` (`can`, `canAny`, `canAll`,
`visibleFor`), `lib/routing.ts` (`defaultPathForRole`, `resolveLoginTarget`),
`lib/options.ts` (21 cached lookup sources), `lib/form.ts` (`useForm`, `requiredSchema`,
`cleanValues`), `lib/useAsync.ts` (`loading/error/data/forbidden/reload`).

### Mobile (`apps/mobile`)

```
RootNavigator
├─ loading  → ActivityIndicator
├─ no user  → AuthNavigator
│   └─ Stack: welcome → public (PublicNavigator) | login-admin | login-teacher | login-parent
└─ user     → MainNavigator (Drawer)
    ├─ tabs (MainTabs) → Dashboard | Academics | Notifications | Profile
    └─ stack screens (all wrapped in the shared Layout)
```

The drawer content is `navForRole(user.role)` grouped into **Overview / My Child / Teaching /
Academics / School Operations / Account**, with any leftover permitted modules under
**More**. The bottom tabs are permission-filtered, and the Notifications tab carries the live
unread badge.

---

## 13. Testing

| Suite | Files | Runner | Scope |
|---|---|---|---|
| Backend | 26 | Vitest | Service logic, RBAC, teacher scoping, parent scoping, HTTP layer, JWT, password hashing |
| Web | 20 | Vitest | Pure helpers — attendance, exam marks, format, form, image, library, messages, options, permissions, public content, realtime, routing, timetable import, timetable, university, vehicle, nav, resources, error boundary |
| Mobile | 2 | Jest (`jest-expo`) | Welcome screen, Login screen |

Backend suites cover, among others: `rbac`, `security`, `teacher-scope`,
`teacher-authorization`, `parent-access`, `report-cards`, `timetable`, `messaging`,
`invoices.feeDesk`, `studentsService capacity limits`, `invoicesService.generateInvoices`.

An end-to-end HTTP smoke script exists as well:

```bash
npm run smoke:exam-result -w @smartschool/backend
```

It signs in as an admin, discovers real school records over HTTP, creates a temporary exam +
result, updates it, verifies the responses, and cleans up only the IDs it created (in a
`finally` block) so a failure never leaves orphans.

---

## 14. Known risks & gaps

| Severity | Issue | Location |
|---|---|---|
| High | `class-subjects.create` writes the row *before* verifying the class level's school, so an out-of-scope mapping briefly exists | `class-subjects.service.ts` |
| High | `homework-attachments` applies only school scope, not teacher scope — a teacher can read attachments for homework in sections they do not teach | `homework-attachments.service.ts` |
| Medium | `createSectionSchema` caps `capacity` at 10, conflicting with typical class sizes and the seed data | `packages/shared/src/schemas/class.schema.ts` |
| Medium | Inconsistent status codes for the same cross-tenant condition — `400 Invalid x` in most modules vs `403 Access denied` in others | multiple services |
| Medium | `results.create` rejects over-max marks with 400 while `results.update` silently clamps — same invalid input handled differently | `results.service.ts` |
| Medium | `SUPER_ADMIN` reads are unfiltered by default (`resolveSchoolScope` → `undefined` = every school) | multiple services |
| Medium | `books.update` can change `totalCopies` independently of active loans, leaving `availableCopies` inconsistent | `books.service.ts` |
| Medium | Summary endpoints cap records (`SUMMARY_MAX_RECORDS`, `SUMMARY_STUDENT_LIMIT`) without signalling truncation in the payload | `attendances.service.ts` |
| Medium | `POST /contact` is an unauthenticated write with no dedicated rate limit or spam protection | `contact.service.ts` |
| Low | `resolveSchoolScope` is duplicated across ~40 service files | `apps/backend/src/modules/**` |
| Low | `messaging` fires notifications with `void notifyUsers(...)` — a failure is silently dropped | `messaging.service.ts` |
| Low | `studentGuardian.relation` is hard-coded to `'GUARDIAN'` on student creation | `students.service.ts` |
| Low | 12 shared modules import `@prisma/client` enums although the package is only marked *external* and undeclared as a dependency | `packages/shared/src/**` |
| Low | `Attendance` uniqueness is `(studentId, date)` only — a student cannot have two rows on a day even across sections | `schema.prisma` |
