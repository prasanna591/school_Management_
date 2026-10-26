import type { ReactNode } from 'react';
import { Pressable, Text, View, type TextStyle } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Permission, type AttendanceIndicator, type Role } from '@smartschool/shared';

import { Icon, type IconName } from '../../components/Icon';
import {
  EmptyState,
  ErrorState,
  Skeleton,
  SkeletonPanels,
  SkeletonStats,
  StatCard,
  StatGrid,
  formatStatValue,
  type StatTone,
} from '../../components/ui';
import { api } from '../../lib/api';
import { indicatorLabel, indicatorTone } from '../../lib/attendanceTracker';
import { formatCurrency, formatDateTime, humanize } from '../../lib/format';
import { can } from '../../lib/permissions';
import { useAsync } from '../../lib/useAsync';
import { useAuth } from '../../lib/auth';
import { useSettings } from '../../lib/settings';
import { ROUTES } from '../../navigation/routes';
import { colors, radius } from '../../theme';

type Nav = { navigate: (route: string, params?: object) => void };

interface AttendanceCard {
  total: number;
  byStatus: Record<string, number>;
  percentage: number;
  indicator: AttendanceIndicator;
}

interface DashboardData {
  counts: Record<string, number>;
  pipeline: {
    openAdmissions: number;
    pendingRequests: number;
  };
  finance: {
    invoices: number;
    totalBilled: number;
    totalCollected: number;
    totalOutstanding: number;
    collectedThisMonth: number;
    byStatus: Record<string, number>;
  };
  attendanceToday: AttendanceCard;
  attendanceOverall: AttendanceCard;
}

interface ActivityItem {
  id: string;
  action: string;
  entity: string;
  entityId?: string | null;
  createdAt: string;
  user?: { firstName?: string | null; lastName?: string | null } | null;
}

interface NotificationItem {
  id: string;
  title: string;
  body: string | null;
  isRead: boolean;
  createdAt: string;
}

interface FeedRow {
  id: string;
  title: string;
  meta: string;
  icon: IconName;
  unread?: boolean;
}

function person(who?: { firstName?: string | null; lastName?: string | null } | null): string {
  if (!who) return '';
  return `${who.firstName ?? ''} ${who.lastName ?? ''}`.trim();
}

function attendanceStat(card: AttendanceCard): { value: string; hint: string; tone: StatTone } {
  if (!card.total) {
    return { value: '—', hint: 'No marks yet', tone: 'info' };
  }
  return {
    value: `${card.percentage}%`,
    hint: indicatorLabel(card.indicator),
    tone: indicatorTone(card.indicator),
  };
}

