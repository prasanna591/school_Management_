import { View } from 'react-native';

import { Layout } from '../../components/Layout';
import { ParentChip, ParentEmpty, ParentPanel, ParentRow } from '../../components/parent/parentUi';
import { DEMO_EXAM_RESULTS } from '../../lib/demoData';

interface ResultRow {
  id: string;
  marksObtained: number | string;
  maxMarks: number | string;
  grade: string | null;
  remarks: string | null;
  exam?: { name?: string | null; type?: string | null } | null;
  subject?: { name?: string | null } | null;
}

function percentage(row: ResultRow): string {
  const obtained = Number(row.marksObtained);
  const total = Number(row.maxMarks);
  if (!total || Number.isNaN(obtained) || Number.isNaN(total)) return '—';
  return `${Math.round((obtained / total) * 100)}%`;
}

function gradeTone(grade: string | null | undefined): 'default' | 'info' | 'success' | 'warning' | 'danger' {
  if (!grade) return 'default';
  const g = grade.toUpperCase();
  if (g.startsWith('A') || g === 'O') return 'success';
  if (g.startsWith('B')) return 'success';
  if (g.startsWith('C')) return 'info';
  if (g.startsWith('D')) return 'warning';
  return 'danger';
}

export function StudentResultsScreen() {
  const data: ResultRow[] = DEMO_EXAM_RESULTS.map((r: { id: string; marksObtained: number; maxMarks: number; grade: string | null; remarks: string | null }) => ({
    id: r.id,
    marksObtained: r.marksObtained,
    maxMarks: r.maxMarks,
    grade: r.grade,
    remarks: r.remarks,
    exam: { name: 'Mathematics Unit Test 1', type: 'UNIT_TEST' },
    subject: { name: 'Mathematics' },
  }));

  return (
    <Layout heading="Results">
      {data.length === 0 ? (
        <ParentEmpty message="No published results yet." hint="Results appear once your teacher publishes them." />
      ) : (
        <View style={{ gap: 10 }}>
          {data.map((row) => (
            <ParentPanel key={row.id} title={row.subject?.name ?? 'Result'} icon="marks">
              <View style={{ gap: 8 }}>
                <ParentRow
                  title="Exam"
                  meta={[row.exam?.name, row.exam?.type].filter(Boolean).join(' · ') || '—'}
                />
                <ParentRow title="Score" meta={`${row.marksObtained} / ${row.maxMarks}`} />
                <ParentRow title="Percentage" meta={percentage(row)} />
                {row.grade ? (
                  <ParentRow title="Grade" meta={row.grade} aside={<ParentChip label={row.grade} tone={gradeTone(row.grade)} />} />
                ) : null}
                {row.remarks ? <ParentRow title="Remarks" meta={row.remarks} /> : null}
              </View>
            </ParentPanel>
          ))}
        </View>
      )}
    </Layout>
  );
}
