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

| Field | Type | Notes |
|---|---|---|
| `id` | String | cuid, PK |
| `tokenHash` | String | **unique** — the raw token is never stored |
| `userId` | String | `Cascade` |
| `expiresAt` | DateTime | |
| `revokedAt` | DateTime? | set on logout / rotation / password change |
| `userAgent` / `ipAddress` | String? | device fingerprint |

**Indexes** — `@@index([userId])`, `@@index([expiresAt])`.

### 3.2 Academic structure

#### `AcademicYear`

| Field | Type | Notes |
|---|---|---|
| `schoolId` | String | `Cascade` |
| `name` | String | unique per school — `@@unique([schoolId, name])` |
| `startDate` / `endDate` | DateTime | `@db.Date` |
| `isCurrent` | Boolean | default `false` — exactly one is current |

**Children** — terms, fee structures, invoices, exams, teacher assignments, attendances,
transport subscriptions, admissions.

#### `Term`

| Field | Type | Notes |
|---|---|---|
| `academicYearId` | String | `Cascade` |
| `name` | String | unique within the year — `@@unique([academicYearId, name])` |
| `startDate` / `endDate` | DateTime | `@db.Date` |
| `isCurrent` | Boolean | default `false` |

#### `ClassLevel`

| Field | Type | Notes |
|---|---|---|
| `schoolId` | String | `Cascade` |
| `name` | String | unique per school — `@@unique([schoolId, name])` |
| `numericLevel` | Int | 1–20, the sort order |

**Children** — sections, class subjects, fee structures, exams, syllabus units, admissions,
lesson plans, learning content.

#### `Section`

| Field | Type | Notes |
|---|---|---|
| `schoolId` | String | `Cascade` |
| `classLevelId` | String | `Cascade` |
| `name` | String | unique within the class — `@@unique([classLevelId, name])` |
| `capacity` | Int | default `10` — enforced at student creation |
| `classTeacherId` | String? | `SetNull` → `TeacherProfile` |

**Indexes** — `@@index([schoolId])`.
**Children** — students, teacher assignments, attendances, homework, timetable entries,
lesson plans.

#### `Subject`

| Field | Type | Notes |
|---|---|---|
| `schoolId` | String | `Cascade` |
| `name` | String | |
| `code` | String | unique per school — `@@unique([schoolId, code])` |
| `description` | String? | `@db.Text` |
| `isElective` | Boolean | default `false` |

**Children** — class subjects, teacher assignments, exam results, homework, timetable
entries, syllabus units, lesson plans, learning content.

#### `ClassSubject`
The subject-to-class mapping (which subjects a class level offers).

| Field | Type | Notes |
|---|---|---|
| `classLevelId` | String | `Cascade` |
| `subjectId` | String | `Cascade` |
| `isMandatory` | Boolean | default `true` |

**Unique** — `@@unique([classLevelId, subjectId])`.

### 3.3 People

#### `TeacherProfile`

| Field | Type | Notes |
|---|---|---|
| `userId` | String | **unique**, `Cascade` — one login per teacher |
| `schoolId` | String | `Cascade` |
| `employeeNo` | String | unique per school — `@@unique([schoolId, employeeNo])` |
| `qualification` | String? | |
| `specialization` | String? | |
| `joiningDate` | DateTime | `@db.Date` |
| `status` | EmploymentStatus | default `ACTIVE` |
| `designation` | Designation | default `OTHER` |
| `employmentType` | EmploymentType | default `FULL_TIME` |

**Children** — assignments, sections as class teacher, homework, timetable entries,
lesson plans.

#### `StudentProfile`

| Field | Type | Notes |
|---|---|---|
| `userId` | String? | unique, `SetNull` — a student may exist without a login |
| `schoolId` | String | `Cascade` |
| `admissionNo` | String | unique per school — `@@unique([schoolId, admissionNo])` |
| `admissionDate` | DateTime | `@db.Date` |
| `dateOfBirth` | DateTime | `@db.Date` |
| `gender` | Gender | |
| `bloodGroup` | String? | |
| `address` | String? | `@db.Text` |
| `rollNo` | String? | |
| `photoUrl` | String? | `@db.MediumText` — base64 data URL |
| `status` | StudentStatus | default `ACTIVE` |
| `sectionId` | String? | `SetNull` → `Section` |

