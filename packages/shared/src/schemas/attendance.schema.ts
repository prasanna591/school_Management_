import { z } from 'zod';
import { AttendanceStatus } from '@prisma/client';

export const createAttendanceSchema = z.object({
  schoolId: z.string().cuid().optional(),
  studentId: z.string().cuid(),
  sectionId: z.string().cuid(),
  date: z.coerce.date(),
  status: z.nativeEnum(AttendanceStatus),
  remark: z.string().max(255).optional(),
  takenById: z.string().cuid().optional(),
});
export type CreateAttendanceInput = z.infer<typeof createAttendanceSchema>;

const bulkAttendanceRecordSchema = z.object({
  studentId: z.string().cuid(),
  status: z.nativeEnum(AttendanceStatus),
  remark: z.string().max(255).optional(),
});

export const bulkAttendanceSchema = z
  .object({
    schoolId: z.string().cuid().optional(),
    sectionId: z.string().cuid(),
    date: z.coerce.date(),
    takenById: z.string().cuid().optional(),
    records: z
      .array(bulkAttendanceRecordSchema)
      .min(1, 'Provide at least one attendance record')
      .max(500, 'A register can hold at most 500 students'),
  })
  .superRefine((data, ctx) => {
    const seen = new Set<string>();
    data.records.forEach((record, index) => {
      if (seen.has(record.studentId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['records', index, 'studentId'],
          message: 'Each student may appear only once in an attendance batch',
        });
      }
      seen.add(record.studentId);
    });
  });
export type BulkAttendanceInput = z.infer<typeof bulkAttendanceSchema>;

export const updateAttendanceSchema = z
  .object({
    status: z.nativeEnum(AttendanceStatus).optional(),
    remark: z.string().max(255).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'At least one field must be provided' });
export type UpdateAttendanceInput = z.infer<typeof updateAttendanceSchema>;

export const listAttendancesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().min(1).max(120).optional(),
  classLevelId: z.string().cuid().optional(),
  sectionId: z.string().cuid().optional(),
  date: z.coerce.date().optional(),
  studentId: z.string().cuid().optional(),
});
export type ListAttendancesQuery = z.infer<typeof listAttendancesQuerySchema>;

export const attendanceSummaryQuerySchema = z.object({
  studentId: z.string().cuid().optional(),
  sectionId: z.string().cuid().optional(),
  classLevelId: z.string().cuid().optional(),
  termId: z.string().cuid().optional(),
  month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Expected a month formatted as YYYY-MM')
    .optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});
export type AttendanceSummaryQuery = z.infer<typeof attendanceSummaryQuerySchema>;
