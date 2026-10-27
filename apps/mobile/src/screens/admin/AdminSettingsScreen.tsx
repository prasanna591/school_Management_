import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { EmptyState, Spinner, StatCard, formatStatValue } from '../../components/ui';
import { api } from '../../lib/api';
import { can } from '../../lib/permissions';
import { useAuth } from '../../lib/auth';
import { useSettings, type SchoolSettings } from '../../lib/settings';
import { Permission } from '@smartschool/shared';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TIMEZONES = ['Asia/Kolkata', 'UTC', 'UTC+03:00', 'UTC-05:00', 'UTC+05:30', 'UTC+08:00'];
const CURRENCIES = ['INR', 'USD', 'EUR', 'KES', 'NGN', 'TZS', 'UGX', 'GHS', 'ZAR'];

interface Draft {
  name: string;
  email: string;
  phone: string;
  address: string;
  timezone: string;
  currency: string;
}

/**
 * School settings. Readable by every school-scoped role; editable only with
 * `school:update`, mirroring the backend's authorisation.
 */
export function SettingsScreen() {
  const { user } = useAuth();
  const { settings, loading, error, reload, applySettings } = useSettings();
  const editable = Boolean(user && can(user.role, Permission.SCHOOL_UPDATE));
  const insets = useSafeAreaInsets();

  if (!settings) {
    if (loading) return <Spinner label="Loading school settings…" />;
    if (error) return <EmptyState message={error} icon="alert" />;
    return <EmptyState message="No school is linked to your account." icon="class" />;
  }

  return (
    <View style={{ flex: 1, paddingTop: insets.top }}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <SettingsForm
          key={settings.id}
          settings={settings}
          editable={editable}
          reload={reload}
          apply={applySettings}
        />
      </ScrollView>
    </View>
  );
}

function SettingsForm({
  settings,
  editable,
  reload,
  apply,
}: {
  settings: SchoolSettings;
  editable: boolean;
  reload: () => void;
  apply: (settings: SchoolSettings) => void;
}) {
  const [draft, setDraft] = useState<Draft>(() => ({
    name: settings.name,
    email: settings.email ?? '',
    phone: settings.phone ?? '',
    address: settings.address ?? '',
    timezone: settings.timezone,
    currency: settings.currency,
  }));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error' | null; text: string | null }>({
    tone: null,
    text: null,
  });

  // Re-sync the draft whenever the stored settings change underneath us.
  useEffect(() => {
    setDraft({
      name: settings.name,
      email: settings.email ?? '',
      phone: settings.phone ?? '',
      address: settings.address ?? '',
      timezone: settings.timezone,
      currency: settings.currency,
    });
  }, [settings]);

  const set = (patch: Partial<Draft>) => setDraft((current) => ({ ...current, ...patch }));

  const save = async () => {
    setSaving(true);
    setMessage({ tone: null, text: null });
    try {
      const updated = await api.patch<SchoolSettings>(`/schools/${settings.id}`, {
        name: draft.name.trim(),
        email: draft.email.trim() || null,
        phone: draft.phone.trim() || null,
        address: draft.address.trim() || null,
        timezone: draft.timezone,
        currency: draft.currency,
      });
      apply(updated);
      setMessage({ tone: 'ok', text: 'Settings saved.' });
    } catch (err) {
      setMessage({
        tone: 'error',
        text: err instanceof Error ? err.message : 'Unable to save settings.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Header title="Settings" subtitle={[settings.code, `School ID ${settings.id}`].join(' · ')} />

      <View style={styles.card}>
        <Text style={styles.cardTitle}>School details</Text>
        <Field
          label="Name"
          value={draft.name}
          onChange={(value) => set({ name: value })}
          editable={editable}
        />
        <Field
          label="Email"
          value={draft.email}
          onChange={(value) => set({ email: value })}
          editable={editable}
        />
        <Field
          label="Phone"
          value={draft.phone}
          onChange={(value) => set({ phone: value })}
          editable={editable}
        />
        <Field
          label="Address"
          value={draft.address}
          onChange={(value) => set({ address: value })}
          editable={editable}
          multiline
        />

        {editable ? (
          <>
            <Text style={styles.fieldLabel}>Timezone</Text>
            <View style={styles.chips}>
              {TIMEZONES.map((zone) => (
                <Chip
                  key={zone}
                  label={zone}
                  active={draft.timezone === zone}
                  onPress={() => set({ timezone: zone })}
                />
              ))}
            </View>
            <Text style={styles.fieldLabel}>Currency</Text>
            <View style={styles.chips}>
              {CURRENCIES.map((code) => (
                <Chip
                  key={code}
                  label={code}
                  active={draft.currency === code}
                  onPress={() => set({ currency: code })}
                />
              ))}
            </View>
          </>
        ) : (
          <Text style={styles.muted}>
            Timezone {draft.timezone} · Currency {draft.currency}
          </Text>
        )}

        {message.text ? (
          <Text style={message.tone === 'ok' ? styles.ok : styles.error}>{message.text}</Text>
        ) : null}

        {editable ? (
          <View style={styles.actions}>
            <Pressable style={styles.primary} onPress={() => void save()} disabled={saving}>
              <Text style={styles.primaryText}>{saving ? 'Saving…' : 'Save changes'}</Text>
            </Pressable>
            <Pressable style={styles.ghost} onPress={reload}>
              <Text style={styles.ghostText}>Reload</Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      <StatCard label="Updated" value={formatStatValue(settings.updatedAt)} hint="School record" />
    </>
  );
}

function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View>
      <Text style={styles.headerTitle}>{title}</Text>
      {subtitle ? <Text style={styles.headerSubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

function Field({
  label,
  value,
  onChange,
  editable,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  editable: boolean;
  multiline?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.input, editable ? null : styles.inputReadonly]}
        value={value}
        onChangeText={onChange}
        editable={editable}
        multiline={multiline}
      />
    </View>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active ? styles.chipActive : null]}>
      <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>{label}</Text>
    </Pressable>
  );
}

const styles = {
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#475569',
    marginTop: 2,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    padding: 12,
    gap: 10,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  field: {
    gap: 4,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    textTransform: 'uppercase',
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#0f172a',
    backgroundColor: '#ffffff',
  },
  inputReadonly: {
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    color: '#334155',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  chipActive: {
    backgroundColor: '#1d4ed8',
    borderColor: '#1d4ed8',
  },
  chipText: {
    color: '#334155',
    fontSize: 13,
  },
  chipTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  primary: {
    backgroundColor: '#1d4ed8',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  primaryText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  ghost: {
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  ghostText: {
    color: '#334155',
    fontWeight: '600',
  },
  ok: {
    color: '#15803d',
    fontSize: 13,
  },
  error: {
    color: '#b91c1c',
    fontSize: 13,
  },
  muted: {
    color: '#64748b',
    fontSize: 13,
  },
} as const;