**Indexes** — `@@index([schoolId])`, `@@index([sectionId])`.
**Children** — guardians, attendances, exam results, invoices, book loans, transport
subscriptions, homework submissions, service requests.

#### `Guardian`

| Field | Type | Notes |
|---|---|---|
| `userId` | String? | unique, `SetNull` — a guardian may exist without a login |
| `schoolId` | String | `Cascade` |
| `firstName` / `lastName` | String | |
| `email` | String? | |
| `phone` | String | required |
| `occupation` | String? | |
| `address` | String? | `@db.Text` |

#### `StudentGuardian`
The link between a student and a guardian.

| Field | Type | Notes |
|---|---|---|
| `studentId` | String | `Cascade` |
| `guardianId` | String | `Cascade` |
| `relation` | GuardianRelation | |
| `isPrimary` | Boolean | default `false` — the contact guardian |

**Unique** — `@@unique([studentId, guardianId])`.

#### `TeacherAssignment`
**The backbone of teacher scoping** — which teacher teaches which subject in which section
in which year.

| Field | Type | Notes |
|---|---|---|
| `teacherId` | String | `Cascade` → `TeacherProfile` |
| `sectionId` | String | `Cascade` → `Section` |
| `subjectId` | String | `Cascade` → `Subject` |
| `academicYearId` | String | `Cascade` → `AcademicYear` |

**Unique** — `@@unique([teacherId, sectionId, subjectId, academicYearId])`.

### 3.4 Admissions

#### `Admission`

| Field | Type | Notes |
|---|---|---|
| `schoolId` | String | `Cascade` |
| `applicantName` | String | |
| `dateOfBirth` | DateTime? | `@db.Date` |
| `gender` | Gender? | |
| `guardianName` | String | |
| `guardianPhone` | String | |
| `guardianEmail` | String? | |
| `address` | String? | `@db.Text` |
| `previousSchool` | String? | |
| `classLevelId` | String? | `SetNull` |
| `academicYearId` | String? | `SetNull` |
| `status` | AdmissionStatus | default `ENQUIRY` |
| `source` | AdmissionSource | default `WALK_IN` |
| `notes` | String? | `@db.Text` |
| `followUpDate` | DateTime? | `@db.Date` |
| `appliedAt` | DateTime | default now |
| `decidedAt` | DateTime? | |
| `enrolledStudentId` | String? | the created student once enrolled |
| `createdById` | String? | `SetNull` → `User` |

**Indexes** — `@@index([schoolId])`, `[status]`, `[classLevelId]`, `[createdAt]`.

### 3.5 Teaching content

#### `LessonPlan`

| Field | Type | Notes |
|---|---|---|
| `schoolId` | String | `Cascade` |
| `subjectId` / `classLevelId` | String | `Cascade` — both required |
| `sectionId` | String? | `SetNull` |
| `syllabusUnitId` | String? | `SetNull` |
| `teacherId` | String? | `SetNull` → `TeacherProfile` |
| `title` | String | |
| `objectives` / `activities` / `resources` / `assessment` / `notes` | String? | `@db.Text` |
| `plannedDate` | DateTime? | `@db.Date` |
| `durationMinutes` | Int? | 5–600 |
| `status` | LessonPlanStatus | default `PLANNED` |
| `createdById` | String? | `SetNull` → `User` |

**Indexes** — `[schoolId]`, `[subjectId, classLevelId]`, `[plannedDate]`, `[status]`.

#### `LearningContent`

| Field | Type | Notes |
|---|---|---|
| `schoolId` | String | `Cascade` |
| `subjectId` / `classLevelId` | String? | `SetNull` — optional scoping |
| `title` | String | |
| `description` | String? | `@db.Text` |
| `type` | LearningContentType | default `LINK` |
| `url` | String? | `@db.Text` |
| `tags` | String? | comma-separated |
| `createdById` | String? | `SetNull` → `User` |

**Indexes** — `[schoolId]`, `[subjectId]`, `[type]`.

#### `SyllabusUnit`

| Field | Type | Notes |
|---|---|---|
| `schoolId` | String | `Cascade` |
| `subjectId` / `classLevelId` | String | `Cascade` |
| `title` | String | unique per subject+class — `@@unique([subjectId, classLevelId, title])` |
| `description` / `upcomingTopic` | String? | `@db.Text` |
| `orderIndex` | Int | default `0` — display order |
| `status` | SyllabusStatus | default `NOT_STARTED` |
| `completedAt` | DateTime? | |

