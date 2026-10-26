import { describe, expect, it } from 'vitest';
import { parseTimetableText, previewPastedText, validateImportRows } from './timetableImport';

const csv = [
  'Class,Section,Subject,Teacher,Day,Start,End,Room',
  'Grade 1,A,Mathematics,Ada Lovelace,Monday,09:00,10:00,101',
  'Grade 1,B,Mathematics,,Tue,9:00 AM,9:45 AM,',
].join('\n');

describe('parseTimetableText', () => {
  it('parses a CSV export into canonical rows', () => {
    const parsed = parseTimetableText(csv);
    expect(parsed.rows).toHaveLength(2);
    expect(parsed.rows[0]).toMatchObject({
      class: 'Grade 1',
      section: 'A',
      subject: 'Mathematics',
      teacher: 'Ada Lovelace',
      day: 'Monday',
      startTime: '09:00',
      endTime: '10:00',
      room: '101',
    });
  });

  it('flags a file without recognised columns', () => {
    const parsed = parseTimetableText('a,b,c\n1,2,3');
    expect(parsed.rows).toHaveLength(0);
    expect(parsed.issues[0]?.message).toMatch(/No recognised columns/);
  });
});

describe('validateImportRows', () => {
  it('accepts valid rows and reports the invalid ones with a row number', () => {
    const issues = validateImportRows([
      { section: 'A', subject: 'Math', day: 'Monday', startTime: '09:00', endTime: '10:00' },
      { section: 'B', subject: 'Math', day: 'Someday', startTime: '9:00', endTime: '10:00' },
    ]);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ row: 2, field: 'day' });
  });

  it('requires an end time after the start time', () => {
    const issues = validateImportRows([
      { section: 'A', subject: 'Math', day: 'Monday', startTime: '10:00', endTime: '09:00' },
    ]);
    expect(issues.some((issue) => issue.field === 'endTime')).toBe(true);
  });
});

describe('previewPastedText', () => {
  it('detects CSV and reports the parsed rows', () => {
    const preview = previewPastedText(csv);
    expect(preview.format).toBe('csv');
    expect(preview.source).toBe('paste');
    expect(preview.rows).toHaveLength(2);
  });
});
