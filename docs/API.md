# REST API Reference

**Base URL:** `http://localhost:4000/api/v1` (prefix configurable via `API_PREFIX`).

**Total endpoints: 235** across 44 modules.

---

## 1. Conventions

### 1.1 Response envelope

Every response uses a consistent envelope.

**Success**

```json
{
  "success": true,
  "data": { "...": "..." },
  "meta": { "page": 1, "limit": 20, "total": 137, "totalPages": 7 }
}
```

`meta` is present only on paginated list endpoints.

**Error**

```json
{
  "success": false,
  "error": {
    "message": "Section \"Grade 5 - A\" is full (10/10 students)",
    "code": "BAD_REQUEST",
    "details": { "issues": [{ "path": ["capacity"], "message": "..." }] }
  }
}
```

### 1.2 Authentication

```http
Authorization: Bearer <accessToken>
```

Access tokens live 15 minutes by default; refresh tokens 7 days and rotate on every use.
Clients get `401` when the access token expires — re-issue via `POST /auth/refresh` and retry.

### 1.3 Pagination

Query parameters on list endpoints:

| Param | Default | Range |
|---|---|---|
| `page` | `1` | ≥ 1 |
| `limit` | `20` | 1–100 (`50` for messages and syllabus) |
| `search` | — | 1–120 chars, trimmed |
| `sortBy` | — | 1–60 chars (where supported) |
| `sortOrder` | `desc` | `asc` \| `desc` |

### 1.4 Status codes

| Code | Meaning |
|---|---|
| `200` | OK |
| `201` | Created |
| `400` | Validation failed, or a referenced entity is invalid / belongs to another school |
| `401` | Missing/invalid/expired token, or bad credentials |
| `403` | Authenticated but not permitted (role, permission, scope, or "not linked to a school") |
| `404` | Record not found |
| `409` | Conflict — duplicate email, unique constraint, record still referenced |
| `429` | Rate limited |
| `500` | Unhandled server error |

### 1.5 Rate limiting

| Scope | Window | Max |
|---|---|---|
| Global | `RATE_LIMIT_WINDOW_MS` (default 15 min) | `RATE_LIMIT_MAX` (default 100) |
| Auth endpoints | `RATE_LIMIT_WINDOW_MS` | stricter limiter |

### 1.6 Multi-tenancy

All school-scoped endpoints are automatically limited to the caller's school. Only
`SUPER_ADMIN` may read across schools, and only when it passes an explicit `schoolId`.

---

## 2. Authentication — `/auth`

| Method | Path | Permission | Auth | Purpose |
|---|---|---|---|---|
| `POST` | `/auth/login` | — | no | Generic sign-in (any role) |
| `POST` | `/auth/login/admin` | — | no | Admin portal sign-in (admin roles only) |
| `POST` | `/auth/login/teacher` | — | no | Teacher portal sign-in |
| `POST` | `/auth/login/parent` | — | no | Parent portal sign-in |
| `POST` | `/auth/refresh` | — | no | Rotate the access/refresh token pair |
| `POST` | `/auth/logout` | — | no | Revoke the current refresh token |
| `GET` | `/auth/me` | — | **yes** | Current user profile |
| `POST` | `/auth/change-password` | — | **yes** | Change own password (revokes all refresh tokens) |
| `POST` | `/auth/register` | `USER_CREATE` | **yes** | Create a user account |

**Request bodies**

`POST /auth/login*` — `{ "email": "...", "password": "..." }` (password ≥ 8 chars).
Response — `{ "user": { id, email, firstName, lastName, role, schoolId, ... }, "accessToken": "..." }`.

`POST /auth/refresh` — body `{}`; the refresh token is read from the httpOnly cookie.

`POST /auth/change-password` — `{ "currentPassword": "...", "newPassword": "..." }`
(new password ≥ 8 chars, must contain a letter and a number).

`POST /auth/register` — `{ email, password, firstName, lastName, phone?, role, schoolId? }`.

**Errors** — unknown *or* inactive user → `401 Invalid email or password` (identical message,
no user enumeration). Wrong portal → `401 This account cannot sign in through this portal`.

---

