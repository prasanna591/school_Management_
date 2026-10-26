import {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
  type DimensionValue,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { Icon, type IconName } from './Icon';
import { colors, radius } from '../theme';

export function Spinner({ label }: { label?: string }) {
  return (
    <View style={styles.state} accessibilityRole="progressbar">
      <ActivityIndicator size="large" color={colors.primary} />
      {label ? <Text style={styles.stateLabel}>{label}</Text> : null}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={styles.state} accessibilityRole="alert">
      <Icon name="alert" size={22} color={colors.danger} />
      <Text style={styles.stateMessage}>{message}</Text>
      {onRetry ? (
        <Pressable style={styles.retryButton} onPress={onRetry} accessibilityRole="button">
          <Text style={styles.retryButtonText}>Try again</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function EmptyState({ message, icon = 'inbox' }: { message: string; icon?: IconName }) {
  return (
    <View style={styles.state} accessibilityRole="alert">
      <Icon name={icon} size={22} color={colors.textMuted} />
      <Text style={styles.stateMessage}>{message}</Text>
    </View>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
  icon,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  icon?: IconName;
}) {
  return (
    <View style={styles.pageHeader}>
      <View style={styles.pageHeaderHeading}>
        {icon ? <Icon name={icon} size={18} color={colors.primary} /> : null}
        <View style={styles.pageHeaderText}>
          <Text style={styles.pageHeaderTitle}>{title}</Text>
          {subtitle ? (
            <Text style={styles.pageHeaderSubtitle}>{subtitle}</Text>
          ) : null}
        </View>
      </View>
      {actions ? <View style={styles.pageHeaderActions}>{actions}</View> : null}
    </View>
  );
}

export type StatTone = 'primary' | 'success' | 'warning' | 'danger' | 'info';

const STAT_TONE_COLORS: Record<StatTone, string> = {
  primary: colors.primary,
  success: colors.success,
  warning: colors.warning,
  danger: colors.danger,
  info: colors.info,
};

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = 'primary',
  onPress,
  style,
  iconColor,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: IconName;
  tone?: StatTone;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  /** Override the icon colour (e.g. the Parent portal's blue accent). */
  iconColor?: string;
}) {
  const content = (
    <>
      <View style={styles.statCardTop}>
        <View style={styles.statCardLabelRow}>
          {tone !== 'primary' ? (
            <View style={[styles.statDot, { backgroundColor: STAT_TONE_COLORS[tone] }]} />
          ) : null}
          <Text style={styles.statCardLabel} numberOfLines={1}>
            {label}
          </Text>
        </View>
        {icon ? <Icon name={icon} size={17} color={iconColor ?? colors.textFaint} /> : null}
      </View>
      <Text style={styles.statCardValue} numberOfLines={1}>
        {value}
      </Text>
      {hint ? (
        <Text style={styles.statCardHint} numberOfLines={1}>
          {hint}
        </Text>
      ) : null}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={({ pressed }) => [
          styles.statCard,
          style,
          pressed ? styles.statCardPressed : null,
        ]}
      >
        {content}
      </Pressable>
    );
  }

  return <View style={[styles.statCard, style]}>{content}</View>;
}

export function StatGrid({
  children,
  gap = 12,
}: {
  children: ReactNode;
  gap?: number;
}) {
  return (
    <View style={[styles.statGrid, { gap }]}>
      {Children.toArray(children).map((child, index) => (
        <View key={index} style={styles.statGridCell}>
          {isValidElement(child) && child.type === StatCard
            ? cloneElement(child as ReactElement<{ style?: StyleProp<ViewStyle> }>, {
                style: [
                  (child as ReactElement<{ style?: StyleProp<ViewStyle> }>).props.style,
                  styles.statGridChild,
                ],
              })
            : child}
        </View>
      ))}
    </View>
  );
}

export function formatStatValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'number') return value.toLocaleString();
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

const NUMERIC_RE = /^(-?[\d,]+(?:\.\d+)?)(%)?$/;

function parseNumeric(value: number | string): { target: number; suffix: string } | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? { target: value, suffix: '' } : null;
  }
  const match = value.match(NUMERIC_RE);
  if (!match) return null;
  const parsed = Number(match[1]?.replace(/,/g, ''));
  if (!Number.isFinite(parsed)) return null;
  return { target: parsed, suffix: match[2] ?? '' };
}

