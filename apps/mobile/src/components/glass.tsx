/**
 * Premium glass-morphism primitives for the SmartSchool mobile app.
 *
 * React Native has no native backdrop-filter, so glass is simulated with
 * semi-transparent surfaces, hairline white borders, soft shadows and
 * LinearGradient washes. All touch targets stay >= 44px.
 */

import { useEffect, type ReactNode } from 'react';
import {
  Pressable,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useReducedMotion,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import { Icon, type IconName } from './Icon';
import {
  colors,
  glow,
  gradients,
  radius,
  shadow,
  shadowStrong,
} from '../theme';

/** Frosted-glass container. Renders over any background and reads as a pane. */
export function GlassCard({
  children,
  style,
  strong = false,
  borderColor,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Stronger opacity for hero / elevated panes. */
  strong?: boolean;
  borderColor?: string;
}) {
  return (
    <View
      style={[
        styles.card,
        strong ? styles.cardStrong : null,
        borderColor ? { borderColor } : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}

/** Hero banner: glass card with a gradient edge wash. */
export function GlassHero({
  children,
  gradient = gradients.primary,
  style,
}: {
  children: ReactNode;
  gradient?: readonly [string, string, ...string[]];
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <LinearGradient
      colors={gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.hero, style]}
    >
      <View style={styles.heroInner}>{children}</View>
    </LinearGradient>
  );
}

/** Glowing accent pill for stats and callouts. */
export function GlowPill({
  children,
  color = 'primary',
  style,
}: {
  children: ReactNode;
  color?: 'primary' | 'accent';
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.glowPill, color === 'accent' ? styles.glowPillAccent : null, style]}>
      {children}
    </View>
  );
}

/** Glass button with subtle press feedback. */
export function GlassButton({
  label,
  icon,
  onPress,
  variant = 'glass',
  disabled,
  style,
  children,
}: {
  label: string;
  icon?: IconName;
  onPress: () => void;
  variant?: 'glass' | 'fill' | 'ghost';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
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
        variant === 'glass' ? styles.buttonGlass : null,
        variant === 'fill' ? styles.buttonFill : null,
        variant === 'ghost' ? styles.buttonGhost : null,
        pressed ? styles.buttonPressed : null,
        disabled ? styles.buttonDisabled : null,
        style,
      ]}
    >
      {icon ? (
        <View style={styles.buttonIcon}>
          <Icon name={icon} size={16} color={colors.white} />
        </View>
      ) : null}
      <Text style={styles.buttonLabel}>{label}</Text>
      {children ? <Text style={styles.buttonSub}>{children}</Text> : null}
    </Pressable>
  );
}

/** Glass text input with hairline border. */
export function GlassInput({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  rightSlot,
  keyboardType,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  rightSlot?: ReactNode;
  keyboardType?: 'email-address';
  autoCapitalize?: 'none' | 'sentences';
}) {
  return (
    <View style={styles.inputField}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={[styles.inputRow, secureTextEntry ? styles.inputRowRight : null]}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textFaint}
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          autoCapitalize={autoCapitalize}
        />
        {rightSlot}
      </View>
    </View>
  );
}

/** Titled glass panel — container for every section. */
export function GlassPanel({
  title,
  subtitle,
  icon,
  action,
  children,
}: {
  title?: string;
  subtitle?: string;
  icon?: IconName;
  action?: ReactNode;
  children: ReactNode;
}) {
  if (!title) {
    return <GlassCard strong>{children}</GlassCard>;
  }
  return (
    <GlassCard strong>
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

/** Premium stat card: glass surface + glow accent + large value. */
export function GlassStatCard({
  label,
  value,
  hint,
  icon,
  tone = 'primary',
  onPress,
  style,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: IconName;
  tone?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const toneGlow = tone === 'primary' ? glow.primary : glow.accent;
  const content = (
    <>
      <View style={styles.statTop}>
        <View style={styles.statLabelRow}>
          <Text style={styles.statLabel}>{label}</Text>
          {icon ? (
            <View style={[styles.statIcon, { backgroundColor: 'rgba(255,255,255,0.08)' }]}>
              <Icon name={icon} size={16} color={colors.white} />
            </View>
          ) : null}
        </View>
      </View>
      <Text style={styles.statValue}>{value}</Text>
      {hint ? <Text style={styles.statHint}>{hint}</Text> : null}
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
          pressed ? styles.statCardPressed : null,
          toneGlow,
          style,
        ]}
      >
        {content}
      </Pressable>
    );
  }
  return <GlassCard strong style={[styles.statCard, toneGlow, style]}>{content}</GlassCard>;
}

/** Decorative ambient glow blob for hero backgrounds. */
export function AmbientGlow({
  x,
  y,
  size,
  color = 'primary',
  opacity = 0.25,
}: {
  x: number;
  y: number;
  size: number;
  color?: 'primary' | 'accent';
  opacity?: number;
}) {
  const glowColor = color === 'primary' ? colors.primaryGlow : colors.accentGlow;
  return (
    <View
      style={[
        styles.blob,
        {
          width: size,
          height: size,
          top: y - size / 2,
          left: x - size / 2,
          backgroundColor: glowColor.replace(/[\d.]+\)$/, `${opacity})`),
        },
      ]}
      pointerEvents="none"
    />
  );
}