## 3. Health — `/health`

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/health` | no | Liveness probe |
| `GET` | `/health/ready` | no | Readiness probe (database connectivity) |

---

## 4. Users — `/users`

| Method | Path | Permission | Purpose |
|---|---|---|---|
| `GET` | `/users` | `USER_READ` | List users (filter `role`, `isActive`, `search`) |
| `POST` | `/users` | `USER_CREATE` | Create a user |
| `GET` | `/users/:id` | `USER_READ` | Fetch one user |
| `PATCH` | `/users/:id` | `USER_UPDATE` | Update name, phone, role, avatar, `isActive` |
| `DELETE` | `/users/:id` | `USER_DELETE` | Deactivate a user (revokes refresh tokens) |

**Rules** — only a `SUPER_ADMIN` may create or grant `SUPER_ADMIN` (`403`). You cannot
deactivate yourself (`400`). Email and password are **not** editable here — use
`/auth/change-password` or the role-specific reset endpoints. A non-super-admin can only
manage users in their own school.

---

## 5. Schools — `/schools`

| Method | Path | Permission | Purpose |
|---|---|---|---|
| `GET` | `/schools` | `SCHOOL_READ` | List schools |
| `GET` | `/schools/:id` | `SCHOOL_READ` | Fetch one school |
| `PATCH` | `/schools/:id` | `SCHOOL_UPDATE` | Update school settings |
| `GET` | `/schools/me` | — | The caller's own school |

**Update fields** — `name`, `code` (unique), `email`, `phone`, `address`, `logoUrl`,
`timezone`, `currency` (ISO 4217, exactly 3 chars), `isActive`.
Duplicate code → `400 School code is already in use`.

---

## 6. Students — `/students`

| Method | Path | Permission | Purpose |
|---|---|---|---|
| `GET` | `/students` | `STUDENT_READ` | List students (filter `sectionId`, `status`, `search`) |
| `POST` | `/students` | `STUDENT_CREATE` | Enroll a student |
| `GET` | `/students/:id` | `STUDENT_READ` | Fetch one student |
| `PATCH` | `/students/:id` | `STUDENT_UPDATE` | Update roll no, section, status, address, phone |
| `PATCH` | `/students/:id/photo` | `STUDENT_UPDATE` | Set or clear the student photo |
| `DELETE` | `/students/:id` | `STUDENT_DELETE` | Soft delete (`status = INACTIVE`) |

**Create fields** — `firstName*`, `lastName*`, `admissionNo*`, `admissionDate*`,
`dateOfBirth*`, `gender*`, plus optional `email`, `password`, `phone`, `rollNo`, `sectionId`,
`bloodGroup`, `address`, `guardianIds[]`.

**Rules** — providing `email` + `password` creates a linked login account (role `STUDENT`);
duplicate email → `409`. Section capacity is enforced → `400 Section "<name>" is full
(n/capacity)`. Profile identity fields are immutable after creation. Teachers see only
students in their own sections.

**Photo** — `{ photoUrl: "data:image/png;base64,..." }`; must be PNG/JPEG/WebP base64,
≤ ~1.5 MB. Send `null` or `""` to clear.

---

## 7. Admissions — `/admissions`

| Method | Path | Permission | Purpose |
|---|---|---|---|
| `GET` | `/admissions` | `ADMISSION_READ` | List admissions (filter `status`, `classLevelId`, `academicYearId`) |
| `POST` | `/admissions` | `ADMISSION_MANAGE` | Create an admission lead |
| `GET` | `/admissions/:id` | `ADMISSION_READ` | Fetch one admission |
| `PATCH` | `/admissions/:id` | `ADMISSION_MANAGE` | Update the lead |
| `DELETE` | `/admissions/:id` | `ADMISSION_MANAGE` | Delete the lead |

**Fields** — `applicantName*`, `guardianName*`, `guardianPhone*`, plus optional
`dateOfBirth`, `gender`, `guardianEmail`, `address`, `previousSchool`, `classLevelId`,
`academicYearId`, `status`, `source`, `notes`, `followUpDate`.

**Pipeline** — `status`: `ENQUIRY → APPLIED → UNDER_REVIEW → APPROVED | REJECTED → ENROLLED`
(default `ENQUIRY`). `source`: `WALK_IN`, `PHONE`, `WEBSITE`, `REFERRAL`, `ADVERTISEMENT`,
`OTHER` (default `WALK_IN`).

---

## 8. Teachers — `/teachers`

| Method | Path | Permission | Purpose |
|---|---|---|---|
| `GET` | `/teachers` | `TEACHER_READ` | List teachers (filter `status`, `designation`, `employmentType`) |
| `POST` | `/teachers` | `TEACHER_MANAGE` | Create a teacher + login account |
| `GET` | `/teachers/:id` | `TEACHER_READ` | Fetch one teacher |
| `PATCH` | `/teachers/:id` | `TEACHER_MANAGE` | Update the teacher profile |
| `DELETE` | `/teachers/:id` | `TEACHER_MANAGE` | Soft delete (`status = INACTIVE`) |
| `POST` | `/teachers/:id/reset-password` | `TEACHER_MANAGE` | Reset the password, revoke refresh tokens |
| `PATCH` | `/teachers/:id/status` | `TEACHER_MANAGE` | Set employment status |
| `GET` | `/teachers/me` | — | The caller's own teacher profile + scope |

**Create fields** — `email*` (required so the teacher can sign in), `firstName*`, `lastName*`,
`employeeNo*`, `joiningDate*`, plus optional `password`, `phone`, `qualification`,
`specialization`, `designation`, `employmentType`.

**Rules** — missing email → `400 An email address is required so the teacher can sign in`;
duplicate email → `409`. `designation`: `PROFESSOR`, `ASSOCIATE_PROFESSOR`,
`ASSISTANT_PROFESSOR`, `LECTURER`, `OTHER`. `employmentType`: `FULL_TIME`, `PART_TIME`,
`CONTRACT`, `VISITING`.

**`GET /teachers/me`** returns the teacher record plus their assignments, timetable entries
and attendance — the single call that powers the entire teacher portal.

---

## 9. Guardians / Parents — `/guardians` and `/parents`

### 9.1 `/guardians` (staff-facing)

| Method | Path | Permission | Purpose |
|---|---|---|---|
| `GET` | `/guardians` | `PARENT_READ` | List guardians |
| `POST` | `/guardians` | `PARENT_MANAGE` | Create a guardian + optional login account |
| `GET` | `/guardians/:id` | `PARENT_READ` | Fetch one guardian |
| `PATCH` | `/guardians/:id` | `PARENT_MANAGE` | Update the guardian |
| `DELETE` | `/guardians/:id` | `PARENT_MANAGE` | Delete the guardian |
| `POST` | `/guardians/:id/reset-password` | `PARENT_MANAGE` | Reset the password, revoke refresh tokens |
| `PATCH` | `/guardians/:id/status` | `PARENT_MANAGE` | Activate / deactivate |

**Fields** — `firstName*`, `lastName*`, `phone*`, plus optional `email`, `password`,
`occupation`, `address`, `relation` (`FATHER`/`MOTHER`/`GUARDIAN`/`OTHER`), `studentIds[]`.

### 9.2 `/parents/me` (parent-scoped, self-service)

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/parents/me/children` | The caller's children + a per-child overview |
| `GET` | `/parents/me/children/:studentId/attendance` | Attendance summary + daily history |
| `GET` | `/parents/me/children/:studentId/results` | Exam results per subject |
| `GET` | `/parents/me/children/:studentId/invoices` | Invoices, line items and payments |
| `GET` | `/parents/me/children/:studentId/homework` | Homework assigned to the child |
| `GET` | `/parents/me/children/:studentId/timetable` | The child's weekly timetable |
| `GET` | `/parents/me/children/:studentId/vehicle` | Transport subscription, route, vehicle, driver, stops |
| `GET` | `/parents/me/children/:studentId/syllabus` | Syllabus units with completion status |
| `PATCH` | `/parents/me/children/:studentId/photo` | Set or clear the child's photo |

Every path verifies the child is linked to the requesting guardian — a parent can never read
another family's data. `GET /parents/me/children` is also used by admins to build pickers.

---

## 10. Academic structure

### 10.1 `/academic-years`