#### `Homework`

| Field | Type | Notes |
|---|---|---|
| `schoolId` | String | `Cascade` |
| `sectionId` / `subjectId` | String | `Cascade` — both required |
| `teacherId` | String? | `SetNull` → `TeacherProfile` |
| `title` | String | |
| `description` / `materials` | String? | `@db.Text` |
| `assignedDate` | DateTime | `@db.Date` |
| `dueDate` | DateTime | `@db.Date` |

**Indexes** — `[schoolId]`, `[sectionId, dueDate]`.

#### `HomeworkAttachment`

| Field | Type | Notes |
|---|---|---|
| `homeworkId` | String | `Cascade` |
| `name` | String | |
| `url` | String | `@db.Text` |

#### `HomeworkSubmission`

| Field | Type | Notes |
|---|---|---|
| `homeworkId` | String | `Cascade` |
| `studentId` | String | `Cascade` |
| `status` | SubmissionStatus | default `PENDING` |
| `submittedAt` | DateTime? | |
| `remarks` | String? | `@db.Text` |

**Unique** — `@@unique([homeworkId, studentId])`.

#### `TimetableEntry`

| Field | Type | Notes |
|---|---|---|
| `schoolId` | String | `Cascade` |
| `sectionId` / `subjectId` | String | `Cascade` |
| `teacherId` | String? | `SetNull` |
| `dayOfWeek` | Weekday | |
| `startTime` / `endTime` | String | `HH:MM` |
| `room` | String? | |
| `materials` | String? | `@db.Text` |

**Unique** — `@@unique([sectionId, dayOfWeek, startTime])` — no double-booking a section.
**Indexes** — `[schoolId]`, `[sectionId, dayOfWeek]`.

### 3.6 Assessment

#### `Attendance`

| Field | Type | Notes |
|---|---|---|
| `studentId` | String | `Cascade` |
| `sectionId` | String | `Cascade` |
| `academicYearId` | String | `Cascade` |
| `date` | DateTime | `@db.Date` |
| `status` | AttendanceStatus | default `PRESENT` |
| `remarks` | String? | |
| `recordedById` | String? | `SetNull` → `User` |

**Unique** — `@@unique([studentId, date])` — one record per student per day.
**Indexes** — `[sectionId, date]`.

#### `Exam`

| Field | Type | Notes |
|---|---|---|
| `schoolId` | String | `Cascade` |
| `academicYearId` | String | `Cascade` |
| `termId` | String? | `SetNull` |
| `classLevelId` | String | `Cascade` |
| `name` | String | |
| `type` | ExamType | default `UNIT_TEST` |
| `maxMarks` | Int | default `100` |
| `passingMarks` | Int | default `0` |
| `startDate` / `endDate` | DateTime | `@db.Date` |
| `isPublished` | Boolean | default `false` — gates parent visibility |

#### `ExamResult`

| Field | Type | Notes |
|---|---|---|
| `examId` | String | `Cascade` |
| `studentId` | String | `Cascade` |
| `subjectId` | String | `Cascade` |
| `marksObtained` | Decimal(6,2) | |
| `maxMarks` | Decimal(6,2) | default `100` — snapshot of the exam's max marks |
| `grade` | String? | derived from the percentage |
| `remarks` | String? | |

**Unique** — `@@unique([examId, studentId, subjectId])` — re-entering a subject for the same
exam **overwrites** rather than duplicating.
**Index** — `[studentId]`.

### 3.7 Finance

#### `FeeCategory`

| Field | Type | Notes |
|---|---|---|
| `schoolId` | String | `Cascade` |
| `name` | String | unique per school — `@@unique([schoolId, name])` |
| `description` | String? | |

#### `FeeStructure`

| Field | Type | Notes |
|---|---|---|
| `schoolId` | String | `Cascade` |
| `academicYearId` | String | `Cascade` |
| `classLevelId` | String | `Cascade` |
| `feeCategoryId` | String | `Cascade` |
| `amount` | Decimal(10,2) | |
| `frequency` | FeeFrequency | default `ANNUAL` |
| `dueDay` | Int? | 1–31 |

