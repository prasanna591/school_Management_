import { useState, type ReactNode } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '../../components/Icon';
import { type LoginPortal } from '../../lib/api';
import { ApiError } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { colors, radius, shadow } from '../../theme';

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
  // The stack header above this screen already covers the top inset; only the
  // bottom one (Android navigation bar) has to be added here.
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient colors={colors.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.screen}>
      <View style={[styles.container, { paddingBottom: 24 + insets.bottom }]}>
        <View style={styles.brandRow}>
          <View style={styles.brandMark}>
            <Icon name="shield" size={22} color={colors.white} />
          </View>
          <Text style={styles.brand}>SmartSchool</Text>
        </View>
        <Text style={styles.headline}>{PORTAL_HEADLINES[selected]}</Text>

        <View style={[styles.card, shadow]}>
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
        </View>
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
      setError(
        err instanceof ApiError ? err.message : 'Unable to sign in. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.form} testID={`login-form-${portal}`}>
      <TextField
        label="Email"
        value={email}
        onChange={setEmail}
        placeholder="you@school.edu"
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextField
        label="Password"
        value={password}
        onChange={setPassword}
        placeholder="••••••••"
        secureTextEntry={!showPassword}
        rightSlot={
          <Pressable
            onPress={() => setShowPassword((value) => !value)}
            hitSlop={8}
            accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
            style={styles.reveal}
          >
            <Icon name={showPassword ? 'eye-off' : 'eye'} size={18} />
          </Pressable>
        }
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable
        style={styles.submit}
        onPress={onSubmit}
        disabled={submitting}
        accessibilityRole="button"
        testID="login-submit"
      >
        <Text style={styles.submitText}>{submitting ? 'Signing in…' : 'Sign in'}</Text>
      </Pressable>

      {process.env.EXPO_PUBLIC_DEMO_MODE === 'true' ? (
        <View style={{ marginTop: 12, gap: 8 }}>
          <Text style={{ fontSize: 12, color: colors.textMuted, textAlign: 'center' }}>Demo Quick Login (demo1234)</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <Pressable style={[styles.submit, { flex: 1, minWidth: '45%' }]} onPress={async () => { setEmail('principal@demo.school'); setPassword('demo1234'); setError(null); setSubmitting(true); try { await login('principal@demo.school', 'demo1234', portal); } catch (e) { setError(e instanceof ApiError ? e.message : 'Login failed'); } finally { setSubmitting(false); } }}><Text style={styles.submitText}>Principal</Text></Pressable>
            <Pressable style={[styles.submit, { flex: 1, minWidth: '45%' }]} onPress={async () => { setEmail('teacher@demo.school'); setPassword('demo1234'); setError(null); setSubmitting(true); try { await login('teacher@demo.school', 'demo1234', portal); } catch (e) { setError(e instanceof ApiError ? e.message : 'Login failed'); } finally { setSubmitting(false); } }}><Text style={styles.submitText}>Teacher</Text></Pressable>
            <Pressable style={[styles.submit, { flex: 1, minWidth: '45%' }]} onPress={async () => { setEmail('accountant@demo.school'); setPassword('demo1234'); setError(null); setSubmitting(true); try { await login('accountant@demo.school', 'demo1234', portal); } catch (e) { setError(e instanceof ApiError ? e.message : 'Login failed'); } finally { setSubmitting(false); } }}><Text style={styles.submitText}>Accountant</Text></Pressable>
            <Pressable style={[styles.submit, { flex: 1, minWidth: '45%' }]} onPress={async () => { setEmail('parent@demo.school'); setPassword('demo1234'); setError(null); setSubmitting(true); try { await login('parent@demo.school', 'demo1234', portal); } catch (e) { setError(e instanceof ApiError ? e.message : 'Login failed'); } finally { setSubmitting(false); } }}><Text style={styles.submitText}>Parent</Text></Pressable>
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
      <Text style={styles.siteLinkText}>Explore SmartSchool</Text>
    </Pressable>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  keyboardType,
  secureTextEntry,
  autoCapitalize,
  rightSlot,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  keyboardType?: 'email-address';
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences';
  rightSlot?: ReactNode;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChange}
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

const styles = {
  screen: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    // The bottom padding is extended with the safe-area inset in the component.
    gap: 14,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  brandMark: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.white,
  },
  headline: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.92)',
    alignSelf: 'center',
    textAlign: 'center',
  },
  card: {
    marginTop: 6,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    padding: 18,
    gap: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabs: {
    flexDirection: 'row',
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabText: {
    color: colors.text,
    fontWeight: '600',
  },
  tabTextActive: {
    color: colors.white,
    fontWeight: '700',
  },
  form: {
    gap: 12,
  },
  field: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: colors.surfaceMuted,
    color: colors.text,
    borderRadius: radius.sm,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceMuted,
    paddingRight: 6,
  },
  reveal: {
    padding: 6,
  },
  error: {
    color: colors.danger,
    fontSize: 14,
  },
  submit: {
    marginTop: 4,
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingVertical: 14,
    alignItems: 'center',
    minHeight: 52,
  },
  submitText: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 16,
  },
  siteLinkRow: {
    marginTop: 8,
    alignSelf: 'center',
  },
  siteLinkText: {
    color: colors.primary,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
} as const;