| Method | Path | Permission | Purpose |
|---|---|---|---|
| `GET` | `/academic-years` | `ACADEMIC_READ` | List years (filter `isCurrent`) |
| `POST` | `/academic-years` | `ACADEMIC_MANAGE` | Create a year (transactional) |
| `GET` | `/academic-years/:id` | `ACADEMIC_READ` | Fetch one year |
| `PATCH` | `/academic-years/:id` | `ACADEMIC_MANAGE` | Update a year |
| `DELETE` | `/academic-years/:id` | `ACADEMIC_MANAGE` | Delete a year |

**Fields** — `name*` (unique per school), `startDate*`, `endDate*`, `isCurrent`.
Duplicate name → `400 An academic year with this name already exists`.
`endDate` must be ≥ `startDate`.

### 10.2 `/terms`

| Method | Path | Permission | Purpose |
|---|---|---|---|
| `GET` | `/terms` | `ACADEMIC_READ` | List terms (filter `academicYearId`, `isCurrent`) |
| `POST` | `/terms` | `ACADEMIC_MANAGE` | Create a term |
| `GET` | `/terms/:id` | `ACADEMIC_READ` | Fetch one term |
| `PATCH` | `/terms/:id` | `ACADEMIC_MANAGE` | Update a term |
| `DELETE` | `/terms/:id` | `ACADEMIC_MANAGE` | Delete a term |

**Fields** — `academicYearId*`, `name*` (unique within the year), `startDate*`, `endDate*`,
`isCurrent`. Invalid year → `400 Invalid academic year`.

### 10.3 `/classes` (class levels)

| Method | Path | Permission | Purpose |
|---|---|---|---|
| `GET` | `/classes` | `CLASS_READ` | List class levels |
| `POST` | `/classes` | `CLASS_MANAGE` | Create a class level |
| `GET` | `/classes/:id` | `CLASS_READ` | Fetch one class level |
| `PATCH` | `/classes/:id` | `CLASS_MANAGE` | Update a class level |
| `DELETE` | `/classes/:id` | `CLASS_MANAGE` | Delete a class level |
| `GET` | `/classes/roster` | `CLASS_READ` | **Roster**: sections, teacher and student counts per class |

**Fields** — `name*` (unique per school), `numericLevel*` (1–20).

### 10.4 `/sections`

| Method | Path | Permission | Purpose |
|---|---|---|---|
| `GET` | `/sections` | `CLASS_READ` | List sections (filter `classLevelId`) |
| `POST` | `/sections` | `CLASS_MANAGE` | Create a section |
| `GET` | `/sections/:id` | `CLASS_READ` | Fetch one section |
| `PATCH` | `/sections/:id` | `CLASS_MANAGE` | Update a section |
| `DELETE` | `/sections/:id` | `CLASS_MANAGE` | Delete a section |

**Fields** — `classLevelId*`, `name*` (unique within the class), `capacity` (default 10),
`classTeacherId`. Duplicate name → `400 A section with this name already exists in the class`.
`_count.students` counts only `ACTIVE` students.

### 10.5 `/subjects`

| Method | Path | Permission | Purpose |
|---|---|---|---|
| `GET` | `/subjects` | `SUBJECT_READ` | List subjects |
| `POST` | `/subjects` | `SUBJECT_MANAGE` | Create a subject |
| `GET` | `/subjects/:id` | `SUBJECT_READ` | Fetch one subject |
| `PATCH` | `/subjects/:id` | `SUBJECT_MANAGE` | Update a subject |
| `DELETE` | `/subjects/:id` | `SUBJECT_MANAGE` | Delete a subject |

**Fields** — `name*`, `code*` (unique per school), `description`, `isElective`.

### 10.6 `/class-subjects` (class ↔ subject mapping)

| Method | Path | Permission | Purpose |
|---|---|---|---|
| `GET` | `/class-subjects` | `CLASS_READ` | List mappings |
| `POST` | `/class-subjects` | `CLASS_MANAGE` | Map a subject to a class level |
| `DELETE` | `/class-subjects/:id` | `CLASS_MANAGE` | Remove a mapping |

**Fields** — `classLevelId*`, `subjectId*`. Unique per `(classLevelId, subjectId)`.

### 10.7 `/teacher-assignments` (teaching allocations)

| Method | Path | Permission | Purpose |
|---|---|---|---|
| `GET` | `/teacher-assignments` | `TEACHER_READ` | List allocations |
| `POST` | `/teacher-assignments` | `TEACHER_MANAGE` | Allocate a teacher to a section + subject + year |
| `DELETE` | `/teacher-assignments/:id` | `TEACHER_MANAGE` | Remove an allocation |

**Fields** — `teacherId*`, `subjectId*`, `academicYearId*`, `sectionId*`.
Unique per `(teacherId, sectionId, subjectId, academicYearId)`.
**These rows are the backbone of teacher scoping.**

---

## 11. Timetable — `/timetable`

| Method | Path | Permission | Purpose |
|---|---|---|---|
| `GET` | `/timetable` | `TIMETABLE_READ` | List entries (filter `sectionId`, `subjectId`, `teacherId`, `dayOfWeek`) |
| `POST` | `/timetable` | `TIMETABLE_MANAGE` | Create an entry |
| `GET` | `/timetable/:id` | `TIMETABLE_READ` | Fetch one entry |
| `PATCH` | `/timetable/:id` | `TIMETABLE_MANAGE` | Update an entry |
| `DELETE` | `/timetable/:id` | `TIMETABLE_MANAGE` | Delete an entry |
| `POST` | `/timetable/import` | `TIMETABLE_MANAGE` | **Bulk import** from CSV / SQL / rows |

**Create fields** — `sectionId*`, `subjectId*`, `dayOfWeek*` (`MONDAY`…`SUNDAY`),
`startTime*` (`HH:MM`), `endTime*` (`HH:MM`), plus `teacherId`, `room`, `materials`.
`endTime` must be after `startTime`. Unique per `(sectionId, dayOfWeek, startTime)`.

**Import body** — `{ mode?: 'upsert'|'replace', format?: 'csv'|'sql', content?: string, rows?: object[] }`.
All-or-nothing: on any row error the whole import is rejected with `400 The timetable could
not be imported` and a per-row `issues` array (row number, field, message).
Max 5,000 rows / 1,000,000 characters.

---

