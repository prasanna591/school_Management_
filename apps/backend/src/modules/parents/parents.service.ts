import { attendanceCountsFromRecord, attendanceMetrics, dateOnly } from '@smartschool/shared';
import { buildReportCards, type ReportCardInput } from '@smartschool/shared';
import type { AttendanceStatus, Prisma } from '@prisma/client';
import { ApiError } from '../../errors/ApiError';
import { prisma } from '../../lib/prisma';
import type { Actor } from '../users/users.service';

const timetableInclude = {
  subject: { select: { id: true, name: true, code: true } },
  teacher: { select: { id: true, user: { select: { firstName: true, lastName: true } } } },
} satisfies Prisma.TimetableEntryInclude;

// A child's transport subscription, resolved all the way to the transport
// route, its stops and the vehicles (with drivers) assigned to that route.
// Only ever queried for a student already proven to belong to the parent.
const vehicleInclude = {
  route: {
    include: {
      stops: { orderBy: { sequence: 'asc' } },
      vehicles: {
        include: {
          driver: {
            select: {
              id: true,
              driverCode: true,
              name: true,
              phone: true,
              licenseNumber: true,
            },
          },
        },
      },
    },
  },
  stop: true,
  academicYear: { select: { id: true, name: true, isCurrent: true } },
} satisfies Prisma.TransportSubscriptionInclude;

function emptyAttendance(): Record<AttendanceStatus, number> {
  return { PRESENT: 0, ABSENT: 0, LATE: 0, EXCUSED: 0, HALF_DAY: 0 };
}

async function requireGuardian(actor: Actor) {
  const guardian = await prisma.guardian.findFirst({ where: { userId: actor.id } });
  if (!guardian) {
    throw ApiError.forbidden('No parent profile is linked to this account');
  }
  return guardian;
}

/** Ensure the requested student is actually one of the signed-in parent's children. */
async function assertChild(actor: Actor, studentId: string) {
  const guardian = await requireGuardian(actor);
  const link = await prisma.studentGuardian.findFirst({
    where: { guardianId: guardian.id, studentId },
  });
  if (!link) throw ApiError.forbidden('You can only view information about your own children');
  return guardian;
}

