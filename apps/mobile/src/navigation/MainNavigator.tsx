import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Permission, Role } from '@smartschool/shared';

import { Icon, type IconName } from '../components/Icon';
import { useRealtime } from '../components/RealtimeProvider';
import { useAuth } from '../lib/auth';
import { colors } from '../theme';
import { ROUTES } from './routes';

/* -------------------------------------------------------------------------- */
/* Screens                                                                    */
/* -------------------------------------------------------------------------- */
import { AdminDashboardScreen } from '../screens/admin/AdminDashboardScreen';
import { AcademicsScreen } from '../screens/admin/AcademicsScreen';
import { NotificationsScreen } from '../screens/admin/AdminNotificationsScreen';
import { ProfileScreen } from '../screens/admin/AdminProfileScreen';
import { TeacherPortalScreen } from '../screens/teacher/TeacherPortalScreen';
import { TeacherClassesScreen } from '../screens/teacher/TeacherClassesScreen';
import { TeacherAttendanceScreen } from '../screens/teacher/TeacherAttendanceScreen';
import { TeacherHomeworkScreen } from '../screens/teacher/TeacherHomeworkScreen';
import { ParentHomeAwesome } from '../screens/parent/ParentHomeAwesome';
import { ParentAttendanceScreen } from '../screens/parent/ParentAttendanceScreen';
import { ParentHomeworkScreen } from '../screens/parent/ParentHomeworkScreen';
import { ParentInvoicesScreen } from '../screens/parent/ParentInvoicesScreen';
import { StudentHomeScreen } from '../screens/student/StudentHomeScreen';
import { StudentAttendanceScreen } from '../screens/student/StudentAttendanceScreen';
import { StudentHomeworkScreen } from '../screens/student/StudentHomeworkScreen';
import { StudentTimetableScreen } from '../screens/student/StudentTimetableScreen';
import { StudentResultsScreen } from '../screens/student/StudentResultsScreen';
import { AccountSettingsScreen } from '../screens/settings/AccountSettingsScreen';

const Tab = createBottomTabNavigator();

type StackParamList = Record<string, undefined>;

interface TabDef {
  name: string;
  label: string;
  icon: IconName;
  component: React.ComponentType;
  permission?: Permission;
  roles?: readonly Role[];
  excludeRoles?: readonly Role[];
  badge?: boolean;
}

/** Each tab owns its own stack so back-navigation stays inside the tab. */
function wrapStack(component: React.ComponentType) {
  const Stack = createStackNavigator<StackParamList>();
  function Wrapped() {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="root" component={component} />
      </Stack.Navigator>
    );
  }
  Wrapped.displayName = 'Stack';
  return Wrapped;
}

/**
 * Exactly five tabs per role. No duplicates, no repeatable content.
 * The same five slot names are reused for every role; only the screen
 * behind each slot changes.
 */