## 12. Syllabus — `/syllabus`

| Method | Path | Permission | Purpose |
|---|---|---|---|
| `GET` | `/syllabus` | `SYLLABUS_READ` | List units (filter `subjectId`, `classLevelId`, `status`) |
| `POST` | `/syllabus` | `SYLLABUS_MANAGE` | Create a unit |
| `GET` | `/syllabus/:id` | `SYLLABUS_READ` | Fetch one unit |
| `PATCH` | `/syllabus/:id` | `SYLLABUS_MANAGE` | Update a unit |
| `DELETE` | `/syllabus/:id` | `SYLLABUS_MANAGE` | Delete a unit |

**Fields** — `subjectId*`, `classLevelId*`, `title*`, plus `description`, `upcomingTopic`,
`orderIndex`, `status` (`NOT_STARTED` / `IN_PROGRESS` / `COMPLETED`), `completedAt`.
Unique per `(subjectId, classLevelId, title)`.

---

## 13. Lesson plans — `/lesson-plans`

| Method | Path | Permission | Purpose |
|---|---|---|---|
| `GET` | `/lesson-plans` | `LESSON_READ` | List plans (filter `subjectId`, `classLevelId`, `sectionId`, `status`) |
| `POST` | `/lesson-plans` | `LESSON_MANAGE` | Create a plan |
| `GET` | `/lesson-plans/:id` | `LESSON_READ` | Fetch one plan |
| `PATCH` | `/lesson-plans/:id` | `LESSON_MANAGE` | Update a plan |
| `DELETE` | `/lesson-plans/:id` | `LESSON_MANAGE` | Delete a plan (blocked if referenced) |

**Fields** — `subjectId*`, `classLevelId*`, `title*`, plus `sectionId`, `syllabusUnitId`,
`teacherId`, `objectives`, `activities`, `resources`, `assessment`, `plannedDate`,
`durationMinutes` (5–600), `status` (`DRAFT` / `PLANNED` / `IN_PROGRESS` / `COMPLETED` /
`CANCELLED`), `notes`.

---

## 14. Learning content — `/learning-content`

| Method | Path | Permission | Purpose |
|---|---|---|---|
| `GET` | `/learning-content` | `CONTENT_READ` | List content (filter `subjectId`, `classLevelId`, `type`) |
| `POST` | `/learning-content` | `CONTENT_MANAGE` | Create content |
| `GET` | `/learning-content/:id` | `CONTENT_READ` | Fetch one item |
| `PATCH` | `/learning-content/:id` | `CONTENT_MANAGE` | Update an item |
| `DELETE` | `/learning-content/:id` | `CONTENT_MANAGE` | Delete an item (blocked if referenced) |

**Fields** — `title*`, `type` (`LINK` / `DOCUMENT` / `VIDEO` / `IMAGE` / `NOTE`, default
`LINK`), plus `subjectId`, `classLevelId`, `url`, `tags`, `description`.

---

## 15. Homework — `/homework`, `/homework-attachments`, `/homework-submissions`

### 15.1 `/homework`

| Method | Path | Permission | Purpose |
|---|---|---|---|
| `GET` | `/homework` | `HOMEWORK_READ` | List homework (filter `sectionId`, `subjectId`, `teacherId`, date range) |
| `POST` | `/homework` | `HOMEWORK_MANAGE` | Assign homework |
| `GET` | `/homework/:id` | `HOMEWORK_READ` | Fetch one with submissions and student names |
| `PATCH` | `/homework/:id` | `HOMEWORK_MANAGE` | Update homework |
| `DELETE` | `/homework/:id` | `HOMEWORK_MANAGE` | Delete homework |

**Fields** — `sectionId*`, `subjectId*`, `title*`, `dueDate*`, plus `teacherId`, `description`,
`materials`, `assignedDate` (defaults to now), `attachments[]` (`{ name, url }`, max 10).

**Rules** — teachers may only target their own sections/subjects and are **always attributed
to themselves** (client-supplied `teacherId` ignored).

### 15.2 `/homework-attachments`

| Method | Path | Permission | Purpose |
|---|---|---|---|
| `GET` | `/homework-attachments` | `HOMEWORK_READ` | List attachments (filter `homeworkId`) |
| `POST` | `/homework-attachments` | `HOMEWORK_MANAGE` | Add an attachment |
| `GET` | `/homework-attachments/:id` | `HOMEWORK_READ` | Fetch one |
| `PATCH` | `/homework-attachments/:id` | `HOMEWORK_MANAGE` | Update one |
| `DELETE` | `/homework-attachments/:id` | `HOMEWORK_MANAGE` | Delete one |

**Fields** — `homeworkId*`, `name*`, `url*`.

### 15.3 `/homework-submissions`

| Method | Path | Permission | Purpose |
|---|---|---|---|
| `GET` | `/homework-submissions` | `HOMEWORK_READ` | List submissions (filter `homeworkId`, `studentId`, `status`) |
| `POST` | `/homework-submissions` | `HOMEWORK_MANAGE` | Record a submission |
| `GET` | `/homework-submissions/:id` | `HOMEWORK_READ` | Fetch one |
| `PATCH` | `/homework-submissions/:id` | `HOMEWORK_MANAGE` | Update status / submittedAt / remarks |
| `DELETE` | `/homework-submissions/:id` | `HOMEWORK_MANAGE` | Delete a submission |

**Fields** — `homeworkId*`, `studentId*`, `status` (`PENDING` / `SUBMITTED` / `LATE` /
`GRADED`, default `PENDING`), `submittedAt`, `remarks`. Unique per `(homeworkId, studentId)`.

---

## 16. Attendance — `/attendances`

| Method | Path | Permission | Purpose |
|---|---|---|---|
| `GET` | `/attendances` | `ATTENDANCE_READ` | List records (filter `classLevelId`, `sectionId`, `date`, `studentId`) |
| `POST` | `/attendances` | `ATTENDANCE_MARK` | Mark attendance |
| `GET` | `/attendances/:id` | `ATTENDANCE_READ` | Fetch one record |
| `PATCH` | `/attendances/:id` | `ATTENDANCE_MANAGE` | Update a record |
| `DELETE` | `/attendances/:id` | `ATTENDANCE_MANAGE` | Delete a record |
| `GET` | `/attendances/summary` | `ATTENDANCE_READ` | **Aggregated summary** |

