import { Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { Layout } from '../../components/Layout';
import {
  GlassCard,
  GlassStatCard,
  GlassButton,
  GlowPill,
} from '../../components/glass';
import { ROUTES } from '../../navigation/routes';
import { colors, radius } from '../../theme';
import { DEMO_STUDENT_ME } from '../../lib/demoData';

interface StudentOverview {
  id: string;
  admissionNo: string;
  firstName: string | null;
  lastName: string | null;
  className: string | null;
  sectionName: string | null;
  attendance: { percentage: number; present: number; absent: number; total: number };
}

function studentName(s: StudentOverview): string {
  const first = s.firstName ?? '';
  const last = s.lastName ?? '';
  return `${first} ${last}`.trim() || `Admission ${s.admissionNo}`;
}

function klassOf(s: StudentOverview): string {
  return [s.className, s.sectionName].filter(Boolean).join(' • ') || '—';
}

export function StudentHomeScreen() {
  const navigation = useNavigation<{ navigate: (route: string, params?: object) => void }>();
  const s = DEMO_STUDENT_ME;
  const attendance = {
    percentage: 50,
    present: 1,
    absent: 1,
    total: 2,
  };

  const overview: StudentOverview = {
    id: s.id,
    admissionNo: s.admissionNo,
    firstName: s.user?.firstName ?? null,
    lastName: s.user?.lastName ?? null,
    className: s.section?.classLevel?.name ?? null,
    sectionName: s.section?.name ?? null,
    attendance,
  };

  return (
    <Layout heading="Home">
      <GlassCard strong style={styles.heroCard}>
        <View style={styles.heroContent}>
          <View>
            <GlowPill color="accent" style={styles.schoolPill}>
              <Text style={styles.schoolLabel}>Greenfield Matriculation Higher Secondary School</Text>
            </GlowPill>
            <Text style={styles.heroName}>{studentName(overview)}</Text>
            <Text style={styles.heroKlass}>{klassOf(overview)} · Admission No. {overview.admissionNo}</Text>
          </View>
          <View style={styles.attendancePill}>
            <Text style={styles.attendanceValue}>{overview.attendance.percentage}%</Text>
            <Text style={styles.attendanceLabel}>Attendance</Text>
          </View>
        </View>
      </GlassCard>

      <GlassStatCard
        label="Attendance"
        value={`${overview.attendance.percentage}%`}
        hint={`${overview.attendance.present} of ${overview.attendance.total} days`}
        icon="attendance"
      />
      <GlassStatCard
        label="Present"
        value={overview.attendance.present}
        icon="check"
        tone="success"
      />
      <GlassStatCard
        label="Absent"
        value={overview.attendance.absent}
        icon="alert"
        tone="danger"
      />
      <GlassStatCard
        label="Class"
        value={klassOf(overview)}
        icon="class"
        onPress={() => navigation.navigate(ROUTES.student.timetable)}
      />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick links</Text>
        <GlassButton
          label="Timetable"
          icon="timetable"
          variant="glass"
          onPress={() => navigation.navigate(ROUTES.student.timetable)}
          style={styles.linkButton}
        />
      </View>
    </Layout>
  );
}

const styles = {
  heroCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    marginBottom: 16,
    borderColor: colors.borderStrong,
  },
  heroContent: {
    flex: 1,
    minWidth: 0,
  },
  schoolPill: {
    marginBottom: 8,
  },
  schoolLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: colors.accent,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
  },
  heroName: {
    fontSize: 21,
    fontWeight: '800' as const,
    color: colors.text,
    marginTop: 2,
    letterSpacing: -0.4,
  },
  heroKlass: {
    fontSize: 13.5,
    color: colors.textMuted,
    marginTop: 1,
  },
  attendancePill: {
    alignItems: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.25)',
  },
  attendanceValue: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: colors.primary,
  },
  attendanceLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.6,
  },
  section: {
    marginTop: 6,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: colors.textMuted,
    marginBottom: 10,
    letterSpacing: 0.6,
    textTransform: 'uppercase' as const,
  },
  linkButton: {
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.glassSurface,
  },
} as const;