**Unique** — `@@unique([academicYearId, classLevelId, feeCategoryId])`.

#### `Invoice`

| Field | Type | Notes |
|---|---|---|
| `schoolId` | String | `Cascade` |
| `studentId` | String | `Cascade` |
| `academicYearId` | String | `Cascade` |
| `invoiceNo` | String | unique per school — `@@unique([schoolId, invoiceNo])` |
| `issueDate` / `dueDate` | DateTime | `@db.Date` |
| `status` | InvoiceStatus | default `ISSUED` |
| `subtotal` | Decimal(10,2) | sum of the items |
| `discount` | Decimal(10,2) | default `0` |
| `total` | Decimal(10,2) | `max(0, subtotal − discount)` |
| `amountPaid` | Decimal(10,2) | default `0` — recomputed on every payment |
| `balance` | Decimal(10,2) | default `0` — `total − amountPaid` |
| `notes` | String? | |

**Indexes** — `[studentId]`, `[status]`.

#### `InvoiceItem`

| Field | Type | Notes |
|---|---|---|
| `invoiceId` | String | `Cascade` |
| `description` | String | |
| `amount` | Decimal(10,2) | |
| `feeStructureId` | String? | `SetNull` → `FeeStructure` |

#### `Payment`

| Field | Type | Notes |
|---|---|---|
| `invoiceId` | String | `Cascade` |
| `amount` | Decimal(10,2) | ≥ 0.01 |
| `method` | PaymentMethod | default `CASH` |
| `reference` | String? | transaction reference |
| `paidAt` | DateTime | default now |
| `receivedById` | String? | `SetNull` → `User` |
| `notes` | String? | |

**Index** — `[invoiceId]`.

### 3.8 Library

#### `Book`

| Field | Type | Notes |
|---|---|---|
| `schoolId` | String | `Cascade` |
| `title` / `author` | String | required |
| `isbn` | String? | unique per school — `@@unique([schoolId, isbn])` |
| `category` / `publisher` | String? | |
| `publishedYear` | Int? | 1000–2100 |
| `totalCopies` | Int | default `1` |
| `availableCopies` | Int | default `1` — decremented on issue, restored on return |
| `shelf` / `coverUrl` | String? | |

**Indexes** — `[schoolId]`, `[title]`.

#### `BookLoan`

| Field | Type | Notes |
|---|---|---|
| `bookId` | String | `Cascade` |
| `studentId` | String? | `SetNull` → `StudentProfile` |
| `userId` | String? | `SetNull` → `User` (staff borrower) |
| `borrowedAt` | DateTime | default now |
| `dueAt` | DateTime | |
| `returnedAt` | DateTime? | |
| `status` | LoanStatus | default `BORROWED` |
| `fine` | Decimal(8,2) | default `0` |
| `issuedById` | String? | `SetNull` → `User` |
| `activeKey` | String? | **unique** — guards against two live loans for the same book+borrower |

**Indexes** — `[bookId]`, `[status]`.

### 3.9 Transport

#### `Driver`

| Field | Type | Notes |
|---|---|---|
| `schoolId` | String | `Cascade` |
| `driverCode` | String | unique per school — `@@unique([schoolId, driverCode])` |
| `name` / `phone` | String | required |
| `licenseNumber` | String | unique per school — `@@unique([schoolId, licenseNumber])` |
| `licenseExpiry` | DateTime | `@db.Date` — drives the expiry report |

#### `Vehicle`

| Field | Type | Notes |
|---|---|---|
| `schoolId` | String | `Cascade` |
| `vehicleCode` | String? | unique per school — auto-allocated |
| `plateNumber` | String | unique per school — `@@unique([schoolId, plateNumber])` |
| `model` | String? | |
| `type` | VehicleType | default `BUS` |
| `capacity` | Int | required |
| `driverName` / `driverPhone` | String? | denormalised contact |
| `driverId` | String? | `SetNull` → `Driver` |
| `routeId` | String? | `SetNull` → `TransportRoute` |
| `status` | VehicleStatus | default `ACTIVE` |
| `insuranceExpiry` | DateTime? | `@db.Date` — drives the expiry report |

**Indexes** — `[schoolId, routeId]`, `[schoolId, driverId]`.

#### `TransportRoute`

