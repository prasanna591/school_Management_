import { useRoute } from '@react-navigation/native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Permission } from '@smartschool/shared';

import { FilterChips } from '../../components/DataList';
import { Icon } from '../../components/Icon';
import {
  TeacherButton,
  TeacherEmpty,
  TeacherNotice,
  TeacherPage,
  TeacherPanel,
  type ChipTone,
} from '../../components/teacher/teacherUi';
import { ErrorState, SkeletonPanels, StatCard, StatGrid } from '../../components/ui';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { can } from '../../lib/permissions';
import { fetchAllPages, useTeacherScope, type TeacherStudent } from '../../lib/teacherScope';
import { useAsync } from '../../lib/useAsync';
import { colors, radius } from '../../theme';

interface AttendanceRecord {
  id: string;
  studentId: string;
  sectionId: string;
  date: string;
  status: string;
  remark?: string | null;
}

interface RegisterEntry {
  studentId: string;
  name: string;
  admissionNo: string;
  rollNo: string | null;
  status: string;
  initialStatus: string | null;
  recordId: string | null;
}

/** The five statuses the register accepts, in the order the web page uses. */
const STATUSES: { value: string; label: string; tone: ChipTone }[] = [
  { value: 'PRESENT', label: 'Present', tone: 'success' },
  { value: 'ABSENT', label: 'Absent', tone: 'danger' },
  { value: 'LATE', label: 'Late', tone: 'warning' },
  { value: 'EXCUSED', label: 'On Leave', tone: 'info' },
  { value: 'HALF_DAY', label: 'Half Day', tone: 'navy' },
];

const DEFAULT_STATUS = 'PRESENT';

const TONE_FILL: Record<ChipTone, string> = {
  success: colors.success,
  danger: colors.danger,
  warning: colors.warning,
  info: colors.info,
  navy: colors.navySurface,
  default: colors.textMuted,
};

function studentNameOf(student: TeacherStudent): string {
  const name = `${student.user?.firstName ?? ''} ${student.user?.lastName ?? ''}`.trim();
  return name || student.admissionNo;
}

