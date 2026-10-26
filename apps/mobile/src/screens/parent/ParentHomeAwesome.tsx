import { useNavigation } from '@react-navigation/native';
import { Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { Icon } from '../../components/Icon';
import { ParentPage, ParentPanel } from '../../components/parent/parentUi';
import { SkeletonPanels } from '../../components/ui';
import { api } from '../../lib/api';
import { formatCurrency } from '../../lib/format';
import { useAsync } from '../../lib/useAsync';
import { colors, parentColors, parentGradient, parentShadowStrong, radius } from '../../theme';
import { ROUTES } from '../../navigation/routes';

type Nav = { navigate: (route: string, params?: object) => void };

interface ChildSummary {
  id: string;
  admissionNo: string;
  name: string | null;
  className: string | null;
  sectionName: string | null;
  attendance: { percentage: number; today: { status: string } | null };
  invoices: Array<{ id: string; invoiceNo: string; dueDate: string; balance: number | string; status: string }>;
  outstanding: number;
}

interface ParentOverview {
  children: ChildSummary[];
}

function childName(child: ChildSummary): string {
  return child.name ?? `Admission ${child.admissionNo}`;
}

function klassOf(child: ChildSummary): string {
  return [child.className, child.sectionName].filter(Boolean).join(' • ') || '—';
}

export function ParentHomeAwesome() {
  const navigation = useNavigation<Nav>();
  const go = (route: string, params?: object) => navigation.navigate(route as never, params as never);

  const overviewState = useAsync<ParentOverview>(
    () => api.get<ParentOverview>('/parents/me/children'),
    [],
  );

  const children = overviewState.data?.children ?? [];
  const child = children[0] ?? null;

  if (overviewState.loading) return <SkeletonPanels count={2} />;
  if (!child) {
    return (
      <ParentPage>
        <ParentPanel title="No child linked">
          <Text style={{ color: colors.textMuted }}>Please contact the school to link your child account.</Text>
        </ParentPanel>
      </ParentPage>
    );
  }

  const todayStatus = child.attendance?.today?.status;
  const hasDue = Number(child.outstanding || 0) > 0;

  return (
    <ParentPage>
      <LinearGradient
        colors={parentGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ borderRadius: radius.xl, padding: 20, marginBottom: 16, ...parentShadowStrong }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={{ color: '#e5edfe', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Your Child</Text>
            <Text style={{ color: colors.white, fontSize: 22, fontWeight: '700', marginTop: 4 }}>{childName(child)}</Text>
            <Text style={{ color: '#c7d7fb', marginTop: 2 }}>{klassOf(child)}</Text>
          </View>
          <View style={{ alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14 }}>
            <Text style={{ color: colors.white, fontSize: 20, fontWeight: '700' }}>{child.attendance?.percentage ?? 0}%</Text>
            <Text style={{ color: '#e5edfe', fontSize: 11 }}>Attendance</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
          <Pressable onPress={() => go(ROUTES.parent.attendance)} style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.16)', paddingVertical: 10, borderRadius: 12, alignItems: 'center' }}>
            <Text style={{ color: colors.white, fontWeight: '600' }}>View Attendance</Text>
          </Pressable>
          <Pressable onPress={() => go(ROUTES.parent.homework)} style={{ flex: 1, backgroundColor: colors.white, paddingVertical: 10, borderRadius: 12, alignItems: 'center' }}>
            <Text style={{ color: parentColors.accent, fontWeight: '600' }}>Homework</Text>
          </Pressable>
        </View>
      </LinearGradient>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <Pressable onPress={() => go(ROUTES.parent.attendance)} style={{ flex: 1, minWidth: '45%', backgroundColor: colors.surface, borderRadius: radius.lg, padding: 14, borderWidth: 1, borderColor: colors.border }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ backgroundColor: parentColors.accentSoft, padding: 8, borderRadius: 10 }}>
              <Icon name="attendance" size={18} color={parentColors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '600' }}>Today</Text>
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>{todayStatus ? `Marked: ${todayStatus}` : 'Not marked'}</Text>
            </View>
            <Icon name="arrow-right" size={16} color={colors.textFaint} />
          </View>
        </Pressable>
        <Pressable onPress={() => go(ROUTES.parent.invoices)} style={{ flex: 1, minWidth: '45%', backgroundColor: colors.surface, borderRadius: radius.lg, padding: 14, borderWidth: 1, borderColor: colors.border }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ backgroundColor: hasDue ? colors.dangerSoft : colors.successSoft, padding: 8, borderRadius: 10 }}>
              <Icon name="finance" size={18} color={hasDue ? colors.danger : colors.success} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '600' }}>Fees</Text>
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>{hasDue ? formatCurrency(Number(child.outstanding || 0)) + ' due' : 'Clear'}</Text>
            </View>
            <Icon name="arrow-right" size={16} color={colors.textFaint} />
          </View>
        </Pressable>
        <Pressable onPress={() => go(ROUTES.parent.homework)} style={{ flex: 1, minWidth: '45%', backgroundColor: colors.surface, borderRadius: radius.lg, padding: 14, borderWidth: 1, borderColor: colors.border }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ backgroundColor: colors.surfaceMuted, padding: 8, borderRadius: 10 }}>
              <Icon name="homework" size={18} color={colors.text} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '600' }}>Homework</Text>
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>View & track</Text>
            </View>
            <Icon name="arrow-right" size={16} color={colors.textFaint} />
          </View>
        </Pressable>
          <Pressable onPress={() => go((ROUTES.parent as any).messages || (ROUTES.parent as any).notices || 'parent-messages')} style={{ flex: 1, minWidth: '45%', backgroundColor: colors.surface, borderRadius: radius.lg, padding: 14, borderWidth: 1, borderColor: colors.border }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ backgroundColor: colors.surfaceMuted, padding: 8, borderRadius: 10 }}>
              <Icon name="messages" size={18} color={colors.text} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '600' }}>Notices</Text>
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>Latest updates</Text>
            </View>
            <Icon name="arrow-right" size={16} color={colors.textFaint} />
          </View>
        </Pressable>
      </View>

      <ParentPanel title="Quick Overview" icon="home">
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 }}>
            <Text style={{ color: colors.textMuted }}>Class</Text>
            <Text style={{ fontWeight: '500' }}>{klassOf(child)}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 }}>
            <Text style={{ color: colors.textMuted }}>Admission No</Text>
            <Text style={{ fontWeight: '500' }}>{child.admissionNo}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 }}>
            <Text style={{ color: colors.textMuted }}>Attendance</Text>
            <Text style={{ fontWeight: '500' }}>{child.attendance?.percentage ?? 0}%</Text>
          </View>
        </View>
      </ParentPanel>
    </ParentPage>
  );
}