**Mark fields** — `studentId*`, `sectionId*`, `date*`, `status*`
(`PRESENT` / `ABSENT` / `LATE` / `EXCUSED` / `HALF_DAY`), `remark`, `takenById`.
Unique per `(studentId, date)`.

**Summary query** — `studentId`, `sectionId`, `classLevelId`, `termId`, `month` (`YYYY-MM`),
`from`, `to`. At least one scope is required → otherwise
`400 Select a class, section or student to view attendance`.

**Summary response** — `period` (`{ kind, from, to, label }`), `scope`, `overall`
(`total`, `present`, `absent`, `late`, `excused`, `halfDay`, `percentage`, `indicator`),
and `students[]` each with their counts, `percentage`, `indicator` and `days[]`.

**Indicator bands** — `good` ≥ 85 %, `warning` ≥ 75 %, else `critical`.
**Percentage** — `(present + late + halfDay × 0.5) / total × 100`; excused days stay in the
denominator.

**Rules** — the student must be in the selected section → `400 Student is not in the selected
section`. Marking `ABSENT` or `LATE` notifies the student's guardians.

---

## 17. Exams & results

### 17.1 `/exams`

| Method | Path | Permission | Purpose |
|---|---|---|---|
| `GET` | `/exams` | `EXAM_READ` | List exams (filter `classLevelId`, `subjectId`) |
| `POST` | `/exams` | `EXAM_MANAGE` | Create an exam |
| `GET` | `/exams/:id` | `EXAM_READ` | Fetch one exam |
| `PATCH` | `/exams/:id` | `EXAM_MANAGE` | Update an exam |
| `DELETE` | `/exams/:id` | `EXAM_MANAGE` | Delete an exam |

**Fields** — `classLevelId*`, `name*`, plus `subjectId`, `academicYearId`, `termId`,
`examType` (`UNIT_TEST` / `MIDTERM` / `FINAL` / `QUIZ` / `PRACTICAL`), `maxMarks` (100),
`passingMarks`, `startDate`, `endDate`, `isPublished`.
`passingMarks > maxMarks` → `400 Passing marks cannot exceed max marks`.

### 17.2 `/exam-results`

| Method | Path | Permission | Purpose |
|---|---|---|---|
| `GET` | `/exam-results` | `RESULT_READ` | List results (filter `examId`, `studentId`, `classLevelId`) |
| `POST` | `/exam-results` | `RESULT_MANAGE` | Record a result (**upsert**) |
| `GET` | `/exam-results/:id` | `RESULT_READ` | Fetch one result |
| `PATCH` | `/exam-results/:id` | `RESULT_MANAGE` | Update a result (clamps marks) |
| `DELETE` | `/exam-results/:id` | `RESULT_MANAGE` | Delete a result |
| `GET` | `/exam-results/report-card` | `RESULT_READ` | Build a report card |

**Fields** — `examId*`, `studentId*`, `subjectId*`, `marksObtained*`, plus `grade`, `remarks`.

**Rules** — unique on `(examId, studentId, subjectId)`, so re-submitting the same subject for
the same exam **overwrites** instead of duplicating. `marksObtained > maxMarks` → `400 Marks
cannot exceed max marks (N)` on create; on update the value is **clamped** to `[0, maxMarks]`.
The grade is derived from the percentage unless supplied.

**`GET /exam-results/report-card`** — query `studentId`, `examId`, `classLevelId` or
`examIds[]`. Returns report cards grouped by exam (subject rows, totals, percentage, grade)
plus an `overall` aggregate. Teachers are limited to their own class levels.

---

## 18. Finance

### 18.1 `/fees/categories`

| Method | Path | Permission | Purpose |
|---|---|---|---|
| `GET` | `/fees/categories` | `FEE_READ` | List fee categories |
| `POST` | `/fees/categories` | `FEE_MANAGE` | Create a category |
| `GET` | `/fees/categories/:id` | `FEE_READ` | Fetch one category |
| `PATCH` | `/fees/categories/:id` | `FEE_MANAGE` | Update a category |
| `DELETE` | `/fees/categories/:id` | `FEE_MANAGE` | Delete (blocked if referenced) |

**Fields** — `name*` (unique per school), `description`.

### 18.2 `/fees/structures`

| Method | Path | Permission | Purpose |
|---|---|---|---|
| `GET` | `/fees/structures` | `FEE_READ` | List structures (filter `classLevelId`, `feeCategoryId`, `academicYearId`) |
| `POST` | `/fees/structures` | `FEE_MANAGE` | Create a structure |
| `PATCH` | `/fees/structures/:id` | `FEE_MANAGE` | Update a structure |
| `DELETE` | `/fees/structures/:id` | `FEE_MANAGE` | Delete (blocked if invoices reference it) |

**Fields** — `classLevelId*`, `feeCategoryId*`, `amount*`, plus `academicYearId` (required),
`frequency` (`ONE_TIME` / `MONTHLY` / `QUARTERLY` / `ANNUAL`, default `ANNUAL`), `dueDay`
(1–31). Unique per `(academicYearId, classLevelId, feeCategoryId)`.

### 18.3 `/invoices`

| Method | Path | Permission | Purpose |
|---|---|---|---|
| `GET` | `/invoices` | `INVOICE_READ` | List invoices (filter `studentId`, `status`, `search`) |
| `POST` | `/invoices` | `INVOICE_MANAGE` | Create an invoice |
| `GET` | `/invoices/:id` | `INVOICE_READ` | Fetch one invoice |
| `PATCH` | `/invoices/:id` | `INVOICE_MANAGE` | Update an invoice |
| `DELETE` | `/invoices/:id` | `INVOICE_MANAGE` | Delete an invoice |
| `GET` | `/invoices/fee-desk` | `INVOICE_READ` | **Fee desk aggregation** (filter `classLevelId`, `sectionId`) |
| `POST` | `/invoices/generate` | `INVOICE_MANAGE` | **Bulk-generate** invoices for a class |

**Create fields** — `studentId*`, `dueDate*`, `items[]*` (min 1 item of
`{ description, amount, feeStructureId? }`), plus `academicYearId`, `issueDate`, `discount`
(default 0), `notes`.

