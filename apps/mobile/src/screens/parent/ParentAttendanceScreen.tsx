import { Text, View } from 'react-native';

import { Layout } from '../../components/Layout';
import { ParentChip, ParentPanel, ParentRow } from '../../components/parent/parentUi';
import { StatCard, StatGrid } from '../../components/ui';
import { formatDate, humanize } from '../../lib/format';
import { parentColors } from '../../theme';
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

function monthKey(date: string): string {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(key: string): string {
  const [year, month] = key.split('-');
  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
  });
}

interface MonthSummary {
  key: string;
  present: number;
  absent: number;
  late: number;
  total: number;
}

function summarise(rows: AttendanceRow[]): MonthSummary[] {
  const byMonth = new Map<string, MonthSummary>();
  for (const row of rows) {
    const key = monthKey(row.date);
    const bucket = byMonth.get(key) ?? { key, present: 0, absent: 0, late: 0, total: 0 };
    bucket.total += 1;
    if (row.status === 'PRESENT') bucket.present += 1;
    if (row.status === 'ABSENT') bucket.absent += 1;
    if (row.status === 'LATE') bucket.late += 1;
    byMonth.set(key, bucket);
  }
  return [...byMonth.values()].sort((a, b) => (a.key < b.key ? 1 : -1));
}

export function ParentAttendanceScreen() {
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
  const months = summarise(data);

  return (
    <Layout heading="Attendance">
      <StatGrid>
        <StatCard
          label="Attendance"
          value={`${percentage}%`}
          hint={`${present} of ${data.length} days`}
          icon="attendance"
          tone={percentage >= 85 ? 'success' : percentage >= 70 ? 'warning' : 'danger'}
          iconColor={parentColors.accent}
        />
        <StatCard label="Present" value={present} icon="check" tone="success" />
        <StatCard label="Absent" value={counts.ABSENT ?? 0} icon="alert" tone="danger" />
        <StatCard label="Late" value={counts.LATE ?? 0} icon="timetable" tone="warning" />
        <StatCard label="Excused" value={counts.EXCUSED ?? 0} icon="shield" tone="info" />
        <StatCard label="Half day" value={counts.HALF_DAY ?? 0} icon="timetable" tone="warning" />
      </StatGrid>

      <ParentPanel title="Monthly summary" subtitle="Attendance by month" icon="timetable">
        {months.length === 0 ? (
          <ParentChip label="No records" tone="default" />
        ) : (
          <View style={{ gap: 8 }}>
            {months.map((month) => (
              <ParentRow
                key={month.key}
                title={monthLabel(month.key)}
                meta={`${month.total} recorded days`}
                aside={
                  <View style={{ alignItems: 'flex-end', gap: 2 }}>
                    <Text style={styles.asideStrong}>
                      {month.total ? `${Math.round((month.present / month.total) * 100)}%` : '—'}
                    </Text>
                    <Text style={styles.aside}>
                      {month.present}P · {month.absent}A · {month.late}L
                    </Text>
                  </View>
                }
              />
            ))}
          </View>
        )}
      </ParentPanel>

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

const styles = {
  aside: {
    fontSize: 12,
    color: '#64748b',
  },
  asideStrong: {
    fontSize: 13.5,
    fontWeight: '700' as const,
    color: '#0f172a',
  },
} as const;
