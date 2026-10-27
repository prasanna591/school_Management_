import { useNavigation } from '@react-navigation/native';
import { Pressable, Text, View } from 'react-native';
import { Permission, type Role } from '@smartschool/shared';

import { Icon } from '../../components/Icon';
import {
  QuickActionGrid,
  TeacherEmpty,
  TeacherHero,
  TeacherNotice,
  TeacherPage,
  TeacherPanel,
  type QuickAction,
} from '../../components/teacher/teacherUi';
import { EmptyState, ErrorState, SkeletonPanels } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { formatDate } from '../../lib/format';
import { can } from '../../lib/permissions';
import {
  attendanceHint,
  emptyPage,
  fetchStudentsForSections,
  fetchTeacherHomework,
  useTeacherScope,
  type HomeworkItem,
  type TeacherStudent,
} from '../../lib/teacherScope';
import { sectionLabelOf, subjectLabel, timeRangeOf } from '../../lib/timetable';
import { useAsync } from '../../lib/useAsync';
import { colors } from '../../theme';
import { ROUTES } from '../../navigation/routes';
import { GlassStatCard } from '../../components/glass';

type Nav = { navigate: (route: string, params?: object) => void };

interface DashboardData {
  students: TeacherStudent[];
  studentsTotal: number;
  studentsTruncated: boolean;
  homework: HomeworkItem[];
  homeworkTotal: number;
}

const EMPTY_DASHBOARD: DashboardData = {
  students: [],
  studentsTotal: 0,
  studentsTruncated: false,
  homework: [],
  homeworkTotal: 0,
};

const WEEKDAY_BY_INDEX = [
  'SUNDAY',
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
] as const;

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function quickActionsFor(role: Role | undefined, go: (route: string) => void): QuickAction[] {
  const allowed = (permission: Permission) => (role ? can(role, permission) : false);
  const actions: (QuickAction & { permission?: Permission })[] = [
    { key: 'classes', label: 'My classes', icon: 'class', onPress: () => go(ROUTES.teacher.classes) },
    { key: 'students', label: 'My students', icon: 'students', permission: Permission.STUDENT_READ, onPress: () => go(ROUTES.teacher.students) },
    { key: 'attendance', label: 'Attendance', icon: 'attendance', permission: Permission.ATTENDANCE_READ, onPress: () => go(ROUTES.teacher.attendance) },
    { key: 'marks', label: 'Marks', icon: 'marks', permission: Permission.RESULT_READ, onPress: () => go(ROUTES.teacher.marks) },
    { key: 'homework', label: 'Homework', icon: 'homework', permission: Permission.HOMEWORK_READ, onPress: () => go(ROUTES.teacher.homework) },
    { key: 'timetable', label: 'Timetable', icon: 'timetable', permission: Permission.TIMETABLE_READ, onPress: () => go(ROUTES.teacher.timetable) },
  ];
  return actions.filter((action) => !action.permission || allowed(action.permission));
}