**Rules** — `total = max(0, subtotal − discount)`; `amountPaid = 0`, `balance = total`,
`status = ISSUED`. Creating an invoice emits `invoice:created` and notifies the student.

**`POST /invoices/generate`** — `{ classLevelId*, sectionId?, academicYearId?, issueDate?, dueDate* }`.
Loads the matching `FeeStructure` → `400 No fee structure found for this class and academic
year` if none. Skips students who already have an invoice for the period. Returns per-student
created/skipped counts.

**`GET /invoices/fee-desk`** — billed, collected, outstanding, collection rate, breakdown by
class and status, and the defaulter list.

### 18.4 `/payments`

| Method | Path | Permission | Purpose |
|---|---|---|---|
| `GET` | `/payments` | `PAYMENT_READ` | List payments (filter `invoiceId`, `studentId`) |
| `POST` | `/payments` | `PAYMENT_MANAGE` | Record a payment |
| `GET` | `/payments/:id` | `PAYMENT_READ` | Fetch one payment |
| `PATCH` | `/payments/:id` | `PAYMENT_MANAGE` | Update a payment |
| `DELETE` | `/payments/:id` | `PAYMENT_MANAGE` | Delete a payment |

**Fields** — `invoiceId*`, `amount*` (≥ 0.01), `method` (`CASH` / `CARD` / `BANK_TRANSFER` /
`ONLINE` / `CHEQUE` / `OTHER`, default `CASH`), `transactionRef`, `notes`, `receivedById`.

**Rules** — every write recomputes the parent invoice (`amountPaid`, `balance`, `status`).
Recording a payment emits `payment:recorded` and notifies the student.

---

## 19. Library

### 19.1 `/books`

| Method | Path | Permission | Purpose |
|---|---|---|---|
| `GET` | `/books` | `LIBRARY_READ` | List books (filter `category`, `search`) |
| `POST` | `/books` | `LIBRARY_MANAGE` | Add a book |
| `GET` | `/books/:id` | `LIBRARY_READ` | Fetch one book + loan history |
| `PATCH` | `/books/:id` | `LIBRARY_MANAGE` | Update a book |
| `DELETE` | `/books/:id` | `LIBRARY_MANAGE` | Delete a book |

**Fields** — `title*`, `author*`, plus `isbn` (unique per school), `category`, `publisher`,
`publishedYear` (1000–2100), `totalCopies` (default 1), `shelf`, `coverUrl`.
`availableCopies` is initialised to `totalCopies`.
`availableCopies > totalCopies` → `400 Available copies cannot exceed total copies`.

### 19.2 `/book-loans`

| Method | Path | Permission | Purpose |
|---|---|---|---|
| `GET` | `/book-loans` | `LOAN_READ` | List loans (filter `bookId`, `studentId`, `userId`, `status`) |
| `POST` | `/book-loans` | `LOAN_MANAGE` | Issue a book |
| `GET` | `/book-loans/:id` | `LOAN_READ` | Fetch one loan |
| `PATCH` | `/book-loans/:id` | `LOAN_MANAGE` | Return a book / update status |
| `DELETE` | `/book-loans/:id` | `LOAN_MANAGE` | Delete a loan (returns the copy) |

**Fields** — `bookId*`, `dueAt*`, plus `studentId` or `userId`, `issuedById`.
Update fields: `returnedAt`, `status` (`BORROWED` / `RETURNED` / `OVERDUE` / `LOST`), `fine`.

**Rules** — no copies available → `400 No copies available`; a second active loan for the same
(book, borrower) → `400 Borrower already has an active loan for this book`; returning a closed
loan → `400 This loan is already closed and cannot be returned again`.

---

## 20. Transport

### 20.1 `/vehicles`

| Method | Path | Permission | Purpose |
|---|---|---|---|
| `GET` | `/vehicles` | `TRANSPORT_READ` | List vehicles (filter `status`, `type`, `routeId`, `driverId`) |
| `POST` | `/vehicles` | `TRANSPORT_MANAGE` | Add a vehicle |
| `GET` | `/vehicles/:id` | `TRANSPORT_READ` | Fetch one vehicle |
| `PATCH` | `/vehicles/:id` | `TRANSPORT_MANAGE` | Update a vehicle |
| `DELETE` | `/vehicles/:id` | `TRANSPORT_MANAGE` | Delete a vehicle |

**Fields** — `plateNumber*` (unique per school), `capacity*`, plus `vehicleCode` (unique, auto-
allocated), `model`, `type` (`BUS` / `VAN`), `driverName`, `driverPhone`, `driverId`, `routeId`,
`status` (`ACTIVE` / `MAINTENANCE` / `INACTIVE`), `insuranceExpiry`.

### 20.2 `/drivers`

| Method | Path | Permission | Purpose |
|---|---|---|---|
| `GET` | `/drivers` | `TRANSPORT_READ` | List drivers |
| `POST` | `/drivers` | `TRANSPORT_MANAGE` | Add a driver |
| `GET` | `/drivers/:id` | `TRANSPORT_READ` | Fetch one driver |
| `PATCH` | `/drivers/:id` | `TRANSPORT_MANAGE` | Update a driver |
| `DELETE` | `/drivers/:id` | `TRANSPORT_MANAGE` | Delete a driver |

**Fields** — `name*`, `phone*`, `licenseNumber*` (unique per school), `licenseExpiry*`, plus
`driverCode` (unique, auto-allocated).
A driver assigned to vehicles → `409 Driver is assigned to one or more vehicles and cannot be
deleted`.

### 20.3 `/transport-routes`

| Method | Path | Permission | Purpose |
|---|---|---|---|
| `GET` | `/transport-routes` | `TRANSPORT_READ` | List routes |
| `POST` | `/transport-routes` | `TRANSPORT_MANAGE` | Create a route (+ stops) |
| `GET` | `/transport-routes/:id` | `TRANSPORT_READ` | Fetch one route |
| `PATCH` | `/transport-routes/:id` | `TRANSPORT_MANAGE` | Update a route (stops replaced atomically) |
| `DELETE` | `/transport-routes/:id` | `TRANSPORT_MANAGE` | Delete a route |

