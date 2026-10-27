import { Text, View } from 'react-native';

import { Layout } from '../../components/Layout';
import { ParentPanel, ParentRow } from '../../components/parent/parentUi';
import { formatDate, initials } from '../../lib/format';
import { DEMO_STUDENT_ME } from '../../lib/demoData';

interface StudentProfile {
  id: string;
  admissionNo: string;
  rollNo: string | null;
  gender: string;
  status: string;
  admissionDate: string | null;
  dateOfBirth: string | null;
  schoolId: string;
  user: { firstName?: string | null; lastName?: string | null; email?: string | null } | null;
  section: { classLevel?: { name?: string | null } | null; name?: string | null } | null;
  guardians: Array<{
    id: string;
    relation: string;
    guardian: { firstName?: string | null; lastName?: string | null; phone?: string | null } | null;
  }>;
}

export function StudentProfileScreen() {
  const s: StudentProfile = DEMO_STUDENT_ME;
  const name = `${s.user?.firstName ?? ''} ${s.user?.lastName ?? ''}`.trim() || `Admission ${s.admissionNo}`;

  return (
    <Layout heading="Profile">
      <View style={styles.card}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials(s.user?.firstName, s.user?.lastName)}</Text>
        </View>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.email}>{s.user?.email ?? '—'}</Text>
        <Text style={styles.role}>Student · Greenfield Matriculation Hr. Sec. School</Text>
      </View>

      <ParentPanel title="Student details" icon="user">
        <ParentRow title="Admission No" meta={s.admissionNo} />
        <ParentRow title="Roll No" meta={s.rollNo ?? '—'} />
        <ParentRow title="Class" meta={[s.section?.classLevel?.name, s.section?.name].filter(Boolean).join(' • ') || '—'} />
        <ParentRow title="Gender" meta={s.gender ?? '—'} />
        <ParentRow title="Date of birth" meta={formatDate(s.dateOfBirth) || '—'} />
        <ParentRow title="Admission date" meta={formatDate(s.admissionDate) || '—'} />
        <ParentRow title="Status" meta={s.status ?? '—'} />
      </ParentPanel>

      <ParentPanel title="Guardian" icon="parents">
        {s.guardians && s.guardians.length > 0 ? (
          <View style={{ gap: 8 }}>
            {s.guardians.map((g) => (
              <ParentRow
                key={g.id}
                title={g.guardian?.firstName && g.guardian?.lastName ? `${g.guardian.firstName} ${g.guardian.lastName}` : 'Guardian'}
                meta={[g.relation, g.guardian?.phone].filter(Boolean).join(' · ') || '—'}
              />
            ))}
          </View>
        ) : (
          <Text style={styles.muted}>No guardian linked.</Text>
        )}
      </ParentPanel>
    </Layout>
  );
}

const styles = {
  card: {
    alignItems: 'center',
    paddingVertical: 10,
    marginBottom: 14,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#f3f0ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e7e5f3',
    marginBottom: 10,
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#4c1d95',
  },
  name: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0f172a',
  },
  email: {
    fontSize: 13,
    color: '#475569',
    marginTop: 1,
  },
  role: {
    fontSize: 12,
    color: '#475569',
    marginTop: 4,
  },
  muted: {
    fontSize: 13,
    color: '#475569',
    textAlign: 'center',
  },
} as const;
