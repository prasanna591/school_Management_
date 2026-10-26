import type {
  AttendanceCounts,
  AttendanceDayEntry,
  AttendanceSummary,
  AttendanceSummaryQuery,
  AttendanceSummaryStudent,
  BulkAttendanceInput,
  CreateAttendanceInput,
  ListAttendancesQuery,
  UpdateAttendanceInput,
} from '@smartschool/shared';
import {
  SOCKET_EVENTS,
  addAttendanceStatus,
  attendanceIndicator,
  attendancePercentage,
  dateOnly,
  emptyAttendanceCounts,
  monthInputValue,
  monthRange,
} from '@smartschool/shared';
import type { Prisma } from '@prisma/client';
import { ApiError } from '../../errors/ApiError';
import { prisma } from '../../lib/prisma';
import { emitToSchool } from '../../lib/realtime';
import { paginate, toSkipTake } from '../../utils/pagination';
import { notifyUsers } from '../notifications/notifications.service';
import { assertOwnStudentId, resolveStudentSelf } from '../students/student-scope';
import {
  assertClassLevelInScope,
  assertSectionInScope,
  assertStudentInScope,
  resolveTeacherScope,
} from '../teachers/teacher-scope';
import type { Actor } from '../users/users.service';

const SUMMARY_MAX_RECORDS = 5000;
const SUMMARY_STUDENT_LIMIT = 500;

function resolveSchoolScope(actor: Actor, requestedSchoolId?: string | null): string | undefined {
  if (actor.role === 'SUPER_ADMIN') return requestedSchoolId ?? undefined;
  if (!actor.schoolId) throw ApiError.forbidden('Your account is not linked to a school');
  return actor.schoolId;
}

function mergeCounts(target: AttendanceCounts, source: AttendanceCounts): void {
  target.total += source.total;
  target.present += source.present;
  target.absent += source.absent;
  target.late += source.late;
  target.excused += source.excused;
  target.halfDay += source.halfDay;
}

