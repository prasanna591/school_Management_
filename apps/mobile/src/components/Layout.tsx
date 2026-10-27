import { useNavigation } from '@react-navigation/native';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from './Icon';
import { NotificationBell } from './NotificationBell';
import { Toaster } from './Toaster';
import { useAuth } from '../lib/auth';
import { initials } from '../lib/format';
import { colors, radius, shadowStrong } from '../theme';

/**
 * The shell every authenticated screen renders inside. Dark canvas shell with a
 * glass header: hairline border, subtle shadow, and premium typography.
 *
 * Safe areas are handled with `react-native-safe-area-context`:
 *  - `insets.top` clears the status bar (the status bar is translucent).
 *  - `insets.bottom` clears the Android navigation bar / iOS home indicator.
 */
export function Layout({
  children,
  heading,
  subheading,
  bottomInset = true,
}: {
  children: React.ReactNode;
  heading?: string;
  subheading?: string;
  bottomInset?: boolean;
}) {
  const navigation = useNavigation();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const canGoBack = navigation.canGoBack();

  const name = `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim();
  const avatar = initials(user?.firstName, user?.lastName);

  return (
    <View style={[styles.shell, { paddingTop: insets.top }]}>
      <View style={[styles.header, { paddingTop: 14 }]}>
        {canGoBack ? (
          <Pressable
            style={styles.navButton}
            onPress={() => navigation.goBack()}
            accessibilityLabel="Go back"
            hitSlop={8}
          >
            <Icon name="chevron-left" size={20} />
          </Pressable>
        ) : null}

        {heading ? (
          <View style={styles.headerText}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {heading}
            </Text>
            {subheading ? (
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                {subheading}
              </Text>
            ) : null}
          </View>
        ) : (
          <View style={styles.headerSpacer} />
        )}

        <NotificationBell />
        <Pressable
          style={styles.avatarButton}
          onPress={() => {}}
          accessibilityLabel={name ? `Signed in as ${name}` : 'Profile'}
          hitSlop={8}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{avatar || 'SS'}</Text>
          </View>
        </Pressable>
      </View>
      <View style={styles.content}>
        <ScrollView
          contentContainerStyle={[
            styles.contentInner,
            { paddingBottom: bottomInset ? insets.bottom + 24 : 24 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
        <Toaster bottomInset={bottomInset} />
      </View>
    </View>
  );
}

const styles = {
  shell: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
    paddingHorizontal: 18,
    paddingBottom: 10,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    ...shadowStrong,
  },
  navButton: {
    width: 44,
    height: 44,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.glassSurface,
  },
  headerSpacer: {
    flex: 1,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800' as const,
    letterSpacing: -0.4,
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 12.5,
    color: colors.textMuted,
    marginTop: 1,
  },
  avatarButton: {
    paddingHorizontal: 2,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.glassSurfaceStrong,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  avatarText: {
    fontSize: 13,
    fontWeight: '800' as const,
    color: colors.primary,
  },
  content: {
    flex: 1,
  },
  contentInner: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 20,
    gap: 18,
  },
} as const;