/** Pressable with premium micro-interaction: scale down + opacity on press. */
export function GlassPressable({
  children,
  onPress,
  disabled,
  activeOpacity = 0.75,
  scale = 0.96,
  style,
}: {
  children: ReactNode;
  onPress: () => void;
  disabled?: boolean;
  activeOpacity?: number;
  scale?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const reduceMotion = useReducedMotion() ?? false;
  const scaleValue = withSpring(scale, { damping: 20, stiffness: 300 });

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityState={{ disabled: Boolean(disabled) }}
      style={({ pressed: isPressed }) => [
        styles.touchable,
        style,
        !reduceMotion && isPressed
          ? {
              transform: [{ scale: scaleValue }],
              opacity: activeOpacity,
            }
          : null,
      ]}
    >
      <Animated.View style={styles.pressWrapper}>{children}</Animated.View>
    </Pressable>
  );
}

/** Animated shimmer skeleton — premium replacement for static gray placeholders. */
export function ShimmerSkeleton({
  width = 200,
  height = 14,
  radius: r = 8,
  duration = 1200,
}: {
  width?: number;
  height?: number;
  radius?: number;
  duration?: number;
}) {
  const reduceMotion = useReducedMotion() ?? false;
  const anim = useSharedValue(reduceMotion ? 1 : 0);
  useEffect(() => {
    if (reduceMotion) return;
    anim.value = withTiming(1, { duration });
    return () => {
      anim.value = 0;
    };
  }, [reduceMotion, duration, anim]);

  const style = useAnimatedStyle(() => ({
    backgroundColor: `rgba(255, 255, 255, ${0.06 + 0.04 * Math.sin(anim.value * Math.PI * 2)})`,
  }));

  return (
    <Animated.View
      style={[
        styles.skeleton,
        { width, height, borderRadius: r },
        style,
      ]}
    />
  );
}

const styles = {  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.glassSurface,
    ...shadow,
  } satisfies ViewStyle,
  cardStrong: {
    backgroundColor: colors.glassSurfaceStrong,
    borderColor: colors.glassBorderStrong,
    ...shadowStrong,
  } satisfies ViewStyle,
  hero: {
    borderRadius: radius.xl,
    padding: 22,
    ...shadowStrong,
  } satisfies ViewStyle,
  heroInner: {
    flex: 1,
  } satisfies ViewStyle,
  glowPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.35)',
    ...glow.primary,
  } satisfies ViewStyle,
  glowPillAccent: {
    backgroundColor: colors.accentSoft,
    borderColor: 'rgba(34, 211, 238, 0.35)',
    ...glow.accent,
  } satisfies ViewStyle,
  button: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: 18,
  } satisfies ViewStyle,
  buttonGlass: {
    backgroundColor: colors.glassSurface,
    borderColor: colors.glassBorder,
  } satisfies ViewStyle,
  buttonFill: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    ...glow.primary,
  } satisfies ViewStyle,
  buttonGhost: {
    backgroundColor: 'transparent',
    borderColor: colors.glassBorder,
  } satisfies ViewStyle,
  buttonPressed: {
    opacity: 0.75,
  } satisfies ViewStyle,
  buttonDisabled: {
    opacity: 0.45,
    borderColor: 'rgba(255,255,255,0.06)',
  } satisfies ViewStyle,
  buttonIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  } satisfies ViewStyle,
  buttonLabel: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: colors.white,
    letterSpacing: -0.2,
  } satisfies TextStyle,
  buttonSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  } satisfies TextStyle,
  inputField: {
    gap: 8,
  } satisfies ViewStyle,
  inputLabel: {
    fontSize: 12.5,
    fontWeight: '700' as const,
    color: colors.textMuted,
    letterSpacing: 0.4,
  } satisfies TextStyle,
  inputRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: radius.md,
    backgroundColor: colors.glassSurface,
    paddingHorizontal: 14,
    paddingVertical: 14,
    ...shadow,
  } satisfies ViewStyle,
  inputRowRight: {
    paddingRight: 4,
  } satisfies ViewStyle,
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
  } satisfies TextStyle,
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
    backgroundColor: 'rgba(34, 211, 238, 0.15)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.3)',
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
  statCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.glassSurface,
    padding: 18,
    gap: 6,
    minWidth: 140,
    ...shadow,
  } satisfies ViewStyle,
  statCardPressed: {
    opacity: 0.85,
  } satisfies ViewStyle,
  statTop: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  } satisfies ViewStyle,
  statLabelRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    flex: 1,
    minWidth: 0,
  } satisfies ViewStyle,
  statLabel: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: colors.textMuted,
    letterSpacing: 0.4,
    flexShrink: 1,
  } satisfies TextStyle,
  statIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  } satisfies ViewStyle,
  statValue: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '800' as const,
    letterSpacing: -0.5,
    color: colors.text,
    marginTop: 2,
  } satisfies TextStyle,
  statHint: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 1,
  } satisfies TextStyle,
  blob: {
    position: 'absolute' as const,
    borderRadius: 999,
    pointerEvents: 'none' as const,
  } satisfies ViewStyle,
  touchable: {
    minHeight: 44,
    justifyContent: 'center' as const,
  } satisfies ViewStyle,
  pressWrapper: {
    flex: 1,
  } satisfies ViewStyle,
  skeleton: {
    borderRadius: 8,
    overflow: 'hidden' as const,
  } satisfies ViewStyle,
} as const;
