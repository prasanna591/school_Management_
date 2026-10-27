import { useNavigation } from '@react-navigation/native';
import { Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { ParentPage, ParentPanel } from '../../components/parent/parentUi';
import { formatCurrency } from '../../lib/format';
import { colors, parentColors, parentGradient, radius } from '../../theme';
import { ROUTES } from '../../navigation/routes';
import { DEMO_STUDENT_ME, DEMO_ATTENDANCE, DEMO_INVOICE, DEMO_NOTICES } from '../../lib/demoData';
import { GlassCard, GlassButton, GlowPill } from '../../components/glass';

type Nav = { navigate: (route: string, params?: object) => void };

interface ChildSummary {
  id: string;
  admissionNo: string;
  name: string | null;
  className: string | null;
  sectionName: string | null;
  attendance: { percentage: number; today: { status: string } | null };
  invoices: Array<{
    id: string;
    invoiceNo: string;
    dueDate: string;
    balance: number | string;
    status: string;
  }>;
  outstanding: number;
}

interface ParentOverview {
  children: ChildSummary[];
}

function childName(child: ChildSummary): string {
  return child.name ?? `Admission ${child.admissionNo}`;
}

function klassOf(child: ChildSummary): string {
  return [child.className, child.sectionName].filter(Boolean).join(' • ') || '—';
}

function buildOverview(): ParentOverview {
  const student = DEMO_STUDENT_ME;
  const todayAttendance = DEMO_ATTENDANCE.find(
    (a) => a.studentId === student.id && a.date === new Date().toISOString().slice(0, 10),
  );
  const allAttendance = DEMO_ATTENDANCE.filter((a) => a.studentId === student.id);
  const present = allAttendance.filter((a) => a.status === 'PRESENT').length;
  const percentage = allAttendance.length ? Math.round((present / allAttendance.length) * 100) : 0;

  const children: ChildSummary[] = [
    {
      id: student.id,
      admissionNo: student.admissionNo,
      name: `${student.user?.firstName} ${student.user?.lastName}`.trim(),
      className: student.section?.classLevel?.name ?? null,
      sectionName: student.section?.name ?? null,
      attendance: {
        percentage,
        today: todayAttendance ? { status: todayAttendance.status } : null,
      },
      invoices: [
        {
          id: DEMO_INVOICE.id,
          invoiceNo: DEMO_INVOICE.invoiceNo,
          dueDate: DEMO_INVOICE.dueDate,
          balance: DEMO_INVOICE.balance,
          status: DEMO_INVOICE.status,
        },
      ],
      outstanding: DEMO_INVOICE.balance,
    },
  ];

  return { children };
}

export function ParentHomeAwesome() {
  const navigation = useNavigation<Nav>();
  const go = (route: string, params?: object) =>
    navigation.navigate(route as never, params as never);

  const overview = buildOverview();
  const child = overview.children[0] ?? null;

  if (!child) {
    return (
      <ParentPage>
        <GlassCard strong style={styles.emptyCard}>
          <Text style={styles.emptyText}>
            Please contact the school to link your child account.
          </Text>
        </GlassCard>
      </ParentPage>
    );
  }

  const todayStatus = child.attendance?.today?.status;
  const hasDue = Number(child.outstanding || 0) > 0;

  return (
    <ParentPage>
      <LinearGradient
        colors={parentGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.heroContent}>
          <View>
            <GlowPill color="accent" style={styles.childPill}>
              <Text style={styles.childLabel}>Your Child</Text>
            </GlowPill>
            <Text style={styles.childName}>{childName(child)}</Text>
            <Text style={styles.childKlass}>{klassOf(child)}</Text>
          </View>
          <View style={styles.attendancePill}>
            <Text style={styles.attendanceValue}>{child.attendance?.percentage ?? 0}%</Text>
            <Text style={styles.attendanceLabel}>Attendance</Text>
          </View>
        </View>
        <View style={styles.heroActions}>
          <GlassButton
            label="View Attendance"
            variant="glass"
            onPress={() => go(ROUTES.parent.attendance)}
            style={styles.heroAction}
          />
          <GlassButton
            label="Homework"
            variant="fill"
            onPress={() => go(ROUTES.parent.homework)}
            style={styles.heroActionFill}
          />
        </View>
      </LinearGradient>

      <View style={styles.gridRow}>
        <GlassButton
          label="Today"
          variant="glass"
          icon="attendance"
          onPress={() => go(ROUTES.parent.attendance)}
          style={styles.gridButton}
        >
          {todayStatus ? `Marked: ${todayStatus}` : 'Not marked'}
        </GlassButton>
        <GlassButton
          label="Fees"
          variant="glass"
          icon="finance"
          onPress={() => go(ROUTES.parent.invoices)}
          style={styles.gridButton}
        >
          {hasDue ? formatCurrency(Number(child.outstanding || 0)) + ' due' : 'Clear'}
        </GlassButton>
        <GlassButton
          label="Homework"
          variant="glass"
          icon="homework"
          onPress={() => go(ROUTES.parent.homework)}
          style={styles.gridButton}
        >
          View & track
        </GlassButton>
        <GlassButton
          label="Notices"
          variant="glass"
          icon="messages"
          onPress={() => go(ROUTES.parent.notices)}
          style={styles.gridButton}
        >
          Latest updates
        </GlassButton>
      </View>

      <ParentPanel title="Quick Overview" icon="home">
        <View style={styles.kvList}>
          <View style={styles.kvRow}>
            <Text style={styles.kvLabel}>Class</Text>
            <Text style={styles.kvValue}>{klassOf(child)}</Text>
          </View>
          <View style={styles.kvRow}>
            <Text style={styles.kvLabel}>Admission No</Text>
            <Text style={styles.kvValue}>{child.admissionNo}</Text>
          </View>
          <View style={styles.kvRow}>
            <Text style={styles.kvLabel}>Attendance</Text>
            <Text style={styles.kvValue}>{child.attendance?.percentage ?? 0}%</Text>
          </View>
        </View>
      </ParentPanel>

      <ParentPanel title="Latest Notices" icon="bell">
        <View style={styles.noticesList}>
          {DEMO_NOTICES.map((notice) => (
            <View key={notice.id} style={styles.noticeRow}>
              <Text style={styles.noticeTitle}>{notice.title}</Text>
              <Text style={styles.noticeMeta}>{notice.publishedAt.slice(0, 10)}</Text>
            </View>
          ))}
        </View>
      </ParentPanel>
    </ParentPage>
  );
}

const styles = {
  emptyCard: {
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyText: {
    color: colors.textMuted,
    textAlign: 'center',
    fontSize: 14,
  },
  hero: {
    borderRadius: radius.xl,
    padding: 20,
    marginBottom: 16,
  },
  heroContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  childPill: {
    marginBottom: 8,
  },
  childLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: parentColors.accent,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
  },
  childName: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: colors.white,
    marginTop: 4,
    letterSpacing: -0.4,
  },
  childKlass: {
    fontSize: 13.5,
    color: '#c7d2fe',
    marginTop: 2,
  },
  attendancePill: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  attendanceValue: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: colors.white,
  },
  attendanceLabel: {
    fontSize: 11,
    color: '#e5edfe',
    marginTop: 1,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.6,
  },
  heroActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  heroAction: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  heroActionFill: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: colors.white,
  },
  gridRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  gridButton: {
    flex: 1,
    maxWidth: '48%',
    minHeight: 80,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.glassSurface,
    padding: 14,
    gap: 10,
  },
  kvList: {
    gap: 8,
  },
  kvRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  kvLabel: {
    fontSize: 13.5,
    color: colors.textMuted,
  },
  kvValue: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: colors.text,
  },
  noticesList: {
    gap: 8,
  },
  noticeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  noticeTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.text,
    flex: 1,
  },
  noticeMeta: {
    fontSize: 12,
    color: colors.textMuted,
  },
} as const;
