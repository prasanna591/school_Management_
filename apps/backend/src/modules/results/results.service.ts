import type {
  CreateExamResultInput,
  ListExamResultsQuery,
  UpdateExamResultInput,
} from '@smartschool/shared';
import type { Prisma } from '@prisma/client';
import { ApiError } from '../../errors/ApiError';
import { prisma } from '../../lib/prisma';
import { paginate, toSkipTake } from '../../utils/pagination';
import { assertOwnStudentId, resolveStudentSelf } from '../students/student-scope';
import {
  assertClassLevelInScope,
  assertStudentInScope,
  assertSubjectInScope,
  resolveTeacherScope,
  type TeacherScope,
} from '../teachers/teacher-scope';
import type { Actor } from '../users/users.service';

function resolveSchoolScope(actor: Actor, requestedSchoolId?: string | null): string | undefined {
  if (actor.role === 'SUPER_ADMIN') return requestedSchoolId ?? undefined;
  if (!actor.schoolId) throw ApiError.forbidden('Your account is not linked to a school');
  return actor.schoolId;
}

/** A teacher may only touch results for their students, subjects and classes. */
function assertResultInScope(
  scope: TeacherScope,
  result: {
    subjectId: string;
    exam: { classLevelId: string };
    student: { sectionId: string | null };
  },
): void {
  assertStudentInScope(scope, result.student);
  assertSubjectInScope(scope, result.subjectId);
  assertClassLevelInScope(scope, result.exam.classLevelId);
}