/** The parent's child plus the section/class needed to scope school activities. */
async function childWithSection(actor: Actor, studentId: string) {
  await assertChild(actor, studentId);
  const student = await prisma.studentProfile.findUnique({
    where: { id: studentId },
    include: { section: { include: { classLevel: true } } },
  });
  if (!student) throw ApiError.notFound('Student not found');
  return student;
}

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/** The teachers assigned to a section, with the details the parent portal shows. */
async function teachersForSection(sectionId: string) {
  const assignments = await prisma.teacherAssignment.findMany({
    where: { sectionId },
    include: {
      teacher: { include: { user: true } },
      subject: { select: { name: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  return assignments.map((assignment) => {
    const user = assignment.teacher.user;
    return {
      id: assignment.id,
      teacherId: assignment.teacherId,
      name: user ? `${user.firstName} ${user.lastName}` : null,
      photoUrl: user?.avatarUrl ?? null,
      subject: assignment.subject.name,
      contact: user?.phone ?? user?.email ?? null,
      email: user?.email ?? null,
      phone: user?.phone ?? null,
    };
  });
}

const WEEKDAY_BY_INDEX = [
  'SUNDAY',
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
] as const;

/** Compact activity counts shown on the parent dashboard cards. */
async function activitySummary(sectionId: string | null, classLevelId: string | null) {
  if (!sectionId) {
    return { upcomingHomework: 0, dueToday: 0, todayClasses: 0, syllabusCompleted: 0, syllabusTotal: 0 };
  }
  const today = startOfToday();
  const tomorrow = addDays(today, 1);
  const weekAhead = addDays(today, 7);
  const weekday = WEEKDAY_BY_INDEX[new Date().getDay()];
  const [upcomingHomework, dueToday, todayClasses, syllabusTotal, syllabusCompleted] =
    await Promise.all([
      prisma.homework.count({
        where: { sectionId, dueDate: { gte: today, lte: weekAhead } },
      }),
      prisma.homework.count({ where: { sectionId, dueDate: { gte: today, lt: tomorrow } } }),
      prisma.timetableEntry.count({ where: { sectionId, dayOfWeek: weekday } }),
      classLevelId
        ? prisma.syllabusUnit.count({ where: { classLevelId } })
        : Promise.resolve(0),
      classLevelId
        ? prisma.syllabusUnit.count({ where: { classLevelId, status: 'COMPLETED' } })
        : Promise.resolve(0),
    ]);
  return { upcomingHomework, dueToday, todayClasses, syllabusCompleted, syllabusTotal };
}

export const parentsService = {
  /** The parent's own profile plus a per-child summary the portal renders. */
  async overview(actor: Actor) {
    const guardian = await requireGuardian(actor);

    const links = await prisma.studentGuardian.findMany({
      where: { guardianId: guardian.id },
      include: {
        student: {
          include: { user: true, section: { include: { classLevel: true } } },
        },
      },
    });

    const children = await Promise.all(
      links.map(async (link) => {
        const student = link.student;
        const todayStart = startOfToday();
        const [
          attendanceGroups,
          todayAttendance,
          allResults,
          invoices,
          teachers,
          activities,
          timetable,
        ] = await Promise.all([
          prisma.attendance.groupBy({
            by: ['status'],
            where: { studentId: student.id },
            _count: { _all: true },
          }),
          prisma.attendance.findFirst({
            where: { studentId: student.id, date: { gte: todayStart, lt: addDays(todayStart, 1) } },
            orderBy: { date: 'desc' },
          }),
          prisma.examResult.findMany({
            where: { studentId: student.id, exam: { isPublished: true } },
            orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
            include: { exam: true, subject: true },
            take: 200,
          }),
          prisma.invoice.findMany({
            where: { studentId: student.id },
            orderBy: { issueDate: 'desc' },
            take: 5,
          }),
          student.sectionId ? teachersForSection(student.sectionId) : Promise.resolve([]),
          activitySummary(student.sectionId, student.section?.classLevelId ?? null),
          student.sectionId
            ? prisma.timetableEntry.findMany({
                where: { sectionId: student.sectionId },
                orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
                include: timetableInclude,
              })
            : Promise.resolve([]),
        ]);

        const attendance = emptyAttendance();
        for (const group of attendanceGroups) attendance[group.status] = group._count._all;
        const metrics = attendanceMetrics(attendanceCountsFromRecord(attendance));

        const resultRows = (allResults ?? []).map((r) => ({
          examId: r.examId,
          examName: r.exam?.name ?? '',
          examType: r.exam?.type ?? null,
          date: r.exam?.startDate ?? null,
          subjectId: r.subjectId,
          subjectName: r.subject?.name ?? '',
          marksObtained: r.marksObtained as unknown as number | string,
          maxMarks: r.maxMarks as unknown as number | string,
          grade: r.grade,
        })) as ReportCardInput[];
        const reportCards = buildReportCards(resultRows);
        const resultsRecent = resultRows.slice(0, 5).map((row, idx) => {
          const source = (allResults ?? [])[idx];
          return {
            id: source?.id ?? `${row.examId}-${row.subjectId}`,
            marksObtained: row.marksObtained,
            grade: row.grade,
            exam: { name: row.examName },
            subject: { name: row.subjectName },
          };
        });

        return {
          id: student.id,
          admissionNo: student.admissionNo,
          rollNo: student.rollNo,
          photoUrl: student.photoUrl,
          status: student.status,
          gender: student.gender,
          name: student.user ? `${student.user.firstName} ${student.user.lastName}` : null,
          className: student.section?.classLevel?.name ?? null,
          sectionName: student.section?.name ?? null,
          section: student.section
            ? { name: student.section.name, classLevel: student.section.classLevel?.name ?? null }
            : null,
          teacherCount: teachers.length,
          teachers,
          relation: link.relation,
          isPrimary: link.isPrimary,
          attendance: {
            total: metrics.total,
            present: metrics.present,
            absent: metrics.absent,
            late: metrics.late,
            excused: metrics.excused,
            halfDay: metrics.halfDay,
            percentage: metrics.percentage,
            indicator: metrics.indicator,
            byStatus: attendance,
            today: todayAttendance
              ? { date: dateOnly(todayAttendance.date), status: todayAttendance.status }
              : null,
          },
          activities,
          timetable,
          results: resultsRecent,
          reportCards: reportCards.reportCards,
          overallResult: reportCards.overall,
          invoices,
          outstanding: invoices.reduce((sum, invoice) => sum + Number(invoice.balance), 0),
        };
      }),
    );

    return {
      parent: {
        id: guardian.id,
        firstName: guardian.firstName,
        lastName: guardian.lastName,
        email: guardian.email,
        phone: guardian.phone,
      },
      children,
    };
  },

  async childAttendance(actor: Actor, studentId: string) {
    await assertChild(actor, studentId);
    return prisma.attendance.findMany({
      where: { studentId },
      orderBy: { date: 'desc' },
      take: 120,
      include: { section: { include: { classLevel: true } } },
    });
  },

  async childResults(actor: Actor, studentId: string) {
    await assertChild(actor, studentId);
    return prisma.examResult.findMany({
      where: { studentId, exam: { isPublished: true } },
      orderBy: { createdAt: 'desc' },
      include: { exam: true, subject: true },
    });
  },

  async childHomework(actor: Actor, studentId: string) {
    const student = await childWithSection(actor, studentId);
    if (!student.sectionId) return [];
    const homework = await prisma.homework.findMany({
      where: { sectionId: student.sectionId },
      orderBy: [{ dueDate: 'desc' }, { createdAt: 'desc' }],
      take: 40,
      include: {
        subject: { select: { id: true, name: true, code: true } },
        teacher: { select: { id: true, user: { select: { firstName: true, lastName: true } } } },
        attachments: true,
        submissions: {
          where: { studentId },
          select: { status: true, submittedAt: true, remarks: true },
        },
      },
    });
    return homework.map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      materials: item.materials,
      assignedDate: item.assignedDate,
      dueDate: item.dueDate,
      subject: item.subject,
      teacher: item.teacher
        ? {
            id: item.teacher.id,
            name: `${item.teacher.user.firstName} ${item.teacher.user.lastName}`,
          }
        : null,
      attachments: item.attachments,
      submission: item.submissions[0] ?? null,
    }));
  },

  async childTimetable(actor: Actor, studentId: string) {
    const student = await childWithSection(actor, studentId);
    if (!student.sectionId) return [];
    return prisma.timetableEntry.findMany({
      where: { sectionId: student.sectionId },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
      include: timetableInclude,
    });
  },

  /** Recent invoices for one of the parent's own children (never others'). */
  async childInvoices(actor: Actor, studentId: string) {
    await assertChild(actor, studentId);
    return prisma.invoice.findMany({
      where: { studentId },
      orderBy: [{ issueDate: 'desc' }, { createdAt: 'desc' }],
      take: 50,
      include: {
        items: { select: { id: true, description: true, amount: true } },
        payments: {
          select: { id: true, amount: true, method: true, reference: true, paidAt: true },
          orderBy: { paidAt: 'desc' },
        },
      },
    });
  },

  /** Transport/vehicle assignment for one of the parent's own children. */
  async childVehicle(actor: Actor, studentId: string) {
    await assertChild(actor, studentId);
    const subscriptions = await prisma.transportSubscription.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
      include: vehicleInclude,
    });

    return subscriptions.map((subscription) => {
      const { route, stop, academicYear } = subscription;
      return {
        id: subscription.id,
        status: subscription.status,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        academicYear: academicYear
          ? { id: academicYear.id, name: academicYear.name, isCurrent: academicYear.isCurrent }
          : null,
        stop: stop
          ? {
              id: stop.id,
              name: stop.name,
              sequence: stop.sequence,
              pickupTime: stop.pickupTime,
              dropTime: stop.dropTime,
            }
          : null,
        route: route
          ? {
              id: route.id,
              code: route.code,
              name: route.name,
              description: route.description,
              startPoint: route.startPoint,
              endPoint: route.endPoint,
              pickupTime: route.pickupTime,
              dropTime: route.dropTime,
              fare: route.fare,
              stops: route.stops.map((item) => ({
                id: item.id,
                name: item.name,
                sequence: item.sequence,
                pickupTime: item.pickupTime,
                dropTime: item.dropTime,
              })),
            }
          : null,
        vehicles: (route?.vehicles ?? []).map((vehicle) => ({
          id: vehicle.id,
          vehicleCode: vehicle.vehicleCode,
          plateNumber: vehicle.plateNumber,
          model: vehicle.model,
          type: vehicle.type,
          capacity: vehicle.capacity,
          status: vehicle.status,
          insuranceExpiry: vehicle.insuranceExpiry,
          driver: vehicle.driver
            ? {
                id: vehicle.driver.id,
                driverCode: vehicle.driver.driverCode,
                name: vehicle.driver.name,
                phone: vehicle.driver.phone,
                licenseNumber: vehicle.driver.licenseNumber,
              }
            : null,
          driverName: vehicle.driverName,
          driverPhone: vehicle.driverPhone,
        })),
      };
    });
  },

  async childSyllabus(actor: Actor, studentId: string) {
    const student = await childWithSection(actor, studentId);
    const classLevelId = student.section?.classLevelId;
    if (!classLevelId) return [];
    return prisma.syllabusUnit.findMany({
      where: { classLevelId },
      orderBy: [{ subjectId: 'asc' }, { orderIndex: 'asc' }, { createdAt: 'asc' }],
      include: { subject: { select: { id: true, name: true, code: true } } },
    });
  },

  /**
   * Set (or clear) the photo of one of the parent's own children.
   *
   * Reuses the data-URL convention the admin Students screen established: the
   * browser resizes and reads the image, then this stores the small string on
   * `StudentProfile.photoUrl`. Only that one column is touched, and only after
   * the child is proven to belong to the signed-in parent — so a parent can
   * never change another family's student.
   */
  async childPhoto(actor: Actor, studentId: string, photoUrl: string | null) {
    await assertChild(actor, studentId);
    return prisma.studentProfile.update({
      where: { id: studentId },
      data: { photoUrl: photoUrl ? photoUrl : null },
      select: { id: true, photoUrl: true },
    });
  },
};
