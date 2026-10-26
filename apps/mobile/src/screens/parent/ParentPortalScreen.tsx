import { useNavigation } from '@react-navigation/native';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Icon } from '../../components/Icon';
import {
  ParentChip,
  ParentEmpty,
  ParentError,
  ParentHero,
  ParentNotice,
  ParentPage,
  ParentPanel,
  ParentQuickActions,
  ParentRow,
  ParentSelectChip,
  type ParentChipTone,
  type ParentQuickAction,
} from '../../components/parent/parentUi';
import { SkeletonList, SkeletonPanels } from '../../components/ui';
import { api } from '../../lib/api';
import { formatCurrency, formatDate, humanize, initials } from '../../lib/format';
import { teacherNameOf, timeRangeOf, type TimetableItem } from '../../lib/timetable';
import { useAsync } from '../../lib/useAsync';
import { colors, parentColors } from '../../theme';
import { ROUTES } from '../../navigation/routes';

type Nav = { navigate: (route: string, params?: object) => void };

interface AttendanceSummary {
  total: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  halfDay: number;
  percentage: number;
  indicator: string;
}

interface ActivitySummary {
  upcomingHomework: number;
  dueToday: number;
  todayClasses: number;
  syllabusCompleted: number;
  syllabusTotal: number;
}

interface ChildTeacher {
  id: string;
  teacherId: string;
  name: string | null;
  subject: string;
}

interface InvoiceRow {
  id: string;
  invoiceNo: string;
  dueDate: string;
  balance: number | string;
  status: string;
}

interface ChildSummary {
  id: string;
  admissionNo: string;
  rollNo: string | null;
  /** The child's saved photo (a small data URL), or null. */
  photoUrl: string | null;
  name: string | null;
  className: string | null;
  sectionName: string | null;
  teachers: ChildTeacher[];
  teacherCount: number;
  attendance: AttendanceSummary;
  activities: ActivitySummary;
  timetable: TimetableItem[];
  invoices: InvoiceRow[];
  outstanding: number;
  overallResult: { percentage: number; grade: string | null };
}

interface ParentOverview {
  children: ChildSummary[];
}

interface HomeworkRow {
  id: string;
  title: string;
  dueDate: string;
  subject?: { name?: string | null } | null;
  submission: { status: string } | null;
}

const WEEKDAY_BY_INDEX = [
  'SUNDAY',
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
] as const;

function childName(child: ChildSummary): string {
  return child.name ?? `Admission ${child.admissionNo}`;
}

function childInitials(child: ChildSummary): string {
  if (child.name) {
    const [first, ...rest] = child.name.split(' ');
    return initials(first, rest.join(' ')) || child.admissionNo.slice(0, 2).toUpperCase();
  }
  return child.admissionNo.slice(0, 2).toUpperCase();
}

/** Matches the backend's `updateStudentPhotoSchema` string cap. */
const MAX_PHOTO_LENGTH = 2_000_000;

function klassOf(child: ChildSummary): string {
  return [child.className, child.sectionName].filter(Boolean).join(' · ') || '—';
}

function statusTone(status: string): ParentChipTone {
  const value = status.toUpperCase();
  if (['PAID', 'PRESENT', 'APPROVED', 'COMPLETED', 'SUBMITTED'].includes(value)) return 'success';
  if (['PENDING', 'LATE', 'PARTIAL'].includes(value)) return 'warning';
  if (['OVERDUE', 'ABSENT', 'REJECTED', 'CANCELLED', 'MISSING'].includes(value)) return 'danger';
  return 'default';
}

function isDone(status: string | undefined): boolean {
  if (!status) return false;
  return ['SUBMITTED', 'GRADED', 'COMPLETED'].includes(status.toUpperCase());
}

/**
 * The parent portal home: one calm summary for the selected child, then only
 * the things a parent acts on today — quick actions, today's classes and the
 * homework coming due. Everything else lives in the drawer.
 */
