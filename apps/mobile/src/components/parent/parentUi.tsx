import type { ReactNode } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActivityIndicator, Image, Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { Icon, type IconName } from '../Icon';
import { colors, parentColors, parentGradient, parentShadowStrong, radius } from '../../theme';

/**
 * The shared building blocks for the Parent portal screens.
 *
 * They follow the navy blue + white design the web Parent portal applies
 * through `data-theme="parent"`: a deep-navy hero sliding into royal blue,
 * white rounded cards with soft blue accents, and a calm 16/24px rhythm.
 * Nothing here talks to the network — screens own their data.
 */

/* --------------------------------------------------------------------------
   Page + card chrome
   -------------------------------------------------------------------------- */

/** Vertical rhythm wrapper for a parent screen. */
export function ParentPage({ children }: { children: ReactNode }) {
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

/** Page title block — the parent palette's answer to the app-wide `PageHeader`. */
export function ParentHeader({
  title,
  subtitle,
  icon,
  action,
}: {
  title: string;
  subtitle?: string;
  icon?: IconName;
  action?: ReactNode;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.headerHeading}>
        {icon ? (
          <View style={styles.headerIcon}>
            <Icon name={icon} size={18} color={parentColors.accent} />
          </View>
        ) : null}
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>{title}</Text>
          {subtitle ? <Text style={styles.headerSubtitle}>{subtitle}</Text> : null}
        </View>
      </View>
      {action ?? null}
    </View>
  );
}

/** A titled, rounded card — the container for every parent section. */
export function ParentPanel({
  title,
  subtitle,
  icon,
  action,
  children,
}: {
  title?: string;
  subtitle?: string;
  icon?: IconName;
  /** Rendered on the right of the header (usually a small text button). */
  action?: ReactNode;
  children: ReactNode;
}) {
  if (!title) {
    return <View style={styles.panel}>{children}</View>;
  }
  return (
    <View style={styles.panel}>
      <View style={styles.panelHeader}>
        <View style={styles.panelHeading}>
          {icon ? (
            <View style={styles.panelIcon}>
              <Icon name={icon} size={16} color={parentColors.accent} />
            </View>
          ) : null}
          <View style={styles.panelHeadingText}>
            <Text style={styles.panelTitle}>{title}</Text>
            {subtitle ? <Text style={styles.panelSubtitle}>{subtitle}</Text> : null}
          </View>
        </View>
        {action ?? null}
      </View>
      {children}
    </View>
  );
}

/**
 * The hero banner: a navy → royal-blue gradient with the child's name, class
 * line, action chips and a highlighted figure (usually attendance).
 */
export function ParentHero({
  title,
  subtitle,
  avatarUrl,
  avatarFallback,
  onEditPhoto,
  editingPhoto,
  badge,
}: {
  title: string;
  subtitle?: string;
  /** The child photo data-URL, when one has been saved. */
  avatarUrl?: string | null;
  /** Initials shown in place of the photo. Setting this opts the avatar in. */
  avatarFallback?: string;
  /** Opens the photo picker; the avatar shows the camera badge only when set. */
  onEditPhoto?: () => void;
  /** While true the camera badge is replaced by a spinner. */
  editingPhoto?: boolean;
  /** One compact figure, usually today's attendance. */
  badge?: { label: string; value: string; tone?: ParentChipTone };
}) {
  const showAvatar = Boolean(avatarUrl || avatarFallback);
  return (
    <LinearGradient
      colors={parentGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.hero}
    >
      <View style={styles.heroIdentity}>
        {showAvatar ? (
          <View style={styles.heroAvatarWrap}>
            <View style={styles.heroAvatar}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatarImage} resizeMode="cover" />
              ) : (
                <Text style={styles.heroAvatarText}>{avatarFallback}</Text>
              )}
            </View>
            {onEditPhoto ? (
              <Pressable
                onPress={onEditPhoto}
                disabled={editingPhoto}
                accessibilityRole="button"
                accessibilityLabel="Change photo"
                accessibilityState={{ disabled: Boolean(editingPhoto) }}
                style={({ pressed }) => [
                  styles.avatarEdit,
                  pressed ? styles.avatarEditPressed : null,
                ]}
              >
                {editingPhoto ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Icon name="camera" size={14} color={colors.white} />
                )}
              </Pressable>
            ) : null}
          </View>
        ) : null}

        <View style={styles.heroIdentityBody}>
          <Text style={styles.heroTitle} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.heroSubtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        {badge ? (
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeValue}>{badge.value}</Text>
            <Text style={styles.heroBadgeLabel}>{badge.label}</Text>
          </View>
        ) : null}
      </View>
    </LinearGradient>
  );
}

/* --------------------------------------------------------------------------
   Notices, chips, rows, shortcuts
   -------------------------------------------------------------------------- */

export type ParentNoticeTone = 'info' | 'warning' | 'danger' | 'success';

const NOTICE_TONES: Record<ParentNoticeTone, { bg: string; fg: string }> = {
  info: { bg: parentColors.accentSoft, fg: parentColors.accent },
  warning: { bg: colors.warningSoft, fg: colors.warning },
  danger: { bg: colors.dangerSoft, fg: colors.danger },
  success: { bg: colors.successSoft, fg: colors.success },
};

