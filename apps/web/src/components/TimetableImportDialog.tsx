import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import {
  type TimetableImportIssue,
  type TimetableImportMode,
  type TimetableImportResult,
} from '@smartschool/shared';
import { ApiError, api } from '../lib/api';
import {
  previewPastedText,
  previewSpreadsheetFile,
  validateImportRows,
  type ImportPreview,
} from '../lib/timetableImport';
import { Modal } from './Modal';

const PREVIEW_LIMIT = 8;

function cell(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value);
}

function issueText(issue: TimetableImportIssue): string {
  return issue.row === null ? issue.message : `Row ${issue.row}: ${issue.message}`;
}

export function TimetableImportDialog({
  onClose,
  onImported,
}: {
  onClose: () => void;
  onImported: (result: TimetableImportResult) => void;
}) {
  const [mode, setMode] = useState<TimetableImportMode>('upsert');
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState('');
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [serverIssues, setServerIssues] = useState<TimetableImportIssue[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    if (!file && text.trim() === '') {
      setPreview(null);
      setParseError(null);
      return;
    }
    const load = file
      ? previewSpreadsheetFile(file)
      : Promise.resolve(previewPastedText(text));
    load
      .then((result) => {
        if (!active) return;
        setPreview(result);
        setParseError(null);
      })
      .catch(() => {
        if (!active) return;
        setPreview(null);
        setParseError('The file could not be read. Save it as .xlsx or .csv and try again.');
      });
    return () => {
      active = false;
    };
  }, [file, text]);

  const clientIssues = useMemo(
    () => (preview ? [...preview.issues, ...validateImportRows(preview.rows)] : []),
    [preview],
  );
  const issues = serverIssues.length > 0 ? serverIssues : clientIssues;
  const rows = preview?.rows ?? [];
  const rowCount = rows.length;
  const canSubmit = rowCount > 0 && clientIssues.length === 0 && !submitting;

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;
    setFile(selected);
    setServerIssues([]);
    setSubmitError(null);
  };

  const submit = async () => {
    if (!preview || rowCount === 0) return;
    setSubmitting(true);
    setSubmitError(null);
    setServerIssues([]);
    try {
      const result = await api.post<TimetableImportResult>('/timetable/import', {
        mode,
        rows: preview.rows,
      });
      onImported(result);
    } catch (error) {
      if (error instanceof ApiError) {
        const details = error.details as { issues?: TimetableImportIssue[] } | undefined;
        setServerIssues(details?.issues ?? []);
        setSubmitError(error.message);
      } else {
        setSubmitError('The timetable could not be imported.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title="Import timetable" onClose={onClose}>
      <div className="form form--wide">
        <p className="muted">
          Upload an Excel/CSV file or paste CSV. Columns are matched by name
          (Class, Section, Subject, Teacher, Day, Start, End, Room, Materials). Each
          row is validated before anything is saved.
        </p>

        <div className="field">
          <label className="field__label" htmlFor="timetable-mode">
            Import mode
          </label>
          <select
            id="timetable-mode"
            className="field__input"
            value={mode}
            onChange={(event) => setMode(event.target.value as TimetableImportMode)}
          >
            <option value="upsert">Update — add new slots and update matching ones</option>
            <option value="replace">Replace — clear each section&rsquo;s timetable first</option>
          </select>
        </div>

        <div className="field">
          <label className="field__label" htmlFor="timetable-file">
            Spreadsheet file (.xlsx, .csv)
          </label>
          <input
            id="timetable-file"
            className="field__input"
            type="file"
            accept=".xlsx,.xls,.xlsm,.csv,.tsv,.txt"
            onChange={onFileChange}
          />
        </div>

        <div className="field">
          <label className="field__label" htmlFor="timetable-text">
            …or paste CSV
          </label>
          <textarea
            id="timetable-text"
            className="field__input"
            rows={5}
            placeholder="Class,Section,Subject,Teacher,Day,Start,End,Room"
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              setFile(null);
              setServerIssues([]);
              setSubmitError(null);
            }}
          />
        </div>

        {parseError ? (
          <div className="alert alert--error" role="alert">
            {parseError}
          </div>
        ) : null}

        {submitError ? (
          <div className="alert alert--error" role="alert">
            {submitError}
          </div>
        ) : null}

        {preview ? (
          <p className="muted">
            {rowCount} row{rowCount === 1 ? '' : 's'} detected
            {preview.fileName ? ` in ${preview.fileName}` : ''} ({preview.format.toUpperCase()}).
          </p>
        ) : (
          <p className="muted">Choose a file or paste data to see a preview.</p>
        )}

        {rowCount > 0 ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Day</th>
                  <th>Start</th>
                  <th>End</th>
                  <th>Class</th>
                  <th>Section</th>
                  <th>Subject</th>
                  <th>Teacher</th>
                  <th>Room</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, PREVIEW_LIMIT).map((row, index) => (
                  <tr key={index}>
                    <td>{index + 1}</td>
                    <td>{cell(row.day)}</td>
                    <td>{cell(row.startTime)}</td>
                    <td>{cell(row.endTime)}</td>
                    <td>{cell(row.class)}</td>
                    <td>{cell(row.section)}</td>
                    <td>{cell(row.subject)}</td>
                    <td>{cell(row.teacher)}</td>
                    <td>{cell(row.room)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rowCount > PREVIEW_LIMIT ? (
              <p className="muted">Showing the first {PREVIEW_LIMIT} of {rowCount} rows.</p>
            ) : null}
          </div>
        ) : null}

        {issues.length > 0 ? (
          <div className="alert alert--error" role="alert">
            <strong>{issues.length} problem{issues.length === 1 ? '' : 's'} found</strong>
            <ul className="alert__list">
              {issues.slice(0, 20).map((issue, index) => (
                <li key={index}>{issueText(issue)}</li>
              ))}
            </ul>
            {issues.length > 20 ? <p className="muted">…and {issues.length - 20} more.</p> : null}
          </div>
        ) : null}

        <div className="form__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button type="button" className="btn btn--primary" onClick={submit} disabled={!canSubmit}>
            {submitting ? 'Importing…' : 'Import timetable'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
