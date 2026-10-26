import { Weekday } from '@prisma/client';
import { z } from 'zod';

/**
 * Timetable import helpers shared by the API and the web client.
 *
 * Admins upload timetables as spreadsheets (Excel/CSV) or paste delimited text.
 * Both the browser (to preview and validate a file before sending it) and the
 * server (to validate the request body) need the same parsing and
 * normalisation rules, so they live here.
 */

export const TIMETABLE_IMPORT_MODES = ['upsert', 'replace'] as const;
export type TimetableImportMode = (typeof TIMETABLE_IMPORT_MODES)[number];

/** A single problem found while parsing, validating or resolving an import. */
export interface TimetableImportIssue {
  /** 1-based index of the data row, or null when the issue is about the file. */
  row: number | null;
  /** Canonical field the issue relates to, when known. */
  field: string | null;
  message: string;
}

export interface ParsedImportRows {
  headers: string[];
  rows: Array<Record<string, unknown>>;
  issues: TimetableImportIssue[];
}

export interface TimetableImportResult {
  mode: TimetableImportMode;
  total: number;
  created: number;
  updated: number;
  removed: number;
  sections: string[];
}

type CanonicalField =
  | 'class'
  | 'section'
  | 'subject'
  | 'teacher'
  | 'day'
  | 'startTime'
  | 'endTime'
  | 'room'
  | 'materials';

const HEADER_ALIASES: Record<string, CanonicalField> = {};

function alias(field: CanonicalField, names: string[]): void {
  for (const name of names) HEADER_ALIASES[name] = field;
}

alias('class', [
  'class',
  'classname',
  'class name',
  'classlevel',
  'class level',
  'grade',
  'gradelevel',
  'grade level',
  'standard',
  'form',
  'year',
  'year group',
]);
alias('section', ['section', 'sectionname', 'section name', 'division', 'batch', 'group']);
alias('subject', [
  'subject',
  'subjectname',
  'subject name',
  'subjectcode',
  'subject code',
  'course',
  'paper',
]);
alias('teacher', [
  'teacher',
  'teachername',
  'teacher name',
  'teachercode',
  'educator',
  'instructor',
  'lecturer',
  'faculty',
  'staff',
  'employeeno',
  'employee no',
  'employee number',
]);
alias('day', ['day', 'dayofweek', 'day of week', 'weekday', 'days']);
alias('startTime', ['starttime', 'start time', 'start', 'from', 'time from', 'begins', 'begin']);
alias('endTime', ['endtime', 'end time', 'end', 'to', 'time to', 'finishes', 'finish']);
alias('room', ['room', 'classroom', 'class room', 'venue', 'location', 'hall']);
alias('materials', ['materials', 'material', 'notes', 'note', 'description', 'topic', 'remarks']);

/** Reduce a spreadsheet column heading to a canonical import field. */
export function canonicalField(header: string): CanonicalField | undefined {
  const key = String(header)
    .toLowerCase()
    .replace(/[\s_\-/.]+/g, ' ')
    .trim();
  return HEADER_ALIASES[key];
}

/** Re-key a raw row (e.g. a spreadsheet record) onto canonical field names. */
export function canonicalizeImportRow(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    const field = canonicalField(key);
    if (!field || out[field] !== undefined) continue;
    out[field] = value === null || value === undefined ? '' : String(value);
  }
  return out;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function timeFromDayFraction(fraction: number): string {
  const total = ((Math.round(fraction * 24 * 60) % 1440) + 1440) % 1440;
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}

const WEEKDAYS: Record<string, Weekday> = {
  sun: Weekday.SUNDAY,
  sunday: Weekday.SUNDAY,
  mon: Weekday.MONDAY,
  monday: Weekday.MONDAY,
  tue: Weekday.TUESDAY,
  tues: Weekday.TUESDAY,
  tuesday: Weekday.TUESDAY,
  wed: Weekday.WEDNESDAY,
  weds: Weekday.WEDNESDAY,
  wednesday: Weekday.WEDNESDAY,
  thu: Weekday.THURSDAY,
  thur: Weekday.THURSDAY,
  thurs: Weekday.THURSDAY,
  thursday: Weekday.THURSDAY,
  fri: Weekday.FRIDAY,
  friday: Weekday.FRIDAY,
  sat: Weekday.SATURDAY,
  saturday: Weekday.SATURDAY,
};

/** Turn "Mon", "MONDAY" or "Monday." into the Weekday enum value. */
export function normalizeWeekday(value: unknown): Weekday | null {
  if (value === null || value === undefined) return null;
  const key = String(value)
    .toLowerCase()
    .replace(/[^a-z]/g, '');
  return WEEKDAYS[key] ?? null;
}

/**
 * Turn many time representations into a HH:MM string:
 * "9:00", "09:00:00", "9.00"? no, "9:00 AM", spreadsheets' 0.375 day fraction,
 * JS Dates and bare hour numbers (9 -> 09:00).
 */
