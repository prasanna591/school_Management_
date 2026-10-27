import { Pressable, Text, View } from 'react-native';
import { Linking } from 'react-native';

import { Layout } from '../../components/Layout';
import { ParentChip, ParentEmpty, ParentPanel, ParentRow } from '../../components/parent/parentUi';
import { formatDate, humanize } from '../../lib/format';
import { DEMO_HOMEWORK } from '../../lib/demoData';

interface HomeworkAttachment {
  id: string;
  name: string;
  url: string;
}

interface HomeworkSubmission {
  status: string;
  submittedAt: string | null;
  remarks: string | null;
}

interface ChildHomework {
  id: string;
  title: string;
  description: string | null;
  materials: string | null;
  assignedDate: string;
  dueDate: string;
  subject?: { id?: string; name?: string | null } | null;
  teacher?: { id?: string; name?: string | null } | null;
  attachments: HomeworkAttachment[];
  submission: HomeworkSubmission | null;
}

function submissionTone(status: string | undefined): 'default' | 'info' | 'success' | 'warning' | 'danger' {
  switch (status) {
    case 'SUBMITTED':
      return 'info';
    case 'LATE':
      return 'danger';
    case 'GRADED':
      return 'success';
    default:
      return 'warning';
  }
}

export function ParentHomeworkScreen() {
  const data: ChildHomework[] = DEMO_HOMEWORK.map((item) => ({
    id: item.id,
    title: item.title,
    description: item.description,
    materials: item.materials,
    assignedDate: item.assignedDate,
    dueDate: item.dueDate,
    subject: item.subject ? { id: item.subject.id, name: item.subject.name } : null,
    teacher: item.teacher ? { id: item.teacher.id, name: `${item.teacher.user.firstName} ${item.teacher.user.lastName}` } : null,
    attachments: item.attachments,
    submission: item.submissions[0] ?? null,
  }));

  return (
    <Layout heading="Homework">
      {data.length === 0 ? (
        <ParentEmpty message="No homework has been assigned yet." hint="Assignments set by teachers will appear here." />
      ) : (
        <View style={styles.grid}>
          {data.map((item) => (
            <HomeworkCard key={item.id ?? 'unknown'} item={item} />
          ))}
        </View>
      )}
    </Layout>
  );
}

function HomeworkCard({ item }: { item: ChildHomework }) {
  const status = item.submission ? humanize(item.submission.status) : 'Not submitted';
  return (
    <ParentPanel title={item.title} icon="homework">
      <View style={styles.cardBody}>
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
          aside={<ParentChip label={status} tone={submissionTone(item.submission?.status)} />}
        />
        {item.description ? (
          <View style={{ marginTop: 6 }}>
            <Text style={styles.subtitle}>Instructions</Text>
            <Text style={styles.body}>{item.description}</Text>
          </View>
        ) : null}
        {item.attachments.length > 0 ? (
          <View style={{ marginTop: 6, gap: 2 }}>
            <Text style={styles.subtitle}>Attachments</Text>
            {item.attachments.map((attachment) => (
              <Pressable
                key={attachment.id}
                onPress={() => void Linking.openURL(attachment.url).catch(() => undefined)}
                style={styles.attachmentRow}
              >
                <Text style={styles.attachment}>{attachment.name}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>
    </ParentPanel>
  );
}

const styles = {
  grid: {
    gap: 12,
  },
  cardBody: {
    gap: 8,
  },
  subtitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#475569',
    marginTop: 6,
  },
  body: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 20,
  },
  small: {
    fontSize: 12,
    color: '#475569',
  },
  attachmentRow: {
    paddingVertical: 4,
  },
  attachment: {
    fontSize: 13,
    color: '#1d4ed8',
    textDecorationLine: 'underline',
  },
} as const;
