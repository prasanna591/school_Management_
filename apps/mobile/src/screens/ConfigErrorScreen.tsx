import { ScrollView, Text, View } from 'react-native';

import { Icon } from '../components/Icon';
import { colors, radius, shadow } from '../theme';

/**
 * Shown instead of the app when `EXPO_PUBLIC_API_BASE` is missing or not an
 * absolute URL. Without it every request would target the Metro bundle origin
 * and fail with a misleading "cannot reach the server" message, so the app
 * explains the real problem and how to fix it.
 */
export function ConfigErrorScreen({ rawValue }: { rawValue?: string }) {
  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.badge}>
          <Icon name="alert" size={28} color={colors.danger} />
        </View>
        <Text style={styles.title}>Server not configured</Text>
        <Text style={styles.body}>
          This build does not know where the SmartSchool API lives, so it cannot sign in.
        </Text>

        <View style={[styles.card, shadow]}>
          <Text style={styles.cardLabel}>Fix it in the build environment</Text>
          <Text style={styles.code}>EXPO_PUBLIC_API_BASE=http://YOUR-PC-IP:4000/api/v1</Text>
          <Text style={styles.hint}>
            Use the computer&apos;s LAN address, not localhost. The address must be absolute
            (start with http:// or https://) and include the API path. Rebuild or restart the
            app after changing it.
          </Text>
          {rawValue ? <Text style={styles.raw}>Current value: {rawValue}</Text> : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = {
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center' as const,
    padding: 24,
    gap: 12,
  },
  badge: {
    alignSelf: 'center' as const,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.dangerSoft,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '800' as const,
    color: colors.text,
    textAlign: 'center' as const,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
    textAlign: 'center' as const,
    marginBottom: 8,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    gap: 10,
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: colors.text,
  },
  code: {
    fontFamily: 'monospace',
    fontSize: 13,
    color: colors.primaryDark,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.sm,
    padding: 10,
  },
  hint: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textMuted,
  },
  raw: {
    fontSize: 12,
    color: colors.danger,
  },
};
