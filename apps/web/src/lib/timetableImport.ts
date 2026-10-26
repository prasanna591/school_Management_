import {
  type ParsedImportRows,
  type TimetableImportIssue,
  canonicalField,
  canonicalizeImportRow,
  parseTimetableCsv,
  timetableImportRowSchema,
} from '@smartschool/shared';
import * as XLSX from 'xlsx';

export type ImportFileFormat = 'csv' | 'xlsx';

export interface ImportPreview {
  source: 'file' | 'paste';
  fileName: string | null;
  format: ImportFileFormat;
  rows: Array<Record<string, unknown>>;
  issues: TimetableImportIssue[];
}

/** Validate canonical rows with the same schema the API uses. */
export function validateImportRows(rows: Array<Record<string, unknown>>): TimetableImportIssue[] {
  const issues: TimetableImportIssue[] = [];
  rows.forEach((row, index) => {
    const result = timetableImportRowSchema.safeParse(row);
    if (result.success) return;
    for (const issue of result.error.issues) {
      issues.push({ row: index + 1, field: issue.path.join('.') || null, message: issue.message });
    }
  });
  return issues;
}

function parseWorkbook(data: ArrayBuffer): ParsedImportRows {
  const workbook = XLSX.read(data, { type: 'array', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return { headers: [], rows: [], issues: [{ row: null, field: null, message: 'The workbook has no sheets.' }] };
  }
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    return { headers: [], rows: [], issues: [{ row: null, field: null, message: 'The first sheet is empty.' }] };
  }

  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    blankrows: false,
    defval: '',
    raw: false,
  });
  const headerRow = (matrix[0] ?? []) as unknown[];
  const headers = headerRow.map((value) => String(value ?? '').trim());
  const recognized = headers.some((header) => canonicalField(header) !== undefined);
  if (!recognized) {
    return {
      headers,
      rows: [],
      issues: [
        {
          row: null,
          field: null,
          message: `No recognised columns were found in the first row (${headers
            .filter(Boolean)
            .join(', ')}). Expected columns such as Class, Section, Subject, Teacher, Day, Start, End and Room.`,
        },
      ],
    };
  }

  const rows = (matrix.slice(1) as unknown[][])
    .filter((record) => record.some((value) => String(value ?? '').trim() !== ''))
    .map((record) => {
      const raw: Record<string, unknown> = {};
      headers.forEach((header, index) => {
        if (header) raw[header] = String(record[index] ?? '').trim();
      });
      return canonicalizeImportRow(raw);
    });

  return { headers, rows, issues: [] };
}

export function parseTimetableText(text: string): ParsedImportRows {
  return parseTimetableCsv(text);
}

export function previewPastedText(text: string): ImportPreview {
  const parsed = parseTimetableText(text);
  return { source: 'paste', fileName: null, format: 'csv', rows: parsed.rows, issues: parsed.issues };
}

export async function previewSpreadsheetFile(file: File): Promise<ImportPreview> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.xlsm')) {
    const parsed = parseWorkbook(await file.arrayBuffer());
    return { source: 'file', fileName: file.name, format: 'xlsx', rows: parsed.rows, issues: parsed.issues };
  }
  const text = await file.text();
  const parsed = parseTimetableText(text);
  return { source: 'file', fileName: file.name, format: 'csv', rows: parsed.rows, issues: parsed.issues };
}