export function ParentPortalScreen() {
  const navigation = useNavigation<Nav>();

  const overviewState = useAsync<ParentOverview>(
    () => api.get<ParentOverview>('/parents/me/children'),
    [],
  );

  const [selectedId, setSelectedId] = useState('');
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [photoSaved, setPhotoSaved] = useState(false);

  const children = overviewState.data?.children ?? [];
  const child = children.find((item) => item.id === selectedId) ?? children[0] ?? null;

  /**
   * Pick, crop and resize a photo for the selected child, then save it through
   * the parent-scoped endpoint. The backend re-checks that the child belongs to
   * this parent, and the resize keeps the payload well under the schema cap.
   */
  const pickChildPhoto = async () => {
    if (!child || photoBusy) return;
    setPhotoError(null);
    setPhotoSaved(false);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setPhotoError('Allow photo access to choose a picture.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      if (!asset?.uri) {
        setPhotoError('Could not read that image.');
        return;
      }
      const resized = await manipulateAsync(
        asset.uri,
        [{ resize: { width: 320 } }],
        { compress: 0.7, format: SaveFormat.JPEG, base64: true },
      );
      if (!resized.base64) {
        setPhotoError('Could not read that image.');
        return;
      }
      const photoUrl = `data:image/jpeg;base64,${resized.base64}`;
      if (photoUrl.length > MAX_PHOTO_LENGTH) {
        setPhotoError('That photo is too large. Please choose a smaller one.');
        return;
      }
      setPhotoBusy(true);
      await api.patch(`/parents/me/children/${child.id}/photo`, { photoUrl });
      setPhotoSaved(true);
      overviewState.reload();
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : 'Could not save the photo.');
    } finally {
      setPhotoBusy(false);
    }
  };

  const homeworkState = useAsync<HomeworkRow[]>(
    () =>
      child
        ? api.get<HomeworkRow[]>(`/parents/me/children/${child.id}/homework`)
        : Promise.resolve([]),
    [child?.id],
  );

  if (overviewState.loading) {
    return (
      <ParentPage>
        <SkeletonPanels count={3} />
      </ParentPage>
    );
  }

  if (overviewState.forbidden) {
    return (
      <ParentPage>
        <ParentEmpty icon="lock" message="Only parents can open this dashboard." />
      </ParentPage>
    );
  }

  if (overviewState.error) {
    return (
      <ParentPage>
        <ParentError
          message={overviewState.error}
          onRetry={() => {
            overviewState.reload();
            homeworkState.reload();
          }}
        />
      </ParentPage>
    );
  }

  if (!child) {
    return (
      <ParentPage>
        <ParentEmpty
          icon="parents"
          message="No children are linked to your account yet."
          hint="Please contact the school office to link your children."
        />
      </ParentPage>
    );
  }

  const attendance = child.attendance;
  const activities = child.activities;
  const pendingInvoices = child.invoices.filter((invoice) => Number(invoice.balance) > 0);
  const homework = (homeworkState.data ?? [])
    .filter((item) => !isDone(item.submission?.status))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 4);

  const todayName = WEEKDAY_BY_INDEX[new Date().getDay()] ?? 'MONDAY';
  const todayClasses = child.timetable
    .filter((entry) => entry.dayOfWeek === todayName)
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
    .slice(0, 4);

  const actions: ParentQuickAction[] = [
    { key: 'attendance', label: 'Attendance', icon: 'attendance', onPress: () => navigation.navigate(ROUTES.parent.attendance) },
    { key: 'homework', label: 'Homework', icon: 'homework', onPress: () => navigation.navigate(ROUTES.parent.homework) },
    { key: 'timetable', label: 'Timetable', icon: 'timetable', onPress: () => navigation.navigate(ROUTES.parent.timetable) },
    { key: 'results', label: 'Results', icon: 'marks', onPress: () => navigation.navigate(ROUTES.parent.results) },
    { key: 'fees', label: 'Fees', icon: 'finance', onPress: () => navigation.navigate(ROUTES.parent.invoices) },
    { key: 'teachers', label: 'Teachers', icon: 'teacher', onPress: () => navigation.navigate(ROUTES.parent.teachers) },
  ];

  const todayLabel = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <ParentPage>
      <ParentHero
        title={childName(child)}
        subtitle={`${klassOf(child)} · ${todayLabel}`}
        badge={{ label: 'Attendance', value: `${attendance.percentage}%` }}
        avatarUrl={child.photoUrl}
        avatarFallback={childInitials(child)}
        onEditPhoto={pickChildPhoto}
        editingPhoto={photoBusy}
      />

      {photoError ? <ParentNotice tone="danger" message={photoError} /> : null}
      {photoSaved ? (
        <ParentNotice tone="success" icon="check" message="Photo updated." />
      ) : null}

      {children.length > 1 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {children.map((item) => (
            <ParentSelectChip
              key={item.id}
              label={childName(item)}
              active={item.id === child.id}
              onPress={() => setSelectedId(item.id)}
              photoUrl={item.photoUrl}
              initials={childInitials(item)}
            />
          ))}
        </View>
      ) : null}

      <View style={styles.metrics}>
        <Metric
          label="Homework due"
          value={String(activities.dueToday)}
          hint={`${activities.upcomingHomework} this week`}
          tone={activities.dueToday > 0 ? 'warning' : 'default'}
        />
        <Metric
          label="Classes today"
          value={String(activities.todayClasses)}
          hint="Scheduled periods"
        />
        <Metric
          label="Fees due"
          value={formatCurrency(child.outstanding)}
          hint={`${pendingInvoices.length} unpaid`}
          tone={child.outstanding > 0 ? 'danger' : 'default'}
        />
      </View>

      <ParentPanel title="Quick actions">
        <ParentQuickActions items={actions} />
      </ParentPanel>

      <ParentPanel
        title="Today"
        subtitle={todayLabel}
        icon="timetable"
        action={
          <PanelLink
            label="Timetable"
            onPress={() => navigation.navigate(ROUTES.parent.timetable)}
          />
        }
      >
        {todayClasses.length === 0 ? (
          <ParentEmpty icon="timetable" message="No classes are scheduled for today." />
        ) : (
          <View>
            {todayClasses.map((entry) => (
              <ParentRow
                key={entry.id}
                title={entry.subject?.name ?? 'Class'}
                meta={[teacherNameOf(entry), entry.room].filter(Boolean).join(' · ') || undefined}
                aside={<Text style={styles.aside}>{timeRangeOf(entry)}</Text>}
              />
            ))}
          </View>
        )}
      </ParentPanel>

      <ParentPanel
        title="Due soon"
        subtitle="Homework that still needs attention"
        icon="homework"
        action={<PanelLink label="All" onPress={() => navigation.navigate(ROUTES.parent.homework)} />}
      >
        {homeworkState.loading ? (
          <SkeletonList rows={3} />
        ) : homeworkState.error ? (
          <ParentEmpty icon="homework" message="Could not load homework right now." />
        ) : homework.length === 0 ? (
          <ParentEmpty icon="check" message="Nothing due right now." hint="All caught up." />
        ) : (
          <View>
            {homework.map((item) => (
              <ParentRow
                key={item.id}
                title={item.title}
                meta={item.subject?.name ?? 'General'}
                aside={
                  <View style={styles.asideStack}>
                    <Text style={styles.asideStrong}>{formatDate(item.dueDate)}</Text>
                    <ParentChip
                      label={item.submission ? humanize(item.submission.status) : 'Not submitted'}
                      tone={item.submission ? statusTone(item.submission.status) : 'warning'}
                    />
                  </View>
                }
              />
            ))}
          </View>
        )}
      </ParentPanel>
    </ParentPage>
  );
}