| Field | Type | Notes |
|---|---|---|
| `schoolId` | String | `Cascade` |
| `routeCode` | String? | unique per school — auto-allocated |
| `name` | String | |
| `code` | String | unique per school — `@@unique([schoolId, code])` |
| `description` | String? | |
| `startPoint` / `endPoint` | String? | |
| `pickupTime` / `dropTime` | String? | `HH:MM` |
| `fare` | Decimal(8,2) | default `0` |
| `vehicleId` | String? | `SetNull` → `Vehicle` |

**Note** — the route↔vehicle link is bidirectional (`TransportRoute.vehicleId` and
`Vehicle.routeId`), so a route can carry several vehicles and a vehicle can sit on a
route. Both sides use `SetNull`.

#### `RouteStop`

| Field | Type | Notes |
|---|---|---|
| `routeId` | String | `Cascade` |
| `name` | String | |
| `sequence` | Int | ≥ 1 — **unique per route** — `@@unique([routeId, sequence])` |
| `pickupTime` / `dropTime` | String? | |
| `latitude` / `longitude` | Decimal(10,7)? | |

#### `TransportSubscription`

| Field | Type | Notes |
|---|---|---|
| `studentId` | String | `Cascade` |
| `routeId` | String | `Cascade` |
| `stopId` | String? | `SetNull` → `RouteStop` (must belong to the route) |
| `academicYearId` | String | `Cascade` |
| `status` | TransportStatus | default `ACTIVE` |
| `startDate` | DateTime | `@db.Date` |
| `endDate` | DateTime? | `@db.Date` |

**Index** — `[studentId]`.

### 3.10 Communication

#### `Notice`

| Field | Type | Notes |
|---|---|---|
| `schoolId` | String | `Cascade` |
| `title` | String | |
| `body` | String | `@db.Text` |
| `audience` | Json? | role/user targeting |
| `isPinned` | Boolean | default `false` |
| `publishedAt` | DateTime | default now |
| `expiresAt` | DateTime? | |
| `createdById` | String? | `SetNull` → `User` |

#### `Notification`

| Field | Type | Notes |
|---|---|---|
| `userId` | String | `Cascade` |
| `schoolId` | String? | `SetNull` |
| `type` | NotificationType | default `GENERAL` |
| `title` | String | |
| `body` | String? | `@db.Text` |
| `data` | Json? | deep-link payload |
| `isRead` | Boolean | default `false` |
| `readAt` | DateTime? | |

**Indexes** — `[userId, isRead]`, `[schoolId]`, `[createdAt]`.

#### `Conversation`

| Field | Type | Notes |
|---|---|---|
| `schoolId` | String | `Cascade` |
| `createdById` | String | `Cascade` → `User` |
| `subject` | String | |
| `lastMessageAt` | DateTime | default now — the thread ordering key |

**Indexes** — `[schoolId]`, `[createdById]`, `[lastMessageAt]`.

#### `ConversationParticipant`

| Field | Type | Notes |
|---|---|---|
| `conversationId` | String | `Cascade` |
| `userId` | String | `Cascade` |
| `lastReadAt` | DateTime? | per-participant read cursor |

**Unique** — `@@unique([conversationId, userId])`.
**Index** — `[userId]`.

#### `Message`

| Field | Type | Notes |
|---|---|---|
| `conversationId` | String | `Cascade` |
| `senderId` | String | `Cascade` → `User` |
| `body` | String | `@db.Text` |

**Indexes** — `[conversationId, createdAt]`, `[senderId]`.

#### `ServiceRequest`

| Field | Type | Notes |
|---|---|---|
| `schoolId` | String | `Cascade` |
| `type` | ServiceRequestType | default `OTHER` |
| `title` | String | |
| `description` | String? | `@db.Text` |
| `status` | ServiceRequestStatus | default `PENDING` |
| `studentId` | String? | `SetNull` |
| `requestedById` | String? | `SetNull` → `User` (requester) |
| `resolvedById` | String? | `SetNull` → `User` (resolver) |
| `response` | String? | `@db.Text` |
| `resolvedAt` | DateTime? | |

**Indexes** — `[schoolId]`, `[status]`, `[type]`, `[studentId]`, `[requestedById]`.

#### `AuditLog`
Append-only activity trail.

