import { useMemo, useState, type ComponentType } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import {
  createDrawerNavigator,
  type DrawerContentComponentProps,
} from '@react-navigation/drawer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '../components/Icon';
import { Layout } from '../components/Layout';
import { useAuth } from '../lib/auth';
import { humanize, initials } from '../lib/format';
import { drawerInitialRouteForRole } from '../lib/routing';
import { colors, radius } from '../theme';
import { ROUTES } from './routes';
import { NAV_ICONS, groupNav, navForRole } from './navItems';
import { MainTabs } from './MainTabs';
import { StudentDetailsScreen } from '../screens/admin/StudentDetailsScreen';
import { MarkManagementScreen } from '../screens/admin/MarkManagementScreen';
import { ResourceListScreen } from '../screens/admin/ResourceListScreen';
import { InfoScreen } from '../screens/admin/InfoScreen';
import { MessagesScreen } from '../screens/admin/AdminMessagesScreen';
import { SettingsScreen } from '../screens/admin/AdminSettingsScreen';
import { ProfileScreen } from '../screens/admin/AdminProfileScreen';
import { TeacherPortalScreen } from '../screens/teacher/TeacherPortalScreen';
import { TeacherClassesScreen } from '../screens/teacher/TeacherClassesScreen';
import { TeacherStudentsScreen } from '../screens/teacher/TeacherStudentsScreen';
import { TeacherAttendanceScreen } from '../screens/teacher/TeacherAttendanceScreen';
import { TeacherAttendanceMarkScreen } from '../screens/teacher/TeacherAttendanceMarkScreen';
import { TeacherAssignmentsScreen } from '../screens/teacher/TeacherAssignmentsScreen';
import { TeacherMarksScreen } from '../screens/teacher/TeacherMarksScreen';
import { TeacherHomeworkScreen } from '../screens/teacher/TeacherHomeworkScreen';
import { TeacherTimetableScreen } from '../screens/teacher/TeacherTimetableScreen';
import { TeacherProfileScreen } from '../screens/teacher/TeacherProfileScreen';
import { TeacherLessonPlanScreen } from '../screens/teacher/TeacherLessonPlanScreen';
import { TeacherMessagesScreen } from '../screens/teacher/TeacherMessagesScreen';
import { ParentHomeAwesome } from '../screens/parent/ParentHomeAwesome';
import { ParentTimetableScreen } from '../screens/parent/ParentTimetableScreen';
import { ParentResultsScreen } from '../screens/parent/ParentResultsScreen';
import { ParentInvoicesScreen } from '../screens/parent/ParentInvoicesScreen';
import { ParentHomeworkScreen } from '../screens/parent/ParentHomeworkScreen';
import { ParentVehicleScreen } from '../screens/parent/ParentVehicleScreen';
import { ParentAttendanceScreen } from '../screens/parent/ParentAttendanceScreen';
import { ParentSyllabusScreen } from '../screens/parent/ParentSyllabusScreen';
import { ParentTeachersScreen } from '../screens/parent/ParentTeachersScreen';
import { ParentNoticesScreen } from '../screens/parent/ParentNoticesScreen';

const Drawer = createDrawerNavigator();

/**
 * Wraps a screen in the shared Layout shell (header, scrollable content,
 * toaster) so every drawer screen renders the same chrome. The bottom-tab host
 * (`tabs`) is excluded because each tab already renders its own Layout.
 */
function withLayout(ScreenComponent: ComponentType): ComponentType {
  function Screen() {
    return (
      <Layout>
        <ScreenComponent />
      </Layout>
    );
  }
  Screen.displayName = `Layout(...${
    ScreenComponent.displayName ?? ScreenComponent.name ?? 'Screen'
  })`;
  return Screen;
}