function fullName(user: { firstName?: string | null; lastName?: string | null } | null): string {
  return `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim();
}

interface AttendanceEventRow {
  id: string;
  studentId: string;
  sectionId: string;
  status: string;
  date: Date;
}

/** Broadcast the live update and notify the student/guardians when relevant. */
async function announceAttendance(row: AttendanceEventRow, schoolId: string): Promise<void> {
  emitToSchool(schoolId, SOCKET_EVENTS.ATTENDANCE_MARKED, {
    id: row.id,
    studentId: row.studentId,
    sectionId: row.sectionId,
    status: row.status,
    date: row.date,
  });
  if (row.status !== 'ABSENT' && row.status !== 'LATE') return;

  const profile = await prisma.studentProfile.findUnique({
    where: { id: row.studentId },
    include: {
      guardians: { include: { guardian: { select: { userId: true } } } },
    },
  });
  const recipients = [
    profile?.userId ?? null,
    ...(profile?.guardians ?? []).map((g) => g.guardian.userId ?? null),
  ].filter((id): id is string => Boolean(id));
  await notifyUsers(recipients, {
    schoolId,
    type: 'ATTENDANCE',
    title: `Attendance marked ${row.status.toLowerCase()}`,
    body: `Your child was marked ${row.status.toLowerCase()} on ${row.date
      .toISOString()
      .slice(0, 10)}.`,
    data: { attendanceId: row.id, studentId: row.studentId, status: row.status },
  });
}

export const attendancesService = {
  /**
   * Attendance tracker: daily status breakdown plus a monthly/term percentage
   * per student, with the visual indicator band (good/warning/critical).
   */
  async summary(query: AttendanceSummaryQuery, actor: Actor): Promise<AttendanceSummary> {
    const selfId = await resolveStudentSelf(actor);
    if (selfId) assertOwnStudentId(selfId, query.studentId);
    if (!selfId && !query.studentId && !query.sectionId && !query.classLevelId) {
      throw ApiError.badRequest('Select a class, section or student to view attendance');
    }

    const schoolId = resolveSchoolScope(actor);

    // Resolve the reporting period first so an invalid term/month fails fast.
    let period: AttendanceSummary['period'];
    let from: Date;
    let to: Date;
    if (query.termId) {
      const term = await prisma.term.findUnique({
        where: { id: query.termId },
        include: { academicYear: true },
      });
      if (!term || (schoolId && term.academicYear.schoolId !== schoolId)) {
        throw ApiError.badRequest('Invalid term');
      }
      from = term.startDate;
      to = term.endDate;
      period = {
        kind: 'term',
        from: dateOnly(term.startDate),
        to: dateOnly(term.endDate),
        label: term.name,
      };
    } else if (query.month) {
      const range = monthRange(query.month);
      if (!range) throw ApiError.badRequest('Invalid month');
      from = new Date(`${range.from}T00:00:00.000Z`);
      to = new Date(`${range.to}T00:00:00.000Z`);
      period = { kind: 'month', from: range.from, to: range.to, label: range.label };
    } else if (query.from || query.to) {
      from = query.from ?? query.to!;
      to = query.to ?? query.from!;
      period = {
        kind: 'range',
        from: dateOnly(from),
        to: dateOnly(to),
        label: `${dateOnly(from)} → ${dateOnly(to)}`,
      };
    } else {
      const range = monthRange(monthInputValue(new Date()))!;
      from = new Date(`${range.from}T00:00:00.000Z`);
      to = new Date(`${range.to}T00:00:00.000Z`);
      period = { kind: 'month', from: range.from, to: range.to, label: range.label };
    }

    const teacherScope = await resolveTeacherScope(actor);
    if (teacherScope) {
      if (query.sectionId) assertSectionInScope(teacherScope, query.sectionId);
      if (query.classLevelId) assertClassLevelInScope(teacherScope, query.classLevelId);
      if (query.studentId) {
        const requested = await prisma.studentProfile.findUnique({
          where: { id: query.studentId },
          select: { sectionId: true },
        });
        if (requested) assertStudentInScope(teacherScope, requested);
      }
    }

    const sectionScope: Prisma.SectionWhereInput = {};
    if (schoolId) sectionScope.classLevel = { schoolId };
    if (query.classLevelId) sectionScope.classLevelId = query.classLevelId;

    const where: Prisma.AttendanceWhereInput = { date: { gte: from, lte: to } };
    if (Object.keys(sectionScope).length > 0) where.section = sectionScope;
    if (query.sectionId) where.sectionId = query.sectionId;
    else if (teacherScope) where.sectionId = { in: teacherScope.sectionIds };
    if (selfId) where.studentId = selfId;
    else if (query.studentId) where.studentId = query.studentId;

    const records = await prisma.attendance.findMany({
      where,
      select: { studentId: true, status: true, date: true },
      orderBy: { date: 'asc' },
      take: SUMMARY_MAX_RECORDS,
    });

    const byStudent = new Map<string, { counts: AttendanceCounts; days: AttendanceDayEntry[] }>();
    for (const record of records) {
      let bucket = byStudent.get(record.studentId);
      if (!bucket) {
        bucket = { counts: emptyAttendanceCounts(), days: [] };
        byStudent.set(record.studentId, bucket);
      }
      addAttendanceStatus(bucket.counts, record.status);
      bucket.days.push({ date: dateOnly(record.date), status: record.status });
    }

    const studentWhere: Prisma.StudentProfileWhereInput = {};
    if (schoolId) studentWhere.schoolId = schoolId;
    if (selfId) studentWhere.id = selfId;
    else if (query.studentId) studentWhere.id = query.studentId;
    if (query.sectionId) studentWhere.sectionId = query.sectionId;
    else if (query.classLevelId) studentWhere.section = { classLevelId: query.classLevelId };
    // Teachers additionally never see students outside their own sections.
    if (teacherScope && !query.sectionId) {
      studentWhere.sectionId = { in: teacherScope.sectionIds };
    }
    const recordIds = [...byStudent.keys()];
    studentWhere.OR = [
      { status: 'ACTIVE' },
      ...(recordIds.length > 0 ? [{ id: { in: recordIds } }] : []),
    ];

    const students = await prisma.studentProfile.findMany({
      where: studentWhere,
      take: SUMMARY_STUDENT_LIMIT,
      include: { user: true, section: { include: { classLevel: true } } },
      orderBy: [{ rollNo: 'asc' }, { admissionNo: 'asc' }],
    });

    const summaryStudents: AttendanceSummaryStudent[] = students.map((student) => {
      const bucket = byStudent.get(student.id);
      const counts = bucket?.counts ?? emptyAttendanceCounts();
      const percentage = attendancePercentage(counts);
      return {
        studentId: student.id,
        name: fullName(student.user) || student.admissionNo,
        admissionNo: student.admissionNo,
        rollNo: student.rollNo ?? null,
        className: student.section?.classLevel?.name ?? null,
        sectionName: student.section?.name ?? null,
        ...counts,
        percentage,
        indicator: attendanceIndicator(percentage),
        days: bucket?.days ?? [],
      };
    });

    const overallCounts = emptyAttendanceCounts();
    for (const student of summaryStudents) mergeCounts(overallCounts, student);
    const overallPercentage = attendancePercentage(overallCounts);

    return {
      period,
      scope: {
        studentId: selfId ?? query.studentId,
        sectionId: query.sectionId,
        classLevelId: query.classLevelId,
      },
      overall: {
        ...overallCounts,
        percentage: overallPercentage,
        indicator: attendanceIndicator(overallPercentage),
      },
      students: summaryStudents,
    };
  },
  async list(query: ListAttendancesQuery, actor: Actor) {
    const { skip, take } = toSkipTake(query.page, query.limit);
    const where: Prisma.AttendanceWhereInput = {};
    const schoolId = resolveSchoolScope(actor);
    const selfId = await resolveStudentSelf(actor);
    if (selfId) assertOwnStudentId(selfId, query.studentId);
    if (schoolId) {
      where.section = { classLevel: { schoolId } } as any;
    }
    if (query.classLevelId) {
      where.section = { ...(where.section as any), classLevelId: query.classLevelId };
    }
    // Teachers only ever see attendance for their own sections; requested
    // filters are validated against that scope instead of trusted.
    const teacherScope = await resolveTeacherScope(actor);
    if (teacherScope) {
      if (query.classLevelId) assertClassLevelInScope(teacherScope, query.classLevelId);
      if (query.studentId) {
        const requested = await prisma.studentProfile.findUnique({
          where: { id: query.studentId },
          select: { sectionId: true },
        });
        if (requested) assertStudentInScope(teacherScope, requested);
      }
      if (query.sectionId) {
        assertSectionInScope(teacherScope, query.sectionId);
        where.sectionId = query.sectionId;
      } else {
        where.sectionId = { in: teacherScope.sectionIds };
      }
    } else if (query.sectionId) where.sectionId = query.sectionId;
    if (selfId) where.studentId = selfId;
    else if (query.studentId) where.studentId = query.studentId;
    if (query.date) where.date = query.date;
    const items = await prisma.attendance.findMany({
      where,
      skip,
      take,
      orderBy: { date: 'desc' },
      include: { student: true, section: { include: { classLevel: true } }, recordedBy: true },
    });
    const total = await prisma.attendance.count({ where });
    return paginate(items, total, query.page, query.limit);
  },
  async getById(id: string, actor: Actor) {
    const att = await prisma.attendance.findUnique({
      where: { id },
      include: { student: true, section: { include: { classLevel: true } }, recordedBy: true },
    });
    if (!att) throw ApiError.notFound('Attendance record not found');
    const scope = resolveSchoolScope(actor);
    if (scope && att.section.classLevel.schoolId !== scope)
      throw ApiError.forbidden('Access denied');
    const selfId = await resolveStudentSelf(actor);
    if (selfId) assertOwnStudentId(selfId, att.studentId);
    const teacherScope = await resolveTeacherScope(actor);
    if (teacherScope) assertSectionInScope(teacherScope, att.sectionId);
    return att;
  },
  async create(input: CreateAttendanceInput, actor: Actor) {
    const schoolId = resolveSchoolScope(actor, input.schoolId) ?? actor.schoolId ?? undefined;
    if (!schoolId) throw ApiError.badRequest('School is required');
    const section = await prisma.section.findUnique({
      where: { id: input.sectionId },
      include: { classLevel: true },
    });
    if (!section || section.classLevel.schoolId !== schoolId)
      throw ApiError.badRequest('Invalid section');
    const teacherScope = await resolveTeacherScope(actor);
    if (teacherScope) assertSectionInScope(teacherScope, input.sectionId);
    const student = await prisma.studentProfile.findUnique({ where: { id: input.studentId } });
    if (!student || student.schoolId !== schoolId) throw ApiError.badRequest('Invalid student');
    if (teacherScope) {
      // A teacher may only mark attendance for students of their own sections,
      // and can never record it on behalf of somebody else.
      assertStudentInScope(teacherScope, student);
      if (student.sectionId !== input.sectionId) {
        throw ApiError.badRequest('Student is not in the selected section');
      }
    }
    if (student.sectionId && student.sectionId !== input.sectionId) {
      // Be tolerant if sectionId differs in legacy data? Keep as is for stability
      // throw ApiError.badRequest('Student is not in the selected section');
    }
    const activeYear = await prisma.academicYear.findFirst({
      where: { schoolId, isCurrent: true },
    });
    const academicYearId =
      activeYear?.id ?? (await prisma.academicYear.findFirst({ where: { schoolId } }))?.id;
    if (!academicYearId) throw ApiError.badRequest('Academic year required');
    const att = await prisma.attendance.create({
      data: {
        studentId: input.studentId,
        sectionId: input.sectionId,
        academicYearId,
        date: input.date,
        status: input.status,
        remarks: input.remark,
        recordedById: teacherScope ? actor.id : input.takenById || actor.id,
      },
    });
    await announceAttendance(att, schoolId);
    return att;
  },
  /**
   * Save a whole class register in one transaction.
   *
   * The unique key is `studentId + date`, so each row is an upsert. That makes
   * the call idempotent: a retry after a lost response updates the same rows
   * instead of failing on a unique constraint. All students are validated
   * against the actor's school/section scope before anything is written.
   */
  async createBulk(input: BulkAttendanceInput, actor: Actor) {
    const schoolId = resolveSchoolScope(actor, input.schoolId) ?? actor.schoolId ?? undefined;
    if (!schoolId) throw ApiError.badRequest('School is required');

    const section = await prisma.section.findUnique({
      where: { id: input.sectionId },
      include: { classLevel: true },
    });
    if (!section || section.classLevel.schoolId !== schoolId) {
      throw ApiError.badRequest('Invalid section');
    }
    const teacherScope = await resolveTeacherScope(actor);
    if (teacherScope) assertSectionInScope(teacherScope, input.sectionId);

    const studentIds = input.records.map((record) => record.studentId);
    const students = await prisma.studentProfile.findMany({
      where: { id: { in: studentIds }, schoolId },
      select: { id: true, sectionId: true },
    });
    const byId = new Map(students.map((student) => [student.id, student]));
    const unknown = studentIds.filter((id) => !byId.has(id));
    if (unknown.length > 0) {
      throw ApiError.badRequest(`Unknown student(s): ${unknown.join(', ')}`);
    }
    for (const record of input.records) {
      const student = byId.get(record.studentId)!;
      if (teacherScope) {
        assertStudentInScope(teacherScope, student);
        if (student.sectionId !== input.sectionId) {
          throw ApiError.badRequest('Student is not in the selected section');
        }
      }
    }

    const activeYear = await prisma.academicYear.findFirst({
      where: { schoolId, isCurrent: true },
    });
    const academicYearId =
      activeYear?.id ?? (await prisma.academicYear.findFirst({ where: { schoolId } }))?.id;
    if (!academicYearId) throw ApiError.badRequest('Academic year required');

    const recordedById = teacherScope ? actor.id : input.takenById || actor.id;
    const previous = await prisma.attendance.findMany({
      where: { studentId: { in: studentIds }, date: input.date },
      select: { studentId: true, status: true },
    });
    const priorStatus = new Map(previous.map((row) => [row.studentId, row.status]));

    const records = await prisma.$transaction(
      input.records.map((record) =>
        prisma.attendance.upsert({
          where: { studentId_date: { studentId: record.studentId, date: input.date } },
          create: {
            studentId: record.studentId,
            sectionId: input.sectionId,
            academicYearId,
            date: input.date,
            status: record.status,
            remarks: record.remark,
            recordedById,
          },
          update: {
            status: record.status,
            ...(record.remark !== undefined ? { remarks: record.remark } : {}),
            recordedById,
          },
        }),
      ),
    );

    // Only broadcast actual transitions so a re-save (for example a retry)
    // does not spam parents with duplicate notifications.
    for (const record of records) {
      if (priorStatus.get(record.studentId) === record.status) continue;
      await announceAttendance(record, schoolId);
    }

    return {
      sectionId: input.sectionId,
      date: input.date,
      saved: records.length,
      records,
    };
  },
  async update(id: string, input: UpdateAttendanceInput, actor: Actor) {
    const existing = await prisma.attendance.findUnique({
      where: { id },
      include: { section: { include: { classLevel: true } } },
    });
    if (!existing) throw ApiError.notFound('Attendance record not found');
    const scope = resolveSchoolScope(actor);
    if (scope && existing.section.classLevel.schoolId !== scope)
      throw ApiError.forbidden('Access denied');
    const teacherScope = await resolveTeacherScope(actor);
    if (teacherScope) assertSectionInScope(teacherScope, existing.sectionId);
    const att = await prisma.attendance.update({
      where: { id },
      data: {
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.remark !== undefined ? { remarks: input.remark } : {}),
      },
    });
    // Emit update and notify on status change
    const schoolId = existing.section.classLevel.schoolId;
    await announceAttendance(att, schoolId);
    return att;
  },
  async remove(id: string, actor: Actor) {
    const existing = await prisma.attendance.findUnique({
      where: { id },
      include: { section: { include: { classLevel: true } } },
    });
    if (!existing) throw ApiError.notFound('Attendance record not found');
    const scope = resolveSchoolScope(actor);
    if (scope && existing.section.classLevel.schoolId !== scope)
      throw ApiError.forbidden('Access denied');
    const teacherScope = await resolveTeacherScope(actor);
    if (teacherScope) assertSectionInScope(teacherScope, existing.sectionId);
    await prisma.attendance.delete({ where: { id } });
    return { success: true };
  },
};
