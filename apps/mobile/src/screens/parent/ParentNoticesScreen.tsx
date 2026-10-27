import { Text, View } from 'react-native';

import { Layout } from '../../components/Layout';
import { ParentChip, ParentPanel, ParentRow } from '../../components/parent/parentUi';
import { DEMO_NOTICES } from '../../lib/demoData';
import { formatDateTime } from '../../lib/format';
import { colors } from '../../theme';

interface NoticeRow {
  id: string;
  title: string;
  body: string;
  isPinned: boolean;
  publishedAt: string;
  expiresAt?: string | null;
}

export function ParentNoticesScreen() {
  const data: NoticeRow[] = DEMO_NOTICES.map((n) => ({
    id: n.id,
    title: n.title,
    body: n.body,
    isPinned: n.isPinned,
    publishedAt: n.publishedAt,
    expiresAt: n.expiresAt,
  }));

  return (
    <Layout heading="Announcements">
      {data.length === 0 ? (
        <ParentChip label="No announcements" tone="default" />
      ) : (
        <View style={{ gap: 10 }}>
          {data.map((notice) => (
            <ParentPanel key={notice.id} title={notice.title} icon="bell">
              <View style={{ gap: 8 }}>
                <Text style={styles.body}>{notice.body}</Text>
                <ParentRow
                  title="Published"
                  meta={formatDateTime(notice.publishedAt)}
                  aside={notice.isPinned ? <ParentChip label="Pinned" tone="info" /> : null}
                />
                {notice.expiresAt ? (
                  <ParentRow title="Expires" meta={formatDateTime(notice.expiresAt)} />
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
  body: {
    fontSize: 13.5,
    lineHeight: 19,
    color: colors.text,
  },
} as const;