export const examResultsService = {
  async list(query: ListExamResultsQuery, actor: Actor) {
    const { skip, take } = toSkipTake(query.page, query.limit);
    const where: Prisma.ExamResultWhereInput = {};
    const schoolId = resolveSchoolScope(actor);
    const selfId = await resolveStudentSelf(actor);
    if (selfId) assertOwnStudentId(selfId, query.studentId);
    const examFilter: Prisma.ExamWhereInput = {};
    if (schoolId) examFilter.schoolId = schoolId;
    const teacherScope = await resolveTeacherScope(actor);
    if (teacherScope) {
      // A teacher only sees results for their own students, in the subjects
      // they teach, for exams of the classes they teach.
      if (query.classLevelId) {
        assertClassLevelInScope(teacherScope, query.classLevelId);
        examFilter.classLevelId = query.classLevelId;
      } else {
        examFilter.classLevelId = { in: teacherScope.classLevelIds };
      }
      where.subjectId = { in: teacherScope.subjectIds };
      if (query.studentId) {
        const requested = await prisma.studentProfile.findUnique({
          where: { id: query.studentId },
          select: { sectionId: true },
        });
        if (requested) assertStudentInScope(teacherScope, requested);
      } else {
        where.student = { sectionId: { in: teacherScope.sectionIds } };
      }
      if (query.examId) {
        const exam = await prisma.exam.findUnique({
          where: { id: query.examId },
          select: { classLevelId: true },
        });
        if (exam) assertClassLevelInScope(teacherScope, exam.classLevelId);
      }
    } else if (query.classLevelId) examFilter.classLevelId = query.classLevelId;
    if (Object.keys(examFilter).length > 0) where.exam = examFilter;
    // Students and parents may only see results for published exams; teachers
    // and administrators see drafts too so they can enter and manage marks.
    if ((actor.role === 'STUDENT' || actor.role === 'PARENT') && !teacherScope) {
      where.exam = { ...(where.exam as Prisma.ExamWhereInput), isPublished: true };
    }
    if (query.examId) where.examId = query.examId;
    if (selfId) where.studentId = selfId;
    else if (query.studentId) where.studentId = query.studentId;
    const items = await prisma.examResult.findMany({
      where,
      skip,
      take,
      include: { exam: true, student: true, subject: true },
    });
    const total = await prisma.examResult.count({ where });
    return paginate(items, total, query.page, query.limit);
  },
  async getById(id: string, actor: Actor) {
    const res = await prisma.examResult.findUnique({
      where: { id },
      include: { exam: true, student: true, subject: true },
    });
    if (!res) throw ApiError.notFound('Exam result not found');
    const scope = resolveSchoolScope(actor);
    if (scope && res.exam.schoolId !== scope) throw ApiError.forbidden('Access denied');
    const selfId = await resolveStudentSelf(actor);
    if (selfId) assertOwnStudentId(selfId, res.studentId);
    const teacherScope = await resolveTeacherScope(actor);
    if (teacherScope) assertResultInScope(teacherScope, res);
    return res;
  },
  async create(input: CreateExamResultInput, actor: Actor) {
    const schoolId = resolveSchoolScope(actor, input.schoolId) ?? actor.schoolId ?? undefined;
    if (!schoolId) throw ApiError.badRequest('School is required');
    const exam = await prisma.exam.findUnique({ where: { id: input.examId } });
    if (!exam || exam.schoolId !== schoolId) throw ApiError.badRequest('Invalid exam');
    const student = await prisma.studentProfile.findUnique({ where: { id: input.studentId } });
    if (!student || student.schoolId !== schoolId) throw ApiError.badRequest('Invalid student');
    const subject = await prisma.subject.findUnique({ where: { id: input.subjectId } });
    if (!subject || subject.schoolId !== schoolId) throw ApiError.badRequest('Invalid subject');
    const teacherScope = await resolveTeacherScope(actor);
    if (teacherScope) {
      assertClassLevelInScope(teacherScope, exam.classLevelId);
      assertStudentInScope(teacherScope, student);
      assertSubjectInScope(teacherScope, subject.id);
    }
    const examForGrade = await prisma.exam.findUnique({ where: { id: input.examId } });
    const maxMarks = examForGrade?.maxMarks ?? 100;
    const passingMarks = examForGrade?.passingMarks ?? 0;
    if (input.marksObtained > maxMarks) {
      throw ApiError.badRequest(`Marks cannot exceed max marks (${maxMarks})`);
    }
    const shared = await import('@smartschool/shared');
    const g = input.grade ?? shared.gradeForPercentage(input.marksObtained, maxMarks);
    const r = await prisma.examResult.upsert({
      where: {
        examId_studentId_subjectId: {
          examId: input.examId,
          studentId: input.studentId,
          subjectId: input.subjectId,
        },
      },
      create: {
        examId: input.examId,
        studentId: input.studentId,
        subjectId: input.subjectId,
        marksObtained: input.marksObtained,
        maxMarks,
        grade: g,
        remarks: input.remarks,
      },
      update: {
        marksObtained: input.marksObtained,
        maxMarks,
        grade: g,
        remarks: input.remarks,
      },
    });
    return r;
  },
  async update(id: string, input: UpdateExamResultInput, actor: Actor) {
    const existing = await prisma.examResult.findUnique({
      where: { id },
      include: { exam: true, student: { select: { id: true, sectionId: true } }, subject: true },
    });
    if (!existing) throw ApiError.notFound('Exam result not found');
    const scope = resolveSchoolScope(actor);
    if (scope && existing.exam.schoolId !== scope) throw ApiError.forbidden('Access denied');
    const teacherScope = await resolveTeacherScope(actor);
    if (teacherScope) assertResultInScope(teacherScope, existing);
    const examForGrade = await prisma.exam.findUnique({ where: { id: existing.examId } });
    const maxMarks = examForGrade?.maxMarks ?? existing.maxMarks.toNumber();
    let marks = input.marksObtained ?? existing.marksObtained.toNumber();
    if (marks > maxMarks) marks = maxMarks;
    if (marks < 0) marks = 0;
    const shared = await import('@smartschool/shared');
    const grade = input.grade ?? shared.gradeForPercentage(marks, maxMarks);
    const r = await prisma.examResult.update({
      where: { id },
      data: {
        ...(input.marksObtained !== undefined ? { marksObtained: marks } : {}),
        grade,
        ...(input.remarks !== undefined ? { remarks: input.remarks } : {}),
      },
    });
    return r;
  },
  async remove(id: string, actor: Actor) {
    const existing = await prisma.examResult.findUnique({
      where: { id },
      include: { exam: true, student: { select: { id: true, sectionId: true } }, subject: true },
    });
    if (!existing) throw ApiError.notFound('Exam result not found');
    const scope = resolveSchoolScope(actor);
    if (scope && existing.exam.schoolId !== scope) throw ApiError.forbidden('Access denied');
    const teacherScope = await resolveTeacherScope(actor);
    if (teacherScope) assertResultInScope(teacherScope, existing);
    await prisma.examResult.delete({ where: { id } });
    return { success: true };
  },
  async reportCard(
    params: { studentId: string; examId?: string; classLevelId?: string; examIds?: string[] },
    actor: Actor,
  ) {
    const scope = resolveSchoolScope(actor);
    const selfId = await resolveStudentSelf(actor);
    if (selfId) assertOwnStudentId(selfId, params.studentId);
    const student = await prisma.studentProfile.findUnique({ where: { id: params.studentId } });
    if (!student) throw ApiError.notFound('Student not found');
    if (scope && student.schoolId !== scope) throw ApiError.forbidden('Access denied');
    const teacherScope = await resolveTeacherScope(actor);
    if (teacherScope) assertStudentInScope(teacherScope, student);

    const examFilter: any = {};
    if (params.examId) examFilter.examId = params.examId;
    else if (params.classLevelId) {
      // restrict to exams for that class in same school context; also filter by school if needed
      examFilter.exam = {
        classLevelId: params.classLevelId,
        ...(scope ? { schoolId: scope } : {}),
      };
    } else if (scope) {
      examFilter.exam = { schoolId: scope };
    }
    if (params.examIds && params.examIds.length > 0) {
      examFilter.examId = { in: params.examIds };
    }
    if (teacherScope) {
      // A teacher only ever reads a report card for exams of their own classes.
      if (params.classLevelId) assertClassLevelInScope(teacherScope, params.classLevelId);
      const currentExamFilter = examFilter.exam ?? {};
      examFilter.exam = {
        ...currentExamFilter,
        classLevelId: currentExamFilter.classLevelId ?? { in: teacherScope.classLevelIds },
      };
    }

    const results = await prisma.examResult.findMany({
      where: { studentId: params.studentId, ...examFilter },
      include: { exam: true, subject: true },
    });
    const grouped: Record<string, typeof results> = {};
    for (const r of results) {
      const k = r.examId;
      if (!grouped[k]) grouped[k] = [];
      grouped[k].push(r);
    }
    const report: any[] = [];
    for (const [examId, items] of Object.entries(grouped)) {
      const exam = items[0]?.exam;
      if (!exam) continue;
      const totalObtained = items.reduce((s, it) => s + Number(it.marksObtained), 0);
      const totalMax = items.reduce((s, it) => s + Number(it.maxMarks || exam.maxMarks), 0);
      const pct = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;
      const shared = await import('@smartschool/shared');
      report.push({
        examId,
        examName: exam.name,
        items: items.map((it) => ({
          subjectId: it.subjectId,
          subjectName: it.subject?.name,
          marksObtained: Number(it.marksObtained),
          maxMarks: Number(it.maxMarks),
          grade: it.grade,
        })),
        totalObtained,
        totalMax,
        percentage: Math.round(pct * 100) / 100,
        grade: shared.gradeForPercentage(totalObtained, totalMax),
      });
    }
    return { studentId: params.studentId, report };
  },
};