/** Inline banner for partial states: a hint, a permission note, a success. */
export function ParentNotice({
  tone = 'info',
  message,
  icon = 'info',
}: {
  tone?: ParentNoticeTone;
  message: string;
  icon?: IconName;
}) {
  const palette = NOTICE_TONES[tone];
  return (
    <View style={[styles.notice, { backgroundColor: palette.bg }]}>
      <Icon name={icon} size={15} color={palette.fg} />
      <Text style={[styles.noticeText, { color: palette.fg }]}>{message}</Text>
    </View>
  );
}

export type ParentChipTone = 'default' | 'info' | 'success' | 'warning' | 'danger';

const CHIP_TONES: Record<ParentChipTone, { bg: string; fg: string }> = {
  default: { bg: colors.surfaceMuted, fg: colors.textMuted },
  info: { bg: parentColors.accentSoft, fg: parentColors.accent },
  success: { bg: colors.successSoft, fg: colors.success },
  warning: { bg: colors.warningSoft, fg: colors.warning },
  danger: { bg: colors.dangerSoft, fg: colors.danger },
};

/** Small pill used for subjects, grades, statuses and counts. */
export function ParentChip({ label, tone = 'default' }: { label: string; tone?: ParentChipTone }) {
  const palette = CHIP_TONES[tone];
  return (
    <View style={[styles.chip, { backgroundColor: palette.bg }]}>
      <Text style={[styles.chipLabel, { color: palette.fg }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/** A tappable chip, used as the child switcher across the portal. */
export function ParentSelectChip({
  label,
  active,
  onPress,
  photoUrl,
  initials,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  /** Child's saved photo, shown in a leading avatar. */
  photoUrl?: string | null;
  /** Initials shown when no photo exists (also opts the avatar in). */
  initials?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [
        styles.selectChip,
        active ? styles.selectChipActive : null,
        pressed ? styles.selectChipPressed : null,
      ]}
    >
      {initials !== undefined ? (
        <View style={[styles.selectChipAvatar, active ? styles.selectChipAvatarActive : null]}>
          {photoUrl ? (
            <Image
              source={{ uri: photoUrl }}
              style={styles.selectChipAvatarImage}
              resizeMode="cover"
            />
          ) : (
            <Text
              style={[
                styles.selectChipAvatarText,
                active ? styles.selectChipAvatarTextActive : null,
              ]}
            >
              {initials}
            </Text>
          )}
        </View>
      ) : null}
      <Text style={[styles.selectChipText, active ? styles.selectChipTextActive : null]}>
        {label}
      </Text>
    </Pressable>
  );
}

/** A compact key/value row used in the dashboard lists. */
export function ParentRow({
  title,
  meta,
  aside,
  onPress,
}: {
  title: string;
  meta?: string;
  aside?: ReactNode;
  onPress?: () => void;
}) {
  const content = (
    <>
      <View style={styles.rowMain}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {title}
        </Text>
        {meta ? (
          <Text style={styles.rowMeta} numberOfLines={2}>
            {meta}
          </Text>
        ) : null}
      </View>
      {aside ? <View style={styles.rowAside}>{aside}</View> : null}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={title}
        style={({ pressed }) => [styles.row, pressed ? styles.rowPressed : null]}
      >
        {content}
      </Pressable>
    );
  }
  return <View style={styles.row}>{content}</View>;
}

export interface ParentQuickAction {
  key: string;
  label: string;
  description?: string;
  icon: IconName;
  onPress: () => void;
}

/** Two-column grid of tappable shortcuts (the dashboard's "Quick links"). */
export function ParentQuickActions({ items }: { items: readonly ParentQuickAction[] }) {
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
            <Icon name={item.icon} size={18} color={parentColors.accent} />
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

/** A full-width primary/ghost button sized for a thumb. */
export function ParentButton({
  label,
  icon,
  onPress,
  variant = 'primary',
  disabled,
}: {
  label: string;
  icon?: IconName;
  onPress: () => void;
  variant?: 'primary' | 'ghost';
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
        variant === 'primary' ? styles.buttonPrimary : styles.buttonGhost,
        pressed ? styles.buttonPressed : null,
        disabled ? styles.buttonDisabled : null,
      ]}
    >
      {icon ? (
        <Icon name={icon} size={16} color={variant === 'primary' ? colors.white : colors.text} />
      ) : null}
      <Text style={[styles.buttonLabel, variant === 'primary' ? styles.buttonLabelOnFill : null]}>
        {label}
      </Text>
    </Pressable>
  );
}

/* --------------------------------------------------------------------------
   Empty / error states
   -------------------------------------------------------------------------- */

/** Blue-toned empty state with an optional next-step hint. */
export function ParentEmpty({
  message,
  hint,
  icon = 'inbox',
}: {
  message: string;
  hint?: string;
  icon?: IconName;
}) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Icon name={icon} size={22} color={parentColors.accent} />
      </View>
      <Text style={styles.emptyMessage}>{message}</Text>
      {hint ? <Text style={styles.emptyHint}>{hint}</Text> : null}
    </View>
  );
}

