import { useNavigation } from '@react-navigation/native';
import { Text, View } from 'react-native';

import { Icon } from '../../components/Icon';
import {
  DetailRow,
  TeacherButton,
  TeacherEmpty,
  TeacherPage,
  TeacherPanel,
  SectionTitle,
} from '../../components/teacher/teacherUi';
import { ErrorState, SkeletonPanels, StatCard, StatGrid } from '../../components/ui';
import { formatDate, humanize, initials } from '../../lib/format';
import { useTeacherScope } from '../../lib/teacherScope';
import { ROUTES } from '../../navigation/routes';
import { colors, radius } from '../../theme';

type Nav = { navigate: (route: string, params?: object) => void };

/** Port of the web `/teacher/profile`: employment profile + account links. */
export function TeacherProfileScreen() {
  const navigation = useNavigation<Nav>();
  const { scope, loading, error, forbidden, reload } = useTeacherScope();
  const teacher = scope?.teacher;

  if (forbidden) return <TeacherEmpty message="Only teachers can open this page." icon="lock" />;
  if (loading) return <SkeletonPanels count={3} />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  const firstName = teacher?.user?.firstName ?? '';
  const lastName = teacher?.user?.lastName ?? '';
  const fullName = [firstName, lastName].filter(Boolean).join(' ') || 'Teacher';

  return (
    <TeacherPage>
      <TeacherPanel title="Profile" subtitle="Your teaching profile and account details" icon="user">
        <View style={styles.identity}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials(firstName, lastName)}</Text>
          </View>
          <View style={styles.identityText}>
            <Text style={styles.name} numberOfLines={2}>
              {fullName}
            </Text>
            <Text style={styles.email} numberOfLines={1}>
              {teacher?.user?.email ?? '—'}
            </Text>
            <View style={styles.badges}>
              <View style={styles.badge}>
                <Text style={styles.badgeLabel}>Teacher</Text>
              </View>
              {teacher?.status ? (
                <View style={[styles.badge, styles.badgeSuccess]}>
                  <Text style={[styles.badgeLabel, styles.badgeSuccessLabel]}>
                    {humanize(teacher.status) || 'Active'}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        <SectionTitle>Contact</SectionTitle>
        <DetailRow label="Email" value={teacher?.user?.email ?? ''} />
        <DetailRow label="Phone" value={teacher?.user?.phone ?? ''} />
        <DetailRow label="School" value={teacher?.school?.name ?? ''} />
      </TeacherPanel>

      <StatGrid>
        <StatCard label="Classes" value={scope?.sections.length ?? 0} hint="Sections you teach" icon="sections" />
        <StatCard label="Subjects" value={scope?.subjects.length ?? 0} hint="Assigned" icon="subject" tone="info" />
        <StatCard
          label="Weekly periods"
          value={scope?.timetableEntries.length ?? 0}
          hint="Timetabled"
          icon="timetable"
          tone="success"
        />
        <StatCard
          label="Students"
          value={scope?.assignments.length ?? 0}
          hint="Assignments"
          icon="students"
          tone="warning"
        />
      </StatGrid>

      <TeacherPanel title="Employment details" subtitle="As recorded by the school" icon="roster">
        <DetailRow label="Employee no." value={teacher?.employeeNo ?? ''} />
        <DetailRow label="Designation" value={humanize(teacher?.designation) || ''} />
        <DetailRow label="Employment type" value={humanize(teacher?.employmentType) || ''} />
        <DetailRow label="Qualification" value={teacher?.qualification ?? ''} />
        <DetailRow label="Specialization" value={teacher?.specialization ?? ''} />
        <DetailRow label="Joining date" value={formatDate(teacher?.joiningDate) || ''} />
        <DetailRow label="Status" value={humanize(teacher?.status) || ''} />
      </TeacherPanel>

      <TeacherPanel title="Your teaching" subtitle="What the school has allocated to you" icon="class">
        {scope && scope.assignments.length > 0 ? (
          <View style={styles.list}>
            {scope.assignments.map((assignment) => (
              <View key={assignment.id} style={styles.row}>
                <View style={styles.rowIcon}>
                  <Icon name="subject" size={15} color={colors.primary} />
                </View>
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {assignment.subject?.name ?? 'Subject'}
                  </Text>
                  <Text style={styles.rowMeta} numberOfLines={1}>
                    {[assignment.section?.classLevel?.name, assignment.section?.name]
                      .filter(Boolean)
                      .join(' · ') || '—'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <TeacherEmpty
            message="No teaching assignments have been recorded yet."
            icon="class"
          />
        )}
      </TeacherPanel>

      <TeacherButton
        label="Account settings"
        icon="settings"
        onPress={() =>
          navigation.navigate(ROUTES.accountSettings)
        }
      />
    </TeacherPage>
  );
}

const styles = {
  identity: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 14,
    paddingVertical: 4,
  },
  avatar: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: colors.navySurface,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: 2,
    borderColor: colors.navyBorder,
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: '#e0e7ff',
  },
  identityText: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  name: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: colors.text,
  },
  email: {
    fontSize: 13.5,
    color: colors.textMuted,
  },
  badges: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 6,
    marginTop: 3,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: '#e0e7ff',
  },
  badgeLabel: {
    fontSize: 11.5,
    fontWeight: '700' as const,
    color: '#1e3a8a',
  },
  badgeSuccess: {
    backgroundColor: colors.successSoft,
  },
  badgeSuccessLabel: {
    color: colors.success,
  },
  list: {
    gap: 8,
  },
  row: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
    padding: 11,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
  },
  rowIcon: {
    width: 30,
    height: 30,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  rowText: {
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
    fontSize: 12.5,
    color: colors.textMuted,
  },
} as const;
