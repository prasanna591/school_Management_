import type {
  UniversityActivityItem,
  UniversityDashboard,
  UniversityDesignationCount,
  UniversityPerformancePoint,
} from '@smartschool/shared';
import { Permission, Role } from '@smartschool/shared';
import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Icon, type IconName } from '../components/Icon';
import { JoiningPanel } from '../components/JoiningPanel';
import { StudentEnrollmentPanel } from '../components/StudentEnrollmentPanel';
import { CountUp, ErrorState, Spinner } from '../components/ui';
import { api, buildQuery } from '../lib/api';
import { useAuth } from '../lib/auth';
import { formatDate, formatDateTime, humanize } from '../lib/format';
import { can } from '../lib/permissions';
import {
  areaPath,
  conicGradient,
  designationLegend,
  linePath,
  performanceCeiling,
  performanceCoordinates,
} from '../lib/university';
import { useAsync } from '../lib/useAsync';
import { DashboardSections } from './DashboardPage';
import { ForbiddenPage } from './ForbiddenPage';
import './UniversityDashboardPage.css';

const CHART_WIDTH = 600;
const CHART_HEIGHT = 200;

type DashTone = 'blue' | 'amber' | 'violet' | 'rose' | 'emerald';

interface StatTileProps {
  icon: IconName;
  label: string;
  value: ReactNode;
  tone: DashTone;
  hint?: string;
}

function StatTile({ icon, label, value, tone, hint }: StatTileProps) {
  return (
    <article className={`uni-stat uni-stat--${tone}`}>
      <span className="uni-stat__icon">
        <Icon name={icon} size={20} />
      </span>
      <div className="uni-stat__body">
        <p className="uni-stat__value">
          <CountUp value={value} />
        </p>
        <p className="uni-stat__label">{label}</p>
        {hint ? <p className="uni-stat__hint">{hint}</p> : null}
      </div>
    </article>
  );
}

interface PanelProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  span?: 4 | 5 | 6 | 7 | 8 | 12;
  children: ReactNode;
}

function Panel({ title, subtitle, action, span = 6, children }: PanelProps) {
  return (
    <section className={`uni-panel uni-panel--span${span}`}>
      <div className="uni-panel__head">
        <div>
          <h2 className="uni-panel__title">{title}</h2>
          {subtitle ? <p className="uni-panel__subtitle">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function ViewAllLink({ to }: { to: string }) {
  return (
    <Link className="uni-link" to={to}>
      View all
      <Icon name="arrow-right" size={14} />
    </Link>
  );
}

function BarList({
  items,
  formatValue,
}: {
  items: readonly { name: string; count: number }[];
  formatValue?: (value: number) => string;
}) {
  if (items.length === 0) return <p className="uni-empty">No data yet.</p>;
  const peak = Math.max(1, ...items.map((item) => item.count));
  return (
    <ul className="uni-barlist">
      {items.map((item) => (
        <li key={item.name} className="uni-barlist__row" title={`${item.name}: ${item.count}`}>
          <span className="uni-barlist__label" title={item.name}>
            {item.name}
          </span>
          <span className="uni-barlist__track">
            <span className="uni-barlist__fill" style={{ width: `${(item.count / peak) * 100}%` }} />
          </span>
          <span className="uni-barlist__value">
            {formatValue ? formatValue(item.count) : item.count}
          </span>
        </li>
      ))}
    </ul>
  );
}

function PerformanceChart({ points }: { points: UniversityPerformancePoint[] }) {
  if (points.length === 0) return <p className="uni-empty">No exam results recorded yet.</p>;
  const ceiling = performanceCeiling(points);
  const coordinates = performanceCoordinates(points, CHART_WIDTH, CHART_HEIGHT, ceiling);
  return (
    <div className="uni-chart">
      <svg
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        className="uni-chart__svg"
        preserveAspectRatio="none"
        role="img"
        aria-label="Average marks by month"
      >
        <defs>
          <linearGradient id="uni-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#4f46e5" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="uni-line" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#4f46e5" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
          <line
            key={ratio}
            className="uni-chart__grid"
            x1={0}
            x2={CHART_WIDTH}
            y1={ratio * CHART_HEIGHT}
            y2={ratio * CHART_HEIGHT}
          />
        ))}
        <path
          d={areaPath(coordinates, CHART_HEIGHT)}
          className="uni-chart__area"
          fill="url(#uni-area)"
        />
        <path d={linePath(coordinates)} className="uni-chart__line" stroke="url(#uni-line)" />
        {coordinates.map((point, index) => (
          <circle
            key={points[index]?.month ?? index}
            className="uni-chart__dot"
            cx={point.x}
            cy={point.y}
            r={4}
          />
        ))}
      </svg>
      <div className="uni-chart__labels">
        {points.map((point) => (
          <span key={point.month} className="uni-chart__label">
            {point.label}
            <small>{point.average}%</small>
          </span>
        ))}
      </div>
    </div>
  );
}