function Metric({
  label,
  value,
  hint,
  tone = 'default',
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: 'default' | 'warning' | 'danger';
}) {
  const valueColor =
    tone === 'danger' ? colors.danger : tone === 'warning' ? colors.warning : colors.text;
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[styles.metricValue, { color: valueColor }]} numberOfLines={1}>
        {value}
      </Text>
      {hint ? (
        <Text style={styles.metricHint} numberOfLines={1}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

function PanelLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.panelLink, pressed ? styles.panelLinkPressed : null]}
    >
      <Text style={styles.panelLinkLabel}>{label}</Text>
      <Icon name="arrow-right" size={14} color={parentColors.accent} />
    </Pressable>
  );
}

const styles = {
  metrics: {
    flexDirection: 'row' as const,
    gap: 8,
  },
  metric: {
    flex: 1,
    gap: 2,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  metricLabel: {
    fontSize: 11.5,
    fontWeight: '600' as const,
    color: colors.textMuted,
  },
  metricValue: {
    fontSize: 19,
    lineHeight: 24,
    fontWeight: '800' as const,
  },
  metricHint: {
    fontSize: 10.5,
    color: colors.textFaint,
  },
  aside: {
    fontSize: 12.5,
    color: colors.textMuted,
  },
  asideStack: {
    alignItems: 'flex-end' as const,
    gap: 4,
  },
  asideStrong: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: colors.text,
  },
  panelLink: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
  },
  panelLinkPressed: {
    opacity: 0.6,
  },
  panelLinkLabel: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: parentColors.accent,
  },
} as const;
