import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState, ErrorState, PageHeader, SkeletonList } from '../../components/ui';
import { Pager, RecordCard, SearchField } from '../../components/DataList';
import { api, type ListMeta } from '../../lib/api';
import { resourceConfig, type Row } from '../../lib/resources';
import { useAsync } from '../../lib/useAsync';

type ResourceRoute = RouteProp<{ resource: { key: string } }, 'resource'>;

const PAGE_LIMIT = 20;
const SEARCH_DEBOUNCE_MS = 400;

export function ResourceListScreen({ resourceKey }: { resourceKey?: string }) {
  const route = useRoute<ResourceRoute>();
  const key = resourceKey ?? route.params?.key;
  const config = resourceConfig(key);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [applied, setApplied] = useState('');

  // Reset paging whenever the module changes.
  useEffect(() => {
    setPage(1);
    setSearch('');
    setApplied('');
  }, [config?.key]);

  useEffect(() => {
    const timer = setTimeout(() => setApplied(search.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  const state = useAsync<{ items: Row[]; meta: ListMeta }>(async () => {
    if (!config) return { items: [], meta: emptyMeta() };
    const result = await api.list<Row>(config.path, {
      page,
      limit: PAGE_LIMIT,
      ...(config.searchable && applied ? { search: applied } : {}),
    });
    return { items: result.items, meta: result.meta };
  }, [config?.key, page, applied]);

  const insets = useSafeAreaInsets();

  if (!config) {
    return <EmptyState message="This module is not available." icon="lock" />;
  }

  const title = config.title;
  const subtitle = config.subtitle;

  if (state.forbidden) {
    return (
      <View style={{ paddingTop: insets.top }}>
        <EmptyState message={`You don't have permission to view ${title}.`} icon="lock" />
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

  return (
    <View style={{ flex: 1, paddingTop: insets.top }}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <PageHeader title={title} subtitle={subtitle} icon={config.icon} />

        {config.searchable ? (
          <SearchField
            value={search}
            onChange={setSearch}
            placeholder={`Search ${title.toLowerCase()}…`}
          />
        ) : null}

        {state.loading ? (
          <SkeletonList rows={6} />
        ) : !state.data || state.data.items.length === 0 ? (
          <EmptyState
            message={
              applied
                ? `No ${title.toLowerCase()} match “${applied}”.`
                : `No ${title.toLowerCase()} yet.`
            }
            icon={config.icon ?? 'inbox'}
          />
        ) : (
          <>
            <View style={styles.list}>
              {state.data.items.map((row, index) => {
                const [primary, ...rest] = config.columns;
                const titleValue = primary ? primary.get(row) : '';
                return (
                  <RecordCard
                    key={idOf(row, index)}
                    title={titleValue}
                    rows={rest.map((col) => ({ label: col.label, value: col.get(row) }))}
                  />
                );
              })}
            </View>
            <Pager
              meta={state.data.meta}
              onPrev={() => setPage((value) => Math.max(1, value - 1))}
              onNext={() => setPage((value) => value + 1)}
            />
          </>
        )}
      </ScrollView>
    </View>
  );
}

function emptyMeta(): ListMeta {
  return { total: 0, page: 1, limit: PAGE_LIMIT, totalPages: 1 };
}

function idOf(row: Row, index: number): string {
  const id = row.id;
  return typeof id === 'string' ? id : `row-${index}`;
}

const styles = {
  list: {
    gap: 8,
  },
} as const;
