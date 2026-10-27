import type { ReactNode } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Pressable, Text, View, type ViewStyle, type TextStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { Icon, type IconName } from '../Icon';
import { EmptyState } from '../ui';
import { GlassCard } from '../glass';
import { colors, radius, shadowStrong, teacherGradient } from '../../theme';

/**
 * The shared building blocks for the Teacher portal screens — premium glass
 * morphism edition. Deep navy hero with violet → navy gradient, frosted-glass
 * panels, hairline borders and soft glow.
 */

export function TeacherPage({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.page,
        {
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
      ]}
    >
      {children}
    </View>
  );
}

export type NoticeTone = 'info' | 'warning' | 'danger' | 'success';

const NOTICE_TONES: Record<NoticeTone, { bg: string; fg: string }> = {
  info: { bg: colors.infoSoft, fg: colors.info },
  warning: { bg: colors.warningSoft, fg: colors.warning },
  danger: { bg: colors.dangerSoft, fg: colors.danger },
  success: { bg: colors.successSoft, fg: colors.success },
};

export function TeacherNotice({
  tone = 'info',
  message,
  icon = 'info',
}: {
  tone?: NoticeTone;
  message: string;
  icon?: IconName;
}) {
  const palette = NOTICE_TONES[tone];
  return (
    <GlassCard strong style={[styles.notice, { backgroundColor: palette.bg }]}>
      <View style={styles.noticeInner}>
        <Icon name={icon} size={15} color={palette.fg} />
        <Text style={[styles.noticeText, { color: palette.fg }]}>{message}</Text>
      </View>
    </GlassCard>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

export function TeacherHero({
  title,
  subtitle,
  actions,
  statLabel,
  statValue,
  statHint,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  statLabel?: string;
  statValue?: string;
  statHint?: string;
}) {
  return (
    <LinearGradient
      colors={teacherGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.hero}
    >
      <View style={styles.heroIdentity}>
        <View style={styles.heroText}>
          <Text style={styles.heroTitle} numberOfLines={2}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.heroSubtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        {statLabel ? (
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeValue} numberOfLines={1}>
              {statValue ?? '—'}
            </Text>
            <Text style={styles.heroBadgeLabel} numberOfLines={1}>
              {statLabel}
            </Text>
            {statHint ? (
              <Text style={styles.heroBadgeHint} numberOfLines={1}>
                {statHint}
              </Text>
            ) : null}
          </View>
        ) : null}
      </View>

      {actions ? <View style={styles.heroActions}>{actions}</View> : null}
    </LinearGradient>
  );
}

export function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue} numberOfLines={2}>
        {value || '—'}
      </Text>
    </View>
  );
}

export type ChipTone = 'default' | 'info' | 'success' | 'warning' | 'danger' | 'navy';

const CHIP_TONES: Record<ChipTone, { bg: string; fg: string }> = {
  default: { bg: colors.surfaceMuted, fg: colors.textMuted },
  info: { bg: colors.infoSoft, fg: colors.info },
  success: { bg: colors.successSoft, fg: colors.success },
  warning: { bg: colors.warningSoft, fg: colors.warning },
  danger: { bg: colors.dangerSoft, fg: colors.danger },
  navy: { bg: 'rgba(30, 58, 138, 0.25)', fg: '#1e3a8a' },
};