**Fields** — `name*`, plus `code` (unique per school), `routeCode`, `description`,
`startPoint`, `endPoint`, `pickupTime`, `dropTime`, `fare` (default 0), `vehicleId`, `stops[]`.
A route assigned to vehicles → `409 Route is assigned to one or more vehicles and cannot be
deleted`.

### 20.4 `/route-stops`

| Method | Path | Permission | Purpose |
|---|---|---|---|
| `GET` | `/route-stops` | `TRANSPORT_READ` | List stops (filter `routeId`) |
| `POST` | `/route-stops` | `TRANSPORT_MANAGE` | Add a stop |
| `GET` | `/route-stops/:id` | `TRANSPORT_READ` | Fetch one stop |
| `PATCH` | `/route-stops/:id` | `TRANSPORT_MANAGE` | Update a stop |
| `DELETE` | `/route-stops/:id` | `TRANSPORT_MANAGE` | Delete a stop |

**Fields** — `routeId*`, `name*`, `sequence*` (≥ 1), plus `pickupTime`, `dropTime`,
`latitude`, `longitude`. Unique per `(routeId, sequence)`.

### 20.5 `/transport-subscriptions`

| Method | Path | Permission | Purpose |
|---|---|---|---|
| `GET` | `/transport-subscriptions` | `TRANSPORT_READ` | List subscriptions (filter `studentId`, `routeId`, `status`) |
| `POST` | `/transport-subscriptions` | `TRANSPORT_MANAGE` | Subscribe a student to a route |
| `GET` | `/transport-subscriptions/:id` | `TRANSPORT_READ` | Fetch one |
| `PATCH` | `/transport-subscriptions/:id` | `TRANSPORT_MANAGE` | Update one |
| `DELETE` | `/transport-subscriptions/:id` | `TRANSPORT_MANAGE` | Delete one |

**Fields** — `studentId*`, `routeId*`, `startDate*`, plus `stopId` (must belong to the
route), `academicYearId` (required), `endDate`, `status` (`ACTIVE` / `SUSPENDED` / `CANCELLED`).

### 20.6 `/vehicle/stats`

| Method | Path | Permission | Purpose |
|---|---|---|---|
| `GET` | `/vehicle/stats` | `TRANSPORT_READ` | Fleet dashboard |

Returns fleet size and status split (`ACTIVE` / `MAINTENANCE` / `INACTIVE`), route and
subscription totals, capacity utilisation, and an expiry list split into `EXPIRED` and
`EXPIRING_SOON` with `daysRemaining` for licences and insurance.

---

## 21. Communication

### 21.1 `/notices`

| Method | Path | Permission | Purpose |
|---|---|---|---|
| `GET` | `/notices` | `NOTICE_READ` | List notices (pinned first, then newest) |
| `POST` | `/notices` | `NOTICE_MANAGE` | Publish a notice |
| `GET` | `/notices/:id` | `NOTICE_READ` | Fetch one notice |
| `PATCH` | `/notices/:id` | `NOTICE_MANAGE` | Update a notice |
| `DELETE` | `/notices/:id` | `NOTICE_MANAGE` | Delete a notice |

**Fields** — `title*`, `body*`, plus `audience` (JSON), `isPinned` (default false),
`expiresAt`. Publishing emits `notice:created` and notifies the whole school.

### 21.2 `/notifications`

| Method | Path | Permission | Purpose |
|---|---|---|---|
| `GET` | `/notifications` | `NOTIFICATION_READ` | List notifications (filter `type`, `unreadOnly`) |
| `POST` | `/notifications` | `NOTIFICATION_MANAGE` | Create a notification (user or role broadcast) |
| `PATCH` | `/notifications/:id/read` | `NOTIFICATION_READ` | Mark one read |
| `PATCH` | `/notifications/read-all` | `NOTIFICATION_READ` | Mark all read |
| `DELETE` | `/notifications/:id` | `NOTIFICATION_READ` | Delete one |
| `GET` | `/notifications/unread-count` | `NOTIFICATION_READ` | Unread count |

**Types** — `GENERAL`, `NOTICE`, `ATTENDANCE`, `INVOICE`, `PAYMENT`, `FEE`, `EXAM`, `RESULT`,
`TRANSPORT`, `MESSAGE`.

### 21.3 `/conversations` (messaging)

| Method | Path | Permission | Purpose |
|---|---|---|---|
| `GET` | `/conversations` | `MESSAGE_READ` | List my conversations (filter `unreadOnly`, `search`) |
| `POST` | `/conversations` | `MESSAGE_MANAGE` | Start a conversation (users and/or roles) |
| `GET` | `/conversations/:id` | `MESSAGE_READ` | Fetch one conversation |
| `DELETE` | `/conversations/:id` | `MESSAGE_MANAGE` | Delete a conversation |
| `GET` | `/conversations/:id/messages` | `MESSAGE_READ` | List messages in a thread |
| `POST` | `/conversations/:id/messages` | `MESSAGE_READ` | Reply in a thread |
| `PATCH` | `/conversations/:id/read` | `MESSAGE_READ` | Mark the thread read |
| `POST` | `/conversations/students` | `MESSAGE_READ` | **Teacher → students** (scoped) |
| `POST` | `/conversations/teachers` | `MESSAGE_READ` | **Parent → teacher** (scoped) |
| `GET` | `/conversations/unread-count` | `MESSAGE_READ` | Unread count |

**`POST /conversations`** — `{ subject*, body*, userIds?[], roles?[] }`; at least one recipient
required → `400 Select at least one recipient`. Recipients must be in the actor's school.

**`POST /conversations/students`** (teachers) — `{ subject*, body*, sectionIds?[], studentIds?[] }`.
Recipients are restricted to `ACTIVE` students; students outside the teacher's classes →
`403 One or more selected students are not in your classes`.

**`POST /conversations/teachers`** (parents) — `{ studentId*, teacherId*, subject*, body* }`.
The parent must be linked to the child, the child must be assigned to a class, and the teacher
must actually teach that child → `403 That teacher does not teach your child`.

**Access** — non-participants get `403 You are not part of this conversation`. Only the sender
or an administrator may delete a conversation.

### 21.4 `/service-requests`

