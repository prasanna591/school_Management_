import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { useRealtime } from '../../components/RealtimeProvider';
import { EmptyState, ErrorState, PageHeader, SkeletonList } from '../../components/ui';
import { FilterChips, Pager } from '../../components/DataList';
import { api, type ListMeta } from '../../lib/api';
import { formatDateTime, humanize } from '../../lib/format';
import { useAsync } from '../../lib/useAsync';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  data?: Record<string, unknown> | null;
}

interface NotificationsResult {
  items: NotificationItem[];
  meta: ListMeta;
  unread: number;
  /** True when the list was filtered on the client (Read filter). */
  clientFiltered: boolean;
}

type Filter = 'ALL' | 'UNREAD' | 'READ';

const PAGE_LIMIT = 20;
/** The API has no read-only filter, so Read fetches one page and filters locally. */
const READ_SCAN_LIMIT = 100;

const FILTER_OPTIONS: { value: Filter; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'UNREAD', label: 'Unread' },
  { value: 'READ', label: 'Read' },
];

/**
 * Notification inbox. Supports paging, All/Unread/Read filters, marking single
 * or all read and deleting, and refreshes whenever a realtime notification
 * arrives. Everything is backed by the real `/notifications` API.
 */
export function NotificationsScreen() {
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<Filter>('ALL');
  const { version, refreshUnread } = useRealtime();
  const [busyId, setBusyId] = useState<string | null>(null);

  const state = useAsync<NotificationsResult>(async () => {
    const [list, count] = await Promise.all([
      api.list<NotificationItem>('/notifications', {
        page: filter === 'READ' ? 1 : page,
        limit: filter === 'READ' ? READ_SCAN_LIMIT : PAGE_LIMIT,
        ...(filter === 'UNREAD' ? { unreadOnly: 'true' } : {}),
      }),
      api.get<{ count: number }>('/notifications/unread-count'),
    ]);
    const items = filter === 'READ' ? list.items.filter((item) => item.isRead) : list.items;
    return {
      items,
      meta: list.meta,
      unread: count.count,
      clientFiltered: filter === 'READ',
    };
  }, [page, filter, version]);

  const meta = state.data?.meta;
  const run = async (id: string, action: () => Promise<unknown>) => {
    setBusyId(id);
    try {
      await action();
      state.reload();
      void refreshUnread();
    } finally {
      setBusyId(null);
    }
  };

  const insets = useSafeAreaInsets();

  if (state.forbidden) {
    return (
      <View style={{ paddingTop: insets.top }}>
        <EmptyState message="You don't have permission to read notifications." icon="lock" />
      </View>
    );
  }
  if (state.loading) {
    return (
      <View style={{ paddingTop: insets.top }}>
        <Header
          title="Notifications"
          subtitle={state.data ? `${state.data.unread} unread` : undefined}
          filter={filter}
          onFilter={(next) => {
            setFilter(next);
            setPage(1);
          }}
        />
        <SkeletonList rows={6} />
      </View>
    );
  }
  if (state.error) {
    return (
      <View style={{ paddingTop: insets.top }}>
        <ErrorState message={state.error} onRetry={state.reload} />
      </View>
    );
  }
  if (!state.data) return null;

  const items = state.data.items;
  const unread = state.data.unread;
  const emptyMessage =
    filter === 'UNREAD'
      ? 'No unread notifications.'
      : filter === 'READ'
        ? 'No read notifications in the latest 100.'
        : 'No notifications yet.';

  return (
    <View style={{ flex: 1, paddingTop: insets.top }}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Header
          title="Notifications"
          subtitle={unread > 0 ? `${unread} unread` : 'You are all caught up'}
          filter={filter}
          onFilter={(next) => {
            setFilter(next);
            setPage(1);
          }}
          action={
            unread > 0 ? (
              <Pressable
                style={styles.smallButton}
                onPress={() => void run('all', () => api.patch('/notifications/read-all'))}
              >
                <Text style={styles.smallButtonText}>Mark all read</Text>
              </Pressable>
            ) : null
          }
        />

        {items.length === 0 ? (
          <EmptyState message={emptyMessage} icon="bell" />
        ) : (
          <View style={styles.list}>
            {items.map((item) => (
              <View key={item.id} style={[styles.card, item.isRead ? null : styles.cardUnread]}>
                <View style={styles.cardHeader}>
                  <Text style={item.isRead ? styles.cardTitle : styles.cardTitleUnread}>
                    {item.title}
                  </Text>
                  <Text style={styles.type}>{humanize(item.type)}</Text>
                </View>
                {item.body ? <Text style={styles.body}>{item.body}</Text> : null}
                <Text style={styles.muted}>{formatDateTime(item.createdAt)}</Text>
                <View style={styles.actions}>
                  {!item.isRead ? (
                    <Pressable
                      style={styles.linkButton}
                      disabled={busyId === item.id}
                      onPress={() =>
                        void run(item.id, () => api.patch(`/notifications/${item.id}/read`))
                      }
                    >
                      <Text style={styles.linkButtonText}>Mark read</Text>
                    </Pressable>
                  ) : null}
                  <Pressable
                    style={styles.linkButton}
                    disabled={busyId === item.id}
                    onPress={() => void run(item.id, () => api.delete(`/notifications/${item.id}`))}
                  >
                    <Text style={styles.linkButtonTextDanger}>Delete</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}

        {!state.data.clientFiltered ? (
          <Pager
            meta={meta ?? { total: 0, page: 1, limit: PAGE_LIMIT, totalPages: 1 }}
            onPrev={() => setPage((value) => Math.max(1, value - 1))}
            onNext={() => setPage((value) => value + 1)}
          />
        ) : null}
      </ScrollView>
    </View>
  );
}

function Header({
  title,
  subtitle,
  action,
  filter,
  onFilter,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  filter: Filter;
  onFilter: (filter: Filter) => void;
}) {
  return (
    <View style={styles.headerBlock}>
      <PageHeader title={title} subtitle={subtitle} icon="bell" actions={action} />
      <FilterChips options={FILTER_OPTIONS} value={filter} onChange={onFilter} />
    </View>
  );
}

const styles = {
  headerBlock: {
    gap: 8,
  },
  list: {
    gap: 8,
  },
  card: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    gap: 4,
  },
  cardUnread: {
    borderLeftWidth: 4,
    borderLeftColor: '#1d4ed8',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    flexShrink: 1,
  },
  cardTitleUnread: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    flexShrink: 1,
  },
  type: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  body: {
    fontSize: 13,
    color: '#334155',
  },
  muted: {
    fontSize: 12,
    color: '#94a3b8',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 2,
  },
  linkButton: {
    paddingVertical: 2,
  },
  linkButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1d4ed8',
  },
  linkButtonTextDanger: {
    fontSize: 13,
    fontWeight: '600',
    color: '#dc2626',
  },
  smallButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  smallButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
} as const;
