import { DrawerActions, useNavigation } from '@react-navigation/native';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from './Icon';
import { NotificationBell } from './NotificationBell';
import { Toaster } from './Toaster';
import { useAuth } from '../lib/auth';
import { initials } from '../lib/format';
import { colors, radius } from '../theme';

/**
 * The shell every authenticated screen renders inside. The top bar stays quiet:
 * navigation on the left, notifications and account on the right. Screen titles
 * live in the content, so the chrome never repeats information the user already
 * knows (brand, school, page name).
 *
 * The header carries the top safe-area inset and the scroll content the bottom
 * one, because the status bar is drawn edge-to-edge: without it the header would
 * sit under the Android status bar and the last row of content under the
 * navigation bar. Screens hosted by the bottom-tab navigator pass
 * `bottomInset={false}`, because the tab bar already occupies that inset.
 */
export function Layout({
  children,
  heading,
  subheading,
  bottomInset = true,
}: {
  children: React.ReactNode;
  /** Optional contextual title. Most screens keep their own in-content title. */
  heading?: string;
  /** Optional second line shown beside the contextual title. */
  subheading?: string;
  /**
   * Whether to add the bottom safe-area inset to the content. Set to `false`
   * inside the bottom-tab host, where the tab bar itself covers the inset.
   */
  bottomInset?: boolean;
}) {
  const navigation = useNavigation();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const bottom = bottomInset ? insets.bottom : 0;
  const canGoBack = navigation.canGoBack();

  const name = `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim();
  const avatar = initials(user?.firstName, user?.lastName);

  return (
    <View style={styles.shell}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable
          style={styles.navButton}
          onPress={() =>
            canGoBack ? navigation.goBack() : navigation.dispatch(DrawerActions.toggleDrawer())
          }
          accessibilityLabel={canGoBack ? 'Go back' : 'Open menu'}
          hitSlop={8}
        >
          <Icon name={canGoBack ? 'chevron-left' : 'menu'} size={20} />
        </Pressable>

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
          onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())}
          accessibilityLabel={name ? `Open menu, signed in as ${name}` : 'Open menu'}
          hitSlop={8}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{avatar || 'SS'}</Text>
          </View>
        </Pressable>
      </View>
      <View style={styles.content}>
        <ScrollView
          contentContainerStyle={[styles.contentInner, { paddingBottom: bottom + 32 }]}
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
    paddingHorizontal: 16,
    // The top padding is extended with the status-bar inset in the component.
    paddingTop: 6,
    paddingBottom: 6,
    backgroundColor: colors.background,
  },
  navButton: {
    width: 40,
    height: 40,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  headerSpacer: {
    flex: 1,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 1,
  },
  avatarButton: {
    paddingHorizontal: 2,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryLight,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '800' as const,
    color: colors.primaryDark,
  },
  content: {
    flex: 1,
  },
  contentInner: {
    paddingHorizontal: 16,
    paddingTop: 8,
    // Extended with the bottom safe-area inset in the component.
    paddingBottom: 32,
    gap: 16,
  },
} as const;
