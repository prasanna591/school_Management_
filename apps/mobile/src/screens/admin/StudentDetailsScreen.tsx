import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { EmptyState, ErrorState, PageHeader, SkeletonList } from '../../components/ui';
import { FilterChips, Pager, RecordCard, SearchField } from '../../components/DataList';
import { api, type ListMeta } from '../../lib/api';
import { humanize } from '../../lib/format';
import { useAsync } from '../../lib/useAsync';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface StudentRow {
  id: string;
  admissionNo: string | null;
  rollNo: string | null;
  status: string | null;
  firstName?: string | null;
  lastName?: string | null;
  user?: { firstName?: string | null; lastName?: string | null; email?: string | null } | null;
  section?: { name?: string | null; classLevel?: { name?: string | null } | null } | null;
}

interface SectionRow {
  id: string;
  name: string;
  classLevel?: { name?: string | null } | null;
}

interface StudentPage {
  items: StudentRow[];
  meta: ListMeta;
}

type StatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';

const PAGE_LIMIT = 20;
const SEARCH_DEBOUNCE_MS = 400;

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
];

/**
 * Student Details: the real student directory (`/students`) with free-text
 * search (name, admission number) and filters by status and section, plus
 * paging. Class and roll number come straight from the API record.
 */
export function StudentDetailsScreen() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [applied, setApplied] = useState('');
  const [status, setStatus] = useState<StatusFilter>('ALL');
  const [sectionId, setSectionId] = useState<string>('');

  useEffect(() => {
    const timer = setTimeout(() => setApplied(search.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  // Any filter change jumps back to the first page.
  useEffect(() => {
    setPage(1);
  }, [applied, status, sectionId]);

  const sectionsState = useAsync(() => api.list<SectionRow>('/sections', { limit: 100 }), []);

  const state = useAsync<StudentPage>(
    () =>
      api.list<StudentRow>('/students', {
        page,
        limit: PAGE_LIMIT,
        ...(applied ? { search: applied } : {}),
        ...(status !== 'ALL' ? { status } : {}),
        ...(sectionId ? { sectionId } : {}),
      }),
    [page, applied, status, sectionId],
  );

  const sections = sectionsState.data?.items ?? [];
  const sectionLabel = useMemo(() => {
    const map = new Map<string, string>();
    for (const section of sections) {
      const cls = section.classLevel?.name?.trim();
      map.set(section.id, cls ? `${cls} · ${section.name}` : section.name);
    }
    return map;
  }, [sections]);

  const insets = useSafeAreaInsets();

  if (state.forbidden) {
    return (
      <View style={{ paddingTop: insets.top }}>
        <EmptyState message="You don't have permission to view students." icon="lock" />
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
        <PageHeader
          title="Student Details"
          subtitle={state.data ? `${state.data.meta.total} students` : undefined}
          icon="students"
        />

        <SearchField
          value={search}
          onChange={setSearch}
          placeholder="Search by name or admission no…"
        />

        <FilterChips options={STATUS_OPTIONS} value={status} onChange={setStatus} />

        {sections.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.sectionChips}
          >
            <SectionChip
              label="All sections"
              active={sectionId === ''}
              onPress={() => setSectionId('')}
            />
            {sections.map((section) => (
              <SectionChip
                key={section.id}
                label={sectionLabel.get(section.id) ?? section.name}
                active={sectionId === section.id}
                onPress={() => setSectionId(section.id)}
              />
            ))}
          </ScrollView>
        ) : null}

        {state.loading ? (
          <SkeletonList rows={6} />
        ) : !state.data || state.data.items.length === 0 ? (
          <EmptyState
            message={applied ? `No students match “${applied}”.` : 'No students found.'}
            icon="students"
          />
        ) : (
          <>
            <View style={styles.list}>
              {state.data.items.map((student) => (
                <RecordCard
                  key={student.id}
                  title={studentName(student)}
                  rows={[
                    { label: 'Admission No', value: student.admissionNo ?? '' },
                    { label: 'Class', value: classLabel(student) },
                    { label: 'Roll No', value: student.rollNo ?? '' },
                    { label: 'Status', value: humanize(student.status) },
                  ]}
                />
              ))}
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

function SectionChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active ? styles.chipActive : null]}
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
    >
      <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>{label}</Text>
    </Pressable>
  );
}

function studentName(student: StudentRow): string {
  const first = student.user?.firstName ?? student.firstName ?? '';
  const last = student.user?.lastName ?? student.lastName ?? '';
  const name = `${first} ${last}`.trim();
  return name || student.admissionNo || 'Student';
}

function classLabel(student: StudentRow): string {
  const cls = student.section?.classLevel?.name?.trim();
  const section = student.section?.name?.trim();
  return [cls, section].filter(Boolean).join(' · ');
}

const styles = {
  list: {
    gap: 8,
  },
  sectionChips: {
    gap: 8,
    paddingVertical: 2,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  chipActive: {
    backgroundColor: '#1d4ed8',
    borderColor: '#1d4ed8',
  },
  chipText: {
    color: '#334155',
    fontSize: 13,
  },
  chipTextActive: {
    color: '#ffffff',
    fontWeight: '600' as const,
  },
} as const;