export function AdminDashboardScreen() {
  const { user } = useAuth();
  const { currency } = useSettings();
  const navigation = useNavigation<Nav>();

  const role = user?.role;
  const canAudit = role ? can(role, Permission.AUDIT_READ) : false;
  const canNotifications = role ? can(role, Permission.NOTIFICATION_READ) : false;

  const state = useAsync<DashboardData>(() => api.get<DashboardData>('/reports/dashboard'), []);

  const feed = useAsync<FeedRow[]>(async () => {
    if (!role) return [];
    if (canAudit) {
      const result = await api.list<ActivityItem>('/audit-logs', { limit: 5 });
      return result.items.map((activity) => ({
        id: activity.id,
        title: humanize(activity.action),
        meta: [humanize(activity.entity), person(activity.user), formatDateTime(activity.createdAt)]
          .filter(Boolean)
          .join(' · '),
        icon: 'reports' as IconName,
      }));
    }
    if (canNotifications) {
      const result = await api.list<NotificationItem>('/notifications', { limit: 5 });
      return result.items.map((notification) => ({
        id: notification.id,
        title: notification.title,
        meta: formatDateTime(notification.createdAt),
        icon: 'bell' as IconName,
        unread: !notification.isRead,
      }));
    }
    return [];
  }, [role, canAudit, canNotifications]);

  const go = (route: string, params?: object) => navigation.navigate(route, params);

  if (state.forbidden) {
    return <EmptyState message="You don't have permission to view the dashboard." icon="lock" />;
  }
  if (state.loading) {
    return (
      <>
        <SkeletonStats count={4} />
        <SkeletonPanels count={3} />
      </>
    );
  }
  if (state.error) {
    return <ErrorState message={state.error} onRetry={state.reload} />;
  }
  if (!state.data) return null;

  const data = state.data;
  const attendance = attendanceStat(data.attendanceToday);
  const showFeed = canAudit || canNotifications;

  const attention: { key: string; label: string; value: number | string; icon: IconName; onPress?: () => void }[] = [];
  if (data.pipeline.pendingRequests > 0) {
    attention.push({
      key: 'requests',
      label: 'Pending requests',
      value: data.pipeline.pendingRequests,
      icon: 'requests',
      onPress: role && can(role, Permission.REQUEST_READ)
        ? () => go(ROUTES.admin.resource, { key: 'service-requests' })
        : undefined,
    });
  }
  if (data.pipeline.openAdmissions > 0) {
    attention.push({
      key: 'admissions',
      label: 'Open admissions',
      value: data.pipeline.openAdmissions,
      icon: 'admissions',
      onPress: role && can(role, Permission.ADMISSION_READ)
        ? () => go(ROUTES.admin.resource, { key: 'admissions' })
        : undefined,
    });
  }
  if (data.finance.totalOutstanding > 0) {
    attention.push({
      key: 'fees',
      label: 'Fees outstanding',
      value: formatCurrency(data.finance.totalOutstanding, currency),
      icon: 'finance',
      onPress: role && can(role, Permission.INVOICE_READ)
        ? () => go(ROUTES.admin.resource, { key: 'invoices' })
        : undefined,
    });
  }

  return (
    <>
      <StatGrid>
        <StatCard
          label="Students"
          value={formatStatValue(data.counts.students)}
          hint="Enrolled"
          icon="students"
          onPress={role && can(role, Permission.STUDENT_READ) ? () => go(ROUTES.admin.students) : undefined}
        />
        <StatCard
          label="Teachers"
          value={formatStatValue(data.counts.teachers)}
          hint="On staff"
          icon="teacher"
          onPress={
            role && can(role, Permission.TEACHER_MANAGE)
              ? () => go(ROUTES.admin.resource, { key: 'teachers' })
              : undefined
          }
        />
        <StatCard
          label="Attendance today"
          value={attendance.value}
          hint={attendance.hint}
          icon="calendar-check"
          tone={attendance.tone}
          onPress={
            role && can(role, Permission.ATTENDANCE_READ)
              ? () => go(ROUTES.admin.resource, { key: 'attendances' })
              : undefined
          }
        />
        <StatCard
          label="Fees outstanding"
          value={formatCurrency(data.finance.totalOutstanding, currency)}
          hint={`${formatCurrency(data.finance.collectedThisMonth, currency)} this month`}
          icon="receipt"
          tone={data.finance.totalOutstanding > 0 ? 'danger' : 'success'}
          onPress={
            role && can(role, Permission.INVOICE_READ)
              ? () => go(ROUTES.admin.resource, { key: 'invoices' })
              : undefined
          }
        />
      </StatGrid>

      <Panel title="Needs attention">
        {attention.length === 0 ? (
          <Text style={styles.muted}>Nothing needs attention right now.</Text>
        ) : (
          attention.map((item) => (
            <Pressable
              key={item.key}
              onPress={item.onPress}
              disabled={!item.onPress}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              style={({ pressed }) => [styles.attentionRow, pressed ? styles.rowPressed : null]}
            >
              <View style={styles.quickIcon}>
                <Icon name={item.icon} size={16} color={colors.primary} />
              </View>
              <Text style={styles.attentionLabel} numberOfLines={1}>
                {item.label}
              </Text>
              <Text style={styles.attentionValue}>{item.value}</Text>
              {item.onPress ? (
                <Icon name="chevron-right" size={16} color={colors.textMuted} />
              ) : null}
            </Pressable>
          ))
        )}
      </Panel>

      <QuickActions role={role} onSelect={go} />

      <Panel
        title="Finance"
        action={
          role && can(role, Permission.INVOICE_READ) ? (
            <Pressable
              style={styles.linkButton}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="View invoices"
              onPress={() => go(ROUTES.admin.resource, { key: 'invoices' })}
            >
              <Text style={styles.linkText}>Invoices</Text>
              <Icon name="chevron-right" size={14} color={colors.primary} />
            </Pressable>
          ) : undefined
        }
      >
        <View style={styles.kvList}>
          <KeyValue
            label="Collected this month"
            value={formatCurrency(data.finance.collectedThisMonth, currency)}
            valueStyle={styles.kvSuccess}
            icon="trending"
          />
          <KeyValue
            label="Pending fees"
            value={formatCurrency(data.finance.totalOutstanding, currency)}
            valueStyle={styles.kvDanger}
            icon="receipt"
          />
        </View>
      </Panel>

      {showFeed ? (
        <Panel
          title="Recent activity"
          action={
            role ? (
              <Pressable
                style={styles.linkButton}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="View all activity"
                onPress={() =>
                  canAudit
                    ? go(ROUTES.admin.resource, { key: 'audit-logs' })
                    : go(ROUTES.admin.tabs, { screen: ROUTES.admin.notifications })
                }
              >
                <Text style={styles.linkText}>View all</Text>
                <Icon name="chevron-right" size={14} color={colors.primary} />
              </Pressable>
            ) : undefined
          }
        >
          {feed.loading ? (
            <>
              <Skeleton height={38} radius={radius.md} />
              <Skeleton height={38} radius={radius.md} />
              <Skeleton height={38} radius={radius.md} />
            </>
          ) : feed.error ? (
            <View style={styles.inlineError}>
              <Text style={styles.muted}>{feed.error}</Text>
              <Pressable onPress={feed.reload} hitSlop={8} style={styles.linkButton} accessibilityRole="button">
                <Text style={styles.linkText}>Try again</Text>
              </Pressable>
            </View>
          ) : (feed.data ?? []).length === 0 ? (
            <Text style={styles.muted}>
              {canAudit ? 'No recent activity yet.' : 'No notifications yet.'}
            </Text>
          ) : (
            (feed.data ?? []).map((row) => (
              <View key={row.id} style={styles.feedRow}>
                <View style={styles.feedIcon}>
                  <Icon name={row.icon} size={16} color={colors.primary} />
                </View>
                <View style={styles.feedText}>
                  <Text style={row.unread ? styles.feedTitleUnread : styles.feedTitle} numberOfLines={2}>
                    {row.title}
                  </Text>
                  <Text style={styles.muted}>{row.meta}</Text>
                </View>
              </View>
            ))
          )}
        </Panel>
      ) : null}
    </>
  );
}