export function CountUp({
  value,
  duration = 900,
}: {
  value: ReactNode;
  duration?: number;
}) {
  const parsed = typeof value === 'number' || typeof value === 'string' ? parseNumeric(value) : null;
  const target = parsed?.target ?? null;
  const suffix = parsed?.suffix ?? '';

  const [display, setDisplay] = useState<number>(() => (target === null ? 0 : target));
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (target === null) return;
    if (display === target) return;
    let current = 0;
    const step = 24;
    timerRef.current = setInterval(() => {
      current = current + (target - current) * 0.12;
      if (current >= target) current = target;
      setDisplay(current);
      if (current >= target && timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }, step);
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [target, duration]);

  if (target === null) return <>{value}</>;

  return (
    <>
      {display.toLocaleString(undefined, { maximumFractionDigits: 1 })}
      {suffix}
    </>
  );
}

export function Skeleton({
  width = '100%',
  height = 14,
  radius = 8,
}: {
  width?: DimensionValue;
  height?: DimensionValue;
  radius?: number;
}) {
  return (
    <View
      aria-hidden
      style={{
        width,
        height,
        borderRadius: radius,
        backgroundColor: colors.primaryLight,
      }}
    />
  );
}

export function SkeletonStats({ count = 4 }: { count?: number }) {
  return (
    <View style={styles.skeletonGrid} aria-hidden>
      {Array.from({ length: count }, (_, index) => (
        <Skeleton key={index} height={72} radius={radius.lg} />
      ))}
    </View>
  );
}

export function SkeletonPanels({ count = 3 }: { count?: number }) {
  return (
    <View style={styles.skeletonStack} aria-hidden>
      {Array.from({ length: count }, (_, index) => (
        <Skeleton key={index} height={160} radius={radius.lg} />
      ))}
    </View>
  );
}

export function SkeletonList({ rows = 6 }: { rows?: number }) {
  return (
    <View style={styles.skeletonStack} aria-hidden>
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} height={48} radius={radius.md} />
      ))}
    </View>
  );
}

const styles = {
  state: {
    padding: 16,
    borderRadius: radius.lg,
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surfaceMuted,
  } satisfies ViewStyle,
  stateLabel: {
    color: colors.textMuted,
    textAlign: 'center',
  } satisfies TextStyle,
  stateMessage: {
    color: colors.text,
    textAlign: 'center',
  } satisfies TextStyle,
  retryButton: {
    marginTop: 4,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.sm,
    backgroundColor: colors.primary,
  } satisfies ViewStyle,
  retryButtonText: {
    color: colors.white,
    fontWeight: '700',
  } satisfies TextStyle,
  pageHeader: {
    paddingTop: 2,
    paddingBottom: 2,
    gap: 8,
  } satisfies ViewStyle,
  pageHeaderHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  } satisfies ViewStyle,
  pageHeaderText: {
    flex: 1,
    minWidth: 0,
  } satisfies ViewStyle,
  pageHeaderTitle: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
    letterSpacing: -0.4,
    color: colors.text,
  } satisfies TextStyle,
  pageHeaderSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
    marginTop: 2,
  } satisfies TextStyle,
  pageHeaderActions: {
    marginTop: 2,
  } satisfies ViewStyle,
  statCard: {
    borderRadius: radius.md,
    padding: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 140,
    gap: 4,
  } satisfies ViewStyle,
  statCardPressed: {
    opacity: 0.82,
  } satisfies ViewStyle,
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  } satisfies ViewStyle,
  statGridCell: {
    flexGrow: 1,
    flexBasis: '47%',
    minWidth: 0,
  } satisfies ViewStyle,
  statGridChild: {
    minWidth: 0,
  } satisfies ViewStyle,
  statCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  } satisfies ViewStyle,
  statCardLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    minWidth: 0,
  } satisfies ViewStyle,
  statDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  } satisfies ViewStyle,
  statCardLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.textMuted,
    flexShrink: 1,
  } satisfies TextStyle,
  statCardValue: {
    fontSize: 23,
    lineHeight: 29,
    fontWeight: '800',
    letterSpacing: -0.3,
    color: colors.text,
    marginTop: 2,
  } satisfies TextStyle,
  statCardHint: {
    fontSize: 12,
    color: colors.textMuted,
  } satisfies TextStyle,
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  } satisfies ViewStyle,
  skeletonStack: {
    gap: 12,
  } satisfies ViewStyle,
} as const;