| Field | Type | Notes |
|---|---|---|
| `schoolId` | String? | `SetNull` — null for platform-level actions |
| `userId` | String? | `SetNull` |
| `action` | String | e.g. `student.created` |
| `entity` | String | e.g. `StudentProfile` |
| `entityId` | String? | |
| `metadata` | Json? | before/after snapshot |
| `ipAddress` | String? | |

**Indexes** — `[schoolId]`, `[userId]`, `[entity, entityId]`.

#### `ContactMessage`
Global (not school-scoped) — the public contact form.

| Field | Type | Notes |
|---|---|---|
| `name` | String | 2–120 chars |
| `email` | String | |
| `phone` | String? | |
| `subject` | String? | |
| `message` | String | 10–4000 chars |
| `source` | String? | default `website` |
| `isRead` | Boolean | default `false` |

**Indexes** — `[isRead]`, `[createdAt]`.

---

## 4. Relationship map

```
School
├── User ── StudentProfile ── Section ── ClassLevel
│    │            │                          │
│    │            └── StudentGuardian ── Guardian
│    │            ├── Attendance
│    │            ├── ExamResult ── Exam ── Term
│    │            ├── Invoice ── InvoiceItem ── FeeStructure ── FeeCategory
│    │            │       └── Payment
│    │            ├── BookLoan ── Book
│    │            ├── TransportSubscription ── TransportRoute ── RouteStop
│    │            ├── HomeworkSubmission ── Homework ── HomeworkAttachment
│    │            └── ServiceRequest
│    ├── TeacherProfile ── TeacherAssignment ── Subject
│    │        └── Section (as class teacher)
│    ├── RefreshToken
│    ├── Notification
│    ├── Conversation ── ConversationParticipant
│    │        └── Message
│    ├── Notice
│    └── AuditLog

AcademicYear ── Term, Exam, TeacherAssignment, Attendance,
               FeeStructure, Invoice, TransportSubscription, Admission
Subject ── ClassSubject ── ClassLevel
Subject ── TimetableEntry ── Section
Subject ── SyllabusUnit ── ClassLevel
Subject ── LessonPlan ── ClassLevel
Vehicle ── Driver, TransportRoute
```

---

## 5. Business rules encoded in the schema

| Rule | Where |
|---|---|
| One current academic year | `AcademicYear.isCurrent` flag |
| One term per year marked current | `Term.isCurrent` |
| A teacher cannot be double-allocated | `@@unique([teacherId, sectionId, subjectId, academicYearId])` |
| A student cannot be marked twice on a day | `@@unique([studentId, date])` |
| A section cannot have two classes at the same slot | `@@unique([sectionId, dayOfWeek, startTime])` |
| Re-entering marks overwrites | `@@unique([examId, studentId, subjectId])` |
| One live loan per book and borrower | `BookLoan.activeKey` unique |
| One submission per student per homework | `@@unique([homeworkId, studentId])` |
| A route cannot repeat a stop position | `@@unique([routeId, sequence])` |
| Fee structures cannot double-charge a class | `@@unique([academicYearId, classLevelId, feeCategoryId])` |
| Invoice numbers are unique per school | `@@unique([schoolId, invoiceNo])` |
| Plate numbers and licences are unique per school | `@@unique` on `Vehicle`, `Driver` |

---

## 6. Migrations and seeding

`apps/backend/prisma/` contains:

| File | Purpose |
|---|---|
| `schema.prisma` | The source of truth |
| `migrations/` | Versioned migration history |
| `seed.ts` | Master seed — school, users, roles, academic structure |
| `seed-classes.ts` | Class levels, sections, subjects, mappings |
| `seed-students.ts` | Student profiles and enrolments |
| `seed-parents.ts` | Guardians and student-guardian links |
| `seed-subjects.ts` | Subject catalogue |
| `seed-attendances.ts` | Attendance history for the demo period |
| `seed-finance.ts` | Fee categories, structures, invoices and payments |
| `assign-student-classes.ts` | Backfill student → section assignments |
| `assign-teacher-classes.ts` | Backfill teacher → section assignments |
| `backfill-teacher-designations.ts` | Fill in designations on legacy teacher rows |

Run with `npx prisma migrate dev` (development) or `npx prisma migrate deploy`
(production), then `npx prisma db seed`.
