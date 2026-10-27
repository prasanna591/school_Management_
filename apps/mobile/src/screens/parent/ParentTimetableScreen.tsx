import { Text, View } from 'react-native';

import { Layout } from '../../components/Layout';
import { ParentEmpty, ParentPanel, ParentRow } from '../../components/parent/parentUi';
import { DEMO_SUBJECTS, DEMO_TEACHER_PROFILE, DEMO_TIMETABLE } from '../../lib/demoData';

interface TimetableRow {
  id: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  subject: { name?: string | null };
  teacher?: { name?: string | null } | null;
  room?: string | null;
}

const DAY_ORDER: Record<string, number> = {
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
  SUNDAY: 7,
};

function dayLabel(key: string): string {
  return key
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function ParentTimetableScreen() {
  const data: TimetableRow[] = DEMO_TIMETABLE.map((row) => {
    const subject = DEMO_SUBJECTS.find((s) => s.id === row.subjectId);
    const teacher = DEMO_TEACHER_PROFILE.id === row.teacherId ? DEMO_TEACHER_PROFILE : null;
    return {
      id: row.id,
      dayOfWeek: row.dayOfWeek,
      startTime: row.startTime,
      endTime: row.endTime,
      subject: { name: subject?.name ?? 'Subject' },
      teacher: teacher ? { name: `${teacher.user.firstName} ${teacher.user.lastName}` } : null,
      room: row.room,
    };
  });

  const byDay = new Map<string, TimetableRow[]>();
  for (const row of data) {
    const bucket = byDay.get(row.dayOfWeek) ?? [];
    bucket.push(row);
    byDay.set(row.dayOfWeek, bucket);
  }
  const days = [...byDay.entries()].sort(
    (a, b) => (DAY_ORDER[a[0]] ?? 99) - (DAY_ORDER[b[0]] ?? 99),
  );

  if (days.length === 0) {
    return (
      <Layout heading="Timetable">
        <ParentEmpty message="No timetable has been published for this class yet." hint="Contact your class teacher." />
      </Layout>
    );
  }

  return (
    <Layout heading="Timetable">
      <View style={{ gap: 10 }}>
        {days.map(([day, rows]) => (
          <ParentPanel key={day} title={dayLabel(day)} icon="timetable">
            <View style={{ gap: 8 }}>
              {rows.map((row) => (
                <ParentRow
                  key={row.id}
                  title={row.subject?.name ?? 'Subject'}
                  meta={`${row.startTime} – ${row.endTime}${row.room ? ` · ${row.room}` : ''}`}
                  aside={row.teacher ? <Text style={styles.small}>{row.teacher.name}</Text> : null}
                />
              ))}
            </View>
          </ParentPanel>
        ))}
      </View>
    </Layout>
  );
}

const styles = {
  small: {
    fontSize: 12,
    color: '#475569',
  },
} as const;
