import { Pressable, Text, View } from 'react-native';

import { Layout } from '../../components/Layout';
import {
  GlassCard,
  GlowPill,
} from '../../components/glass';
import { Icon } from '../../components/Icon';
import { useAuth } from '../../lib/auth';
import { useSettings } from '../../lib/settings';
import { ROLE_LABELS, type Role } from '@smartschool/shared';
import { colors, radius } from '../../theme';

/**
 * Unified account settings for every role: profile details plus sign-out.
 * Rendered inside the shared glass `Layout`, so the header, bell and avatar
 * are consistent with the rest of the app.
 */
export function AccountSettingsScreen() {
  const { user, logout } = useAuth();
  const { settings } = useSettings();

  if (!user) return null;

  const signOut = () => void logout();
  const roleLabel = ROLE_LABELS[user.role as Role] ?? user.role;

  return (
    <Layout heading="Settings">
      <GlowPill color="primary" style={styles.pill}>
        <Text style={styles.pillText}>Account</Text>
      </GlowPill>

      <GlassCard strong style={styles.profileCard}>
        <View style={styles.identity}>
          <View style={styles.avatar}>
            <Icon name="user" size={24} color={colors.primary} />
          </View>
          <View style={styles.identityText}>
            <Text style={styles.name}>{`${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email}</Text>
            <Text style={styles.email}>{user.email}</Text>
            <Text style={styles.role}>{roleLabel}</Text>
          </View>
        </View>
        <View style={styles.divider} />
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Role</Text>
            <Text style={styles.metaValue}>{roleLabel}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>School</Text>
            <Text style={styles.metaValue}>{settings?.name ?? user.schoolId ?? '—'}</Text>
          </View>
        </View>
      </GlassCard>

      <GlassCard strong style={styles.actionsCard}>
        <View style={styles.actionsHeader}>
          <Text style={styles.actionsTitle}>Account</Text>
        </View>
        <Pressable
          style={styles.signOut}
          onPress={signOut}
          accessibilityLabel="Logout"
          hitSlop={8}
        >
          <Icon name="logout" size={18} color={colors.danger} />
          <Text style={styles.signOutText}>Logout</Text>
        </Pressable>
      </GlassCard>
    </Layout>
  );
}

const styles = {
  pill: {
    alignSelf: 'flex-start',
    marginBottom: 14,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: colors.primary,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
  },
  profileCard: {
    padding: 20,
    borderColor: colors.borderStrong,
  },
  identity: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 14,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primarySoft,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.35)',
  },
  identityText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  name: {
    fontSize: 19,
    fontWeight: '800' as const,
    color: colors.text,
    letterSpacing: -0.4,
  },
  email: {
    fontSize: 13.5,
    color: colors.textMuted,
  },
  role: {
    fontSize: 12.5,
    fontWeight: '700' as const,
    color: colors.accent,
    marginTop: 2,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.6,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 14,
  },
  metaRow: {
    flexDirection: 'row' as const,
    gap: 12,
  },
  metaItem: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  metaLabel: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: colors.textMuted,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.6,
  },
  metaValue: {
    fontSize: 13.5,
    color: colors.text,
    flexShrink: 1,
  },
  actionsCard: {
    padding: 0,
    borderColor: colors.borderStrong,
  },
  actionsHeader: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  actionsTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: colors.text,
    letterSpacing: -0.3,
  },
  signOut: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    backgroundColor: 'rgba(239, 68, 68, 0.06)',
  },
  signOutText: {
    color: colors.danger,
    fontWeight: '700' as const,
    fontSize: 15,
  },
} as const;
