import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Permission } from '@smartschool/shared';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState, ErrorState, PageHeader, SkeletonList } from '../../components/ui';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { can, canAny } from '../../lib/permissions';
import { useLookups } from '../../lib/options';
import {
  MAX_MARKS,
  applyMarksPlan,
  buildMarks,
  compareStudents,
  isValidMarks,
  planMarks,
  summarizeMarks,
  toExistingResult,
  toMarksStudent,
  type ExistingResult,
  type MarksEntry,
  type MarksStudent,
  type MarksSummary,
} from '../../lib/examMarks';
import { useAsync } from '../../lib/useAsync';

const ROSTER_LIMIT = 100;

type Row = Record<string, unknown>;

interface ExamRow {
  id: string;
  name: string;
  classLevelId?: string | null;
  maxMarks?: number | null;
  classLevel?: { name?: string | null } | null;
}

function examLabel(exam: ExamRow): string {
  const cls = exam.classLevel?.name ?? '';
  return cls ? `${exam.name} · ${cls}` : exam.name;
}

/**
 * Mark Management: pick an exam and subject, load the class-level roster, then
 * review or record each student's marks/grade/remark.
 *
 * Permissions mirror the backend and the web `ExamMarksPage`: the roster comes
 * from `/sections` + `/students`, existing marks from `/exam-results`, and
 * saving writes to `/exam-results` (create) or `/exam-results/:id` (update),
 * which the API guards with `result:manage` (teachers and super admins).
 * Administrators have `result:read` only, so they get a read-only view.
 */
export function MarkManagementScreen() {
  const { user } = useAuth();
  const { options } = useLookups(['subjects']);
  const subjectOptions = options.subjects ?? [];

  const [examId, setExamId] = useState('');
  const [subjectId, setSubjectId] = useState('');

  const examsState = useAsync(() => api.list<ExamRow>('/exams', { limit: ROSTER_LIMIT }), []);
  const exams = examsState.data?.items ?? [];
  const selectedExam = exams.find((exam) => exam.id === examId);
  const classLevelId = selectedExam?.classLevelId ?? '';
  const maxMarks = selectedExam?.maxMarks ?? MAX_MARKS;
  const ready = Boolean(examId) && Boolean(subjectId) && Boolean(classLevelId);

  const rosterState = useAsync<{
    students: MarksStudent[];
    existing: ExistingResult[];
  } | null>(async () => {
    if (!ready || !classLevelId) return null;
    const sections = await api.list<Row>('/sections', { classLevelId, limit: ROSTER_LIMIT });
    const studentLists = await Promise.all(
      sections.items.map((section) =>
        api.list<Row>('/students', {
          sectionId: String(section.id ?? ''),
          status: 'ACTIVE',
          limit: ROSTER_LIMIT,
        }),
      ),
    );
    const students = studentLists
      .flatMap((list) => list.items.map(toMarksStudent))
      .sort(compareStudents);
    const results = await api.list<Row>('/exam-results', { examId, limit: ROSTER_LIMIT });
    const existing = results.items
      .map(toExistingResult)
      .filter((result) => result.subjectId === subjectId);
    return { students, existing };
  }, [examId, subjectId, classLevelId, ready]);

  if (
    !user ||
    !can(user.role, Permission.EXAM_READ) ||
    !canAny(user.role, [Permission.RESULT_READ, Permission.RESULT_MANAGE])
  ) {
    return <EmptyState message="You don't have permission to view exam marks." icon="lock" />;
  }

  const canSave = can(user.role, Permission.RESULT_MANAGE);

  const insets = useSafeAreaInsets();

  if (
    !user ||
    !can(user.role, Permission.EXAM_READ) ||
    !canAny(user.role, [Permission.RESULT_READ, Permission.RESULT_MANAGE])
  ) {
    return (
      <View style={{ paddingTop: insets.top }}>
        <EmptyState message="You don't have permission to view exam marks." icon="lock" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, paddingTop: insets.top }}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <PageHeader
          title="Mark Management"
          subtitle="Record subject marks for every student in an exam"
          icon="mark"
        />

        {examsState.loading ? (
          <SkeletonList rows={3} />
        ) : examsState.error ? (
          <ErrorState message={examsState.error} onRetry={examsState.reload} />
        ) : exams.length === 0 ? (
          <EmptyState message="No exams have been created yet." icon="mark" />
        ) : (
          <View style={styles.pickerBlock}>
            <Text style={styles.pickerLabel}>Exam</Text>
            <ChoiceChips
              options={exams.map((exam) => ({ value: exam.id, label: examLabel(exam) }))}
              value={examId}
              onSelect={setExamId}
              emptyLabel="— Select exam —"
            />
            <Text style={styles.pickerLabel}>Subject</Text>
            <ChoiceChips
              options={subjectOptions}
              value={subjectId}
              onSelect={setSubjectId}
              emptyLabel="— Select subject —"
            />
          </View>
        )}

        {!examId || !subjectId ? (
          <EmptyState message="Choose an exam and subject to load the roster." icon="search" />
        ) : !classLevelId ? (
          <View style={styles.alertError}>
            <Text style={styles.alertErrorText}>This exam is not linked to a class level.</Text>
          </View>
        ) : rosterState.loading ? (
          <SkeletonList rows={6} />
        ) : rosterState.error ? (
          <ErrorState message={rosterState.error} onRetry={rosterState.reload} />
        ) : !rosterState.data || rosterState.data.students.length === 0 ? (
          <EmptyState message="No active students found in this class level." icon="students" />
        ) : (
          <MarksEditor
            key={`${examId}-${subjectId}`}
            examId={examId}
            subjectId={subjectId}
            maxMarks={maxMarks}
            students={rosterState.data.students}
            existing={rosterState.data.existing}
            canSave={canSave}
          />
        )}
      </ScrollView>
    </View>
  );
}

