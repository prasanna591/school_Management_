import { Text, View } from 'react-native';

import { Layout } from '../../components/Layout';
import { ParentChip, ParentEmpty, ParentPanel, ParentRow } from '../../components/parent/parentUi';
import { formatDate } from '../../lib/format';
import { DEMO_HOMEWORK } from '../../lib/demoData';

interface HomeworkRow {
  id: string;
  title: string;
  description: string | null;
  materials: string | null;
  assignedDate: string;
  dueDate: string;
  subject: { name?: string | null };
  teacher?: { name?: string | null } | null;
  submission: { status?: string | null; submittedAt?: string | null; remarks?: string | null } | null;
}

function submissionTone(status: string | null | undefined): 'default' | 'info' | 'success' | 'warning' | 'danger' {
  if (!status) return 'default';
  if (status === 'SUBMITTED') return 'success';
  if (status === 'GRADED') return 'success';
  if (status === 'LATE') return 'warning';
  if (status === 'PENDING') return 'warning';
  return 'default';
}

function humanizeStatus(status: string | null | undefined): string {
  if (!status) return '—';
  return status
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function StudentHomeworkScreen() {
  const data: HomeworkRow[] = DEMO_HOMEWORK.map((item) => ({
    id: item.id,
    title: item.title,
    description: item.description,
    materials: item.materials,
    assignedDate: item.assignedDate,
    dueDate: item.dueDate,
    subject: { name: item.subject?.name ?? '—' },
    teacher: item.teacher
      ? { name: `${item.teacher.user.firstName} ${item.teacher.user.lastName}` }
      : null,
    submission: item.submissions[0] ?? null,
  }));

  return (
    <Layout heading="Homework">
      {data.length === 0 ? (
        <ParentEmpty message="No homework assigned yet." hint="Assignments your teacher publishes will appear here." />
      ) : (
        <View style={{ gap: 10 }}>
          {data.map((item) => (
            <ParentPanel key={item.id} title={item.title} icon="homework">
              <View style={{ gap: 8 }}>
                <ParentRow
                  title="Subject"
                  meta={item.subject?.name ?? '—'}
                  aside={item.teacher ? <Text style={styles.small}>{item.teacher.name}</Text> : null}
                />
                <ParentRow title="Assigned" meta={formatDate(item.assignedDate)} />
                <ParentRow title="Due" meta={formatDate(item.dueDate)} />
                {item.materials ? <ParentRow title="Materials" meta={item.materials} /> : null}
                <ParentRow
                  title="Submission"
                  meta={item.submission?.submittedAt ? formatDate(item.submission.submittedAt) : 'Not submitted'}
                  aside={
                    <ParentChip label={humanizeStatus(item.submission?.status)} tone={submissionTone(item.submission?.status)} />
                  }
                />
                {item.description ? (
                  <View style={{ marginTop: 6 }}>
                    <Text style={styles.subtitle}>Instructions</Text>
                    <Text style={styles.body}>{item.description}</Text>
                  </View>
                ) : null}
              </View>
            </ParentPanel>
          ))}
        </View>
      )}
    </Layout>
  );
}

const styles = {
  subtitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#475569',
    marginTop: 6,
  },
  body: {
    fontSize: 14,
    color: '#0f172a',
    lineHeight: 20,
  },
  small: {
    fontSize: 12,
    color: '#475569',
  },
} as const;
