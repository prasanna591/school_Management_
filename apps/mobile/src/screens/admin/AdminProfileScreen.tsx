import { Pressable, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ROLE_LABELS, type Role } from '@smartschool/shared';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '../../components/Icon';
import { useAuth } from '../../lib/auth';
import { useSettings } from '../../lib/settings';
import { ROUTES } from '../../navigation/routes';

const APP_VERSION = '0.1.0';

/**
 * The signed-in account: profile details, quick links (My Profile is this
 * screen, Change Password, Help and Support, About SmartSchool) and sign-out.
 *
 * Passwords are managed by the school administrator (the backend exposes no
 * self-service change-password endpoint), so that entry explains how to get
 * one rather than pretending to change it.
 */
export function ProfileScreen() {
  const { user, logout } = useAuth();
  const { settings } = useSettings();
  const navigation = useNavigation<{ navigate: (route: string, params?: object) => void }>();
  const insets = useSafeAreaInsets();

  if (!user) return null;

  const signOut = () => void logout();
  const openInfo = (params: { title: string; body: string; meta?: string[] }) =>
    navigation.navigate(ROUTES.admin.info, params);

  const supportMeta = [
    settings?.email ? `Email: ${settings.email}` : '',
    settings?.phone ? `Phone: ${settings.phone}` : '',
    settings?.address ? `Address: ${settings.address}` : '',
  ].filter(Boolean);

  return (
    <View style={[styles.safeContainer, { paddingTop: insets.top }]}>
      <View>
        <Text style={styles.headerTitle}>Profile</Text>
        <Text style={styles.headerSubtitle}>{ROLE_LABELS[user.role as Role] ?? user.role}</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.identity}>
          <View style={styles.avatar}>
            <Icon name="user" size={22} />
          </View>
          <View style={styles.identityText}>
            <Text style={styles.name}>{`${user.firstName} ${user.lastName}`.trim()}</Text>
            <Text style={styles.muted}>{user.email}</Text>
          </View>
        </View>
        <Row label="Role" value={ROLE_LABELS[user.role as Role] ?? user.role} />
        <Row label="School" value={settings?.name ?? user.schoolId ?? '—'} />
        {user.phone ? <Row label="Phone" value={user.phone} /> : null}
        {user.lastLoginAt ? <Row label="Last sign-in" value={user.lastLoginAt} /> : null}
      </View>

      <View style={styles.menu}>
        <MenuRow
          icon="user"
          label="My Profile"
          hint="Your account details"
          onPress={() =>
            openInfo({
              title: 'My Profile',
              body: 'Your profile details are shown above. To change your name, email or role, contact your school administrator.',
              meta: [
                `Name: ${`${user.firstName} ${user.lastName}`.trim()}`,
                `Email: ${user.email}`,
                `Role: ${ROLE_LABELS[user.role as Role] ?? user.role}`,
              ],
            })
          }
        />
        <MenuRow
          icon="key"
          label="Change Password"
          hint="Managed by your school"
          onPress={() =>
            openInfo({
              title: 'Change Password',
              body: 'Password changes are handled by your school administrator. Ask them to reset your password and share the new sign-in details with you.',
            })
          }
        />
        <MenuRow
          icon="help"
          label="Help and Support"
          hint={settings?.email ?? 'Contact your school'}
          onPress={() =>
            openInfo({
              title: 'Help and Support',
              body: 'Need help? Reach out to your school administrator using the contact details below.',
              meta: supportMeta.length > 0 ? supportMeta : ['Contact your school administrator.'],
            })
          }
        />
        <MenuRow
          icon="info"
          label="About SmartSchool"
          hint={`Version ${APP_VERSION}`}
          onPress={() =>
            openInfo({
              title: 'About SmartSchool',
              body: 'SmartSchool is an all-in-one school management platform covering admissions, academics, finance, transport and communication.',
              meta: [`Mobile app version ${APP_VERSION}`],
            })
          }
        />
      </View>

      <Pressable style={styles.signOut} onPress={signOut} accessibilityLabel="Logout">
        <Icon name="logout" size={18} />
        <Text style={styles.signOutText}>Logout</Text>
      </Pressable>
    </View>
  );
}

function MenuRow({
  icon,
  label,
  hint,
  onPress,
}: {
  icon: IconName;
  label: string;
  hint?: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.menuRow} onPress={onPress} accessibilityLabel={label}>
      <View style={styles.menuIcon}>
        <Icon name={icon} size={18} />
      </View>
      <View style={styles.menuText}>
        <Text style={styles.menuLabel}>{label}</Text>
        {hint ? <Text style={styles.muted}>{hint}</Text> : null}
      </View>
      <Icon name="chevron-right" size={16} />
    </Pressable>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = {
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
  },
  headerSubtitle: {
    fontSize: 14,
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
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  identityText: {
    flexShrink: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  rowLabel: {
    fontSize: 13,
    color: '#64748b',
  },
  rowValue: {
    fontSize: 13,
    color: '#0f172a',
    flexShrink: 1,
    textAlign: 'right',
  },
  menu: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    minHeight: 56,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuText: {
    flex: 1,
    gap: 2,
  },
  menuLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
  },
  signOut: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
  },
  safeContainer: {
    paddingTop: 0,
  },
  signOutText: {
    color: '#b91c1c',
    fontWeight: '700',
  },
  muted: {
    fontSize: 13,
    color: '#64748b',
  },
} as const;
