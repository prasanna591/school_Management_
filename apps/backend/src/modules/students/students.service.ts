import type {
  CreateStudentInput,
  ListStudentsQuery,
  UpdateStudentInput,
} from '@smartschool/shared';
import type { Prisma, Role as PrismaRole } from '@prisma/client';
import { ApiError } from '../../errors/ApiError';
import { prisma } from '../../lib/prisma';
import { paginate, toSkipTake } from '../../utils/pagination';
import { hashPassword } from '../../utils/password';
import {
  assertSectionInScope,
  assertStudentInScope,
  resolveTeacherScope,
} from '../teachers/teacher-scope';
import type { Actor } from '../users/users.service';

function resolveSchoolScope(actor: Actor, requestedSchoolId?: string | null): string | undefined {
  if (actor.role === 'SUPER_ADMIN') return requestedSchoolId ?? undefined;
  if (!actor.schoolId) throw ApiError.forbidden('Your account is not linked to a school');
  return actor.schoolId;
}

async function assertSectionCapacity(
  sectionId: string,
  schoolId: string,
  excludeStudentId?: string,
): Promise<void> {
  const section = await prisma.section.findUnique({
    where: { id: sectionId },
    select: { id: true, schoolId: true, capacity: true, name: true },
  });
  if (!section || section.schoolId !== schoolId) throw ApiError.badRequest('Invalid section');

  const enrolled = await prisma.studentProfile.count({
    where: {
      sectionId,
      status: 'ACTIVE',
      ...(excludeStudentId ? { id: { not: excludeStudentId } } : {}),
    },
  });
  if (enrolled >= section.capacity) {
    throw ApiError.badRequest(
      `Section "${section.name}" is full (${enrolled}/${section.capacity} students)`,
    );
  }
}

