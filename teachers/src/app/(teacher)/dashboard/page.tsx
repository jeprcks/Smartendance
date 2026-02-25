'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getToken, getTeacherData } from '@/lib/auth';
import {
  getTeacherSchedule,
  getAttendanceRecords,
  type AttendanceStats,
} from '../../../lib/api';
import PageHeader from '@/components/PageHeader';

const DashboardIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
  </svg>
);
const ScheduleIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);
const UserIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function getDayName(weekday: number): string {
  return DAYS[weekday - 1];
}

function getTodayDatePrefix(): string {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
}

function filterRecordsBySchedules(
  records: Record<string, unknown>[],
  schedules: Record<string, unknown>[]
): Record<string, unknown>[] {
  if (schedules.length === 0) return [];
  const keys = new Set<string>();
  for (const s of schedules) {
    const gl = String(s.gradeLevel ?? '');
    const sec = String(s.section ?? '');
    const sh = String(s.shift ?? '');
    const sub = String(s.subject ?? '');
    if (gl && sec && sh) {
      keys.add(`${gl}-${sec}-${sh}-${sub}`);
      keys.add(`${gl}-${sec}-${sh}-General`);
    }
  }
  return records.filter((r) => {
    const gl = String(r.gradeLevel ?? '');
    const sec = String(r.section ?? '');
    const sh = String(r.shift ?? '');
    const sub = String(r.subject ?? '');
    return keys.has(`${gl}-${sec}-${sh}-${sub}`);
  });
}

function getTodaySchedules(schedules: Record<string, unknown>[]): Record<string, unknown>[] {
  const today = new Date();
  const dayName = getDayName(today.getDay() || 7);
  return schedules
    .filter((s) => {
      const days = s.days;
      if (Array.isArray(days)) return days.includes(dayName);
      return s.day === dayName;
    })
    .sort((a, b) => {
      const ta = String(a.timeSlot ?? '');
      const tb = String(b.timeSlot ?? '');
      return ta.localeCompare(tb);
    });
}

function calcStatsFromRecords(records: Record<string, unknown>[]): AttendanceStats {
  const stats = { present: 0, absent: 0, late: 0, cutting: 0, total: 0 };
  for (const r of records) {
    stats.total++;
    const s = String(r.status ?? '').toLowerCase();
    if (s === 'present') stats.present++;
    else if (s === 'absent') stats.absent++;
    else if (s === 'late') stats.late++;
    else if (s === 'cutting') stats.cutting++;
  }
  return stats;
}

function calcClassPerformance(records: Record<string, unknown>[]): Record<string, unknown>[] {
  const byClass: Record<string, { gradeLevel: unknown; section: unknown; subject: unknown; present: number; absent: number; late: number; cutting: number; total: number }> = {};
  for (const r of records) {
    const key = `${r.gradeLevel}-${r.section}`;
    if (!byClass[key]) {
      byClass[key] = {
        gradeLevel: r.gradeLevel,
        section: r.section,
        subject: r.subject,
        present: 0,
        absent: 0,
        late: 0,
        cutting: 0,
        total: 0,
      };
    }
    byClass[key].total++;
    const s = String(r.status ?? '');
    if (s === 'Present') byClass[key].present++;
    else if (s === 'Absent') byClass[key].absent++;
    else if (s === 'Late') byClass[key].late++;
    else if (s === 'Cutting') byClass[key].cutting++;
  }
  return Object.values(byClass).sort((a, b) => {
    const ga = parseInt(String(a.gradeLevel ?? '0'), 10) || 0;
    const gb = parseInt(String(b.gradeLevel ?? '0'), 10) || 0;
    return ga - gb;
  });
}

