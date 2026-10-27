import { z } from 'zod';
import { ExamType } from '@prisma/client';

export const createExamSchema = z.object({
  schoolId: z.string().cuid().optional(),
  academicYearId: z.string().cuid().optional(),
  termId: z.string().cuid().optional(),
  classLevelId: z.string().cuid(),
  subjectId: z.string().cuid(),
  name: z.string().trim().min(1).max(100),
  examType: z.nativeEnum(ExamType).optional(),
  maxMarks: z.coerce.number().int().min(0).optional(),
  passingMarks: z.coerce.number().int().min(0).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});
export type CreateExamInput = z.infer<typeof createExamSchema>;

export const updateExamSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    examType: z.nativeEnum(ExamType).optional(),
    maxMarks: z.coerce.number().int().min(0).optional(),
    passingMarks: z.coerce.number().int().min(0).optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    isPublished: z.boolean().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'At least one field must be provided' });
export type UpdateExamInput = z.infer<typeof updateExamSchema>;

export const listExamsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().min(1).max(120).optional(),
  classLevelId: z.string().cuid().optional(),
  subjectId: z.string().cuid().optional(),
});
export type ListExamsQuery = z.infer<typeof listExamsQuerySchema>;