function DonutChart({ items }: { items: UniversityDesignationCount[] }) {
  const legend = designationLegend(items);
  if (legend.length === 0) return <p className="uni-empty">No teaching staff recorded yet.</p>;
  const total = legend.reduce((sum, item) => sum + item.count, 0);
  return (
    <div className="uni-donut">
      <div
        className="uni-donut__ring"
        style={{
          background: conicGradient(
            legend.map((item) => ({ designation: item.key, percentage: item.percentage })),
          ),
        }}
      >
        <div className="uni-donut__hole">
          <span className="uni-donut__total">{total}</span>
          <small>teachers</small>
        </div>
      </div>
      <ul className="uni-donut__legend">
        {legend.map((item) => (
          <li key={item.key} className="uni-donut__legend-row">
            <span className="uni-dot" style={{ background: item.color }} />
            <span className="uni-donut__legend-label">{item.label}</span>
            <span className="uni-donut__legend-value">
              {item.count} · {item.percentage}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DataTable({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="uni-table-wrap">
      <table className="uni-table">
        <thead>
          <tr>
            {head.map((label) => (
              <th key={label}>{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function ActivityList({ items }: { items: UniversityActivityItem[] }) {
  if (items.length === 0) return <p className="uni-empty">No recent activity.</p>;
  return (
    <ul className="uni-activity">
      {items.map((item) => (
        <li key={item.id} className="uni-activity__item">
          <span className="uni-activity__dot" />
          <div>
            <p className="uni-activity__title">
              {humanize(item.action)} · {humanize(item.entity)}
            </p>
            <p className="uni-activity__meta">
              {item.actor ?? 'System'} · {formatDateTime(item.createdAt)}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

interface QuickAction {
  label: string;
  to: string;
  icon: IconName;
  tone: DashTone;
  primary?: boolean;
  permission?: Permission;
  roles?: readonly Role[];
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    label: 'Add Student',
    to: '/resource/students',
    icon: 'students',
    tone: 'blue',
    permission: Permission.STUDENT_CREATE,
  },
  {
    label: 'Add Teacher',
    to: '/resource/teachers',
    icon: 'teacher',
    tone: 'amber',
    permission: Permission.TEACHER_MANAGE,
  },
  {
    label: 'Create Exam',
    to: '/resource/exams',
    icon: 'subject',
    tone: 'rose',
    permission: Permission.EXAM_MANAGE,
  },
  {
    label: 'Enter Marks',
    to: '/exams/marks',
    icon: 'marks',
    tone: 'emerald',
    permission: Permission.RESULT_MANAGE,
  },
  {
    label: 'View Reports',
    to: '/reports',
    icon: 'reports',
    tone: 'violet',
    primary: true,
    permission: Permission.REPORT_READ,
  },
];

function QuickActions({ role }: { role: Role }) {
  const actions = QUICK_ACTIONS.filter((action) => {
    if (action.roles && !action.roles.includes(role)) return false;
    return !action.permission || can(role, action.permission);
  });
  if (actions.length === 0) return null;
  return (
    <Panel title="Quick actions" subtitle="Jump straight into common tasks" span={12}>
      <div className="uni-actions">
        {actions.map((action) => (
          <Link
            key={action.to}
            className={`uni-action uni-action--${action.tone}${
              action.primary ? ' uni-action--primary' : ''
            }`}
            to={action.to}
          >
            <span className="uni-action__icon">
              <Icon name={action.icon} size={16} />
            </span>
            <span className="uni-action__label">{action.label}</span>
          </Link>
        ))}
      </div>
    </Panel>
  );
}

function MiniStat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="uni-mini">
      <span className="uni-mini__value">
        <CountUp value={value} />
      </span>
      <span className="uni-mini__label">{label}</span>
    </div>
  );
}

function ThemeIcon({ dark }: { dark: boolean }) {
  return dark ? (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  ) : (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </svg>
  );
}

const THEME_STORAGE_KEY = 'uni-dash-theme';

function initialTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  try {
    return window.localStorage.getItem(THEME_STORAGE_KEY) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export function UniversityDashboardPage() {
  const { user } = useAuth();
  const [academicYearId, setAcademicYearId] = useState('');
  const [theme, setTheme] = useState<'light' | 'dark'>(initialTheme);
  const state = useAsync<UniversityDashboard>(
    () => api.get<UniversityDashboard>(`/reports/university${buildQuery({ academicYearId })}`),
    [academicYearId],
  );

  useEffect(() => {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      /* storage unavailable — theme still applies for this session */
    }
  }, [theme]);

  if (state.forbidden) return <ForbiddenPage />;

  const data = state.data;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const displayName = user ? user.firstName.trim() || humanize(user.role) : '';
  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="page uni-dash" data-dash-theme={theme}>
      <header className="uni-head">
        <div className="uni-head__main">
          <p className="uni-greeting">
            {greeting}
            {displayName ? (
              <>
                , <strong>{displayName}</strong>
              </>
            ) : null}
          </p>
          <p className="uni-date">
            <Icon name="timetable" size={14} />
            {today}
          </p>
          <h1 className="uni-title">School dashboard</h1>
          <p className="uni-subtitle">Students, staff, exams and performance in real time.</p>
        </div>
        <div className="uni-head__controls">
          <select
            className="uni-select"
            aria-label="Academic year"
            value={academicYearId}
            onChange={(event) => setAcademicYearId(event.target.value)}
          >
            <option value="">Current academic year</option>
            {(data?.academicYears ?? []).map((year) => (
              <option key={year.id} value={year.id}>
                {year.name}
                {year.isCurrent ? ' (current)' : ''}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="uni-btn"
            onClick={state.reload}
            disabled={state.loading}
          >
            <Icon name="refresh" size={16} />
            Refresh
          </button>
          <button
            type="button"
            className="uni-icon-btn"
            onClick={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
          >
            <ThemeIcon dark={theme === 'dark'} />
          </button>
        </div>
      </header>

      {state.loading && !data ? (
        <Spinner label="Loading university dashboard…" />
      ) : state.error ? (
        <ErrorState message={state.error} onRetry={state.reload} />
      ) : data ? (
        <div className="uni-grid">
          <section className="uni-stats" aria-label="Key metrics">
            <StatTile icon="students" label="Students" value={data.overview.students} tone="blue" />
            <StatTile icon="teacher" label="Teachers" value={data.overview.teachers} tone="amber" />
            <StatTile icon="subject" label="Subjects" value={data.overview.courses} tone="violet" />
            <StatTile
              icon="marks"
              label="Exams"
              value={data.overview.exams}
              tone="rose"
              hint={data.overview.exams === 0 ? 'No exams yet. Create your first exam.' : undefined}
            />
            <StatTile
              icon="trending"
              label="Average marks"
              value={`${data.overview.averageMarks}%`}
              tone="emerald"
              hint={data.overview.averageMarks === 0 ? 'No marks recorded yet.' : undefined}
            />
          </section>

          {user ? <QuickActions role={user.role} /> : null}

          <JoiningPanel />

          {data.students ? (
            <>
              <StudentEnrollmentPanel students={data.students} />

              <Panel
                title="Recent admissions"
                subtitle="Latest students on record"
                action={
                  user && can(user.role, Permission.STUDENT_READ) ? (
                    <ViewAllLink to="/resource/students" />
                  ) : undefined
                }
                span={5}
              >
                <DataTable head={['Student', 'Admission No', 'Class', 'Status', 'Joined']}>
                  {data.students.recent.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="uni-empty">
                        No students yet.
                      </td>
                    </tr>
                  ) : (
                    data.students.recent.map((student) => (
                      <tr key={student.id}>
                        <td>{student.name ?? '—'}</td>
                        <td>{student.admissionNo}</td>
                        <td>{student.className ?? '—'}</td>
                        <td>
                          <span className="uni-badge">{humanize(student.status)}</span>
                        </td>
                        <td>{formatDate(student.admissionDate)}</td>
                      </tr>
                    ))
                  )}
                </DataTable>
              </Panel>
            </>
          ) : null}

          {data.teachers ? (
            <>
              <Panel title="Teaching staff" subtitle="Employment and workload" span={5}>
                <div className="uni-mini-row">
                  <MiniStat label="Total" value={data.teachers.total} />
                  <MiniStat label="Active" value={data.teachers.active} />
                  <MiniStat label="Full time" value={data.teachers.fullTime} />
                  <MiniStat label="Part time" value={data.teachers.partTime} />
                </div>
                <h3 className="uni-subtitle">By employment type</h3>
                <BarList
                  items={data.teachers.byEmploymentType.map((item) => ({
                    name: item.label,
                    count: item.count,
                  }))}
                />
                <h3 className="uni-subtitle">Workload</h3>
                <p className="uni-note">
                  {data.teachers.workload.assignments} assignments ·{' '}
                  {data.teachers.workload.average} average per teacher
                </p>
              </Panel>

              <Panel
                title="Recent teachers"
                subtitle="Newest teaching staff"
                action={
                  user && can(user.role, Permission.TEACHER_READ) ? (
                    <ViewAllLink to="/resource/teachers" />
                  ) : undefined
                }
                span={7}
              >
                <DataTable head={['Teacher', 'Employee No', 'Designation', 'Subjects', 'Workload']}>
                  {data.teachers.recent.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="uni-empty">
                        No teachers yet.
                      </td>
                    </tr>
                  ) : (
                    data.teachers.recent.map((teacher) => (
                      <tr key={teacher.id}>
                        <td>{teacher.name ?? '—'}</td>
                        <td>{teacher.employeeNo}</td>
                        <td>
                          <span className="uni-badge">{teacher.designationLabel}</span>
                        </td>
                        <td>{teacher.subjects}</td>
                        <td>{teacher.workload}</td>
                      </tr>
                    ))
                  )}
                </DataTable>
              </Panel>
            </>
          ) : null}

          {data.exams ? (
            <>
              <Panel
                title="Performance trend"
                subtitle="Average marks scored over recent exams"
                span={12}
              >
                <div className="uni-mini-row">
                  <MiniStat label="Average marks" value={`${data.exams.averageMarks}%`} />
                  <MiniStat label="Pass rate" value={`${data.exams.passRate}%`} />
                  <MiniStat label="Exams" value={data.exams.total} />
                  <MiniStat label="Results" value={data.exams.results} />
                </div>
                <PerformanceChart points={data.exams.performance} />
              </Panel>

              <Panel title="Recent exams" subtitle="Scheduled and completed" span={6}>
                <DataTable head={['Exam', 'Class', 'Date', 'Results']}>
                  {data.exams.recent.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="uni-empty">
                        No exams yet.
                      </td>
                    </tr>
                  ) : (
                    data.exams.recent.map((exam) => (
                      <tr key={exam.id}>
                        <td>{exam.name}</td>
                        <td>{exam.className ?? '—'}</td>
                        <td>{formatDate(exam.startDate)}</td>
                        <td>{exam.results}</td>
                      </tr>
                    ))
                  )}
                </DataTable>
              </Panel>

              <Panel title="Recent results" subtitle="Latest marks recorded" span={6}>
                <DataTable head={['Student', 'Subject', 'Marks', '%', 'Grade']}>
                  {data.exams.recentResults.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="uni-empty">
                        No results yet.
                      </td>
                    </tr>
                  ) : (
                    data.exams.recentResults.map((result) => (
                      <tr key={result.id}>
                        <td>{result.studentName ?? result.admissionNo ?? '—'}</td>
                        <td>{result.subject}</td>
                        <td>
                          {result.marksObtained}/{result.maxMarks}
                        </td>
                        <td>
                          <span className="uni-badge">{result.percentage}%</span>
                        </td>
                        <td>{result.grade ?? '—'}</td>
                      </tr>
                    ))
                  )}
                </DataTable>
              </Panel>
            </>
          ) : null}

          {data.roleAnalytics ? (
            <Panel title="Role analytics" subtitle="Teaching staff by designation" span={5}>
              <DonutChart items={data.roleAnalytics.byDesignation} />
            </Panel>
          ) : null}

          {data.activity ? (
            <Panel
              title="Recent activity"
              subtitle="Latest actions across the campus"
              span={data.roleAnalytics ? 7 : 12}
            >
              <ActivityList items={data.activity} />
            </Panel>
          ) : null}

          <section className="uni-ops">
            <div className="uni-ops__head">
              <h2 className="uni-ops__title">Operations</h2>
              <p className="uni-ops__subtitle">
                Finance, attendance, admissions and joining trends.
              </p>
            </div>
            <DashboardSections showQuickActions={false} showJoining={false} />
          </section>
        </div>
      ) : null}
    </div>
  );
}