export function Chip({ label, tone = 'default' }: { label: string; tone?: ChipTone }) {
  const palette = CHIP_TONES[tone];
  return (
    <View style={[styles.chip, { backgroundColor: palette.bg }]}>
      <Text style={[styles.chipLabel, { color: palette.fg }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

export interface QuickAction {
  key: string;
  label: string;
  description?: string;
  icon: IconName;
  onPress: () => void;
}

export function QuickActionGrid({ items }: { items: readonly QuickAction[] }) {
  if (items.length === 0) return null;
  return (
    <View style={styles.actionGrid}>
      {items.map((item) => (
        <Pressable
          key={item.key}
          onPress={item.onPress}
          accessibilityRole="button"
          accessibilityLabel={item.label}
          style={({ pressed }) => [styles.actionCard, pressed ? styles.actionCardPressed : null]}
        >
          <View style={styles.actionIcon}>
            <Icon name={item.icon} size={18} color={colors.primary} />
          </View>
          <View style={styles.actionBody}>
            <Text style={styles.actionLabel} numberOfLines={1}>
              {item.label}
            </Text>
            {item.description ? (
              <Text style={styles.actionDesc} numberOfLines={2}>
                {item.description}
              </Text>
            ) : null}
          </View>
        </Pressable>
      ))}
    </View>
  );
}

export function TeacherButton({
  label,
  icon,
  onPress,
  variant = 'primary',
  disabled,
}: {
  label: string;
  icon?: IconName;
  onPress: () => void;
  variant?: 'primary' | 'ghost' | 'navy';
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(disabled) }}
      style={({ pressed }) => [
        styles.button,
        variant === 'primary' ? styles.buttonPrimary : null,
        variant === 'ghost' ? styles.buttonGhost : null,
        variant === 'navy' ? styles.buttonNavy : null,
        pressed ? styles.buttonPressed : null,
        disabled ? styles.buttonDisabled : null,
      ]}
    >
      {icon ? (
        <Icon
          name={icon}
          size={16}
          color={variant === 'primary' || variant === 'navy' ? colors.white : colors.text}
        />
      ) : null}
      <Text
        style={[
          styles.buttonLabel,
          variant === 'primary' || variant === 'navy' ? styles.buttonLabelOnFill : null,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function TeacherEmpty({
  message,
  hint,
  icon = 'inbox',
  art,
}: {
  message: string;
  hint?: string;
  icon?: IconName;
  art?: ReactNode;
}) {
  return (
    <View style={styles.empty}>
      {art}
      <EmptyState message={message} icon={icon} />
      {hint ? <Text style={styles.emptyHint}>{hint}</Text> : null}
    </View>
  );
}

/** Titled glass panel for teacher sections. */
export function TeacherPanel({
  title,
  subtitle,
  icon,
  action,
  accent,
  children,
}: {
  title?: string;
  subtitle?: string;
  icon?: IconName;
  action?: ReactNode;
  accent?: 'navy' | 'violet';
  children: ReactNode;
}) {
  if (!title) {
    return <GlassCard strong>{children}</GlassCard>;
  }
  return (
    <GlassCard strong style={[styles.panel, accent ? PANEL_ACCENTS[accent] : null]}>
      <View style={styles.panelHeader}>
        <View style={styles.panelHeading}>
          {icon ? (
            <View style={styles.panelIcon}>
              <Icon name={icon} size={16} color={colors.accent} />
            </View>
          ) : null}
          <View style={styles.panelHeadingText}>
            <Text style={styles.panelTitle}>{title}</Text>
            {subtitle ? <Text style={styles.panelSubtitle}>{subtitle}</Text> : null}
          </View>
        </View>
        {action ?? null}
      </View>
      <View style={styles.panelBody}>{children}</View>
    </GlassCard>
  );
}

const PANEL_ACCENTS = {
  navy: { borderTopWidth: 4, borderTopColor: '#1e3a8a' },
  violet: { borderTopWidth: 4, borderTopColor: '#8b5cf6' },
} as const;

const styles = {
  page: {
    flex: 1,
    gap: 16,
  },
  notice: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
    padding: 12,
    borderRadius: radius.md,
  } satisfies ViewStyle,
  noticeInner: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
  } satisfies ViewStyle,
  noticeText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: '600' as const,
  } satisfies TextStyle,
  sectionTitle: {
    fontSize: 11.5,
    fontWeight: '700' as const,
    letterSpacing: 0.6,
    textTransform: 'uppercase' as const,
    color: colors.textFaint,
    marginTop: 4,
  } satisfies TextStyle,
  hero: {
    borderRadius: radius.xl,
    padding: 20,
    gap: 14,
    ...shadowStrong,
  } satisfies ViewStyle,
  heroIdentity: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
  } satisfies ViewStyle,
  heroText: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  } satisfies ViewStyle,
  heroTitle: {
    fontSize: 21,
    lineHeight: 26,
    fontWeight: '800' as const,
    letterSpacing: -0.3,
    color: colors.onNavy,
  } satisfies TextStyle,
  heroSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.onNavyMuted,
  } satisfies TextStyle,
  heroActions: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 8,
  } satisfies ViewStyle,
  heroBadge: {
    alignItems: 'flex-end' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    maxWidth: 120,
  } satisfies ViewStyle,
  heroBadgeValue: {
    fontSize: 19,
    fontWeight: '800' as const,
    color: colors.white,
  } satisfies TextStyle,
  heroBadgeLabel: {
    fontSize: 10.5,
    fontWeight: '600' as const,
    color: colors.onNavyMuted,
  } satisfies TextStyle,
  heroBadgeHint: {
    fontSize: 9.5,
    color: colors.onNavyMuted,
  } satisfies TextStyle,
  detailRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-start' as const,
    gap: 12,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  } satisfies ViewStyle,
  detailLabel: {
    fontSize: 13.5,
    color: colors.textMuted,
    flexShrink: 0,
  } satisfies TextStyle,
  detailValue: {
    fontSize: 13.5,
    fontWeight: '600' as const,
    color: colors.text,
    flexShrink: 1,
    textAlign: 'right' as const,
  } satisfies TextStyle,
  chip: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radius.pill,
    alignSelf: 'flex-start' as const,
  } satisfies ViewStyle,
  chipLabel: {
    fontSize: 11.5,
    fontWeight: '700' as const,
  } satisfies TextStyle,
  actionGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 8,
  } satisfies ViewStyle,
  actionCard: {
    flexGrow: 1,
    flexBasis: '30%',
    alignItems: 'center' as const,
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 6,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    minHeight: 78,
  } satisfies ViewStyle,
  actionCardPressed: {
    backgroundColor: colors.primarySoft,
  } satisfies ViewStyle,
  actionIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  } satisfies ViewStyle,
  actionBody: {
    alignItems: 'center' as const,
    gap: 2,
    width: '100%',
  } satisfies ViewStyle,
  actionLabel: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: colors.text,
    textAlign: 'center' as const,
  } satisfies TextStyle,
  actionDesc: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center' as const,
  } satisfies TextStyle,
  button: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    minHeight: 42,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
  } satisfies ViewStyle,
  buttonPrimary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  } satisfies ViewStyle,
  buttonGhost: {
    backgroundColor: colors.surface,
    borderColor: colors.borderStrong,
  } satisfies ViewStyle,
  buttonNavy: {
    backgroundColor: colors.navySurface,
    borderColor: colors.navyBorder,
  } satisfies ViewStyle,
  buttonPressed: {
    opacity: 0.75,
  } satisfies ViewStyle,
  buttonDisabled: {
    opacity: 0.5,
  } satisfies ViewStyle,
  buttonLabel: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: colors.text,
  } satisfies TextStyle,
  buttonLabelOnFill: {
    color: colors.white,
  } satisfies TextStyle,
  empty: {
    alignItems: 'center' as const,
    gap: 6,
  } satisfies ViewStyle,
  emptyHint: {
    fontSize: 12.5,
    lineHeight: 18,
    color: colors.textMuted,
    textAlign: 'center' as const,
    paddingHorizontal: 8,
  } satisfies TextStyle,
  panel: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 18,
    gap: 14,
  } satisfies ViewStyle,
  panelHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    gap: 10,
    flexWrap: 'wrap' as const,
    marginBottom: 8,
  } satisfies ViewStyle,
  panelHeading: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
    flex: 1,
    minWidth: 0,
  } satisfies ViewStyle,
  panelIcon: {
    width: 30,
    height: 30,
    borderRadius: radius.md,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  } satisfies ViewStyle,
  panelHeadingText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  } satisfies ViewStyle,
  panelTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: colors.text,
    letterSpacing: -0.3,
  } satisfies TextStyle,
  panelSubtitle: {
    fontSize: 12.5,
    color: colors.textMuted,
    marginTop: 1,
  } satisfies TextStyle,
  panelBody: {
    gap: 8,
  } satisfies ViewStyle,
} as const;