const QUICK_ACTIONS: {
  key: string;
  label: string;
  icon: IconName;
  permission: Permission;
  route: string;
  params?: Record<string, unknown>;
}[] = [
  {
    key: 'students',
    label: 'Students',
    icon: 'students',
    permission: Permission.STUDENT_READ,
    route: ROUTES.admin.students,
  },
  {
    key: 'attendance',
    label: 'Attendance',
    icon: 'attendance',
    permission: Permission.ATTENDANCE_READ,
    route: ROUTES.admin.resource,
    params: { key: 'attendances' },
  },
  {
    key: 'fees',
    label: 'Fees',
    icon: 'finance',
    permission: Permission.INVOICE_READ,
    route: ROUTES.admin.resource,
    params: { key: 'invoices' },
  },
  {
    key: 'marks',
    label: 'Marks',
    icon: 'marks',
    permission: Permission.RESULT_READ,
    route: ROUTES.admin.resource,
    params: { key: 'exam-results' },
  },
];

function QuickActions({
  role,
  onSelect,
}: {
  role?: Role;
  onSelect: (route: string, params?: object) => void;
}) {
  if (!role) return null;
  const actions = QUICK_ACTIONS.filter((action) => can(role, action.permission));
  if (actions.length === 0) return null;

  return (
    <Panel title="Quick actions">
      <View style={styles.quickGrid}>
        {actions.map((action) => (
          <Pressable
            key={action.key}
            style={({ pressed }) => [styles.quickButton, pressed ? styles.quickButtonPressed : null]}
            onPress={() => onSelect(action.route, action.params)}
            accessibilityRole="button"
            accessibilityLabel={action.label}
          >
            <View style={styles.quickIcon}>
              <Icon name={action.icon} size={18} color={colors.primary} />
            </View>
            <Text style={styles.quickLabel} numberOfLines={1}>
              {action.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </Panel>
  );
}

function KeyValue({
  label,
  value,
  valueStyle,
  icon,
}: {
  label: string;
  value: string;
  valueStyle?: TextStyle;
  icon?: IconName;
}) {
  return (
    <View style={styles.kvRow}>
      <View style={styles.kvLeft}>
        {icon ? <Icon name={icon} size={16} color={colors.textMuted} /> : null}
        <Text style={styles.kvLabel} numberOfLines={1}>
          {label}
        </Text>
      </View>
      <Text style={[styles.kvValue, valueStyle]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function Panel({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <View style={styles.panel}>
      <View style={styles.panelHeader}>
        <Text style={styles.panelTitle}>{title}</Text>
        {action}
      </View>
      <View style={styles.panelBody}>{children}</View>
    </View>
  );
}

const styles = {
  attentionRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
    paddingVertical: 9,
    paddingHorizontal: 4,
    borderRadius: radius.sm,
  },
  rowPressed: {
    backgroundColor: colors.primaryLight,
  },
  attentionLabel: {
    flex: 1,
    minWidth: 0,
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.text,
  },
  attentionValue: {
    fontSize: 14,
    fontWeight: '800' as const,
    color: colors.primary,
  },
  panel: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 18,
    gap: 14,
  },
  panelHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    gap: 8,
  },
  panelTitle: {
    flexShrink: 1,
    fontSize: 16,
    fontWeight: '700' as const,
    color: colors.text,
  },
  panelBody: {
    gap: 8,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    minHeight: 44,
    paddingHorizontal: 4,
  },
  linkText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  feedRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 6,
  },
  feedIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedText: {
    flex: 1,
    gap: 2,
  },
  feedTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  feedTitleUnread: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  inlineError: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  kvList: {
    gap: 2,
  },
  kvRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceMuted,
  },
  kvLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  kvLabel: {
    flexShrink: 1,
    fontSize: 14,
    color: colors.textMuted,
  },
  kvValue: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'right',
  },
  kvSuccess: {
    color: colors.success,
  },
  kvDanger: {
    color: colors.danger,
  },
  quickGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 8,
  },
  quickButton: {
    flexGrow: 1,
    flexBasis: '22%',
    alignItems: 'center' as const,
    gap: 8,
    minHeight: 78,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 6,
    paddingVertical: 14,
  },
  quickButtonPressed: {
    backgroundColor: colors.primaryLight,
  },
  quickIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primaryLight,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  quickLabel: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: colors.text,
    textAlign: 'center' as const,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipLabel: {
    fontSize: 12,
    color: colors.textMuted,
  },
  chipValue: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
  },
  muted: {
    fontSize: 12,
    color: colors.textFaint,
  },
} as const;