| Method | Path | Permission | Purpose |
|---|---|---|---|
| `GET` | `/service-requests` | `REQUEST_READ` | List requests (filter `status`, `type`, `studentId`) |
| `POST` | `/service-requests` | `REQUEST_MANAGE` | Create a request |
| `GET` | `/service-requests/:id` | `REQUEST_READ` | Fetch one request |
| `PATCH` | `/service-requests/:id` | `REQUEST_MANAGE` | Update / resolve a request |
| `DELETE` | `/service-requests/:id` | `REQUEST_MANAGE` | Delete a request |
| `GET` | `/service-requests/me` | — | My own requests |
| `POST` | `/service-requests/me` | — | Raise a request |

**Types** — `BONAFIDE_CERTIFICATE`, `TRANSFER_CERTIFICATE`, `CHARACTER_CERTIFICATE`,
`STUDY_CERTIFICATE`, `LEAVE`, `COMPLAINT`, `OTHER`.
**Statuses** — `PENDING`, `APPROVED`, `REJECTED`, `COMPLETED`, `CANCELLED`.

**Self-service rules** — a parent may only raise a request for a child they are linked to →
`403 You can only raise requests for your own children`. Requests always start `PENDING`.

### 21.5 `/contact` (public)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `POST` | `/contact` | no | Public contact form submission |

**Fields** — `name*` (2–120), `email*`, `message*` (10–4000), plus `phone`, `subject`, `source`.
Stored in the global `ContactMessage` table (no school scoping).

---

## 22. Reports — `/reports`

| Method | Path | Permission | Query | Purpose |
|---|---|---|---|---|
| `GET` | `/reports/dashboard` | `REPORT_READ` | — | Head counts, open requests, fee collections, recent admissions |
| `GET` | `/reports/university` | `REPORT_READ` | `academicYearId` | Management roll-up with performance trend and activity feed |
| `GET` | `/reports/joinings` | `REPORT_READ` | `academicYearId`, `month` | Admissions→students over time with growth % |
| `GET` | `/reports/attendance` | `REPORT_READ` | `from`, `to`, `classLevelId`, `sectionId` | Attendance report with indicator bands |
| `GET` | `/reports/fees` | `REPORT_READ` | `from`, `to`, `classLevelId`, `sectionId` | Collection totals by status and method, outstanding, ageing |
| `GET` | `/reports/enrollment` | `REPORT_READ` | `classLevelId` | Enrollment counts and capacity fill rate |
| `GET` | `/reports/report-cards` | `RESULT_READ` | `studentId` **xor** `sectionId` | Report-card roll-up |

`report-cards` requires **exactly one** of `studentId` or `sectionId` →
`400 Provide exactly one of studentId or sectionId`.

---

## 23. Audit logs — `/audit-logs`

| Method | Path | Permission | Purpose |
|---|---|---|---|
| `GET` | `/audit-logs` | `AUDIT_READ` | List audit entries (filter `userId`, `action`, `entity`, `entityId`, `from`, `to`) |
| `GET` | `/audit-logs/:id` | `AUDIT_READ` | Fetch one entry |

Read-only. Super admins see everything; school admins see their own school; anyone else →
`403 You do not have access to this audit log`.

---

## 24. Endpoint index by permission

| Permission | Endpoints |
|---|---|
| `USER_READ` / `CREATE` / `UPDATE` / `DELETE` | `/users*` (5) |
| `SCHOOL_READ` / `SCHOOL_UPDATE` | `/schools*` (4) |
| `STUDENT_READ` / `CREATE` / `UPDATE` / `DELETE` | `/students*` (6) |
| `ADMISSION_READ` / `MANAGE` | `/admissions*` (5) |
| `REQUEST_READ` / `MANAGE` | `/service-requests*` (7) |
| `TEACHER_READ` / `MANAGE` | `/teachers*` (8) |
| `PARENT_READ` / `MANAGE` | `/guardians*` (7) |
| `CLASS_READ` / `MANAGE` | `/classes*` (6), `/sections*` (5), `/class-subjects*` (3) |
| `SUBJECT_READ` / `MANAGE` | `/subjects*` (5) |
| `ATTENDANCE_READ` / `MARK` / `MANAGE` | `/attendances*` (6) |
| `HOMEWORK_READ` / `MANAGE` | `/homework*` (5), `/homework-attachments*` (5), `/homework-submissions*` (5) |
| `TIMETABLE_READ` / `MANAGE` | `/timetable*` (6) |
| `SYLLABUS_READ` / `MANAGE` | `/syllabus*` (5) |
| `LESSON_READ` / `MANAGE` | `/lesson-plans*` (5) |
| `CONTENT_READ` / `MANAGE` | `/learning-content*` (5) |
| `EXAM_READ` / `MANAGE` | `/exams*` (5) |
| `RESULT_READ` / `MANAGE` | `/exam-results*` (6), `/reports/report-cards` |
| `FEE_READ` / `MANAGE` | `/fees/categories*` (5), `/fees/structures*` (4) |
| `INVOICE_READ` / `MANAGE` | `/invoices*` (7) |
| `PAYMENT_READ` / `MANAGE` | `/payments*` (5) |
| `LIBRARY_READ` / `MANAGE` | `/books*` (5) |
| `LOAN_READ` / `MANAGE` | `/book-loans*` (5) |
| `TRANSPORT_READ` / `MANAGE` | `/vehicles*` (5), `/drivers*` (5), `/transport-routes*` (5), `/route-stops*` (5), `/transport-subscriptions*` (5), `/vehicle/stats` |
| `NOTICE_READ` / `MANAGE` | `/notices*` (5) |
| `REPORT_READ` | `/reports/dashboard`, `/university`, `/joinings`, `/attendance`, `/fees`, `/enrollment` |
| `AUDIT_READ` | `/audit-logs*` (2) |
| `ACADEMIC_READ` / `MANAGE` | `/academic-years*` (5), `/terms*` (5) |
| `NOTIFICATION_READ` / `MANAGE` | `/notifications*` (6) |
| `MESSAGE_READ` / `MANAGE` | `/conversations*` (10) |
| *Authenticated, no permission* | `/auth/me`, `/auth/change-password`, `/schools/me`, `/teachers/me`, `/parents/me/*` (9), `/service-requests/me` (2) |
| *Public* | `/health*` (2), `/auth/login*` (4), `/auth/refresh`, `/auth/logout`, `/contact` |