function ChoiceChips({
  options,
  value,
  onSelect,
  emptyLabel,
}: {
  options: { value: string; label: string }[];
  value: string;
  onSelect: (value: string) => void;
  emptyLabel: string;
}) {
  if (options.length === 0) {
    return <Text style={styles.muted}>{emptyLabel}</Text>;
  }
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chips}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onSelect(option.value)}
            style={[styles.chip, active ? styles.chipActive : null]}
            accessibilityLabel={option.label}
            accessibilityState={{ selected: active }}
          >
            <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function MarksEditor({
  examId,
  subjectId,
  maxMarks,
  students,
  existing,
  canSave,
}: {
  examId: string;
  subjectId: string;
  maxMarks: number;
  students: MarksStudent[];
  existing: ExistingResult[];
  canSave: boolean;
}) {
  const [entries, setEntries] = useState<MarksEntry[]>(() => buildMarks(students, existing));
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [summary, setSummary] = useState<MarksSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const update = (studentId: string, patch: Partial<MarksEntry>) =>
    setEntries((prev) =>
      prev.map((entry) => (entry.studentId === studentId ? { ...entry, ...patch } : entry)),
    );

  const handleSave = async () => {
    setError(null);
    setSummary(null);
    const { plans, errors } = planMarks(entries, { canSave, maxMarks });
    if (errors.length > 0) {
      setError(
        `Fix ${errors.length} invalid marks field${errors.length === 1 ? '' : 's'}: ${errors
          .map((item) => item.name || item.studentId)
          .join(', ')}`,
      );
      return;
    }
    if (plans.length === 0) {
      setError(
        canSave ? 'No changes to save.' : 'You do not have permission to record exam marks.',
      );
      return;
    }
    setSaving(true);
    setProgress({ done: 0, total: plans.length });
    let nextEntries = entries;
    const results: { plan: (typeof plans)[number]; ok: boolean; message?: string }[] = [];
    try {
      for (const plan of plans) {
        const optional = { grade: plan.grade || undefined, remarks: plan.remark || undefined };
        try {
          if (plan.kind === 'create') {
            const created = await api.post<{ id: string }>('/exam-results', {
              examId,
              studentId: plan.studentId,
              subjectId,
              marksObtained: plan.marks,
              ...optional,
            });
            nextEntries = applyMarksPlan(nextEntries, plan, created?.id);
          } else {
            await api.patch(`/exam-results/${plan.id}`, {
              marksObtained: plan.marks,
              ...optional,
            });
            nextEntries = applyMarksPlan(nextEntries, plan);
          }
          results.push({ plan, ok: true });
        } catch (err) {
          results.push({
            plan,
            ok: false,
            message: err instanceof Error ? err.message : 'Failed',
          });
        }
        setProgress({ done: results.length, total: plans.length });
      }
      setEntries(nextEntries);
      setSummary(summarizeMarks(results));
    } finally {
      setSaving(false);
    }
  };

  const recordedCount = entries.filter((entry) => entry.existingId).length;
  const enteredCount = entries.filter((entry) => entry.marks.trim() !== '').length;

  return (
    <View style={styles.editor}>
      <View style={styles.toolbar}>
        <Text style={styles.meta}>
          {entries.length} students · {enteredCount} entered · {recordedCount} recorded · out of{' '}
          {maxMarks}
        </Text>
        <Pressable
          onPress={() => void handleSave()}
          disabled={saving || !canSave}
          style={[styles.saveButton, saving || !canSave ? styles.disabled : null]}
          accessibilityLabel="Save marks"
        >
          <Text style={styles.saveButtonText}>{saving ? 'Saving…' : 'Save marks'}</Text>
        </Pressable>
      </View>

      {!canSave ? (
        <View style={styles.alertError}>
          <Text style={styles.alertErrorText}>
            You can view these marks but do not have permission to record them.
          </Text>
        </View>
      ) : null}
      {error ? (
        <View style={styles.alertError}>
          <Text style={styles.alertErrorText}>{error}</Text>
        </View>
      ) : null}
      {saving && progress ? (
        <View style={styles.alert}>
          <Text style={styles.alertText}>
            Saving {progress.done}/{progress.total}…
          </Text>
        </View>
      ) : null}
      {summary ? (
        <View style={summary.failed.length > 0 ? styles.alertError : styles.alertSuccess}>
          <Text style={summary.failed.length > 0 ? styles.alertErrorText : styles.alertSuccessText}>
            Saved {summary.created} new and {summary.updated} updated.
            {summary.failed.length > 0
              ? ` ${summary.failed.length} failed: ${summary.failed
                  .map((item) => `${item.name} (${item.message})`)
                  .join('; ')}`
              : ''}
          </Text>
        </View>
      ) : null}

      {entries.map((entry) => {
        const invalid = !isValidMarks(entry.marks, maxMarks);
        const label = entry.name || entry.admissionNo;
        return (
          <View key={entry.studentId} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {label}
              </Text>
              {entry.existingId ? <Text style={styles.badge}>Recorded</Text> : null}
            </View>
            <Text style={styles.muted}>Roll {entry.rollNo || entry.admissionNo || '—'}</Text>
            <View style={styles.fieldRow}>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Marks / {maxMarks}</Text>
                <TextInput
                  style={[styles.input, invalid ? styles.inputInvalid : null]}
                  value={entry.marks}
                  keyboardType="number-pad"
                  placeholder="—"
                  placeholderTextColor="#94a3b8"
                  editable={canSave && !saving}
                  onChangeText={(text) => update(entry.studentId, { marks: text })}
                  accessibilityLabel={`Marks for ${label}`}
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Grade</Text>
                <TextInput
                  style={styles.input}
                  value={entry.grade}
                  maxLength={5}
                  placeholder="Optional"
                  placeholderTextColor="#94a3b8"
                  editable={canSave && !saving}
                  onChangeText={(text) => update(entry.studentId, { grade: text })}
                  accessibilityLabel={`Grade for ${label}`}
                />
              </View>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Remark</Text>
              <TextInput
                style={styles.input}
                value={entry.remark}
                maxLength={255}
                placeholder="Optional"
                placeholderTextColor="#94a3b8"
                editable={canSave && !saving}
                onChangeText={(text) => update(entry.studentId, { remark: text })}
                accessibilityLabel={`Remark for ${label}`}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = {
  pickerBlock: {
    gap: 6,
  },
  pickerLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  chips: {
    gap: 8,
    paddingVertical: 2,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  chipActive: {
    backgroundColor: '#1d4ed8',
    borderColor: '#1d4ed8',
  },
  chipText: {
    color: '#334155',
    fontSize: 13,
  },
  chipTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  editor: {
    gap: 8,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    flexWrap: 'wrap',
  },
  meta: {
    flexShrink: 1,
    fontSize: 12,
    color: '#64748b',
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#1d4ed8',
    minHeight: 44,
    justifyContent: 'center',
  },
  saveButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  disabled: {
    opacity: 0.5,
  },
  card: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    gap: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardTitle: {
    flexShrink: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  badge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1d4ed8',
    backgroundColor: '#dbeafe',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    overflow: 'hidden',
  },
  fieldRow: {
    flexDirection: 'row',
    gap: 8,
  },
  field: {
    flex: 1,
    gap: 4,
  },
  fieldLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#ffffff',
    color: '#0f172a',
  },
  inputInvalid: {
    borderColor: '#dc2626',
  },
  muted: {
    fontSize: 12,
    color: '#94a3b8',
  },
  alert: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#eff6ff',
  },
  alertText: {
    fontSize: 13,
    color: '#1e3a8a',
  },
  alertError: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  alertErrorText: {
    fontSize: 13,
    color: '#b91c1c',
  },
  alertSuccess: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  alertSuccessText: {
    fontSize: 13,
    color: '#065f46',
  },
} as const;
