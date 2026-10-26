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