function getTodayAbsent(records: Record<string, unknown>[]): Record<string, unknown>[] {
  const prefix = getTodayDatePrefix();
  return records.filter(
    (r) =>
      String(r.status ?? '') === 'Absent' &&
      String(r.createdAt ?? '').startsWith(prefix)
  );
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<AttendanceStats>({
    present: 0,
    absent: 0,
    late: 0,
    cutting: 0,
    total: 0,
  });
  const [todaySchedules, setTodaySchedules] = useState<Record<string, unknown>[]>([]);
  const [classPerformance, setClassPerformance] = useState<Record<string, unknown>[]>([]);
  const [todayAbsent, setTodayAbsent] = useState<Record<string, unknown>[]>([]);

  const load = async () => {
    const token = getToken();
    const data = getTeacherData();
    if (!token || !data.teacherId || !data.teacherName) {
      setError('Not authenticated');
      setLoading(false);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const [schedules, recordsRes] = await Promise.all([
        getTeacherSchedule({
          token,
          teacherId: data.teacherId,
          teacherName: data.teacherName,
        }),
        getAttendanceRecords({ token }),
      ]);
      const filtered = filterRecordsBySchedules(recordsRes.records, schedules);
      const today = getTodaySchedules(schedules);
      const s = calcStatsFromRecords(filtered);
      const perf = calcClassPerformance(filtered);
      const absent = getTodayAbsent(filtered);

      setStats(s);
      setTodaySchedules(today);
      setClassPerformance(perf);
      setTodayAbsent(absent);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div
          className="animate-spin w-12 h-12 border-[3px] border-t-transparent rounded-full"
          style={{ borderColor: 'var(--primary)' }}
        />
        <p className="text-sm font-semibold" style={{ color: 'var(--muted-foreground)' }}>
          Loading dashboard...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-6">
        <div className="p-6 rounded-xl border bg-red-100 dark:bg-red-900/40 border-red-300 dark:border-red-700">
          <p className="text-base font-semibold" style={{ color: 'var(--error)' }}>{error}</p>
        </div>
        <button
          type="button"
          onClick={load}
          className="px-6 py-3 rounded-xl text-white transition-all duration-200 hover:scale-105 hover:shadow-lg font-semibold"
          style={{ background: 'var(--primary)' }}
        >
          Retry
        </button>
      </div>
    );
  }

  const statCardStyles: Record<string, { border: string; bg: string; valueColor: string }> = {
    Present: { border: 'var(--success)', bg: 'rgba(67, 160, 71, 0.3)', valueColor: 'var(--success)' },
    Absent: { border: 'var(--destructive)', bg: 'rgba(216, 67, 21, 0.28)', valueColor: 'var(--destructive)' },
    Late: { border: 'var(--accent)', bg: 'rgba(255, 193, 7, 0.35)', valueColor: 'var(--error)' },
    Cutting: { border: 'var(--error)', bg: 'rgba(230, 81, 0, 0.28)', valueColor: 'var(--error)' },
    Total: { border: 'var(--primary)', bg: 'rgba(46, 125, 50, 0.25)', valueColor: 'var(--primary-dark)' },
  };

  const statCards = [
    { label: 'Present', value: stats.present },
    { label: 'Absent', value: stats.absent },
    { label: 'Late', value: stats.late },
    { label: 'Cutting', value: stats.cutting },
    { label: 'Total', value: stats.total },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        icon={<DashboardIcon />}
        action={
          <button
            type="button"
            onClick={load}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 hover:scale-105 hover:shadow-lg"
            style={{
              background: 'rgba(255,255,255,0.95)',
              color: 'var(--primary-dark)',
            }}
          >
            Refresh
          </button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {statCards.map((c, i) => {
          const s = statCardStyles[c.label] ?? statCardStyles.Total;
          return (
            <div
              key={c.label}
              className="p-4 rounded-xl border-l-4 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 animate-fade-in-up dashboard-card bg-white dark:bg-slate-800 border-gray-200 dark:border-gray-700"
              style={{
                background: s.bg,
                borderLeftColor: s.border,
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                animationDelay: `${(i + 1) * 0.05}s`,
              }}
            >
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--muted-foreground)' }}>
                {c.label}
              </p>
              <p className="text-3xl font-bold mt-1" style={{ color: s.valueColor, letterSpacing: '-0.02em' }}>
                {c.value}
              </p>
            </div>
          );
        })}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div
          className="rounded-xl border border-l-4 p-4 animate-fade-in-up transition-all duration-300 hover:shadow-md dashboard-card bg-white dark:bg-slate-800 border-gray-200 dark:border-gray-700"
          style={{
            borderLeftColor: 'var(--primary)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
            animationDelay: '0.3s',
          }}
        >
          <h2 className="text-xl font-bold mb-5 flex items-center gap-3" style={{ color: 'var(--primary-dark)' }}>
            <div className="p-2 rounded-lg" style={{ background: 'rgba(46, 125, 50, 0.1)' }}>
              <ScheduleIcon />
            </div>
            <span>Today&apos;s Schedules</span>
          </h2>
          {todaySchedules.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <p className="text-sm font-semibold" style={{ color: 'var(--muted-foreground)' }}>
                No classes scheduled for today
              </p>
            </div>
          ) : (
            <ul className="space-y-2.5">
              {todaySchedules.map((s, i) => (
                <li key={i}>
                  <Link
                    href={`/schedule/${s._id ?? s.id ?? i}`}
                    className="block p-3.5 rounded-xl transition-all duration-200 hover:bg-[var(--muted)]/50 group"
                    style={{ color: 'var(--foreground)' }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-base group-hover:text-[var(--primary-dark)] transition-colors">
                        {String(s.subject ?? 'N/A')}
                      </span>
                      <span 
                        className="text-sm font-semibold px-2 py-0.5 rounded-md" 
                        style={{ 
                          background: 'rgba(46, 125, 50, 0.1)',
                          color: 'var(--primary-dark)',
                        }}
                      >
                        {String(s.gradeLevel ?? '')}-{String(s.section ?? '')}
                      </span>
                      <span className="text-sm font-medium ml-auto flex items-center gap-1" style={{ color: 'var(--muted-foreground)' }}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {String(s.timeSlot ?? '')}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div
          className="rounded-xl border border-l-4 p-4 animate-fade-in-up transition-all duration-300 hover:shadow-md dashboard-card bg-white dark:bg-slate-800 border-gray-200 dark:border-gray-700"
          style={{
            borderLeftColor: 'var(--destructive)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
            animationDelay: '0.35s',
          }}
        >
          <h2 className="text-xl font-bold mb-5 flex items-center gap-3" style={{ color: 'var(--destructive)' }}>
            <div className="p-2 rounded-lg" style={{ background: 'rgba(216, 67, 21, 0.1)' }}>
              <UserIcon />
            </div>
            <span>Today&apos;s Absent Students</span>
          </h2>
          {todayAbsent.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <p className="text-sm font-semibold" style={{ color: 'var(--muted-foreground)' }}>
                No absent students today
              </p>
            </div>
          ) : (
            <ul className="space-y-2.5">
              {todayAbsent.slice(0, 10).map((r, i) => (
                <li 
                  key={i} 
                  className="text-sm font-medium p-2.5 rounded-lg transition-colors hover:bg-red-50/50" 
                  style={{ color: 'var(--foreground)' }}
                >
                  <span className="font-semibold">{String(r.studentName ?? r.studentId ?? 'Unknown')}</span>
                  <span className="mx-2" style={{ color: 'var(--muted-foreground)' }}>–</span>
                  <span 
                    className="text-xs font-semibold px-2 py-0.5 rounded-md" 
                    style={{ 
                      background: 'rgba(216, 67, 21, 0.1)',
                      color: 'var(--destructive)',
                    }}
                  >
                    {String(r.gradeLevel ?? '')}-{String(r.section ?? '')}
                  </span>
                </li>
              ))}
              {todayAbsent.length > 10 && (
                <li className="text-sm font-semibold pt-2" style={{ color: 'var(--muted-foreground)' }}>
                  +{todayAbsent.length - 10} more
                </li>
              )}
            </ul>
          )}
        </div>
      </div>

      <div
        className="rounded-xl border border-l-4 p-4 animate-fade-in-up transition-all duration-300 hover:shadow-md dashboard-card bg-white dark:bg-slate-800 border-gray-200 dark:border-gray-700"
        style={{
          borderLeftColor: 'var(--primary-dark)',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
          animationDelay: '0.4s',
        }}
      >
        <h2 className="text-xl font-bold mb-5 flex items-center gap-3" style={{ color: 'var(--primary-dark)' }}>
          <div className="p-2 rounded-lg" style={{ background: 'rgba(46, 125, 50, 0.1)' }}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--primary)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <span>Class Performance</span>
        </h2>
        {classPerformance.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <p className="text-sm font-semibold" style={{ color: 'var(--muted-foreground)' }}>
              No attendance data yet
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottomColor: 'var(--border)' }} className="border-b">
                  <th
                    className="text-left py-3 px-4 font-bold text-xs uppercase tracking-wider"
                    style={{
                      background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%)',
                      color: 'white',
                      borderBottom: '2px solid var(--primary-dark)',
                    }}
                  >
                    Class
                  </th>
                  <th
                    className="text-right py-3 px-4 font-bold text-xs uppercase tracking-wider"
                    style={{
                      background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%)',
                      color: 'white',
                      borderBottom: '2px solid var(--primary-dark)',
                    }}
                  >
                    P
                  </th>
                  <th
                    className="text-right py-3 px-4 font-bold text-xs uppercase tracking-wider"
                    style={{
                      background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%)',
                      color: 'white',
                      borderBottom: '2px solid var(--primary-dark)',
                    }}
                  >
                    A
                  </th>
                  <th
                    className="text-right py-3 px-4 font-bold text-xs uppercase tracking-wider"
                    style={{
                      background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%)',
                      color: 'white',
                      borderBottom: '2px solid var(--primary-dark)',
                    }}
                  >
                    L
                  </th>
                  <th
                    className="text-right py-3 px-4 font-bold text-xs uppercase tracking-wider"
                    style={{
                      background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%)',
                      color: 'white',
                      borderBottom: '2px solid var(--primary-dark)',
                    }}
                  >
                    C
                  </th>
                  <th
                    className="text-right py-3 px-4 font-bold text-xs uppercase tracking-wider"
                    style={{
                      background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%)',
                      color: 'white',
                      borderBottom: '2px solid var(--primary-dark)',
                    }}
                  >
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {classPerformance.map((row, i) => (
                  <tr 
                    key={i} 
                    className="border-b transition-colors hover:bg-[var(--muted)]/50" 
                    style={{ borderColor: 'var(--border)' }}
                  >
                    <td className="py-3 px-4 font-semibold" style={{ color: 'var(--foreground)' }}>
                      <span className="font-bold">{String(row.gradeLevel ?? '')}-{String(row.section ?? '')}</span>
                      <span className="text-sm font-medium ml-2" style={{ color: 'var(--muted-foreground)' }}>
                        ({String(row.subject ?? '')})
                      </span>
                    </td>
                    <td className="text-right py-3 px-4 font-bold" style={{ color: 'var(--success)' }}>
                      {Number(row.present ?? 0)}
                    </td>
                    <td className="text-right py-3 px-4 font-bold" style={{ color: 'var(--destructive)' }}>
                      {Number(row.absent ?? 0)}
                    </td>
                    <td className="text-right py-3 px-4 font-bold" style={{ color: 'var(--accent)' }}>
                      {Number(row.late ?? 0)}
                    </td>
                    <td className="text-right py-3 px-4 font-bold" style={{ color: 'var(--error)' }}>
                      {Number(row.cutting ?? 0)}
                    </td>
                    <td className="text-right py-3 px-4 font-bold" style={{ color: 'var(--primary-dark)' }}>
                      {Number(row.total ?? 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
