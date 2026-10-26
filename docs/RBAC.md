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
| `ACCOUNTANT` | 12 |
| `STUDENT` | 12 |
| `LIBRARIAN` | 8 |
| `TRANSPORT_MANAGER` | 6 |
| `PARENT` | 3 |

---

## 4. Deliberate asymmetries

The matrix is not uniform on purpose. The notable splits:

| Split | Why |
|---|---|
| `result:manage` → Principal, Teacher, **not Admin** | Admins can read results and report cards, but only academic staff (and teachers for their own classes) write marks. |
| `attendance:mark` → Teacher, **not Admin** | Teachers mark their own registers. Admins get `attendance:manage` (edit/delete) but not the marking permission, so marking stays with classroom staff. |
| `fee:manage` / `invoice:manage` / `payment:manage` → **Accountant only** | Finance writes are restricted to the finance role even for admins. |
| `library:*` / `loan:*` → **Librarian only** | The library domain belongs to the librarian. |
| `audit:read` → Principal only | Audit history is for the academic head. |
| `user:delete`, `student:delete`, `school:update` → **Super Admin only** | Destructive and platform-level operations are reserved for the platform owner. |
| `request:read` → Teacher included | Teachers must see the service requests raised for their students. |
| `report:read` → no Librarian / Transport Manager | Those roles have no reporting need; they work from their own module screens. |
| `parent` holds only 3 permissions | Deliberate. A parent's child data is served exclusively by `/parents/me/children/*`, which verifies the link server-side. The parent has no generic `student:read`, so there is no route through which a parent could list every student. |

---

## 5. Enforcement

### 5.1 Backend

Two middlewares in `apps/backend/src/middleware/authorize.ts`:

```ts
authorize(...roles: Role[])            // role allow-list
requirePermission(...permissions)      // permission check (every one must be held)
```

| Guard | Failure |
|---|---|
| `authenticate` (no session / bad token) | `401 Unauthorized` |
| `authorize(Role.X)` | `403 Your role is not allowed to perform this action` |
| `requirePermission(P.X)` | `403 You do not have permission to perform this action` |
| School scope mismatch | `403` — the record belongs to another school |

The pattern on every router module is:

```ts
router.use(authenticate);                         // every route in the module needs a session
router.get('/', requirePermission(Permission.X_READ), handler);
router.post('/', requirePermission(Permission.X_MANAGE), handler);
```

### 5.2 Frontend

Both clients use the same shared helpers, so a hidden control always matches the API's
verdict:

```ts
can(role, permission)                     // shared/rbac
getPermissionsForRole(role)               // shared/rbac
hasPermission(role, permission)           // shared/rbac
hasAnyPermission(role, permissions)       // shared/rbac
```

- **Web** — `apps/web/src/lib/permissions.ts` drives `nav.ts` (sidebar), `App.tsx`
  (`RequireRole`) and `resources.tsx` (which buttons to render).
- **Mobile** — `apps/mobile/src/lib/permissions.ts` drives `navigation/navItems.ts`
  (drawer + Academics hub) and `MainTabs.tsx` (bottom tabs).

Hiding is a convenience only. The API re-checks every request.

---

## 6. Scoping rules on top of permissions

Permissions decide *whether* an action is allowed. Scoping decides *whose* data it may
touch. These are enforced in the services, independently of the role matrix.

| Rule | Enforcement |
|---|---|
| School isolation | Every school-scoped query filters on `req.user.schoolId`. Only `SUPER_ADMIN` may read across schools, and only with an explicit `schoolId`. |
| Teacher → sections | A teacher's sections come from `TeacherAssignment` plus `Section.classTeacherId`. Students, attendance, homework, marks and messages are all filtered through those section ids. |
| Teacher → subjects | Within their sections, teachers may only act on subjects they are allocated. |
| Teacher → homework authorship | The homework creator is always the signed-in teacher; a client-supplied `teacherId` is ignored. |
| Parent → children | The parent's `StudentGuardian` links are resolved first; every `/parents/me/children/:studentId/*` call verifies the link and returns `403` otherwise. |
| Student → self | Students read their own records only. |
| Conversation participants | Only participants (or an administrator) may read or write a thread; others get `403 You are not part of this conversation`. |
| Audit log | Super admins see everything; school admins see their own school; anyone else gets `403 You do not have access to this audit log`. |

---

## 7. Adding a permission

1. Add the constant to `Permission` in `packages/shared/src/rbac/permissions.ts`.
2. Grant it to the relevant roles in `ROLE_PERMISSIONS`.
3. Guard the backend route with `requirePermission(Permission.X)`.
4. Reference it in `apps/web/src/resources.tsx` (if the resource gains an action) and/or in
   `apps/web/src/nav.ts` and `apps/mobile/src/navigation/navItems.ts` (if it unlocks a page).
5. Add a case to the matrix in `docs/RBAC.md`.

Because all three apps import the same package, no client-side rebuild of a permission
table is needed — a single change propagates everywhere.
