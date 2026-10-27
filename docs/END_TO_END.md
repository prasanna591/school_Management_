# PSM School Management - End-to-End Application Document

**Version:** 1.0.0  
**Date:** October 2026  
**Repository:** `/home/prasanna/Desktop/sms`

---

## Demonstration school (sample data)

The demo provisions **Greenfield Matriculation Higher Secondary School** (fictional, Chennai,
Tamil Nadu). All seeded records are sample data for the principal-facing demo.

Demo accounts (password `demo1234`):
- `principal@demo.school` — Principal / Administrator
- `teacher@demo.school` — Teacher
- `parent@demo.school` — Parent (child: Kavya Ramesh, Class 8-A)
- `student@demo.school` — Student (Kavya Ramesh, Class 8-A)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Overview](#2-system-overview)
3. [Architecture](#3-architecture)
4. [Technology Stack](#4-technology-stack)
5. [Authentication & Authorization](#5-authentication--authorization)
6. [Data Model](#6-data-model)
7. [API Reference](#7-api-reference)
8. [Web Application](#8-web-application)
9. [Mobile Application](#9-mobile-application)
10. [Core Features](#10-core-features)
11. [Realtime & Background Jobs](#11-realtime--background-jobs)
12. [Installation & Setup](#12-installation--setup)
13. [Development Workflow](#13-development-workflow)
14. [Testing](#14-testing)
15. [Security Considerations](#15-security-considerations)
16. [Appendix](#16-appendix)

---

## 1. Executive Summary

SmartSchool is a multi-tenant School Management System (SMS) that covers the complete school lifecycle - from admissions to alumni tracking. It provides role-based access to students, teachers, parents, administrators, and support staff through three integrated surfaces: a web admin console, a mobile app (iOS/Android), and a RESTful API backend.

### Key Metrics

| Metric | Value |
|---|---|
| REST API Endpoints | 235 |
| Backend Modules | 44 |
| Database Models (Prisma) | 44 |
| Database Enums | 27 |
| User Roles | 9 |
| Permissions | 61 |
| Web Routes | ~60 |
| Web Resource Types | 32 |
| Mobile Screens | 41 |
| Shared Packages | 1 (@smartschool/shared) |

---

## 2. System Overview

SmartSchool operates as a monorepo with three applications sharing common code and a single database instance.

### Applications

| Application | Purpose | Users |
|---|---|---|
| `apps/web` | Full-featured admin/staff console and marketing website | Super Admin, Principal, Admin, Teacher, Accountant, Librarian, Transport Manager |
| `apps/mobile` | Native mobile app for on-the-go access | Admin, Teacher, Parent (primary mobile users) |
| `apps/backend` | REST API server with realtime capabilities | All clients |
| `packages/shared` | Shared types, schemas, RBAC, constants | All applications |

### User Roles

| Role | Scope | Description |
|---|---|---|
| `SUPER_ADMIN` | Global | Platform administrator with full access across all schools |
| `PRINCIPAL` | School | Academic head with near-full authority including results and audit logs |
| `ADMIN` | School | Day-to-day operations, no result management or audit access |
| `TEACHER` | School (Scoped) | Teaching staff limited to assigned sections, subjects, and students |
| `ACCOUNTANT` | School | Finance, fees, invoices, payments, and financial reports |
| `PARENT` | School (Scoped) | Guardians with access only to their own children via `/parents/me/*` |
| `STUDENT` | School (Scoped) | Students with access to own academic records |
| `LIBRARIAN` | School | Library catalog and book loan management |
| `TRANSPORT_MANAGER` | School | Fleet, routes, drivers, and transport subscriptions |

---

## 3. Architecture

﻿# Architecture

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

...

*See [ARCHITECTURE.md](ARCHITECTURE.md) for complete architecture details.*

---

## 4. Technology Stack

### Backend

| Technology | Version | Purpose |
|---|---|---|
| Node.js | >=20.0.0 | Runtime |
| Express | 4.x | Web framework |
| TypeScript | 5.7.2 | Language |
| Prisma | 6.x | ORM |
| MySQL | 8.4 | Database |
| Socket.IO | 4.8 | Realtime communication |
| Zod | Latest | Schema validation |
| Pino | Latest | Logging |
| Helmet | Latest | Security headers |
| bcrypt | Latest | Password hashing |
| jsonwebtoken | Latest | JWT authentication |

### Web

| Technology | Version | Purpose |
|---|---|---|
| React | 18.3.1 | UI framework |
| Vite | 6.0.7 | Build tool |
| TypeScript | 5.7.2 | Language |
| React Router | 6.28.0 | Routing |
| Recharts | 3.10.1 | Charts |
| Socket.IO Client | 4.8.4 | Realtime |
| Lucide React | 1.57.0 | Icons |
| XLSX | 0.18.5 | Spreadsheet handling |
| Vitest | 2.1.8 | Testing |

### Mobile

| Technology | Version | Purpose |
|---|---|---|
| React Native | 0.76.9 | Framework |
| Expo | 52.0.0 | Development platform |
| TypeScript | 5.7.2 | Language |
| React Navigation | 6.x | Navigation |
| React Native Reanimated | 3.16.1 | Animations |
| Socket.IO Client | 4.8.4 | Realtime |
| Lucide React Native | 1.57.0 | Icons |
| Jest | 29.7.0 | Testing |

---

## 5. Authentication & Authorization

# Roles and Permissions Reference

**Source of truth:** `packages/shared/src/rbac/permissions.ts` and `roles.ts`.
**Scale:** 9 roles · 61 permissions.

The same catalogue is consumed by the backend (`requirePermission`, `authorize`), the web
app (`can(role, permission)`) and the mobile app (`can(role, permission)`), so the UI and
the API always agree on what a role may do.

---

## 1. Roles (9)

| Role | Label | Scope | Purpose |
|---|---|---|---|
| `SUPER_ADMIN` | Super Admin | Platform | Owns the platform. Wildcard permissions; the only role that can read across schools or grant itself another role. |
| `PRINCIPAL` | Principal | School | The academic head. Everything an admin can do, plus results management and the audit log. |
| `ADMIN` | Admin | School | Day-to-day school operations. Nearly the full surface except audit logs, school settings edits and result management. |
| `TEACHER` | Teacher | School | Teaching staff, scoped to their own sections and subjects. |
| `ACCOUNTANT` | Accountant | School | Fees, invoices, payments and the finance reports. |
| `PARENT` | Parent | School | Guardians. Read access is limited to notices, notifications and messages; child data comes only from the scoped parent-portal endpoints. |
| `STUDENT` | Student | School | Pupils. Read access to their own academic records. |
| `LIBRARIAN` | Librarian | School | Library catalogue and loans. |
| `TRANSPORT_MANAGER` | Transport Manager | School | Fleet, routes, drivers and transport subscriptions. |

`SCHOOL_SCOPED_ROLES` lists the eight roles that must always belong to a school
(`SUPER_ADMIN` is excluded, so a super admin may be schoolless).

---

## 2. Permission catalogue (61)

Permissions are `<resource>:<action>` strings. Read and manage variants exist for every
domain.

| Domain | Read | Manage / write |
|---|---|---|
| Users | `user:read` | `user:create`, `user:update`, `user:delete` |
| School | `school:read` | `school:update` |
| Students | `student:read` | `student:create`, `student:update`, `student:delete` |
| Admissions | `admission:read` | `admission:manage` |
| Service requests | `request:read` | `request:manage` |
| Teachers | `teacher:read` | `teacher:manage` |
| Parents | `parent:read` | `parent:manage` |
| Classes & sections | `class:read` | `class:manage` |
| Subjects | `subject:read` | `subject:manage` |
| Attendance | `attendance:read` | `attendance:mark`, `attendance:manage` |
| Homework | `homework:read` | `homework:manage` |
| Timetable | `timetable:read` | `timetable:manage` |
| Syllabus | `syllabus:read` | `syllabus:manage` |
| Lesson plans | `lesson:read` | `lesson:manage` |
| Learning content | `content:read` | `content:manage` |
| Exams | `exam:read` | `exam:manage` |
| Results | `result:read` | `result:manage` |
| Fees | `fee:read` | `fee:manage` |
| Invoices | `invoice:read` | `invoice:manage` |
| Payments | `payment:read` | `payment:manage` |
| Library | `library:read` | `library:manage` |
| Book loans | `loan:read` | `loan:manage` |
| Transport | `transport:read` | `transport:manage` |
| Notices | `notice:read` | `notice:manage` |
| Reports | `report:read` | — |
| Audit log | `audit:read` | — |
| Academic structure | `academic:read` | `academic:manage` |
| Notifications | `notification:read` | `notification:manage` |
| Messages | `message:read` | `message:manage` |

**Attendance has three levels** — `attendance:read` sees records, `attendance:mark` records
daily attendance (teachers and super admins), `attendance:manage` edits or deletes existing
records (admins only).

---

## 3. Full permission matrix

`✔` = granted · `—` = not granted. `SUPER_ADMIN` holds `*` (every permission) and is
omitted from the table for width; see §4 for the exceptions that still apply to it.

| Permission | Principal | Admin | Teacher | Accountant | Librarian | Transport Mgr | Parent | Student |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| `user:read` | ✔ | ✔ | — | — | — | — | — | — |
| `user:create` | ✔ | ✔ | — | — | — | — | — | — |
| `user:update` | ✔ | ✔ | — | — | — | — | — | — |
| `user:delete` | — | — | — | — | — | — | — | — |
| `school:read` | ✔ | ✔ | — | — | — | — | — | — |
| `school:update` | — | — | — | — | — | — | — | — |
| `student:read` | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | — | — |
| `student:create` | ✔ | ✔ | — | — | — | — | — | — |
| `student:update` | ✔ | ✔ | — | — | — | — | — | — |
| `student:delete` | — | — | — | — | — | — | — | — |
| `admission:read` | ✔ | ✔ | — | — | — | — | — | — |
| `admission:manage` | ✔ | ✔ | — | — | — | — | — | — |
| `request:read` | ✔ | ✔ | ✔ | — | — | — | — | — |
| `request:manage` | ✔ | ✔ | — | — | — | — | — | — |
| `teacher:read` | ✔ | ✔ | — | — | — | — | — | — |
| `teacher:manage` | ✔ | ✔ | — | — | — | — | — | — |
| `parent:read` | ✔ | ✔ | — | — | — | — | — | — |
| `parent:manage` | ✔ | ✔ | — | — | — | — | — | — |
| `class:read` | ✔ | ✔ | ✔ | — | — | — | — | — |
| `class:manage` | ✔ | ✔ | — | — | — | — | — | — |
| `subject:read` | ✔ | ✔ | ✔ | — | — | — | — | — |
| `subject:manage` | ✔ | ✔ | — | — | — | — | — | — |
| `attendance:read` | ✔ | ✔ | ✔ | — | — | — | — | ✔ |
| `attendance:mark` | — | — | ✔ | — | — | — | — | — |
| `attendance:manage` | ✔ | ✔ | — | — | — | — | — | — |
| `homework:read` | ✔ | ✔ | ✔ | — | — | — | — | ✔ |
| `homework:manage` | ✔ | ✔ | ✔ | — | — | — | — | — |
| `timetable:read` | ✔ | ✔ | ✔ | — | — | — | — | ✔ |
| `timetable:manage` | ✔ | ✔ | — | — | — | — | — | — |
| `syllabus:read` | ✔ | ✔ | ✔ | — | — | — | — | ✔ |
| `syllabus:manage` | ✔ | ✔ | — | — | — | — | — | — |
| `lesson:read` | ✔ | ✔ | ✔ | — | — | — | — | ✔ |
| `lesson:manage` | ✔ | ✔ | ✔ | — | — | — | — | — |
| `content:read` | ✔ | ✔ | ✔ | — | — | — | — | ✔ |
| `content:manage` | ✔ | ✔ | ✔ | — | — | — | — | — |
| `exam:read` | ✔ | ✔ | ✔ | — | — | — | — | — |
| `exam:manage` | ✔ | ✔ | — | — | — | — | — | — |
| `result:read` | ✔ | ✔ | ✔ | — | — | — | — | ✔ |
| `result:manage` | ✔ | — | ✔ | — | — | — | — | — |
| `fee:read` | ✔ | ✔ | — | ✔ | — | — | — | — |
| `fee:manage` | — | — | — | ✔ | — | — | — | — |
| `invoice:read` | ✔ | ✔ | — | ✔ | — | — | — | ✔ |
| `invoice:manage` | — | — | — | ✔ | — | — | — | — |
| `payment:read` | ✔ | — | — | ✔ | — | — | — | — |
| `payment:manage` | — | — | — | ✔ | — | — | — | — |
| `library:read` | ✔ | — | — | — | ✔ | — | — | — |
| `library:manage` | — | — | — | — | ✔ | — | — | — |
| `loan:read` | ✔ | — | — | — | ✔ | — | — | — |
| `loan:manage` | — | — | — | — | ✔ | — | — | — |
| `transport:read` | ✔ | ✔ | — | — | — | ✔ | — | — |
| `transport:manage` | ✔ | ✔ | — | — | — | ✔ | — | — |
| `notice:read` | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| `notice:manage` | ✔ | ✔ | — | — | — | — | — | — |
| `report:read` | ✔ | ✔ | ✔ | ✔ | — | — | — | — |
| `audit:read` | ✔ | — | — | — | — | — | — | — |
| `academic:read` | ✔ | ✔ | ✔ | ✔ | — | — | — | ✔ |
| `academic:manage` | ✔ | ✔ | — | — | — | — | — | — |
| `notification:read` | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| `notification:manage` | ✔ | ✔ | — | — | — | — | — | — |
| `message:read` | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| `message:manage` | ✔ | ✔ | — | — | — | — | — | — |

### 3.1 Permission counts

| Role | Permissions granted |
|---|---|
| `SUPER_ADMIN` | 61 (wildcard `*`) |
| `PRINCIPAL` | 51 |
| `ADMIN` | 47 |
| `TEACHER` | 22 |

...

*See [RBAC.md](RBAC.md) for complete permission matrix and enforcement details.*

---

## 6. Data Model

# Database Reference

**Engine:** MySQL 8 (Prisma `prisma-client-js`).
**Schema file:** `apps/backend/prisma/schema.prisma` — **45 models**, **26 enums**.
**Connection:** `DATABASE_URL` env var.

---

## 1. Conventions

| Convention | Rule |
|---|---|
| Primary keys | `String @id @default(cuid())` on every model |
| Timestamps | `createdAt DateTime @default(now())` and `updatedAt DateTime @updatedAt` on mutable models |
| Money | `Decimal(10, 2)` for amounts, `Decimal(8, 2)` for fines and fares, `Decimal(6, 2)` for marks |
| Dates | `@db.Date` for calendar dates (no time component) |
| Long text | `@db.Text` for free-form bodies, `@db.MediumText` for base64 photos |
| School scoping | Most models carry `schoolId` with `onDelete: Cascade` from `School` |
| Optional links | `onDelete: SetNull` so removing a parent never deletes history |
| Soft deletes | `StudentProfile.status = INACTIVE`, `User.isActive = false`, `TeacherProfile.status` |
| Geo | `RouteStop.latitude/longitude` as `Decimal(10, 7)` |

### 1.1 Referential-delete policy

| Parent → child | Policy |
|---|---|
| `School` → nearly everything | `Cascade` — deleting a school removes its world |
| `User` → `RefreshToken`, `StudentProfile`, `TeacherProfile`, `Guardian` | `Cascade` (a login and its profile are one thing) |
| `User` → `Section.classTeacher`, `Attendance.recordedBy`, `Payment.receivedBy`, `Notice.createdBy`, `AuditLog.user`, `Admission.createdBy` | `SetNull` — the record survives the account |
| `Section` → `StudentProfile` | `SetNull` — deleting a section un-enrolls students rather than deleting them |
| `AcademicYear` → `FeeStructure`, `Invoice`, `Exam`, `TeacherAssignment`, `Attendance`, `TransportSubscription`, `Admission` | `Cascade` |
| `FeeStructure` → `InvoiceItem` | `SetNull` — the invoice line survives a fee-structure change |

---

## 2. Enums (26)

| Enum | Values | Default |
|---|---|---|
| `Role` | `SUPER_ADMIN`, `PRINCIPAL`, `ADMIN`, `TEACHER`, `ACCOUNTANT`, `PARENT`, `STUDENT`, `LIBRARIAN`, `TRANSPORT_MANAGER` | — |
| `Gender` | `MALE`, `FEMALE`, `OTHER` | — |
| `StudentStatus` | `ACTIVE`, `INACTIVE`, `GRADUATED`, `TRANSFERRED`, `SUSPENDED` | `ACTIVE` |
| `EmploymentStatus` | `ACTIVE`, `ON_LEAVE`, `RESIGNED`, `TERMINATED` | `ACTIVE` |
| `Designation` | `PROFESSOR`, `ASSOCIATE_PROFESSOR`, `ASSISTANT_PROFESSOR`, `LECTURER`, `OTHER` | `OTHER` |
| `EmploymentType` | `FULL_TIME`, `PART_TIME`, `CONTRACT`, `VISITING` | `FULL_TIME` |
| `AttendanceStatus` | `PRESENT`, `ABSENT`, `LATE`, `EXCUSED`, `HALF_DAY` | `PRESENT` |
| `ExamType` | `UNIT_TEST`, `MIDTERM`, `FINAL`, `QUIZ`, `PRACTICAL` | `UNIT_TEST` |
| `InvoiceStatus` | `DRAFT`, `ISSUED`, `PARTIALLY_PAID`, `PAID`, `OVERDUE`, `CANCELLED` | `ISSUED` |
| `PaymentMethod` | `CASH`, `CARD`, `BANK_TRANSFER`, `ONLINE`, `CHEQUE`, `OTHER` | `CASH` |
| `LoanStatus` | `BORROWED`, `RETURNED`, `OVERDUE`, `LOST` | `BORROWED` |
| `TransportStatus` | `ACTIVE`, `SUSPENDED`, `CANCELLED` | `ACTIVE` |
| `GuardianRelation` | `FATHER`, `MOTHER`, `GUARDIAN`, `OTHER` | — |
| `FeeFrequency` | `ONE_TIME`, `MONTHLY`, `QUARTERLY`, `ANNUAL` | `ANNUAL` |
| `VehicleStatus` | `ACTIVE`, `MAINTENANCE`, `INACTIVE` | `ACTIVE` |
| `VehicleType` | `BUS`, `VAN` | `BUS` |
| `NotificationType` | `GENERAL`, `NOTICE`, `ATTENDANCE`, `INVOICE`, `PAYMENT`, `FEE`, `EXAM`, `RESULT`, `TRANSPORT`, `MESSAGE` | `GENERAL` |
| `SubmissionStatus` | `PENDING`, `SUBMITTED`, `LATE`, `GRADED` | `PENDING` |
| `SyllabusStatus` | `NOT_STARTED`, `IN_PROGRESS`, `COMPLETED` | `NOT_STARTED` |
| `Weekday` | `MONDAY`…`SUNDAY` | — |
| `AdmissionStatus` | `ENQUIRY`, `APPLIED`, `UNDER_REVIEW`, `APPROVED`, `REJECTED`, `ENROLLED` | `ENQUIRY` |
| `AdmissionSource` | `WALK_IN`, `PHONE`, `WEBSITE`, `REFERRAL`, `ADVERTISEMENT`, `OTHER` | `WALK_IN` |
| `LessonPlanStatus` | `DRAFT`, `PLANNED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED` | `PLANNED` |
| `LearningContentType` | `LINK`, `DOCUMENT`, `VIDEO`, `IMAGE`, `NOTE` | `LINK` |
| `ServiceRequestType` | `BONAFIDE_CERTIFICATE`, `TRANSFER_CERTIFICATE`, `CHARACTER_CERTIFICATE`, `STUDY_CERTIFICATE`, `LEAVE`, `COMPLAINT`, `OTHER` | `OTHER` |
| `ServiceRequestStatus` | `PENDING`, `APPROVED`, `REJECTED`, `COMPLETED`, `CANCELLED` | `PENDING` |

---

## 3. Model reference (45)

### 3.1 Identity and tenancy

#### `School`
The tenant root.

| Field | Type | Notes |
|---|---|---|
| `id` | String | cuid, PK |
| `name` | String | |
| `code` | String | **unique** — the human tenant key |
| `email` / `phone` | String? | |
| `address` | String? | `@db.Text` |
| `logoUrl` | String? | |
| `timezone` | String | default `UTC` |
| `currency` | String | default `INR` — ISO 4217, exactly 3 chars |
| `isActive` | Boolean | default `true` |

**Indexes** — `@@index([isActive])`.
**Cascade children** — users, academic years, class levels, sections, subjects, teacher and
student profiles, guardians, fee categories and structures, invoices, books, vehicles,
drivers, transport routes, notices, audit logs, exams, notifications, homework, timetable
entries, syllabus units, conversations, admissions, lesson plans, learning content and
service requests.

#### `User`
The login account. Exactly one profile may attach.

| Field | Type | Notes |
|---|---|---|
| `id` | String | cuid, PK |
| `email` | String | **unique** |
| `passwordHash` | String | bcrypt |
| `firstName` / `lastName` | String | |
| `phone` | String? | |
| `role` | Role | |
| `avatarUrl` | String? | |
| `isActive` | Boolean | default `true` |
| `emailVerifiedAt` | DateTime? | |
| `lastLoginAt` | DateTime? | |
| `schoolId` | String? | `SetNull` — super admins may have no school |

**Indexes** — `@@index([schoolId])`, `@@index([role])`.
**Optional profiles** — `studentProfile`, `teacherProfile`, `guardianProfile` (each 1:1).
**Relations** — refresh tokens, audit logs, notices authored, attendance taken, book loans
borrowed and issued, payments received, notifications, conversations created and joined,
messages sent, admissions created, lesson plans created, learning content created, service
requests raised and handled.

#### `RefreshToken`


...

*See [DATABASE.md](DATABASE.md) for complete schema with all 44 models and 27 enums.*

---

## 7. API Reference

The backend exposes **235 REST endpoints** across **44 modules** at `http://localhost:4000/api/v1`.

### Endpoint Distribution by Domain

| Domain | Modules | Endpoints |
|---|---|---|
| Identity & Access | 7 | 48 |
| Admissions & Requests | 3 | 13 |
| Academics | 7 | 32 |
| Timetable & Curriculum | 4 | 21 |
| Assessment & Attendance | 6 | 32 |
| Finance | 3 | 21 |
| Library | 2 | 10 |
| Transport | 6 | 26 |
| Communication | 3 | 21 |
| Reporting & Audit | 2 | 9 |
| System | 1 | 2 |

### Common Conventions

- **Base URL**: `http://localhost:4000/api/v1`
- **Authentication**: `Authorization: Bearer <accessToken>` (15 min) with httpOnly refresh token (7 days)
- **Response Envelope**: `{ success: boolean, data?: any, meta?: {...}, error?: {...} }`
- **Pagination**: `?page=1&limit=20&search=...&sortBy=...&sortOrder=asc|desc`
- **Rate Limiting**: Global (100 req/15 min), stricter on auth endpoints
- **Multi-tenancy**: All school-scoped data filtered by user's school (SUPER_ADMIN can cross schools)

*See [API.md](API.md) for complete endpoint documentation with request/response details.*

---

## 8. Web Application

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


...

*See [WEB.md](WEB.md) for all routes, resources, and page details.*

---

## 9. Mobile Application

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
| **Overview** | Dashboard, My Dashboard (teacher), My Children (parent) |
| **My Child** | Attendance, Homework, Timetable, Results, Syllabus, Fees & invoices, Teachers, Transport, Announcements |
| **Teaching** | My Classes, My Students, Attendance, Assignments, Marks & Grades, Homework, Lesson Plans, Messages, Timetable |
| **Academics** | Student Details, Student Marks, Classes, Sections, Subjects, Attendance, Homework, Lesson Plans, Learning Content, Timetable |
| **School Operations** | Vehicle Details, Admissions, Messages |
| **Account** | My Profile, Notifications, Profile, Settings |
| **More** | Any permitted module not in the sections above |

The `academics` tab is deliberately omitted from the drawer (`PRIMARY_TAB_KEYS`) so the
menu never duplicates a destination already one tap away.

### 2.6 Nav filtering

`navItems.ts` declares **46 navigation entries** with `permission`, `anyPermission`, `roles` and
`excludeRoles` gates, exactly mirroring the web sidebar. `navForRole(role)` applies them

...

*See [MOBILE.md](MOBILE.md) for navigation, screens, and platform details.*

---

## 10. Core Features

# Features Catalogue

Complete feature inventory by domain, with API entry points and UI surfaces.

## Overview

| Metric | Count |
|---|---|
| REST endpoints | 235 |
| Backend modules | 44 |
| Prisma models | 44 |
| Prisma enums | 27 |
| Web routes (pages) | ~60 |
| Web resources | 32 |
| Mobile screens | 41 |
| Roles | 9 |
| Permissions | 61 |

## Identity & Access (48 endpoints)

- `/auth` — 9 endpoints
- `/users` — 5 endpoints
- `/students` — 6 endpoints
- `/teachers` — 8 endpoints
- `/guardians` — 7 endpoints
- `/parents` — 9 endpoints
- `/schools` — 4 endpoints

## Admissions & Requests (13 endpoints)

- `/admissions` — 5 endpoints
- `/service-requests` — 7 endpoints
- `/contact` — 1 endpoints

## Academics (32 endpoints)

- `/academic-years` — 5 endpoints
- `/terms` — 5 endpoints
- `/classes` — 6 endpoints
- `/sections` — 5 endpoints
- `/subjects` — 5 endpoints
- `/class-subjects` — 3 endpoints
- `/teacher-assignments` — 3 endpoints

## Timetable & Curriculum (21 endpoints)

- `/timetable` — 6 endpoints
- `/syllabus` — 5 endpoints
- `/lesson-plans` — 5 endpoints
- `/learning-content` — 5 endpoints

## Assessment & Attendance (32 endpoints)

- `/attendances` — 6 endpoints
- `/exams` — 5 endpoints
- `/exam-results` — 6 endpoints
- `/homework` — 5 endpoints
- `/homework-attachments` — 5 endpoints
- `/homework-submissions` — 5 endpoints

## Finance (21 endpoints)

- `/fees` — 9 endpoints
- `/invoices` — 7 endpoints
- `/payments` — 5 endpoints

## Library (10 endpoints)

- `/books` — 5 endpoints
- `/book-loans` — 5 endpoints

## Transport (26 endpoints)

- `/vehicles` — 5 endpoints
- `/drivers` — 5 endpoints
- `/transport-routes` — 5 endpoints
- `/route-stops` — 5 endpoints
- `/transport-subscriptions` — 5 endpoints
- `/vehicle/stats` — 1 endpoints

## Communication (21 endpoints)

- `/notices` — 5 endpoints
- `/notifications` — 6 endpoints
- `/conversations` — 10 endpoints

## Reporting & Audit (9 endpoints)

- `/reports` — 7 endpoints
- `/audit-logs` — 2 endpoints

## System (2 endpoints)

- `/health` — 2 endpoints

## Cross-cutting features

| Feature | Notes |
|---|---|
| Multi-tenancy | Every school-scoped query filters by `schoolId`; only `SUPER_ADMIN` can cross schools. |
| RBAC | 9 roles, 61 permissions, server-enforced with `requirePermission`/`authorize`. |
| Scoped access | Teachers → own sections/subjects; parents → own children via `/parents/me/*`. |
| Realtime | Socket.IO rooms per user/school/role; events for notices, attendance, homework, invoices, payments, notifications, messages. |
| Audit trail | Every mutation logged in `AuditLog` with actor, action, entity, IP, user agent. |
| Pagination | All lists paginated (1–100, default 20); envelopes with `success/data/meta`. |
| Validation | Zod schemas in `@smartschool/shared`; validated via middleware. |
| Timetable import | CSV/SQL bulk import with per-row validation, all-or-nothing. |
| Attendance summary | Weighted % `(present+late+halfDay×0.5)/total×100` with good/warning/critical bands. |
| Finance | Invoice totals recomputed from items minus discount; payments update balance/status. |
| Library fines/availability | Copies decremented on issue, restored on return; overdue detection. |
| Messaging | Conversations with participants, read cursors, teacher→students and parent→teacher scoped threads. |
| File/photos | Student/guardian photos as base64; learning content with URLs. |
| Jobs/scheduler | Periodic overdue-loan detection (every 6 h). |


---

## 11. Realtime & Background Jobs

### Realtime (Socket.IO)

The backend emits events to rooms based on user context:

| Room | Purpose |
|---|---|
| `user:{userId}` | Personal notifications and messages |
| `school:{schoolId}` | School-wide events (notices, attendance, invoices, payments) |
| `role:{role}` | Role-specific broadcasts |

**Events:** `connected`, `notice:created`, `attendance:marked`, `homework:assigned`, `invoice:created`, `payment:recorded`, `notification`, `message:created`

### Background Jobs

| Job | Interval | Purpose |
|---|---|---|
| `markOverdueLoans` | 6 hours | Marks borrowed books as OVERDUE when `dueAt < now`, clears `activeKey` |

---

## 12. Installation & Setup

﻿# SmartSchool - Installation

Prerequisites
- Node.js >= 20 (see .nvmrc)
- npm >= 10+
- MySQL 8.0+ or Docker
- Git

Quick Start
1. cd C:\Users\DELL\Desktop\sms
2. npm install
3. Copy-Item .env.example .env
4. Generate secrets: node -e "require('crypto').randomBytes(48).toString('hex')"; update .env
5. docker compose up -d mysql (or start local MySQL)
6. npm run build:shared
7. npm run db:migrate
8. npm run db:seed
9. npm run dev

API: http://localhost:4000/api/v1/health
Super Admin: set via SEED_SUPER_ADMIN_EMAIL/PASSWORD or generated on seed.



---

## 13. Development Workflow

﻿# Startup Guide

Development
- npm run dev (backend only for now)

Build
- npm run build (builds shared + backend)
- npm run start (runs backend from dist)

Checks
- npm run typecheck
- npm run lint
- npm run lint:fix
- npm run format
- npm run format:check
- npm test

DB
- npm run db:up (docker mysql)
- npm run db:down
- npm run db:migrate
- npm run db:deploy
- npm run db:seed
- npm run db:studio



---

## 14. Testing

### Backend
- **Framework:** Vitest 2.x
- **Test Files:** 26 suites
- **Location:** `apps/backend/src/**/*.test.ts`

### Web
- **Framework:** Vitest 2.x
- **Test Files:** 20 files
- **Location:** `apps/web/src/**/*.test.ts`

### Mobile
- **Framework:** Jest 29 + jest-expo
- **Test Files:** 2 suites
- **Location:** `apps/mobile/__tests__/*.test.tsx`

### Running Tests

```bash
npm test                    # Run all tests across workspaces
npm run test -w @smartschool/backend
npm run test -w @smartschool/web
npm run test -w @smartschool/mobile
```

---

## 15. Security Considerations

- **Authentication:** JWT access tokens (15min) + rotating httpOnly refresh tokens (7d)
- **Password Security:** bcrypt with configurable salt rounds (default 12)
- **Authorization:** Permission-based access control enforced at route level
- **Input Validation:** Zod schemas validate all request bodies, params, and queries
- **Rate Limiting:** Applied globally and with stricter limits on auth endpoints
- **Security Headers:** Helmet middleware enabled
- **CORS:** Configurable allowed origins
- **SQL Injection:** Prevented by Prisma ORM parameterized queries
- **Multi-tenancy:** School-level data isolation enforced in services
- **Audit Trail:** All mutations logged with actor, IP, and metadata
- **Token Rotation:** Refresh tokens rotate on each use and are revoked on logout/password change
- **User Enumeration:** Login returns identical errors for invalid email/password
- **Role-based Portal Access:** Wrong portal login returns specific error

---

## 16. Appendix

### Related Documentation

| Document | Description |
|---|---|
| [README.md](README.md) | Quick start and documentation index |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Detailed system architecture |
| [API.md](API.md) | Complete REST API reference (235 endpoints) |
| [WEB.md](WEB.md) | Web application documentation |
| [MOBILE.md](MOBILE.md) | Mobile application documentation |
| [DATABASE.md](DATABASE.md) | Database schema and models |
| [RBAC.md](RBAC.md) | Roles, permissions, and authorization |
| [FEATURES.md](FEATURES.md) | Feature catalogue by domain |
| [INSTALL.md](INSTALL.md) | Installation instructions |
| [STARTUP.md](STARTUP.md) | Startup and development guide |

### Environment Variables

See [.env.example](../.env.example) for all required configuration variables.

### Support

For issues and questions, refer to the repository structure and individual documentation files.

---

*This document was generated from the live codebase and serves as a comprehensive end-to-end reference for the SmartSchool application.*