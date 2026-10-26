import {
  type CreateTimetableEntryInput,
  type ImportTimetableInput,
  type ListTimetableQuery,
  type ParsedImportRows,
  type TimetableImportIssue,
  type TimetableImportResult,
  type UpdateTimetableEntryInput,
  canonicalizeImportRow,
  normalizeTimeValue,
  normalizeWeekday,
  parseTimetableCsv,
  timetableImportRowSchema,
} from '@smartschool/shared';
import type { Prisma, Weekday } from '@prisma/client';
import { ApiError } from '../../errors/ApiError';
import { prisma } from '../../lib/prisma';
import { paginate, toSkipTake } from '../../utils/pagination';
import {
  assertSectionInScope,
  assertSubjectInScope,
  assertTeacherIdIsSelf,
  assertTimetableEntryInScope,
  resolveTeacherScope,
} from '../teachers/teacher-scope';
import type { Actor } from '../users/users.service';

function resolveSchoolScope(actor: Actor, requestedSchoolId?: string | null): string | undefined {
  if (actor.role === 'SUPER_ADMIN') return requestedSchoolId ?? undefined;
  if (!actor.schoolId) throw ApiError.forbidden('Your account is not linked to a school');
  return actor.schoolId;
}

const timetableInclude = {
  subject: { select: { id: true, name: true, code: true } },
  section: {
    select: { id: true, name: true, classLevel: { select: { id: true, name: true } } },
  },
  teacher: {
    select: { id: true, user: { select: { firstName: true, lastName: true } } },
  },
} satisfies Prisma.TimetableEntryInclude;

async function assertSection(sectionId: string, schoolId: string) {
  const section = await prisma.section.findUnique({
    where: { id: sectionId },
    select: { schoolId: true },
  });
  if (!section) throw ApiError.badRequest('Section not found');
  if (section.schoolId !== schoolId) throw ApiError.badRequest('Section belongs to another school');
}

async function assertSubject(subjectId: string, schoolId: string) {
  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
    select: { schoolId: true },
  });
  if (!subject) throw ApiError.badRequest('Subject not found');
  if (subject.schoolId !== schoolId) throw ApiError.badRequest('Subject belongs to another school');
}

async function assertTeacher(teacherId: string | null | undefined, schoolId: string) {
  if (!teacherId) return;
  const teacher = await prisma.teacherProfile.findUnique({
    where: { id: teacherId },
    select: { schoolId: true },
  });
  if (!teacher) throw ApiError.badRequest('Teacher not found');
  if (teacher.schoolId !== schoolId) throw ApiError.badRequest('Teacher belongs to another school');
}

function lower(value: string): string {
  return value.trim().toLowerCase();
}

function push<T>(map: Map<string, T[]>, key: string, value: T): void {
  const list = map.get(key);
  if (list) list.push(value);
  else map.set(key, [value]);
}

function readableDay(day: string): string {
  return `${day.charAt(0)}${day.slice(1).toLowerCase()}`;
}

interface ImportSection {
  id: string;
  name: string;
  classLevel: { name: string } | null;
}

interface ImportSubject {
  id: string;
  name: string;
  code: string;
}

interface ImportTeacher {
  id: string;
  employeeNo: string;
  user: { firstName: string; lastName: string } | null;
}

interface NormalizedRow {
  row: number;
  class: string;
  section: string;
  subject: string;
  teacher: string;
  dayOfWeek: Weekday;
  startTime: string;
  endTime: string;
  room: string;
  materials: string;
}

interface ResolvedEntry {
  sectionId: string;
  sectionLabel: string;
  subjectId: string;
  teacherId: string | null;
  dayOfWeek: Weekday;
  startTime: string;
  endTime: string;
  room: string | null;
  materials: string | null;
}

/** Read the rows to import from either parsed rows or pasted CSV text. */
function collectRows(input: ImportTimetableInput): ParsedImportRows {
  if (input.rows && input.rows.length > 0) {
    return { headers: [], rows: input.rows.map(canonicalizeImportRow), issues: [] };
  }
  return parseTimetableCsv(input.content ?? '');
}

