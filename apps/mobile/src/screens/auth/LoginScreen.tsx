import { useState, useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlassCard, GlassInput, GlassButton } from '../../components/glass';
import { Icon } from '../../components/Icon';
import { type LoginPortal } from '../../lib/api';
import { ApiError } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { colors, radius, shadowStrong, gradients } from '../../theme';

const PORTALS: { value: LoginPortal; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'teacher', label: 'Teacher' },
  { value: 'parent', label: 'Parent' },
];

const PORTAL_HEADLINES: Record<LoginPortal, string> = {
  admin: 'Run your entire school from one place.',
  teacher: 'Your classes, attendance and homework in one app.',
  parent: 'Follow your child’s schooling in real time.',
};

export function LoginScreen({ portal = 'admin' }: { portal?: LoginPortal }) {
  const [selected, setSelected] = useState<LoginPortal>(portal);
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion() ?? false;

  /* Slow-moving blurred background blobs behind the glass card. */
  const blobOne = useSharedValue(0);
  const blobTwo = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion) {
      blobOne.value = 0;
      blobTwo.value = 0;
      return;
    }
    blobOne.value = withRepeat(
      withTiming(1, { duration: 9000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    blobTwo.value = withRepeat(
      withTiming(1, { duration: 11000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    return () => {
      cancelAnimation(blobOne);
      cancelAnimation(blobTwo);
    };
  }, [reduceMotion, blobOne, blobTwo]);

  const blobOneStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: 24 * blobOne.value - 12 },
      { translateY: -18 * blobOne.value + 8 },
      { scale: 1 + 0.1 * blobOne.value },
    ],
  }));
  const blobTwoStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: -20 * blobTwo.value + 10 },
      { translateY: 22 * blobTwo.value - 10 },
      { scale: 1.05 - 0.08 * blobTwo.value },
    ],
  }));

  return (
    <LinearGradient
      colors={gradients.canvas}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.screen}
    >
      <View
        style={[
          styles.container,
          {
            paddingTop: 16 + insets.top,
            paddingBottom: 32 + insets.bottom,
            paddingLeft: 24 + insets.left,
            paddingRight: 24 + insets.right,
          },
        ]}
      >
        <Animated.View style={[styles.blob, styles.blobOne, blobOneStyle]} pointerEvents="none" />
        <Animated.View style={[styles.blob, styles.blobTwo, blobTwoStyle]} pointerEvents="none" />
        <View style={styles.brandRow}>
          <View style={styles.brandMark}>
            <Icon name="shield" size={22} color={colors.white} />
          </View>
          <Text style={styles.brand}>PSM School Management</Text>
        </View>
        <Text style={styles.headline}>{PORTAL_HEADLINES[selected]}</Text>

        <GlassCard strong style={[styles.card, shadowStrong]}>
          <View style={styles.tabs}>
            {PORTALS.map((tab) => (
              <Pressable
                key={tab.value}
                onPress={() => {
                  setSelected(tab.value);
                }}
                style={[styles.tab, selected === tab.value ? styles.tabActive : null]}
                accessibilityLabel={`${tab.label} sign in`}
              >
                <Text style={selected === tab.value ? styles.tabTextActive : styles.tabText}>
                  {tab.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <LoginForm key={selected} portal={selected} />
        </GlassCard>
      </View>
    </LinearGradient>
  );
}

function LoginForm({ portal }: { portal: LoginPortal }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await login(email.trim(), password, portal);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to sign in. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.form} testID={`login-form-${portal}`}>
      <GlassInput
        label="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="you@school.edu"
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <GlassInput
        label="Password"
        value={password}
        onChangeText={setPassword}
        placeholder="••••••••"
        secureTextEntry={!showPassword}
        rightSlot={
          <Pressable
            onPress={() => setShowPassword((value) => !value)}
            hitSlop={8}
            accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
            style={styles.reveal}
          >
            <Icon name={showPassword ? 'eye-off' : 'eye'} size={18} color={colors.textMuted} />
          </Pressable>
        }
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <GlassButton
        label={submitting ? 'Signing in…' : 'Sign in'}
        onPress={onSubmit}
        variant="fill"
        disabled={submitting}
        style={styles.submit}
      />

      {process.env.EXPO_PUBLIC_DEMO_MODE === 'true' ? (
        <View style={{ marginTop: 14, gap: 10 }}>
          <Text style={styles.demoLabel}>Demo quick login</Text>
          <View style={styles.demoGrid}>
            {[
              { label: 'Principal', email: 'principal@demo.school' },
              { label: 'Teacher', email: 'teacher@demo.school' },
              { label: 'Accountant', email: 'accountant@demo.school' },
              { label: 'Parent', email: 'parent@demo.school' },
            ].map((demo) => (
              <GlassButton
                key={demo.label}
                label={demo.label}
                variant="ghost"
                onPress={async () => {
                  setEmail(demo.email);
                  setPassword('demo1234');
                  setError(null);
                  setSubmitting(true);
                  try {
                    await login(demo.email, 'demo1234', portal);
                  } catch (e) {
                    setError(e instanceof ApiError ? e.message : 'Login failed');
                  } finally {
                    setSubmitting(false);
                  }
                }}
                style={styles.demoButton}
              />
            ))}
          </View>
        </View>
      ) : null}

      <SiteLink />
    </View>
  );
}

function SiteLink() {
  const navigation = useNavigation<{ navigate: (route: string, params?: object) => void }>();
  return (
    <Pressable
      onPress={() => navigation.navigate('public')}
      accessibilityLabel="Browse the public site"
      style={styles.siteLinkRow}
    >
      <Text style={styles.siteLinkText}>Explore PSM School Management</Text>
    </Pressable>
  );
}

const styles = {
  screen: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    gap: 14,
  },
  blob: {
    position: 'absolute' as const,
    borderRadius: 999,
    pointerEvents: 'none' as const,
  },
  blobOne: {
    width: 300,
    height: 300,
    top: -90,
    right: -90,
    backgroundColor: 'rgba(139, 92, 246, 0.18)',
  },
  blobTwo: {
    width: 260,
    height: 260,
    bottom: -70,
    left: -70,
    backgroundColor: 'rgba(34, 211, 238, 0.14)',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  brandMark: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  brand: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.white,
    letterSpacing: -0.5,
  },
  headline: {
    fontSize: 14.5,
    color: 'rgba(255,255,255,0.85)',
    alignSelf: 'center',
    textAlign: 'center',
    marginTop: 2,
  },
  card: {
    marginTop: 8,
    borderRadius: radius.xl,
    padding: 22,
    gap: 16,
    borderColor: colors.glassBorderStrong,
  },
  tabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.glassSurface,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabText: {
    color: colors.textMuted,
    fontWeight: '600' as const,
    fontSize: 13,
  },
  tabTextActive: {
    color: colors.white,
    fontWeight: '800' as const,
    fontSize: 13,
  },
  form: {
    gap: 12,
  },
  reveal: {
    padding: 6,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
  },
  submit: {
    marginTop: 4,
    minHeight: 52,
  },
  siteLinkRow: {
    marginTop: 10,
    alignSelf: 'center',
  },
  siteLinkText: {
    color: colors.primary,
    fontWeight: '700' as const,
    textDecorationLine: 'underline',
    fontSize: 13.5,
  },
  demoLabel: {
    fontSize: 11.5,
    fontWeight: '700' as const,
    color: colors.textMuted,
    textAlign: 'center',
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
  },
  demoGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 8,
  },
  demoButton: {
    flex: 1,
    minWidth: '45%',
    minHeight: 44,
  },
} as const;
