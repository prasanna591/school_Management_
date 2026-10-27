# PSM School Management — Complete Documentation

**PSM School Management** is a multi-tenant School Management System for Matriculation / CBSE
private schools (targeting Tamil Nadu, India). It covers the full lifecycle of a school:
admissions, academic structure, teaching delivery, assessment, attendance, finance, transport,
library, communication and analytics.

It ships as **three applications** sharing one API and one database.

| Surface | Stack | Location | Purpose |
|---|---|---|---|
| **Web dashboard** | React 18 + Vite + TypeScript + React Router | `apps/web` | Principal / admin console + public marketing site |
| **Mobile app** | React Native 0.76 + Expo 52 + React Navigation | `apps/mobile` | Android/iOS app — teacher, parent and student role-based experiences |
| **Backend** | Express 4 + Prisma 6 + Socket.IO + Zod | `apps/backend` | REST API, realtime events, audit trail |

Shared code lives in `packages/shared` (roles, permissions, Zod schemas, grading rules,
attendance metrics, timetable-import parsing).

---

## Documentation index

| Document | Contents |
|---|---|
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | Monorepo layout, request pipeline, realtime, scheduling, testing, known risks |
| [`INSTALL.md`](./INSTALL.md) | Prerequisites, env vars, DB setup, seeding, mobile/web setup |
| [`STARTUP.md`](./STARTUP.md) | Every npm script, dev workflows, migrations, troubleshooting |
| [`API.md`](./API.md) | **Complete REST reference — all 235 endpoints**, auth, envelopes, pagination, errors |
| [`WEB.md`](./WEB.md) | **Every web page** — route, role, data sources, features, states; the 32-resource CRUD engine |
| [`MOBILE.md`](./MOBILE.md) | **Every mobile screen** — navigation graph, tabs, drawer, per-screen functionality |
| [`DATABASE.md`](./DATABASE.md) | **All 44 Prisma models**, 27 enums, constraints, relationships, money/decimal rules |
| [`RBAC.md`](./RBAC.md) | 9 roles, 57 permissions, full role×permission matrix, scoping rules |
| [`FEATURES.md`](./FEATURES.md) | Feature catalogue by module, with the API + UI entry points for each |

---

## Demonstration school (sample data)

The seed script provisions **Greenfield Matriculation Higher Secondary School** (`school code: DEMO`),
a fictional school used purely for the principal-facing demo. **All seeded records are sample data
and must not be treated as real school records.**

Demo accounts (password `demo1234` for every role):

| Role | Email | What they can demo |
|---|---|---|
| Principal / Administrator | `principal@demo.school` | Dashboard, students, teachers, attendance, homework, exams/marks, fees, timetable, announcements, complaints/leave |
| Teacher | `teacher@demo.school` | My classes, take attendance, create/publish homework, enter marks, timetable, leave |
| Parent | `parent@demo.school` | Child (Kavya Ramesh, Class 8-A) attendance, homework, results, timetable, fees, leave request, complaint |
| Student | `student@demo.school` | Own attendance, homework, timetable, published results, profile |

One-click demo login buttons appear on the web and mobile login screens when `DEMO_MODE=true`.

---

## The nine roles

| Role | Label | Scope |
|---|---|---|
| `SUPER_ADMIN` | Super Admin | Global — may read across every school |
| `PRINCIPAL` | Principal | Own school, near-full authority (incl. results, audit) |
| `ADMIN` | Admin | Own school, operational authority (no result management, no audit log) |
| `TEACHER` | Teacher | **Scoped to own sections/subjects/classes** |
| `ACCOUNTANT` | Accountant | Fees, invoices, payments, reports |
| `PARENT` | Parent | **Own children only** via `/parents/me/...` |
| `STUDENT` | Student | **Own attendance, homework, timetable, results, profile** via `/students/me/...` |
| `LIBRARIAN` | Librarian | Books, loans |
| `TRANSPORT_MANAGER` | Transport Manager | Vehicles, drivers, routes, stops, subscriptions |

Full detail: [`RBAC.md`](./RBAC.md).

---

## Module map — 44 modules, 235 endpoints

| Domain | Modules | Endpoints |
|---|---|---|
| **Identity** | auth, users, students, teachers, guardians, parents, schools | 46 |
| **Academics** | academic-years, terms, classes, sections, subjects, class-subjects, teacher-assignments, timetable, syllabus | 41 |
| **Assessment** | exams, results, attendance, homework (+attachments, submissions), lesson-plans, learning-content | 41 |
| **Finance** | fees, invoices, payments | 24 |
| **Transport** | vehicles, drivers, transport-routes, route-stops, transport-subscriptions, vehicle-stats | 25 |
| **Library** | books, book-loans | 10 |
| **Communication** | notices, notifications, messaging (conversations), service-requests, contact | 27 |
| **Reporting** | reports, audit-logs | 9 |
| **Ops** | health | 2 |

Every endpoint is listed in [`API.md`](./API.md).

---

## Feature highlights

- **Role-scoped everything.** Teachers see only their own sections; parents see only their own
  children; students see only their own records. Scoping is enforced server-side, not just in the UI.
- **Realtime.** Socket.IO rooms per user, school and role. Live notifications, messages, attendance
  marks, homework, invoices and payments.
- **Generic CRUD engine.** 32 resource types on web, 19 on mobile — all driven by declarative
  column/field configs with Zod validation, pagination, search and row actions.
- **Rich reporting.** University dashboard, attendance/fees/enrollment reports, report cards,
  joining-growth analytics.
- **Bulk timetable import.** CSV or SQL paste with per-row validation, alias-tolerant headers,
  Excel day-fraction times, and all-or-nothing writes.
- **Audit trail.** Every mutation is recorded (actor, action, entity, IP, user agent) and is
  queryable by permitted roles.
- **Graceful degradation.** Every screen has explicit loading / empty / error / forbidden states.
- **Demo mode.** One-click role switching on login, clearly labelled simulated payments (never real
  banking details), and sample data marked as such.

---

## Quick start (short form)

```bash
cp .env.example .env          # fill in secrets + DATABASE_URL
npm install
npm run build:shared
docker compose up -d mysql     # or use your own MySQL 8
npm run db:migrate
npm run db:seed:demo           # seeds Greenfield Matriculation + demo accounts
npm run dev                    # backend on :4000
npm run dev -w @smartschool/web      # web on :5173
npx expo start -w @smartschool/mobile # Expo mobile
```

Full details: [`INSTALL.md`](./INSTALL.md) and [`STARTUP.md`](./STARTUP.md).