/** Error state with a retry affordance, in the parent palette. */
export function ParentError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, styles.emptyIconDanger]}>
        <Icon name="alert" size={22} color={colors.danger} />
      </View>
      <Text style={styles.emptyMessage}>{message}</Text>
      {onRetry ? <ParentButton label="Try again" icon="refresh" onPress={onRetry} /> : null}
    </View>
  );
}

/* --------------------------------------------------------------------------
   Styles
   -------------------------------------------------------------------------- */

const styles = {
  page: {
    flex: 1,
    gap: 16,
  },

  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    gap: 12,
    paddingTop: 2,
    paddingBottom: 2,
  },
  headerHeading: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  headerIcon: {
    width: 30,
    height: 30,
    borderRadius: radius.sm,
    backgroundColor: parentColors.accentSoft,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  headerTitle: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800' as const,
    letterSpacing: -0.4,
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
    marginTop: 2,
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
    alignItems: 'flex-start' as const,
    justifyContent: 'space-between' as const,
    gap: 10,
    flexWrap: 'wrap' as const,
  },
  panelHeading: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  panelIcon: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    backgroundColor: parentColors.accentSoft,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  panelHeadingText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  panelTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: colors.text,
  },
  panelSubtitle: {
    fontSize: 12.5,
    color: colors.textMuted,
  },

  hero: {
    borderRadius: radius.xl,
    padding: 18,
    ...parentShadowStrong,
  },
  heroIdentity: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 14,
    minWidth: 0,
  },
  heroIdentityBody: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  heroAvatarWrap: {
    position: 'relative' as const,
  },
  heroAvatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    overflow: 'hidden' as const,
  },
  heroAvatarText: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: colors.white,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarEdit: {
    position: 'absolute' as const,
    right: -2,
    bottom: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: colors.white,
    backgroundColor: parentColors.accent,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  avatarEditPressed: {
    opacity: 0.75,
  },
  heroTitle: {
    fontSize: 21,
    lineHeight: 26,
    fontWeight: '800' as const,
    letterSpacing: -0.3,
    color: colors.onNavy,
  },
  heroSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.onNavyMuted,
  },
  heroBadge: {
    alignItems: 'flex-end' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  heroBadgeValue: {
    fontSize: 19,
    fontWeight: '800' as const,
    color: colors.white,
  },
  heroBadgeLabel: {
    fontSize: 10.5,
    fontWeight: '600' as const,
    color: colors.onNavyMuted,
  },

  notice: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    gap: 8,
    padding: 12,
    borderRadius: radius.sm,
  },
  noticeText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: '600' as const,
  },

  chip: {
    alignSelf: 'flex-start' as const,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  chipLabel: {
    fontSize: 11.5,
    fontWeight: '700' as const,
  },

  selectChip: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  selectChipActive: {
    backgroundColor: parentColors.accent,
    borderColor: parentColors.accent,
  },
  selectChipPressed: {
    opacity: 0.8,
  },
  selectChipText: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '600' as const,
  },
  selectChipTextActive: {
    color: colors.white,
  },
  selectChipAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: parentColors.accentSoft,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    overflow: 'hidden' as const,
  },
  selectChipAvatarActive: {
    backgroundColor: 'rgba(255,255,255,0.24)',
  },
  selectChipAvatarImage: {
    width: '100%',
    height: '100%',
  },
  selectChipAvatarText: {
    fontSize: 11,
    fontWeight: '800' as const,
    color: parentColors.accent,
  },
  selectChipAvatarTextActive: {
    color: colors.white,
  },

  row: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    gap: 12,
    paddingVertical: 9,
    borderRadius: radius.sm,
  },
  rowPressed: {
    backgroundColor: parentColors.accentSoft,
  },
  rowMain: {
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
  rowAside: {
    alignItems: 'flex-end' as const,
    gap: 4,
  },

  actionGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 8,
  },
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
  },
  actionCardPressed: {
    backgroundColor: parentColors.accentSoft,
  },
  actionIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    backgroundColor: parentColors.accentSoft,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  actionBody: {
    alignItems: 'center' as const,
    gap: 2,
    width: '100%',
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: colors.text,
    textAlign: 'center' as const,
  },
  actionDesc: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center' as const,
  },

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
  },
  buttonPrimary: {
    backgroundColor: parentColors.accent,
    borderColor: parentColors.accent,
  },
  buttonGhost: {
    backgroundColor: colors.surface,
    borderColor: colors.borderStrong,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonLabel: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: colors.text,
  },
  buttonLabelOnFill: {
    color: colors.white,
  },

  empty: {
    alignItems: 'center' as const,
    gap: 10,
    padding: 20,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceMuted,
  },
  emptyIcon: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: parentColors.accentSoft,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  emptyIconDanger: {
    backgroundColor: colors.dangerSoft,
  },
  emptyMessage: {
    fontSize: 13.5,
    color: colors.text,
    textAlign: 'center' as const,
  },
  emptyHint: {
    fontSize: 12.5,
    lineHeight: 17,
    color: colors.textMuted,
    textAlign: 'center' as const,
  },
} as const;
