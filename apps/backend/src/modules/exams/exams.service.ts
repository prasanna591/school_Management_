import type { CreateExamInput, ListExamsQuery, UpdateExamInput } from '@smartschool/shared';
import type { Prisma } from '@prisma/client';
import { ApiError } from '../../errors/ApiError';
import { prisma } from '../../lib/prisma';
import { paginate, toSkipTake } from '../../utils/pagination';
import type { Actor } from '../users/users.service';

function resolveSchoolScope(actor: Actor, requestedSchoolId?: string | null): string | undefined {
  if (actor.role === 'SUPER_ADMIN') return requestedSchoolId ?? undefined;
  if (!actor.schoolId) throw ApiError.forbidden('Your account is not linked to a school');
  return actor.schoolId;
}

export const examsService = {
  async list(query: ListExamsQuery, actor: Actor) {
    const { skip, take } = toSkipTake(query.page, query.limit);
    const where: Prisma.ExamWhereInput = {};
    const schoolId = resolveSchoolScope(actor);
    if (schoolId) where.schoolId = schoolId;
    if (query.classLevelId) where.classLevelId = query.classLevelId;
    if (query.search) where.OR = [{ name: { contains: query.search } }];
    const items = await prisma.exam.findMany({
      where,
      skip,
      take,
      orderBy: { startDate: 'desc' },
      include: { classLevel: true, term: true },
    });
    const total = await prisma.exam.count({ where });
    return paginate(items, total, query.page, query.limit);
  },
  async getById(id: string, actor: Actor) {
    const exam = await prisma.exam.findUnique({
      where: { id },
      include: { classLevel: true, term: true, results: true },
    });
    if (!exam) throw ApiError.notFound('Exam not found');
    const scope = resolveSchoolScope(actor);
    if (scope && exam.schoolId !== scope) throw ApiError.forbidden('Access denied');
    return exam;
  },
  async create(input: CreateExamInput, actor: Actor) {
    const schoolId = resolveSchoolScope(actor, input.schoolId) ?? actor.schoolId ?? undefined;
    if (!schoolId) throw ApiError.badRequest('School is required');
    const activeAy = await prisma.academicYear.findFirst({ where: { schoolId } });
    const maxMarks = input.maxMarks ?? 100;
    const passingMarks = input.passingMarks ?? 0;
    if (passingMarks > maxMarks) {
      throw ApiError.badRequest('Passing marks cannot exceed max marks');
    }
    const exam = await prisma.exam.create({
      data: {
        schoolId,
        academicYearId: input.academicYearId || activeAy?.id || '',
        termId: input.termId,
        classLevelId: input.classLevelId,
        name: input.name,
        type: input.examType || 'UNIT_TEST',
        maxMarks,
        passingMarks,
        startDate: input.startDate || new Date(),
        endDate: input.endDate || new Date(),
        isPublished: false,
      },
    });
    return exam;
  },
  async update(id: string, input: UpdateExamInput, actor: Actor) {
    const existing = await prisma.exam.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Exam not found');
    const scope = resolveSchoolScope(actor);
    if (scope && existing.schoolId !== scope) throw ApiError.forbidden('Access denied');
    const maxMarks = input.maxMarks ?? existing.maxMarks;
    const passingMarks = input.passingMarks ?? existing.passingMarks;
    if (passingMarks > maxMarks) {
      throw ApiError.badRequest('Passing marks cannot exceed max marks');
    }
    const exam = await prisma.exam.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.examType !== undefined ? { type: input.examType } : {}),
        ...(input.maxMarks !== undefined ? { maxMarks: input.maxMarks } : {}),
        ...(input.passingMarks !== undefined ? { passingMarks: input.passingMarks } : {}),
        ...(input.startDate !== undefined ? { startDate: input.startDate } : {}),
        ...(input.endDate !== undefined ? { endDate: input.endDate } : {}),
        ...(input.isPublished !== undefined ? { isPublished: input.isPublished } : {}),
      },
    });
    return exam;
  },
  async remove(id: string, actor: Actor) {
    const existing = await prisma.exam.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Exam not found');
    const scope = resolveSchoolScope(actor);
    if (scope && existing.schoolId !== scope) throw ApiError.forbidden('Access denied');
    await prisma.exam.delete({ where: { id } });
    return { success: true };
  },
};