export function TeacherPortalScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<Nav>();
  const go = (route: string) => navigation.navigate(route);

  const scopeState = useTeacherScope();
  const scope = scopeState.scope;
  const role = user?.role;

  const dash = useAsync<DashboardData>(async () => {
    if (!scope) return EMPTY_DASHBOARD;
    const [students, homework] = await Promise.all([
      scope.sectionIds.length > 0
        ? fetchStudentsForSections(scope.sectionIds)
        : Promise.resolve(emptyPage<TeacherStudent>()),
      role && can(role, Permission.HOMEWORK_READ)
        ? fetchTeacherHomework(scope.teacher.id, { preview: 5 })
        : Promise.resolve(emptyPage<HomeworkItem>()),
    ]);
    return {
      students: students.items,
      studentsTotal: students.total,
      studentsTruncated: students.truncated,
      homework: homework.items,
      homeworkTotal: homework.total,
    };
  }, [scope?.teacher.id, role]);

  if (scopeState.forbidden) {
    return <EmptyState message="Only teachers can open this dashboard." icon="lock" />;
  }
  if (scopeState.loading || dash.loading) return <SkeletonPanels count={3} />;
  if (scopeState.error) return <ErrorState message={scopeState.error} onRetry={scopeState.reload} />;
  if (!scope) return null;

  const {
    students,
    studentsTotal,
    studentsTruncated,
    homework,
    homeworkTotal,
  } = dash.data ?? EMPTY_DASHBOARD;
  const teacher = scope.teacher;
  const entries = scope.timetableEntries;

  const todayName = WEEKDAY_BY_INDEX[new Date().getDay()] ?? 'MONDAY';
  const todayEntries = entries
    .filter((entry) => entry.dayOfWeek === todayName)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
  const todayLabel = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const today = teacher.attendance?.today;
  const actions = quickActionsFor(role, go);
  const firstName = teacher.user?.firstName ?? user?.firstName ?? 'Teacher';

  return (
    <TeacherPage>
      <TeacherHero
        title={`${greeting()}, ${firstName}`}
        subtitle={`${todayLabel} · ${todayEntries.length} class${
          todayEntries.length === 1 ? '' : 'es'
        } today`}
        statLabel="Attendance today"
        statValue={`${today?.percentage ?? 0}%`}
        statHint={attendanceHint(today)}
      />

      {studentsTruncated ? (
        <TeacherNotice
          tone="warning"
          icon="alert"
          message={`${studentsTotal} students are enrolled in your sections, but only the first ${students.length} could be loaded in one pass. Open My students and filter by class to reach the rest.`}
        />
      ) : null}

      <GlassStatCard
        label="My classes"
        value={scope.sections.length}
        hint={`${entries.length} weekly periods`}
        icon="sections"
      />
      <GlassStatCard
        label="My students"
        value={studentsTotal}
        hint="In your sections"
        icon="students"
        tone="info"
      />
      <GlassStatCard
        label="Homework"
        value={homeworkTotal}
        hint="Assigned by you"
        icon="homework"
        tone="primary"
      />

      <TeacherPanel title="Quick actions">
        <QuickActionGrid items={actions} />
      </TeacherPanel>

      <TeacherPanel
        title="Today"
        subtitle={todayLabel}
        icon="timetable"
        action={
          <Pressable
            onPress={() => go(ROUTES.teacher.timetable)}
            accessibilityRole="button"
            accessibilityLabel="Open full timetable"
            style={({ pressed }) => [styles.panelAction, pressed ? { opacity: 0.6 } : null]}
          >
            <Text style={styles.panelActionLabel}>Timetable</Text>
            <Icon name="arrow-right" size={14} color={colors.primary} />
          </Pressable>
        }
      >
        {todayEntries.length === 0 ? (
          <TeacherEmpty
            message="No classes scheduled today."
            hint="Your next teaching day is in the timetable."
            icon="timetable"
          />
        ) : (
          <View>
            {todayEntries.map((entry) => (
              <View key={entry.id} style={styles.row}>
                <View style={styles.timePill}>
                  <Text style={styles.timeLabel}>{timeRangeOf(entry)}</Text>
                </View>
                <View style={styles.rowBody}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {subjectLabel(entry)}
                  </Text>
                  <Text style={styles.rowMeta} numberOfLines={1}>
                    {[sectionLabelOf(entry), entry.room].filter(Boolean).join(' · ') || '—'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </TeacherPanel>

      <TeacherPanel
        title="Recent homework"
        subtitle={homeworkTotal > 0 ? `${homeworkTotal} assigned` : undefined}
        icon="homework"
        action={
          <Pressable
            onPress={() => go(ROUTES.teacher.homework)}
            accessibilityRole="button"
            accessibilityLabel="Open homework"
            style={({ pressed }) => [styles.panelAction, pressed ? { opacity: 0.6 } : null]}
          >
            <Text style={styles.panelActionLabel}>All</Text>
            <Icon name="arrow-right" size={14} color={colors.primary} />
          </Pressable>
        }
      >
        {homework.length === 0 ? (
          <TeacherEmpty
            message="No homework assigned yet."
            hint="Homework you create for your classes appears here."
            icon="homework"
          />
        ) : (
          <View>
            {homework.map((item) => (
              <View key={item.id} style={styles.row}>
                <View style={styles.rowBody}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.rowMeta} numberOfLines={1}>
                    {[
                      item.subject?.name,
                      item.section?.classLevel?.name,
                      item.section?.name,
                    ]
                      .filter(Boolean)
                      .join(' · ') || 'No subject'}
                  </Text>
                </View>
                <View style={styles.rowAside}>
                  <Text style={styles.rowAsideStrong}>{item._count?.submissions ?? 0} subs</Text>
                  <Text style={styles.rowMeta}>{formatDate(item.dueDate) || '—'}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </TeacherPanel>
    </TeacherPage>
  );
}

const styles = {
  panelAction: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  panelActionLabel: {
    fontSize: 12.5,
    fontWeight: '700' as const,
    color: colors.primary,
  },
  row: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
    paddingVertical: 9,
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: colors.text,
  },
  rowMeta: {
    fontSize: 12,
    color: colors.textMuted,
  },
  rowAside: {
    alignItems: 'flex-end' as const,
    gap: 2,
  },
  rowAsideStrong: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: colors.primary,
  },
  timePill: {
    minWidth: 78,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.primarySoft,
  },
  timeLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: colors.primary,
    textAlign: 'center' as const,
  },
} as const;