export const timetableService = {
  async list(query: ListTimetableQuery, actor: Actor) {
    const { skip, take } = toSkipTake(query.page, query.limit);
    const where: Prisma.TimetableEntryWhereInput = {};
    const schoolId = resolveSchoolScope(actor);
    if (schoolId) where.schoolId = schoolId;
    if (query.sectionId) where.sectionId = query.sectionId;
    if (query.subjectId) where.subjectId = query.subjectId;
    if (query.teacherId) where.teacherId = query.teacherId;
    if (query.dayOfWeek) where.dayOfWeek = query.dayOfWeek;
    // A teacher only ever sees their own periods, plus the sections they are
    // the class teacher of. Requested filters are validated, not trusted.
    const teacherScope = await resolveTeacherScope(actor);
    if (teacherScope) {
      if (query.teacherId) assertTeacherIdIsSelf(teacherScope, query.teacherId);
      if (query.sectionId) assertSectionInScope(teacherScope, query.sectionId);
      if (query.subjectId) assertSubjectInScope(teacherScope, query.subjectId);
      if (teacherScope.classTeacherSectionIds.length > 0) {
        where.OR = [
          { teacherId: teacherScope.profileId },
          { sectionId: { in: teacherScope.classTeacherSectionIds } },
        ];
      } else if (!query.teacherId) {
        where.teacherId = teacherScope.profileId;
      }
    }
    const items = await prisma.timetableEntry.findMany({
      where,
      skip,
      take,
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
      include: timetableInclude,
    });
    const total = await prisma.timetableEntry.count({ where });
    return paginate(items, total, query.page, query.limit);
  },

  async getById(id: string, actor: Actor) {
    const entry = await prisma.timetableEntry.findUnique({
      where: { id },
      include: timetableInclude,
    });
    if (!entry) throw ApiError.notFound('Timetable entry not found');
    const scope = resolveSchoolScope(actor);
    if (scope && entry.schoolId !== scope) throw ApiError.forbidden('Access denied');
    const teacherScope = await resolveTeacherScope(actor);
    if (teacherScope) assertTimetableEntryInScope(teacherScope, entry);
    return entry;
  },

  async create(input: CreateTimetableEntryInput, actor: Actor) {
    const schoolId = resolveSchoolScope(actor, input.schoolId) ?? actor.schoolId ?? undefined;
    if (!schoolId) throw ApiError.badRequest('School is required');
    const teacherScope = await resolveTeacherScope(actor);
    if (teacherScope) {
      assertSectionInScope(teacherScope, input.sectionId);
      assertSubjectInScope(teacherScope, input.subjectId);
      assertTeacherIdIsSelf(teacherScope, input.teacherId);
    }
    await assertSection(input.sectionId, schoolId);
    await assertSubject(input.subjectId, schoolId);
    await assertTeacher(input.teacherId, schoolId);
    const entry = await prisma.timetableEntry.create({
      data: {
        schoolId,
        sectionId: input.sectionId,
        subjectId: input.subjectId,
        teacherId: input.teacherId ?? null,
        dayOfWeek: input.dayOfWeek,
        startTime: input.startTime,
        endTime: input.endTime,
        room: input.room ?? null,
        materials: input.materials ?? null,
      },
      include: timetableInclude,
    });
    return entry;
  },

  async update(id: string, input: UpdateTimetableEntryInput, actor: Actor) {
    const existing = await prisma.timetableEntry.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Timetable entry not found');
    const scope = resolveSchoolScope(actor);
    if (scope && existing.schoolId !== scope) throw ApiError.forbidden('Access denied');
    const teacherScope = await resolveTeacherScope(actor);
    if (teacherScope) {
      assertTimetableEntryInScope(teacherScope, existing);
      if (input.sectionId) assertSectionInScope(teacherScope, input.sectionId);
      if (input.subjectId) assertSubjectInScope(teacherScope, input.subjectId);
      if (input.teacherId !== undefined) assertTeacherIdIsSelf(teacherScope, input.teacherId);
    }
    if (input.sectionId) await assertSection(input.sectionId, existing.schoolId);
    if (input.subjectId) await assertSubject(input.subjectId, existing.schoolId);
    if (input.teacherId !== undefined) await assertTeacher(input.teacherId, existing.schoolId);
    const entry = await prisma.timetableEntry.update({
      where: { id },
      data: {
        ...(input.sectionId !== undefined ? { sectionId: input.sectionId } : {}),
        ...(input.subjectId !== undefined ? { subjectId: input.subjectId } : {}),
        ...(input.teacherId !== undefined ? { teacherId: input.teacherId } : {}),
        ...(input.dayOfWeek !== undefined ? { dayOfWeek: input.dayOfWeek } : {}),
        ...(input.startTime !== undefined ? { startTime: input.startTime } : {}),
        ...(input.endTime !== undefined ? { endTime: input.endTime } : {}),
        ...(input.room !== undefined ? { room: input.room } : {}),
        ...(input.materials !== undefined ? { materials: input.materials } : {}),
      },
      include: timetableInclude,
    });
    return entry;
  },

  async remove(id: string, actor: Actor) {
    const existing = await prisma.timetableEntry.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('Timetable entry not found');
    const scope = resolveSchoolScope(actor);
    if (scope && existing.schoolId !== scope) throw ApiError.forbidden('Access denied');
    const teacherScope = await resolveTeacherScope(actor);
    if (teacherScope) assertTimetableEntryInScope(teacherScope, existing);
    await prisma.timetableEntry.delete({ where: { id } });
    return { success: true };
  },

  /**
   * Import a whole timetable from an Excel/CSV export or pasted delimited text.
   * Rows are validated and resolved (class/section, subject, teacher) inside the
   * actor's school before anything is written, so an invalid file changes
   * nothing. `upsert` merges by section/day/start time; `replace` clears the
   * affected sections first.
   */
  async import(input: ImportTimetableInput, actor: Actor): Promise<TimetableImportResult> {
    const schoolId = resolveSchoolScope(actor, input.schoolId) ?? actor.schoolId ?? undefined;
    if (!schoolId) throw ApiError.badRequest('School is required');

    const parsed = collectRows(input);
    const issues: TimetableImportIssue[] = [...parsed.issues];
    if (parsed.rows.length === 0) {
      if (issues.length === 0) {
        issues.push({ row: null, field: null, message: 'The import contains no timetable rows.' });
      }
      throw ApiError.badRequest('The timetable could not be imported', { issues });
    }

    // 1. Validate and normalise every row (day names, times, required fields).
    const normalizedRows: NormalizedRow[] = [];
    parsed.rows.forEach((raw, index) => {
      const rowNumber = index + 1;
      const result = timetableImportRowSchema.safeParse(raw);
      if (!result.success) {
        for (const issue of result.error.issues) {
          issues.push({
            row: rowNumber,
            field: issue.path.join('.') || null,
            message: issue.message,
          });
        }
        return;
      }
      normalizedRows.push({
        row: rowNumber,
        ...result.data,
        dayOfWeek: normalizeWeekday(result.data.day) as Weekday,
        startTime: normalizeTimeValue(result.data.startTime) as string,
        endTime: normalizeTimeValue(result.data.endTime) as string,
      });
    });

    // 2. Load the school's sections, subjects and teachers for name resolution.
    const [sections, subjects, teachers, assignments] = await Promise.all([
      prisma.section.findMany({
        where: { schoolId },
        select: {
          id: true,
          name: true,
          classLevel: { select: { name: true } },
        },
      }),
      prisma.subject.findMany({
        where: { schoolId },
        select: { id: true, name: true, code: true },
      }),
      prisma.teacherProfile.findMany({
        where: { schoolId },
        select: {
          id: true,
          employeeNo: true,
          user: { select: { firstName: true, lastName: true } },
        },
      }),
      prisma.teacherAssignment.findMany({
        where: { section: { schoolId } },
        select: { sectionId: true, subjectId: true, teacherId: true },
      }),
    ]);

    const sectionsByClassAndName = new Map<string, ImportSection[]>();
    const sectionsByName = new Map<string, ImportSection[]>();
    for (const section of sections) {
      const className = lower(section.classLevel?.name ?? '');
      push(sectionsByClassAndName, `${className}::${lower(section.name)}`, section);
      push(sectionsByName, lower(section.name), section);
    }

    const subjectsByCode = new Map<string, ImportSubject>();
    const subjectsByName = new Map<string, ImportSubject[]>();
    for (const subject of subjects) {
      if (subject.code) subjectsByCode.set(lower(subject.code), subject);
      push(subjectsByName, lower(subject.name), subject);
    }

    const teachersByEmployeeNo = new Map<string, ImportTeacher[]>();
    const teachersByName = new Map<string, ImportTeacher[]>();
    for (const teacher of teachers) {
      const first = teacher.user?.firstName ?? '';
      const last = teacher.user?.lastName ?? '';
      const full = lower(`${first} ${last}`.replace(/\s+/g, ' '));
      if (full) push(teachersByName, full, teacher);
      const reversed = lower(`${last}, ${first}`.replace(/\s+/g, ' '));
      if (reversed && last) push(teachersByName, reversed, teacher);
      if (teacher.employeeNo) push(teachersByEmployeeNo, lower(teacher.employeeNo), teacher);
    }

    const assignmentTeacher = new Map<string, string>();
    for (const assignment of assignments) {
      const key = `${assignment.sectionId}|${assignment.subjectId}`;
      if (!assignmentTeacher.has(key)) assignmentTeacher.set(key, assignment.teacherId);
    }

    // 3. Resolve each row to concrete ids and guard against duplicate/overlapping slots.
    const entries: ResolvedEntry[] = [];
    const seenSlots = new Map<string, number>();
    const occupiedSlots = new Map<string, Array<{ start: string; end: string; row: number }>>();

    for (const row of normalizedRows) {
      let className = row.class.trim();
      let sectionName = row.section.trim();
      if (!sectionName && /\s[-/]\s/.test(className)) {
        const parts = className.split(/\s+[-/]\s+/);
        sectionName = (parts.pop() ?? '').trim();
        className = parts.join(' ').trim();
      }
      if (!className && !sectionName) {
        issues.push({
          row: row.row,
          field: 'section',
          message: 'Each row needs a section (add a Class column if section names repeat).',
        });
        continue;
      }

      let section: ImportSection | undefined;
      if (className) {
        section = (sectionsByClassAndName.get(`${lower(className)}::${lower(sectionName)}`) ?? [])[0];
        if (!section) {
          issues.push({
            row: row.row,
            field: 'section',
            message: `No section "${sectionName}" was found in class "${className}".`,
          });
          continue;
        }
      } else {
        const matches = sectionsByName.get(lower(sectionName)) ?? [];
        if (matches.length === 0) {
          issues.push({
            row: row.row,
            field: 'section',
            message: `No section named "${sectionName}" was found in this school.`,
          });
          continue;
        }
        if (matches.length > 1) {
          issues.push({
            row: row.row,
            field: 'section',
            message: `Section "${sectionName}" matches ${matches.length} classes. Add a Class column to disambiguate.`,
          });
          continue;
        }
        section = matches[0];
      }
      if (!section) continue;

      const subjectKey = lower(row.subject);
      const namedSubjects = subjectsByName.get(subjectKey) ?? [];
      const subject =
        subjectsByCode.get(subjectKey) ?? (namedSubjects.length === 1 ? namedSubjects[0] : undefined);
      if (!subject) {
        issues.push({
          row: row.row,
          field: 'subject',
          message:
            namedSubjects.length > 1
              ? `Subject "${row.subject}" matches ${namedSubjects.length} subjects. Use the subject code instead.`
              : `No subject named "${row.subject}" was found in this school.`,
        });
        continue;
      }

      let teacherId: string | null = null;
      const teacherKey = lower(row.teacher);
      if (teacherKey) {
        const byEmployee = teachersByEmployeeNo.get(teacherKey) ?? [];
        const byName = teachersByName.get(teacherKey) ?? [];
        const teacher = byEmployee[0] ?? (byName.length === 1 ? byName[0] : undefined);
        if (!teacher) {
          issues.push({
            row: row.row,
            field: 'teacher',
            message:
              byName.length > 1
                ? `Teacher "${row.teacher}" matches ${byName.length} people. Use the employee number instead.`
                : `No teacher matching "${row.teacher}" was found in this school.`,
          });
          continue;
        }
        teacherId = teacher.id;
      } else {
        teacherId = assignmentTeacher.get(`${section.id}|${subject.id}`) ?? null;
      }

      const slotKey = `${section.id}|${row.dayOfWeek}|${row.startTime}`;
      const duplicate = seenSlots.get(slotKey);
      if (duplicate) {
        issues.push({
          row: row.row,
          field: 'startTime',
          message: `Duplicate of row ${duplicate}: ${section.name} already has a class at ${row.startTime} on ${readableDay(row.dayOfWeek)}.`,
        });
        continue;
      }

      const dayKey = `${section.id}|${row.dayOfWeek}`;
      const slots = occupiedSlots.get(dayKey) ?? [];
      const clash = slots.find((slot) => row.startTime < slot.end && row.endTime > slot.start);
      if (clash) {
        issues.push({
          row: row.row,
          field: 'startTime',
          message: `Overlaps with row ${clash.row} (${clash.start}–${clash.end}).`,
        });
        continue;
      }

      seenSlots.set(slotKey, row.row);
      slots.push({ start: row.startTime, end: row.endTime, row: row.row });
      occupiedSlots.set(dayKey, slots);

      entries.push({
        sectionId: section.id,
        sectionLabel: [section.classLevel?.name, section.name].filter(Boolean).join(' · '),
        subjectId: subject.id,
        teacherId,
        dayOfWeek: row.dayOfWeek,
        startTime: row.startTime,
        endTime: row.endTime,
        room: row.room.trim() || null,
        materials: row.materials.trim() || null,
      });
    }

    if (issues.length > 0) {
      throw ApiError.badRequest('The timetable could not be imported', {
        issues,
        total: parsed.rows.length,
      });
    }

    // 4. Persist atomically so a failure halfway through never leaves a partial timetable.
    const sectionIds = [...new Set(entries.map((entry) => entry.sectionId))];
    const counts = await prisma.$transaction(async (tx) => {
      let removed = 0;
      if (input.mode === 'replace') {
        const deletion = await tx.timetableEntry.deleteMany({
          where: { schoolId, sectionId: { in: sectionIds } },
        });
        removed = deletion.count;
      }

      const existingSlots = new Set<string>();
      if (input.mode === 'upsert') {
        const existing = await tx.timetableEntry.findMany({
          where: { schoolId, sectionId: { in: sectionIds } },
          select: { sectionId: true, dayOfWeek: true, startTime: true },
        });
        for (const item of existing) {
          existingSlots.add(`${item.sectionId}|${item.dayOfWeek}|${item.startTime}`);
        }
      }

      let created = 0;
      let updated = 0;
      for (const entry of entries) {
        const key = `${entry.sectionId}|${entry.dayOfWeek}|${entry.startTime}`;
        if (existingSlots.has(key)) updated += 1;
        else created += 1;
        await tx.timetableEntry.upsert({
          where: {
            sectionId_dayOfWeek_startTime: {
              sectionId: entry.sectionId,
              dayOfWeek: entry.dayOfWeek,
              startTime: entry.startTime,
            },
          },
          create: {
            schoolId,
            sectionId: entry.sectionId,
            subjectId: entry.subjectId,
            teacherId: entry.teacherId,
            dayOfWeek: entry.dayOfWeek,
            startTime: entry.startTime,
            endTime: entry.endTime,
            room: entry.room,
            materials: entry.materials,
          },
          update: {
            subjectId: entry.subjectId,
            teacherId: entry.teacherId,
            endTime: entry.endTime,
            room: entry.room,
            materials: entry.materials,
          },
        });
      }
      return { created, updated, removed };
    });

    return {
      mode: input.mode,
      total: entries.length,
      ...counts,
      sections: [...new Set(entries.map((entry) => entry.sectionLabel))].sort(),
    };
  },
};
