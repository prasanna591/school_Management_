import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const prisma: Record<string, unknown> = {
    section: { findMany: vi.fn() },
    subject: { findMany: vi.fn() },
    teacherProfile: { findMany: vi.fn() },
    teacherAssignment: { findMany: vi.fn() },
    timetableEntry: { findMany: vi.fn(), deleteMany: vi.fn(), upsert: vi.fn() },
  };
  prisma.$transaction = vi.fn(async (arg: unknown) =>
    typeof arg === 'function'
      ? (arg as (tx: unknown) => Promise<unknown>)(prisma)
      : Promise.all(arg as Array<Promise<unknown>>),
  );
  return { prisma };
});

vi.mock('../src/lib/prisma', () => ({ prisma: mocks.prisma }));

import { ApiError } from '../src/errors/ApiError';
import { timetableService } from '../src/modules/timetable/timetable.service';
import type { Actor } from '../src/modules/users/users.service';

const entry = mocks.prisma.timetableEntry as {
  findMany: ReturnType<typeof vi.fn>;
  deleteMany: ReturnType<typeof vi.fn>;
  upsert: ReturnType<typeof vi.fn>;
};

const admin: Actor = { id: 'u1', role: 'ADMIN', schoolId: 'school-1' };
const unscopedSuperAdmin: Actor = { id: 'u2', role: 'SUPER_ADMIN', schoolId: null };

function primeReferences() {
  (mocks.prisma.section as { findMany: ReturnType<typeof vi.fn> }).findMany.mockResolvedValue([
    { id: 'sec-a', name: 'A', classLevel: { name: 'Grade 1' } },
    { id: 'sec-b', name: 'B', classLevel: { name: 'Grade 1' } },
  ]);
  (mocks.prisma.subject as { findMany: ReturnType<typeof vi.fn> }).findMany.mockResolvedValue([
    { id: 'sub-math', name: 'Mathematics', code: 'MATH' },
    { id: 'sub-sci', name: 'Science', code: 'SCI' },
  ]);
  (mocks.prisma.teacherProfile as { findMany: ReturnType<typeof vi.fn> }).findMany.mockResolvedValue([
    { id: 't-1', employeeNo: 'E100', user: { firstName: 'Ada', lastName: 'Lovelace' } },
  ]);
  (mocks.prisma.teacherAssignment as { findMany: ReturnType<typeof vi.fn> }).findMany.mockResolvedValue([
    { sectionId: 'sec-a', subjectId: 'sub-math', teacherId: 't-1' },
  ]);
}