export const studentsService = {
  async list(query: ListStudentsQuery, actor: Actor) {
    const { skip, take } = toSkipTake(query.page, query.limit);
    const where: Prisma.StudentProfileWhereInput = {};
    const schoolId = resolveSchoolScope(actor);
    if (schoolId) where.schoolId = schoolId;
    // Teachers only ever see the students of their own sections; an explicitly
    // requested section is validated against that scope instead of trusted.
    const teacherScope = await resolveTeacherScope(actor);
    if (teacherScope) {
      if (query.sectionId) {
        assertSectionInScope(teacherScope, query.sectionId);
        where.sectionId = query.sectionId;
      } else {
        where.sectionId = { in: teacherScope.sectionIds };
      }
    } else if (query.sectionId) where.sectionId = query.sectionId;
    if (query.status) where.status = query.status;
    if (query.search) {
      where.OR = [
        { admissionNo: { contains: query.search } },
        { user: { firstName: { contains: query.search } } },
        { user: { lastName: { contains: query.search } } },
        { user: { email: { contains: query.search } } },
      ];
    }
    const items = await prisma.studentProfile.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: { user: true, section: { include: { classLevel: true } }, school: true },
    });
    const total = await prisma.studentProfile.count({ where });
    return paginate(items, total, query.page, query.limit);
  },
  async getById(id: string, actor: Actor) {
    const student = await prisma.studentProfile.findUnique({
      where: { id },
      include: {
        user: true,
        section: { include: { classLevel: true } },
        guardians: { include: { guardian: true } },
      },
    });
    if (!student) throw ApiError.notFound('Student not found');
    const scope = resolveSchoolScope(actor);
    if (scope && student.schoolId !== scope) throw ApiError.forbidden('Access denied');
    const teacherScope = await resolveTeacherScope(actor);
    if (teacherScope) assertStudentInScope(teacherScope, student);
    return student;
  },
  async create(input: CreateStudentInput, actor: Actor) {
    const schoolId = resolveSchoolScope(actor, input.schoolId) ?? actor.schoolId ?? undefined;
    if (!schoolId) throw ApiError.badRequest('School is required');
    if (input.sectionId) await assertSectionCapacity(input.sectionId, schoolId);
    let userId: string | undefined;
    if (input.email && input.password) {
      const existing = await prisma.user.findUnique({ where: { email: input.email } });
      if (existing) throw ApiError.conflict('A user with this email already exists');
      const passwordHash = await hashPassword(input.password);
      const user = await prisma.user.create({
        data: {
          email: input.email,
          passwordHash,
          firstName: input.firstName,
          lastName: input.lastName,
          phone: input.phone,
          role: 'STUDENT' as PrismaRole,
          schoolId,
        },
      });
      userId = user.id;
    }
    const student = await prisma.studentProfile.create({
      data: {
        userId,
        schoolId,
        admissionNo: input.admissionNo,
        admissionDate: new Date(input.admissionDate as any),
        dateOfBirth: new Date(input.dateOfBirth as any),
        gender: input.gender,
        bloodGroup: input.bloodGroup,
        address: input.address,
        rollNo: input.rollNo,
        sectionId: input.sectionId,
      },
      include: { user: true, section: { include: { classLevel: true } } },
    });
    if (input.guardianIds && input.guardianIds.length > 0) {
      await prisma.studentGuardian.createMany({
        data: input.guardianIds.map((gid) => ({
          studentId: student.id,
          guardianId: gid,
          relation: 'GUARDIAN' as any,
        })),
        skipDuplicates: true,
      });
    }
    return student;
  },
  async update(id: string, input: UpdateStudentInput, actor: Actor) {
    const existing = await prisma.studentProfile.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Student not found');
    const scope = resolveSchoolScope(actor);
    if (scope && existing.schoolId !== scope) throw ApiError.forbidden('Access denied');
    if (input.sectionId && input.sectionId !== existing.sectionId) {
      await assertSectionCapacity(input.sectionId, existing.schoolId, id);
    }
    const student = await prisma.studentProfile.update({
      where: { id },
      data: {
        ...(input.rollNo !== undefined ? { rollNo: input.rollNo } : {}),
        ...(input.sectionId !== undefined ? { sectionId: input.sectionId } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.address !== undefined ? { address: input.address } : {}),
      },
      include: { user: true, section: { include: { classLevel: true } } },
    });
    return student;
  },
  async updatePhoto(id: string, photoUrl: string | null, actor: Actor) {
    const existing = await prisma.studentProfile.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Student not found');
    const scope = resolveSchoolScope(actor);
    if (scope && existing.schoolId !== scope) throw ApiError.forbidden('Access denied');
    const student = await prisma.studentProfile.update({
      where: { id },
      data: { photoUrl: photoUrl && photoUrl.length > 0 ? photoUrl : null },
      select: { id: true, photoUrl: true },
    });
    return student;
  },
  async remove(id: string, actor: Actor) {
    const existing = await prisma.studentProfile.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Student not found');
    const scope = resolveSchoolScope(actor);
    if (scope && existing.schoolId !== scope) throw ApiError.forbidden('Access denied');
    await prisma.studentProfile.update({ where: { id }, data: { status: 'INACTIVE' } });
    return { success: true };
  },

  // ------------------------------------------------------------------
  // Self-service endpoints for the signed-in student. Every query is scoped to
  // the student's own profile (resolved from the authenticated user), so a
  // student can never reach another student's records.
  // ------------------------------------------------------------------
  async me(actor: Actor) {
    const student = await prisma.studentProfile.findUnique({
      where: { userId: actor.id },
      include: {
        user: true,
        section: { include: { classLevel: true } },
        guardians: { include: { guardian: true } },
      },
    });
    if (!student) throw ApiError.notFound('Student profile not found');
    const scope = resolveSchoolScope(actor);
    if (scope && student.schoolId !== scope) throw ApiError.forbidden('Access denied');
    return student;
  },
  async meAttendance(actor: Actor) {
    const student = await prisma.studentProfile.findUnique({ where: { userId: actor.id } });
    if (!student) throw ApiError.notFound('Student profile not found');
    const scope = resolveSchoolScope(actor);
    if (scope && student.schoolId !== scope) throw ApiError.forbidden('Access denied');
    return prisma.attendance.findMany({
      where: { studentId: student.id },
      orderBy: { date: 'desc' },
      take: 120,
      include: { section: { include: { classLevel: true } } },
    });
  },
  async meHomework(actor: Actor) {
    const student = await prisma.studentProfile.findUnique({
      where: { userId: actor.id },
      select: { id: true, sectionId: true, schoolId: true },
    });
    if (!student) throw ApiError.notFound('Student profile not found');
    const scope = resolveSchoolScope(actor);
    if (scope && student.schoolId !== scope) throw ApiError.forbidden('Access denied');
    if (!student.sectionId) return [];
    const homework = await prisma.homework.findMany({
      where: { sectionId: student.sectionId },
      orderBy: [{ dueDate: 'desc' }, { createdAt: 'desc' }],
      take: 40,
      include: {
        subject: { select: { id: true, name: true, code: true } },
        teacher: { select: { id: true, user: { select: { firstName: true, lastName: true } } } },
        submissions: { where: { studentId: student.id }, select: { status: true, submittedAt: true, remarks: true } },
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
        ? { id: item.teacher.id, name: `${item.teacher.user.firstName} ${item.teacher.user.lastName}` }
        : null,
      submission: item.submissions[0] ?? null,
    }));
  },
  async meTimetable(actor: Actor) {
    const student = await prisma.studentProfile.findUnique({
      where: { userId: actor.id },
      select: { id: true, sectionId: true, schoolId: true },
    });
    if (!student) throw ApiError.notFound('Student profile not found');
    const scope = resolveSchoolScope(actor);
    if (scope && student.schoolId !== scope) throw ApiError.forbidden('Access denied');
    if (!student.sectionId) return [];
    return prisma.timetableEntry.findMany({
      where: { sectionId: student.sectionId },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
      include: {
        subject: { select: { id: true, name: true, code: true } },
        teacher: { select: { id: true, user: { select: { firstName: true, lastName: true } } } },
      },
    });
  },
  async meResults(actor: Actor) {
    const student = await prisma.studentProfile.findUnique({ where: { userId: actor.id } });
    if (!student) throw ApiError.notFound('Student profile not found');
    const scope = resolveSchoolScope(actor);
    if (scope && student.schoolId !== scope) throw ApiError.forbidden('Access denied');
    return prisma.examResult.findMany({
      where: { studentId: student.id, exam: { isPublished: true } },
      orderBy: { createdAt: 'desc' },
      include: { exam: true, subject: true },
    });
  },
};
