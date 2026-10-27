import { View } from 'react-native';

import { Layout } from '../../components/Layout';
import { StatCard, StatGrid } from '../../components/ui';
import { ParentChip, ParentPanel, ParentRow } from '../../components/parent/parentUi';
import { formatDate, humanize } from '../../lib/format';
import { DEMO_ATTENDANCE } from '../../lib/demoData';

interface AttendanceRow {
  id: string;
  date: string;
  status: string;
  remarks: string | null;
}

function statusTone(status: string): 'default' | 'info' | 'success' | 'warning' | 'danger' {
  if (status === 'PRESENT') return 'success';
  if (status === 'ABSENT') return 'danger';
  if (status === 'LATE' || status === 'HALF_DAY') return 'warning';
  if (status === 'EXCUSED') return 'info';
  return 'default';
}

export function StudentAttendanceScreen() {
  const data: AttendanceRow[] = DEMO_ATTENDANCE.map((row) => ({
    id: row.id,
    date: row.date,
    status: row.status,
    remarks: row.remarks,
  }));
  const counts: Record<string, number> = {};
  for (const row of data) counts[row.status] = (counts[row.status] ?? 0) + 1;
  const total = data.length;
  const present = counts.PRESENT ?? 0;
  const percentage = total ? Math.round((present / total) * 100) : 0;

  return (
    <Layout heading="Attendance">
      <StatGrid>
        <StatCard label="Attendance" value={`${percentage}%`} hint={`${present} of ${total} days`} icon="attendance" />
        <StatCard label="Present" value={present} icon="check" tone="success" />
        <StatCard label="Absent" value={counts.ABSENT ?? 0} icon="alert" tone="danger" />
        <StatCard label="Late" value={counts.LATE ?? 0} icon="alert" tone="warning" />
        <StatCard label="Excused" value={counts.EXCUSED ?? 0} icon="shield" tone="info" />
      </StatGrid>

      <ParentPanel title="Daily history" subtitle="Most recent records first" icon="reports">
        {data.length === 0 ? (
          <ParentChip label="No records" tone="default" />
        ) : (
          <View style={{ gap: 8 }}>
            {data.map((row) => (
              <ParentRow
                key={row.id}
                title={formatDate(row.date)}
                meta={row.remarks || undefined}
                aside={<ParentChip label={humanize(row.status)} tone={statusTone(row.status)} />}
              />
            ))}
          </View>
        )}
      </ParentPanel>
    </Layout>
  );
}