describe('timetableService.import', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    primeReferences();
    entry.findMany.mockResolvedValue([]);
    entry.deleteMany.mockResolvedValue({ count: 0 });
    entry.upsert.mockResolvedValue({});
  });

  it('resolves class/section/subject and auto-assigns the assigned teacher', async () => {
    const result = await timetableService.import(
      {
        mode: 'upsert',
        rows: [
          {
            class: 'Grade 1',
            section: 'A',
            subject: 'MATH',
            teacher: '',
            day: 'Monday',
            startTime: '9:00',
            endTime: '10:00',
            room: '101',
          },
        ],
      },
      admin,
    );

    expect(result).toMatchObject({ mode: 'upsert', total: 1, created: 1, updated: 0, removed: 0 });
    expect(result.sections).toEqual(['Grade 1 · A']);
    expect(entry.upsert).toHaveBeenCalledTimes(1);
    expect(entry.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          sectionId_dayOfWeek_startTime: {
            sectionId: 'sec-a',
            dayOfWeek: 'MONDAY',
            startTime: '09:00',
          },
        },
        create: expect.objectContaining({
          schoolId: 'school-1',
          sectionId: 'sec-a',
          subjectId: 'sub-math',
          teacherId: 't-1',
          dayOfWeek: 'MONDAY',
          startTime: '09:00',
          endTime: '10:00',
          room: '101',
          materials: null,
        }),
      }),
    );
  });

  it('resolves a teacher by name and a subject by name', async () => {
    await timetableService.import(
      {
        mode: 'upsert',
        rows: [
          {
            section: 'A',
            subject: 'Science',
            teacher: 'Ada Lovelace',
            day: 'Tuesday',
            startTime: '09:00',
            endTime: '09:45',
          },
        ],
      },
      admin,
    );

    expect(entry.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ subjectId: 'sub-sci', teacherId: 't-1' }),
      }),
    );
  });

  it('counts existing slots as updates', async () => {
    entry.findMany.mockResolvedValue([
      { sectionId: 'sec-a', dayOfWeek: 'MONDAY', startTime: '09:00' },
    ]);

    const result = await timetableService.import(
      {
        mode: 'upsert',
        rows: [
          { section: 'A', subject: 'MATH', day: 'Monday', startTime: '09:00', endTime: '10:00' },
        ],
      },
      admin,
    );

    expect(result).toMatchObject({ created: 0, updated: 1, total: 1 });
  });

  it('imports pasted CSV text', async () => {
    const csv =
      'Class,Section,Subject,Teacher,Day,Start,End,Room\nGrade 1,A,MATH,E100,Mon,9:00,10:00,101';

    await timetableService.import({ mode: 'upsert', content: csv }, admin);

    expect(entry.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          sectionId: 'sec-a',
          subjectId: 'sub-math',
          teacherId: 't-1',
        }),
      }),
    );
  });

  it('clears the affected sections first in replace mode', async () => {
    entry.deleteMany.mockResolvedValue({ count: 4 });

    const result = await timetableService.import(
      {
        mode: 'replace',
        rows: [
          { section: 'A', subject: 'MATH', day: 'Monday', startTime: '09:00', endTime: '10:00' },
        ],
      },
      admin,
    );

    expect(entry.deleteMany).toHaveBeenCalledWith({
      where: { schoolId: 'school-1', sectionId: { in: ['sec-a'] } },
    });
    expect(entry.findMany).not.toHaveBeenCalled();
    expect(result).toMatchObject({ mode: 'replace', created: 1, updated: 0, removed: 4 });
  });

  it('rejects the whole import and writes nothing when a row is invalid', async () => {
    await expect(
      timetableService.import(
        {
          mode: 'upsert',
          rows: [
            { section: 'A', subject: 'MATH', day: 'Funday', startTime: '9:00', endTime: '10:00' },
            { section: 'Z', subject: 'MATH', day: 'Monday', startTime: '9:00', endTime: '10:00' },
          ],
        },
        admin,
      ),
    ).rejects.toMatchObject({ statusCode: 400 });

    expect(entry.upsert).not.toHaveBeenCalled();
  });

  it('reports duplicate and overlapping slots in the same file', async () => {
    const duplicate = timetableService.import(
      {
        mode: 'upsert',
        rows: [
          { section: 'A', subject: 'MATH', day: 'Monday', startTime: '09:00', endTime: '10:00' },
          { section: 'A', subject: 'SCI', day: 'Monday', startTime: '09:00', endTime: '10:30' },
        ],
      },
      admin,
    );

    await expect(duplicate).rejects.toThrow('could not be imported');
    expect(entry.upsert).not.toHaveBeenCalled();
  });

  it('scopes the import to the actor school and fails clearly without one', async () => {
    await expect(
      timetableService.import(
        {
          mode: 'upsert',
          rows: [
            { section: 'A', subject: 'MATH', day: 'Monday', startTime: '09:00', endTime: '10:00' },
          ],
        },
        unscopedSuperAdmin,
      ),
    ).rejects.toThrow('School is required');

    expect((mocks.prisma.section as { findMany: ReturnType<typeof vi.fn> }).findMany).not.toHaveBeenCalled();
  });

  it('returns 400 details when the payload has no rows', async () => {
    const error = await timetableService
      .import({ mode: 'upsert', content: '   ' }, admin)
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).statusCode).toBe(400);
  });
});