function toIsoDate(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function todayIso(): string {
  return toIsoDate(new Date());
}

function shiftDate(iso: string, days: number): string {
  const date = new Date(`${iso}T12:00:00`);
  date.setDate(date.getDate() + days);
  return toIsoDate(date);
}

function prettyDate(iso: string): string {
  const date = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Port of the web `/attendance/mark` register for the teacher role: pick one of
 * your sections, move to a date, then set a status per student and save.
 *
 * Writes go straight to `POST /attendances` / `PATCH /attendances/:id`, which
 * the backend already scopes to sections the signed-in teacher owns.
 */
export function TeacherAttendanceMarkScreen() {
  const route = useRoute();
  const { user } = useAuth();
  const { scope, loading, error, forbidden, reload } = useTeacherScope();

  const params = route.params as { section?: string } | undefined;
  const [sectionId, setSectionId] = useState<string>(params?.section ?? '');
  const [date, setDate] = useState<string>(todayIso());

  const sections = useMemo(
    () =>
      (scope?.sections ?? []).map((section) => ({
        value: section.id,
        label: section.classLevelName
          ? `${section.classLevelName} · ${section.name}`
          : section.name,
      })),
    [scope],
  );

  // Default to the first section once the scope has loaded.
  useEffect(() => {
    if (sectionId === '' && sections.length > 0) setSectionId(sections[0]!.value);
  }, [sectionId, sections]);

  const roster = useAsync(async () => {
    if (!sectionId) {
      return {
        students: [] as TeacherStudent[],
        records: [] as AttendanceRecord[],
        studentsTotal: 0,
        truncated: false,
      };
    }
    // Both lists are paged: `GET /students` and `GET /attendances` cap `limit`
    // at 100, so a register for a larger section has to walk every page or it
    // would quietly drop students from the sheet.
    const [students, records] = await Promise.all([
      fetchAllPages<TeacherStudent>('/students', { sectionId }),
      fetchAllPages<AttendanceRecord>('/attendances', { sectionId, date }),
    ]);
    return {
      students: students.items,
      records: records.items,
      studentsTotal: students.total,
      truncated: students.truncated || records.truncated,
    };
  }, [sectionId, date]);

  const [entries, setEntries] = useState<RegisterEntry[]>([]);

  useEffect(() => {
    const data = roster.data;
    if (!data) return;
    setEntries(
      data.students.map((student) => {
        const record = data.records.find((item) => item.studentId === student.id);
        return {
          studentId: student.id,
          name: studentNameOf(student),
          admissionNo: student.admissionNo,
          rollNo: student.rollNo ?? null,
          status: record?.status ?? DEFAULT_STATUS,
          initialStatus: record?.status ?? null,
          recordId: record?.id ?? null,
        };
      }),
    );
  }, [roster.data]);

  const [saving, setSaving] = useState(false);
  /** Synchronous guard: `saving` state does not flush before a second tap. */
  const savingRef = useRef(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const canMark = user ? can(user.role, Permission.ATTENDANCE_MARK) : false;
  const today = todayIso();

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const entry of entries) map.set(entry.status, (map.get(entry.status) ?? 0) + 1);
    return map;
  }, [entries]);

  const setStatus = (studentId: string, status: string) => {
    setEntries((prev) =>
      prev.map((entry) => (entry.studentId === studentId ? { ...entry, status } : entry)),
    );
  };

  const setStatusForAll = (status: string) => {
    setEntries((prev) => prev.map((entry) => ({ ...entry, status })));
  };

  const plans = useMemo(
    () =>
      entries.filter((entry) =>
        entry.recordId
          ? entry.status !== entry.initialStatus
          : true,
      ),
    [entries],
  );

  const handleSave = async () => {
    // Synchronous re-entrancy guard: two quick taps both see `saving === false`.
    if (savingRef.current) return;
    setSaveError(null);
    setSummary(null);
    if (plans.length === 0) {
      setSaveError('No changes to save.');
      return;
    }
    savingRef.current = true;
    setSaving(true);
    setProgress({ done: 0, total: plans.length });
    const created = plans.filter((plan) => !plan.recordId).length;
    const updated = plans.length - created;
    try {
      const result = await api.post<{ saved: number; records: AttendanceRecord[] }>(
        '/attendances/bulk',
        {
          sectionId,
          date,
          records: plans.map((plan) => ({ studentId: plan.studentId, status: plan.status })),
        },
      );
      const savedIds = new Map<string, string>();
      for (const record of result.records ?? []) savedIds.set(record.studentId, record.id);
      // Only rows the server confirmed move forward. The bulk call is atomic,
      // so on failure nothing is marked as saved and a retry can re-send it.
      setEntries((prev) =>
        prev.map((entry) => {
          if (!plans.some((plan) => plan.studentId === entry.studentId)) return entry;
          return {
            ...entry,
            initialStatus: entry.status,
            recordId: savedIds.get(entry.studentId) ?? entry.recordId,
          };
        }),
      );
      setProgress({ done: plans.length, total: plans.length });
      setSummary(`Saved ${created} new and ${updated} updated.`);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'The register could not be saved.');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  if (forbidden) return <TeacherEmpty message="Only teachers can open this page." icon="lock" />;
  if (loading || roster.loading) return <SkeletonPanels count={3} />;
  if (error ?? roster.error) {
    return <ErrorState message={error ?? roster.error ?? ''} onRetry={reload} />;
  }

  if (sections.length === 0) {
    return (
      <TeacherPage>
        <TeacherPanel title="Mark attendance" icon="attendance">
          <TeacherEmpty
            message="No sections are assigned to you yet."
            hint="You can record attendance for a class as soon as an administrator assigns it to you."
            icon="attendance"
          />
        </TeacherPanel>
      </TeacherPage>
    );
  }

  const recordedCount = entries.filter((entry) => entry.recordId).length;

  return (
    <TeacherPage>
      <StatGrid>
        <StatCard label="Present" value={counts.get('PRESENT') ?? 0} hint="Selected" icon="check" tone="success" />
        <StatCard label="Absent" value={counts.get('ABSENT') ?? 0} hint="Selected" icon="close" tone="danger" />
        <StatCard label="Late" value={counts.get('LATE') ?? 0} hint="Selected" icon="timetable" tone="warning" />
        <StatCard
          label="On leave"
          value={(counts.get('EXCUSED') ?? 0) + (counts.get('HALF_DAY') ?? 0)}
          hint="Selected"
          icon="bell"
          tone="info"
        />
      </StatGrid>

      <TeacherPanel title="Class" subtitle="Pick the section you want to record" icon="sections">
        {/* Locked while a save is running so a register can never be switched
            out from under an in-flight batch of writes. */}
        <View
          pointerEvents={saving ? 'none' : 'auto'}
          style={saving ? styles.controlsLocked : undefined}
        >
          <FilterChips options={sections} value={sectionId} onChange={setSectionId} />
        </View>
      </TeacherPanel>

      <TeacherPanel title="Date" subtitle="Registers can only be taken up to today" icon="attendance">
        <View
          style={[styles.dateRow, saving ? styles.controlsLocked : undefined]}
          pointerEvents={saving ? 'none' : 'auto'}
        >
          <Pressable
            onPress={() => setDate((current) => shiftDate(current, -1))}
            accessibilityRole="button"
            accessibilityLabel="Previous day"
            style={({ pressed }) => [styles.dateArrow, pressed ? { opacity: 0.6 } : null]}
          >
            <Icon name="chevron-left" size={18} color={colors.text} />
          </Pressable>

          <View style={styles.dateValue}>
            <Text style={styles.dateValueLabel} numberOfLines={1}>
              {prettyDate(date)}
            </Text>
            {date !== today ? (
              <Pressable onPress={() => setDate(today)} accessibilityRole="button">
                <Text style={styles.dateToday}>Jump to today</Text>
              </Pressable>
            ) : null}
          </View>

          <Pressable
            onPress={() => setDate((current) => shiftDate(current, 1))}
            disabled={date >= today}
            accessibilityRole="button"
            accessibilityLabel="Next day"
            accessibilityState={{ disabled: date >= today }}
            style={({ pressed }) => [
              styles.dateArrow,
              date >= today ? styles.dateArrowDisabled : null,
              pressed ? { opacity: 0.6 } : null,
            ]}
          >
            <Icon name="chevron-right" size={18} color={date >= today ? colors.textFaint : colors.text} />
          </Pressable>
        </View>
      </TeacherPanel>

      <TeacherPanel
        title="Register"
        subtitle={
          entries.length > 0
            ? `${entries.length} students · ${recordedCount} already recorded`
            : 'No students in this section'
        }
        icon="students"
        action={
          <Pressable
            onPress={() => setStatusForAll('PRESENT')}
            accessibilityRole="button"
            accessibilityLabel="Mark everyone present"
            style={({ pressed }) => [styles.bulk, pressed ? { opacity: 0.6 } : null]}
          >
            <Text style={styles.bulkLabel}>All present</Text>
          </Pressable>
        }
      >
        {roster.data?.truncated ? (
          <TeacherNotice
            tone="warning"
            icon="alert"
            message={`This section has ${roster.data.studentsTotal} students, but only the first ${roster.data.students.length} could be loaded. The register below is incomplete — nothing beyond that row will be saved.`}
          />
        ) : null}
        {!canMark ? (
          <View style={styles.alertError}>
            <Text style={styles.alertErrorText}>
              You can view this register but do not have permission to record it.
            </Text>
          </View>
        ) : null}
        {saveError ? (
          <View style={styles.alertError}>
            <Text style={styles.alertErrorText}>{saveError}</Text>
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
          <View style={styles.alertSuccess}>
            <Text style={styles.alertSuccessText}>{summary}</Text>
          </View>
        ) : null}

        {entries.length === 0 ? (
          <TeacherEmpty
            message="There are no students enrolled in this section yet."
            hint="Pick another class, or enrol students first."
            icon="students"
          />
        ) : (
          <View style={styles.list}>
            {entries.map((entry, index) => (
              <View key={entry.studentId} style={styles.studentCard}>
                <View style={styles.studentHead}>
                  <Text style={styles.studentIndex}>{index + 1}</Text>
                  <View style={styles.studentHeadText}>
                    <Text style={styles.studentName} numberOfLines={1}>
                      {entry.name}
                    </Text>
                    <Text style={styles.studentMeta} numberOfLines={1}>
                      {entry.admissionNo}
                      {entry.rollNo ? ` · Roll ${entry.rollNo}` : ''}
                    </Text>
                  </View>
                  {entry.recordId ? <Text style={styles.recorded}>Recorded</Text> : null}
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={styles.statusRow}>
                  {STATUSES.map((status) => {
                    const active = entry.status === status.value;
                    return (
                      <Pressable
                        key={status.value}
                        onPress={() => setStatus(entry.studentId, status.value)}
                        disabled={!canMark || saving}
                        accessibilityRole="button"
                        accessibilityLabel={`${status.label} for ${entry.name}`}
                        accessibilityState={{ selected: active }}
                        style={[
                          styles.statusChip,
                          { borderColor: TONE_FILL[status.tone] },
                          active ? { backgroundColor: TONE_FILL[status.tone] } : null,
                          !canMark || saving ? { opacity: 0.5 } : null,
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusChipLabel,
                            active ? styles.statusChipLabelActive : null,
                          ]}
                          numberOfLines={1}
                        >
                          {status.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            ))}
          </View>
        )}
      </TeacherPanel>

      <TeacherButton
        label={saving ? 'Saving…' : `Save register${plans.length ? ` (${plans.length})` : ''}`}
        icon="attendance"
        onPress={() => void handleSave()}
        disabled={saving || !canMark || plans.length === 0}
      />
    </TeacherPage>
  );
}

const styles = {
  controlsLocked: {
    opacity: 0.5,
  },
  dateRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
  },
  dateArrow: {
    width: 42,
    height: 42,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  dateArrowDisabled: {
    opacity: 0.45,
  },
  dateValue: {
    flex: 1,
    alignItems: 'center' as const,
    gap: 3,
    paddingHorizontal: 6,
  },
  dateValueLabel: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: colors.text,
    textAlign: 'center' as const,
  },
  dateToday: {
    fontSize: 12.5,
    fontWeight: '700' as const,
    color: colors.primary,
    textDecorationLine: 'underline' as const,
  },
  bulk: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.primaryLight,
    backgroundColor: colors.primarySoft,
  },
  bulkLabel: {
    fontSize: 12.5,
    fontWeight: '700' as const,
    color: colors.primary,
  },
  alert: {
    padding: 12,
    borderRadius: radius.sm,
    backgroundColor: colors.infoSoft,
  },
  alertText: {
    fontSize: 13,
    color: colors.info,
    fontWeight: '600' as const,
  },
  alertSuccess: {
    padding: 12,
    borderRadius: radius.sm,
    backgroundColor: colors.successSoft,
  },
  alertSuccessText: {
    fontSize: 13,
    color: colors.success,
    fontWeight: '600' as const,
  },
  alertError: {
    padding: 12,
    borderRadius: radius.sm,
    backgroundColor: colors.dangerSoft,
  },
  alertErrorText: {
    fontSize: 13,
    color: colors.danger,
    fontWeight: '600' as const,
  },
  list: {
    gap: 10,
  },
  studentCard: {
    gap: 10,
    padding: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
  },
  studentHead: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
  },
  studentIndex: {
    width: 24,
    fontSize: 12.5,
    fontWeight: '700' as const,
    color: colors.textFaint,
    textAlign: 'center' as const,
  },
  studentHeadText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  studentName: {
    fontSize: 14.5,
    fontWeight: '700' as const,
    color: colors.text,
  },
  studentMeta: {
    fontSize: 12.5,
    color: colors.textMuted,
  },
  recorded: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: colors.success,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.4,
  },
  statusRow: {
    gap: 8,
    paddingRight: 4,
  },
  statusChip: {
    minHeight: 36,
    justifyContent: 'center' as const,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    backgroundColor: colors.surface,
  },
  statusChipLabel: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: colors.text,
  },
  statusChipLabelActive: {
    color: colors.white,
  },
} as const;