/** Drawer screens that carry their own Layout (everything except the tab host). */
const SCREEN_SHELLS: { route: string; component: ComponentType }[] = [
  { route: ROUTES.teacher.portal, component: TeacherPortalScreen },
  { route: ROUTES.teacher.classes, component: TeacherClassesScreen },
  { route: ROUTES.teacher.students, component: TeacherStudentsScreen },
  { route: ROUTES.teacher.attendance, component: TeacherAttendanceScreen },
  { route: ROUTES.teacher.attendanceMark, component: TeacherAttendanceMarkScreen },
  { route: ROUTES.teacher.assignments, component: TeacherAssignmentsScreen },
  { route: ROUTES.teacher.marks, component: TeacherMarksScreen },
  { route: ROUTES.teacher.homework, component: TeacherHomeworkScreen },
  { route: ROUTES.teacher.lessonPlans, component: TeacherLessonPlanScreen },
  { route: ROUTES.teacher.timetable, component: TeacherTimetableScreen },
  { route: ROUTES.teacher.profile, component: TeacherProfileScreen },
  { route: ROUTES.teacher.messages, component: TeacherMessagesScreen },
  { route: ROUTES.parent.portal, component: ParentHomeAwesome },
  { route: ROUTES.parent.timetable, component: ParentTimetableScreen },
  { route: ROUTES.parent.results, component: ParentResultsScreen },
  { route: ROUTES.parent.invoices, component: ParentInvoicesScreen },
  { route: ROUTES.parent.homework, component: ParentHomeworkScreen },
  { route: ROUTES.parent.vehicle, component: ParentVehicleScreen },
  { route: ROUTES.parent.attendance, component: ParentAttendanceScreen },
  { route: ROUTES.parent.syllabus, component: ParentSyllabusScreen },
  { route: ROUTES.parent.teachers, component: ParentTeachersScreen },
  { route: ROUTES.parent.notices, component: ParentNoticesScreen },
  { route: ROUTES.admin.students, component: StudentDetailsScreen },
  { route: ROUTES.admin.marks, component: MarkManagementScreen },
  { route: ROUTES.admin.resource, component: ResourceListScreen },
  { route: ROUTES.admin.info, component: InfoScreen },
  { route: ROUTES.admin.messages, component: MessagesScreen },
  { route: ROUTES.admin.settings, component: SettingsScreen },
  { route: ROUTES.account, component: ProfileScreen },
];

/**
 * The authenticated experience: a drawer whose entries are exactly the nav
 * items the signed-in role may open (grouped into Overview / Academics / School
 * Operations / Account). Its home is the bottom-tab host, so the role's primary
 * areas stay one tap away and everything else is searchable.
 */
export function MainNavigator() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <Drawer.Navigator
      initialRouteName={drawerInitialRouteForRole(user.role)}
      screenOptions={{
        headerShown: false,
        swipeEnabled: true,
        drawerType: 'slide',
        drawerStyle: { backgroundColor: colors.surface, width: 288 },
      }}
      drawerContent={(props) => <DrawerContent {...props} />}
    >
      <Drawer.Screen name={ROUTES.admin.tabs} component={MainTabs} />
      {SCREEN_SHELLS.map(({ route, component }) => (
        <Drawer.Screen key={route} name={route} component={withLayout(component)} />
      ))}
    </Drawer.Navigator>
  );
}