export function normalizeTimeValue(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${pad(value.getHours())}:${pad(value.getMinutes())}`;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (value > 0 && value < 1) return timeFromDayFraction(value);
    if (Number.isInteger(value) && value >= 0 && value <= 23) return `${pad(value)}:00`;
    return null;
  }
  if (typeof value !== 'string') return null;
  const raw = value.trim();
  if (!raw) return null;

  if (/^\d+(\.\d+)?$/.test(raw)) {
    const num = Number(raw);
    if (num > 0 && num < 1) return timeFromDayFraction(num);
    if (/^\d{3,4}$/.test(raw)) {
      const digits = raw.padStart(4, '0');
      const hours = Number(digits.slice(0, 2));
      const minutes = Number(digits.slice(2));
      if (hours <= 23 && minutes <= 59) return `${pad(hours)}:${pad(minutes)}`;
    }
    if (/^\d{1,2}$/.test(raw)) {
      const hours = Number(raw);
      if (hours <= 23) return `${pad(hours)}:00`;
    }
    return null;
  }

  const meridiem = raw.match(/^(\d{1,2})(?::(\d{2}))?\s*([AaPp])\.?\s*[Mm]\.?$/);
  if (meridiem) {
    const minutes = Number(meridiem[2] ?? 0);
    let hours = Number(meridiem[1]);
    if (hours < 1 || hours > 12 || minutes > 59) return null;
    hours = (hours % 12) + (meridiem[3]?.toLowerCase() === 'p' ? 12 : 0);
    return `${pad(hours)}:${pad(minutes)}`;
  }

  const military = raw.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (military) {
    const hours = Number(military[1]);
    const minutes = Number(military[2]);
    if (hours > 23 || minutes > 59) return null;
    return `${pad(hours)}:${pad(minutes)}`;
  }

  return null;
}

function parseDelimitedRecords(text: string, delimiter: string): string[][] {
  const records: string[][] = [];
  let record: string[] = [];
  let field = '';
  let inQuotes = false;
  const src = text.replace(/\r\n?/g, '\n');

  for (let i = 0; i < src.length; i++) {
    const char = src[i];
    if (inQuotes) {
      if (char === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
      continue;
    }
    if (char === delimiter) {
      record.push(field);
      field = '';
      continue;
    }
    if (char === '\n') {
      record.push(field);
      records.push(record);
      record = [];
      field = '';
      continue;
    }
    field += char;
  }
  record.push(field);
  records.push(record);
  return records;
}

function detectDelimiter(headerLine: string): string {
  let best = ',';
  let bestCount = 0;
  for (const candidate of [',', ';', '\t', '|']) {
    const count = headerLine.split(candidate).length - 1;
    if (count > bestCount) {
      best = candidate;
      bestCount = count;
    }
  }
  return best;
}

function meaningfulLines(text: string): string[] {
  return text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .filter((line) => line.trim() !== '' && !line.trimStart().startsWith('#'));
}

/** Parse a CSV/TSV/semicolon-delimited timetable into canonical rows. */
export function parseTimetableCsv(text: string): ParsedImportRows {
  const lines = meaningfulLines(text);
  if (lines.length === 0) {
    return {
      headers: [],
      rows: [],
      issues: [{ row: null, field: null, message: 'The pasted data is empty.' }],
    };
  }

  const delimiter = detectDelimiter(lines[0] ?? '');
  const records = parseDelimitedRecords(text, delimiter).filter(
    (record) =>
      !(record.length === 1 && (record[0] ?? '').trim() === '') &&
      !(record[0] ?? '').trimStart().startsWith('#'),
  );
  const headers = (records[0] ?? []).map((header) => header.trim());
  const fields = headers.map(canonicalField);
  const issues: TimetableImportIssue[] = [];

  if (fields.every((field) => field === undefined)) {
    issues.push({
      row: null,
      field: null,
      message: `No recognised columns were found in the header row (${headers.join(
        ', ',
      )}). Expected columns such as Class, Section, Subject, Teacher, Day, Start, End and Room.`,
    });
    return { headers, rows: [], issues };
  }

  const rows = records.slice(1).map((record) => {
    const row: Record<string, unknown> = {};
    fields.forEach((field, index) => {
      if (field && row[field] === undefined) row[field] = (record[index] ?? '').trim();
    });
    return row;
  });

  return { headers, rows, issues };
}

/** Row schema: raw values, normalised and validated for the importer. */
export const timetableImportRowSchema = z
  .object({
    class: z.string().trim().max(120).optional().default(''),
    section: z.string().trim().min(1, 'Section is required').max(120),
    subject: z.string().trim().min(1, 'Subject is required').max(120),
    teacher: z.string().trim().max(120).optional().default(''),
    day: z.string().trim().min(1, 'Day is required'),
    startTime: z.string().trim().min(1, 'Start time is required'),
    endTime: z.string().trim().min(1, 'End time is required'),
    room: z.string().trim().max(60).optional().default(''),
    materials: z.string().trim().max(2000).optional().default(''),
  })
  .superRefine((row, ctx) => {
    if (!normalizeWeekday(row.day)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['day'],
        message: `"${row.day}" is not a weekday name (use Monday, Tue, …).`,
      });
    }
    const start = normalizeTimeValue(row.startTime);
    if (!start) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['startTime'],
        message: `"${row.startTime}" is not a valid time (use HH:MM, e.g. 09:00).`,
      });
    }
    const end = normalizeTimeValue(row.endTime);
    if (!end) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endTime'],
        message: `"${row.endTime}" is not a valid time (use HH:MM, e.g. 10:00).`,
      });
    }
    if (start && end && start >= end) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endTime'],
        message: 'End time must be after the start time.',
      });
    }
  });
export type TimetableImportRowInput = z.infer<typeof timetableImportRowSchema>;

export const importTimetableSchema = z
  .object({
    schoolId: z.string().cuid().optional(),
    mode: z.enum(TIMETABLE_IMPORT_MODES).default('upsert'),
    content: z.string().max(1_000_000, 'The pasted file is too large').optional(),
    rows: z
      .array(z.record(z.unknown()))
      .max(5000, 'A timetable import can hold at most 5000 rows')
      .optional(),
  })
  .refine((data) => Boolean(data.content?.trim()) || (data.rows?.length ?? 0) > 0, {
    message: 'Provide a spreadsheet, pasted CSV data, or parsed rows to import.',
  });
export type ImportTimetableInput = z.infer<typeof importTimetableSchema>;