const TABS_BY_ROLE: Record<Role, TabDef[]> = {
  [Role.PRINCIPAL]: [
    { name: ROUTES.admin.dashboard, label: 'Home', icon: 'home', component: AdminDashboardScreen },
    {
      name: ROUTES.admin.academics,
      label: 'Academics',
      icon: 'subject',
      component: AcademicsScreen,
    },
    {
      name: 'notifications',
      label: 'Alerts',
      icon: 'bell',
      component: NotificationsScreen,
      permission: Permission.NOTIFICATION_READ,
      badge: true,
    },
    { name: 'profile', label: 'Profile', icon: 'user', component: ProfileScreen },
    { name: ROUTES.admin.more, label: 'More', icon: 'more', component: AcademicsScreen },
  ],
  [Role.ADMIN]: [
    { name: ROUTES.admin.dashboard, label: 'Home', icon: 'home', component: AdminDashboardScreen },
    {
      name: ROUTES.admin.academics,
      label: 'Academics',
      icon: 'subject',
      component: AcademicsScreen,
    },
    {
      name: 'notifications',
      label: 'Alerts',
      icon: 'bell',
      component: NotificationsScreen,
      permission: Permission.NOTIFICATION_READ,
      badge: true,
    },
    { name: 'profile', label: 'Profile', icon: 'user', component: ProfileScreen },
    { name: ROUTES.admin.more, label: 'More', icon: 'more', component: AcademicsScreen },
  ],
  [Role.TEACHER]: [
    { name: ROUTES.teacher.portal, label: 'Home', icon: 'home', component: TeacherPortalScreen },
    {
      name: ROUTES.teacher.classes,
      label: 'Classes',
      icon: 'class',
      component: TeacherClassesScreen,
    },
    {
      name: ROUTES.teacher.attendance,
      label: 'Attendance',
      icon: 'attendance',
      component: TeacherAttendanceScreen,
      permission: Permission.ATTENDANCE_READ,
    },
    {
      name: ROUTES.teacher.homework,
      label: 'Homework',
      icon: 'homework',
      component: TeacherHomeworkScreen,
      permission: Permission.HOMEWORK_READ,
    },
    {
      name: 'notifications',
      label: 'Alerts',
      icon: 'bell',
      component: NotificationsScreen,
      permission: Permission.NOTIFICATION_READ,
      badge: true,
    },
    {
      name: ROUTES.accountSettings,
      label: 'Settings',
      icon: 'settings',
      component: AccountSettingsScreen,
    },
  ],
  [Role.PARENT]: [
    { name: ROUTES.parent.portal, label: 'Home', icon: 'home', component: ParentHomeAwesome },
    {
      name: ROUTES.parent.attendance,
      label: 'Attendance',
      icon: 'attendance',
      component: ParentAttendanceScreen,
    },
    {
      name: ROUTES.parent.homework,
      label: 'Homework',
      icon: 'homework',
      component: ParentHomeworkScreen,
    },
    {
      name: ROUTES.parent.invoices,
      label: 'Fees',
      icon: 'finance',
      component: ParentInvoicesScreen,
    },
    {
      name: 'notifications',
      label: 'Alerts',
      icon: 'bell',
      component: NotificationsScreen,
      permission: Permission.NOTIFICATION_READ,
      badge: true,
    },
    {
      name: ROUTES.accountSettings,
      label: 'Settings',
      icon: 'settings',
      component: AccountSettingsScreen,
    },
  ],
  [Role.STUDENT]: [
    { name: ROUTES.student.portal, label: 'Home', icon: 'home', component: StudentHomeScreen },
    {
      name: ROUTES.student.attendance,
      label: 'Attendance',
      icon: 'attendance',
      component: StudentAttendanceScreen,
    },
    {
      name: ROUTES.student.homework,
      label: 'Homework',
      icon: 'homework',
      component: StudentHomeworkScreen,
    },
    {
      name: ROUTES.student.timetable,
      label: 'Timetable',
      icon: 'timetable',
      component: StudentTimetableScreen,
    },
    {
      name: ROUTES.student.results,
      label: 'Results',
      icon: 'marks',
      component: StudentResultsScreen,
    },
  ],
  [Role.ACCOUNTANT]: [
    { name: ROUTES.admin.dashboard, label: 'Home', icon: 'home', component: AdminDashboardScreen },
    {
      name: ROUTES.admin.academics,
      label: 'Academics',
      icon: 'subject',
      component: AcademicsScreen,
    },
    {
      name: ROUTES.parent.invoices,
      label: 'Fees',
      icon: 'finance',
      component: ParentInvoicesScreen,
    },
    {
      name: 'notifications',
      label: 'Alerts',
      icon: 'bell',
      component: NotificationsScreen,
      permission: Permission.NOTIFICATION_READ,
      badge: true,
    },
    { name: 'profile', label: 'Profile', icon: 'user', component: ProfileScreen },
  ],
  [Role.LIBRARIAN]: [
    { name: ROUTES.admin.dashboard, label: 'Home', icon: 'home', component: AdminDashboardScreen },
    {
      name: ROUTES.admin.academics,
      label: 'Academics',
      icon: 'subject',
      component: AcademicsScreen,
    },
    {
      name: 'notifications',
      label: 'Alerts',
      icon: 'bell',
      component: NotificationsScreen,
      permission: Permission.NOTIFICATION_READ,
      badge: true,
    },
    { name: 'profile', label: 'Profile', icon: 'user', component: ProfileScreen },
    { name: ROUTES.admin.more, label: 'More', icon: 'more', component: AcademicsScreen },
  ],
  [Role.TRANSPORT_MANAGER]: [
    { name: ROUTES.admin.dashboard, label: 'Home', icon: 'home', component: AdminDashboardScreen },
    {
      name: ROUTES.admin.academics,
      label: 'Academics',
      icon: 'subject',
      component: AcademicsScreen,
    },
    {
      name: 'notifications',
      label: 'Alerts',
      icon: 'bell',
      component: NotificationsScreen,
      permission: Permission.NOTIFICATION_READ,
      badge: true,
    },
    { name: 'profile', label: 'Profile', icon: 'user', component: ProfileScreen },
    { name: ROUTES.admin.more, label: 'More', icon: 'more', component: AcademicsScreen },
  ],
  [Role.SUPER_ADMIN]: [
    { name: ROUTES.admin.dashboard, label: 'Home', icon: 'home', component: AdminDashboardScreen },
    {
      name: ROUTES.admin.academics,
      label: 'Academics',
      icon: 'subject',
      component: AcademicsScreen,
    },
    {
      name: 'notifications',
      label: 'Alerts',
      icon: 'bell',
      component: NotificationsScreen,
      permission: Permission.NOTIFICATION_READ,
      badge: true,
    },
    { name: 'profile', label: 'Profile', icon: 'user', component: ProfileScreen },
    { name: ROUTES.admin.more, label: 'More', icon: 'more', component: AcademicsScreen },
  ],
};

function TabIcon({ name, color, size }: { name: IconName; color: string; size: number }) {
  return <Icon name={name} size={size} color={color} />;
}

export function MainNavigator() {
  const { user } = useAuth();
  const { unread } = useRealtime();
  if (!user) return null;

  const tabs = TABS_BY_ROLE[user.role] ?? TABS_BY_ROLE[Role.PARENT];

  // Wire live unread count into badge-aware tabs.
  const tabsWithBadge = tabs.map((tab) =>
    tab.badge && unread > 0 ? { ...tab, badge: true } : tab,
  );

  const initialRouteName = tabsWithBadge[0]?.name ?? 'profile';

  return (
    <Tab.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          height: 62,
          paddingTop: 6,
          paddingBottom: 6,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          backgroundColor: colors.surface,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
        },
      }}
    >
      {tabsWithBadge.map((tab) => (
        <Tab.Screen
          key={tab.name}
          name={tab.name}
          component={wrapStack(tab.component)}
          options={{
            title: tab.label,
            tabBarLabel: tab.label,
            tabBarAccessibilityLabel: `${tab.label} tab`,
            tabBarIcon: ({ color, size }) => <TabIcon name={tab.icon} color={color} size={size} />,
            tabBarBadge: tab.badge && unread > 0 ? (unread > 99 ? '99+' : unread) : undefined,
          }}
        />
      ))}
    </Tab.Navigator>
  );
}