/** Custom drawer content: profile header, role-filtered sections, sign-out. */
function DrawerContent({ state, navigation }: DrawerContentComponentProps) {
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');

  const groups = useMemo(() => {
    if (!user) return [];
    const all = groupNav(navForRole(user.role));
    const needle = query.trim().toLowerCase();
    if (!needle) return all;
    return all
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => item.label.toLowerCase().includes(needle)),
      }))
      .filter((group) => group.items.length > 0);
  }, [user, query]);

  if (!user) return null;

  const activeScreen = currentScreenName(state);
  const name = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || 'Signed in';
  const role = humanize(user.role);
  const avatar = initials(user.firstName, user.lastName);

  const openProfile = () => {
    if (user.role === 'TEACHER') {
      navigation.navigate(ROUTES.teacher.profile);
    } else if (user.role === 'PARENT') {
      navigation.navigate(ROUTES.account);
    } else {
      navigation.navigate(ROUTES.admin.tabs, { screen: ROUTES.admin.profile });
    }
    navigation.closeDrawer();
  };

  const confirmSignOut = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out of SmartSchool?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => void logout() },
    ]);
  };

  return (
    <View style={styles.drawer}>
      <Pressable
        style={[styles.profileHeader, { paddingTop: 20 + insets.top }]}
        onPress={openProfile}
        accessibilityRole="button"
        accessibilityLabel={`${name}, ${role}. Open profile`}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{avatar}</Text>
        </View>
        <View style={styles.profileText}>
          <Text style={styles.profileName} numberOfLines={1}>
            {name}
          </Text>
          <Text style={styles.profileRole} numberOfLines={1}>
            {role}
          </Text>
        </View>
      </Pressable>

      <View style={styles.searchWrap}>
        <Icon name="search" size={16} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Find a page"
          placeholderTextColor={colors.textFaint}
          autoCapitalize="none"
          returnKeyType="search"
          accessibilityLabel="Find a page"
        />
        {query ? (
          <Pressable onPress={() => setQuery('')} hitSlop={8} accessibilityLabel="Clear search">
            <Icon name="close" size={16} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        style={styles.drawerScroll}
        contentContainerStyle={styles.drawerScrollInner}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {groups.length === 0 ? (
          <Text style={styles.drawerEmpty}>No pages match “{query.trim()}”.</Text>
        ) : null}
        {groups.map((group, index) => (
          <View key={group.title ?? `group-${index}`} style={styles.drawerGroup}>
            {group.title ? <Text style={styles.drawerGroupTitle}>{group.title}</Text> : null}
            {group.items.map((item) => {
              const active = isItemActive(item.route, item.params, activeScreen);
              return (
                <Pressable
                  key={item.key}
                  onPress={() => {
                    navigation.navigate(item.route, item.params);
                    navigation.closeDrawer();
                  }}
                  style={[styles.drawerItem, active ? styles.drawerItemActive : null]}
                  accessibilityRole="button"
                  accessibilityLabel={item.label}
                  accessibilityState={{ selected: active }}
                >
                  <Icon
                    name={NAV_ICONS[item.key] ?? 'dashboard'}
                    size={18}
                    color={active ? colors.primary : colors.textMuted}
                  />
                  <Text
                    style={[styles.drawerItemLabel, active ? styles.drawerItemLabelActive : null]}
                    numberOfLines={1}
                  >
                    {item.label}
                  </Text>
                  {active ? <View style={styles.activeDot} /> : null}
                </Pressable>
              );
            })}
          </View>
        ))}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: 12 + insets.bottom }]}>
        <Pressable
          style={styles.drawerSignOut}
          accessibilityRole="button"
          accessibilityLabel="Sign out"
          onPress={confirmSignOut}
        >
          <Icon name="logout" size={18} color={colors.danger} />
          <Text style={styles.drawerSignOutText}>Sign out</Text>
        </Pressable>
      </View>
    </View>
  );
}

/**
 * The screen name currently visible, descending into the tab host so drawer
 * entries that target a tab (e.g. Dashboard) still highlight correctly.
 */
function currentScreenName(state: DrawerContentComponentProps['state']): string {
  const route = state.routes[state.index];
  const nested = route?.state;
  if (nested && typeof nested.index === 'number') {
    return nested.routes[nested.index]?.name ?? route.name;
  }
  return route?.name ?? '';
}

function isItemActive(
  route: string,
  params: Record<string, unknown> | undefined,
  activeScreen: string,
): boolean {
  if (route === activeScreen) return true;
  const target = params?.screen;
  return typeof target === 'string' && target === activeScreen;
}

const styles = {
  drawer: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    // Overridden with the top safe-area inset in the component.
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: colors.primarySoft,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.white,
    fontSize: 17,
    fontWeight: '800',
  },
  profileText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  profileRole: {
    fontSize: 12.5,
    color: colors.primary,
    fontWeight: '600',
  },
  searchWrap: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    marginHorizontal: 12,
    marginTop: 4,
    marginBottom: 2,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    paddingVertical: 0,
  },
  drawerScroll: {
    flex: 1,
  },
  drawerScrollInner: {
    paddingVertical: 6,
    paddingBottom: 16,
  },
  drawerEmpty: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    fontSize: 13,
    color: colors.textMuted,
  },
  drawerGroup: {
    paddingBottom: 4,
  },
  drawerGroupTitle: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
    fontSize: 10.5,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: colors.textFaint,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 46,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  drawerItemActive: {
    backgroundColor: colors.primaryLight,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  drawerItemLabel: {
    flexShrink: 1,
    fontSize: 14.5,
    color: colors.text,
  },
  drawerItemLabelActive: {
    fontWeight: '700',
    color: colors.primaryDark,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
    marginLeft: 'auto',
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: 12,
    // The bottom padding is extended with the safe-area inset in the component.
  },
  drawerSignOut: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    minHeight: 48,
    padding: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.dangerSoft,
    backgroundColor: colors.dangerSoft,
  },
  drawerSignOutText: {
    color: colors.danger,
    fontWeight: '700',
    fontSize: 15,
  },
} as const;
