'use client';

import { useEffect, useState } from 'react';
import { getToken, getTeacherData } from '@/lib/auth';
import {
  getAttendanceRecords,
  getTeacherSchedule,
} from '../../../lib/api';
import PageHeader from '../../../components/PageHeader';

const ReportsIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const DownloadIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);

const PrintIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
  </svg>
);

const CalendarIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const ChartIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

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

function calcClassPerformance(
  records: Record<string, unknown>[]
): Record<string, unknown>[] {
  const byClass: Record<
    string,
    {
      gradeLevel: unknown;
      section: unknown;
      subject: unknown;
      present: number;
      absent: number;
      late: number;
      cutting: number;
      total: number;
    }
  > = {};
  for (const r of records) {
    const key = `${r.gradeLevel}-${r.section}-${r.subject}`;
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
  return Object.values(byClass);
}

function filterRecordsByDateRange(
  records: Record<string, unknown>[],
  startDate: Date,
  endDate: Date
): Record<string, unknown>[] {
  return records.filter((r) => {
    const t = r.scanTime ?? r.checkInTime ?? r.createdAt ?? r.date;
    if (!t) return false;
    const d = new Date(String(t));
    if (Number.isNaN(d.getTime())) return false;
    return d >= startDate && d <= endDate;
  });
}

/** Week = Monday to Saturday. On Sunday, show the week that just ended (last Mon–Sat). */
function getWeekRange(): { start: Date; end: Date; label: string; days: Date[] } {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  // If Sunday (0), use last week's Monday. Otherwise use this week's Monday.
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - daysFromMonday);
  monday.setHours(0, 0, 0, 0);
  const saturday = new Date(monday);
  saturday.setDate(monday.getDate() + 5);
  saturday.setHours(23, 59, 59, 999);
  const days: Date[] = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push(d);
  }
  return {
    start: monday,
    end: saturday,
    label: `Mon ${monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} – Sat ${saturday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
    days,
  };
}

/** One row per (date, class) for weekly breakdown */
function calcWeeklyBreakdown(
  records: Record<string, unknown>[],
  weekDays: Date[]
): { date: string; dateLabel: string; gradeLevel: string; section: string; subject: string; present: number; absent: number; late: number; cutting: number; total: number }[] {
  const rows: { date: string; dateLabel: string; gradeLevel: string; section: string; subject: string; present: number; absent: number; late: number; cutting: number; total: number }[] = [];
  for (const day of weekDays) {
    const dayStart = new Date(day);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(day);
    dayEnd.setHours(23, 59, 59, 999);
    const dayRecords = filterRecordsByDateRange(records, dayStart, dayEnd);
    const perf = calcClassPerformance(dayRecords);
    const dateLabel = day.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    const dateKey = day.toISOString().slice(0, 10);
    for (const row of perf) {
      rows.push({
        date: dateKey,
        dateLabel,
        gradeLevel: String(row.gradeLevel ?? ''),
        section: String(row.section ?? ''),
        subject: String(row.subject ?? ''),
        present: Number(row.present ?? 0),
        absent: Number(row.absent ?? 0),
        late: Number(row.late ?? 0),
        cutting: Number(row.cutting ?? 0),
        total: Number(row.total ?? 0),
      });
    }
  }
  return rows;
}

function getMonthRange(): { start: Date; end: Date; label: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  end.setHours(23, 59, 59, 999);
  return {
    start,
    end,
    label: `${start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
  };
}

function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function WeeklyBreakdownTable({
  rows,
  periodLabel,
  onPrint,
}: {
  rows: { date: string; dateLabel: string; gradeLevel: string; section: string; subject: string; present: number; absent: number; late: number; cutting: number; total: number }[];
  periodLabel: string;
  onPrint?: () => void;
}) {
  return (
    <div className="p-6 rounded-xl border print:block card-theme shadow-lg animate-fade-in-up dashboard-card" style={{ borderColor: 'var(--border)' }}>
      <div className="flex flex-wrap justify-between items-center gap-4 mb-5 no-print">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg" style={{ background: 'rgba(46, 125, 50, 0.1)' }}>
            <CalendarIcon />
          </div>
          <div>
            <h2 className="text-xl font-bold" style={{ color: 'var(--primary-dark)' }}>
              Weekly Class Performance Breakdown (Monday – Saturday)
            </h2>
            <p className="text-sm mt-1 font-semibold" style={{ color: 'var(--muted-foreground)' }}>
              {periodLabel}
            </p>
          </div>
        </div>
        {onPrint && (
          <button
            type="button"
            onClick={onPrint}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all duration-200 hover:scale-105 hover:shadow-lg font-semibold"
            style={{ background: 'var(--secondary)', color: 'var(--primary-dark)' }}
          >
            <PrintIcon />
            <span>Print</span>
          </button>
        )}
      </div>
      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-muted to-color-mix(in srgb, var(--muted) 70%, var(--primary) 30%) flex items-center justify-center">
            <ChartIcon />
          </div>
          <p className="text-sm font-semibold" style={{ color: 'var(--muted-foreground)' }}>No data for this period</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border" style={{ borderColor: 'var(--border)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderColor: 'var(--border)' }} className="border-b">
                <th className="text-left py-3 px-4 text-white font-bold text-xs uppercase tracking-wider" style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%)', borderBottom: '2px solid var(--primary-dark)' }}>Date</th>
                <th className="text-left py-3 px-4 text-white font-bold text-xs uppercase tracking-wider" style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%)', borderBottom: '2px solid var(--primary-dark)' }}>Class</th>
                <th className="text-right py-3 px-4 text-white font-bold text-xs uppercase tracking-wider" style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%)', borderBottom: '2px solid var(--primary-dark)' }}>Present</th>
                <th className="text-right py-3 px-4 text-white font-bold text-xs uppercase tracking-wider" style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%)', borderBottom: '2px solid var(--primary-dark)' }}>Absent</th>
                <th className="text-right py-3 px-4 text-white font-bold text-xs uppercase tracking-wider" style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%)', borderBottom: '2px solid var(--primary-dark)' }}>Late</th>
                <th className="text-right py-3 px-4 text-white font-bold text-xs uppercase tracking-wider" style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%)', borderBottom: '2px solid var(--primary-dark)' }}>Cutting</th>
                <th className="text-right py-3 px-4 text-white font-bold text-xs uppercase tracking-wider" style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%)', borderBottom: '2px solid var(--primary-dark)' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr 
                  key={i} 
                  className="border-b transition-colors hover:bg-[var(--muted)]/50 animate-fade-in-up" 
                  style={{ 
                    borderColor: 'var(--border)',
                    animationDelay: `${i * 0.02}s`,
                  }}
                >
                  <td className="py-3 px-4 whitespace-nowrap font-semibold" style={{ color: 'var(--foreground)' }}>{row.dateLabel}</td>
                  <td className="py-3 px-4">
                    <span className="font-bold" style={{ color: 'var(--primary-dark)' }}>{row.gradeLevel}-{row.section}</span>
                    <span className="text-sm font-medium ml-2" style={{ color: 'var(--muted-foreground)' }}>({row.subject})</span>
                  </td>
                  <td className="text-right py-3 px-4 font-bold" style={{ color: 'var(--success)' }}>{row.present}</td>
                  <td className="text-right py-3 px-4 font-bold" style={{ color: 'var(--destructive)' }}>{row.absent}</td>
                  <td className="text-right py-3 px-4 font-bold" style={{ color: 'var(--accent)' }}>{row.late}</td>
                  <td className="text-right py-3 px-4 font-bold" style={{ color: 'var(--error)' }}>{row.cutting}</td>
                  <td className="text-right py-3 px-4 font-bold" style={{ color: 'var(--primary-dark)' }}>{row.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ClassPerfTable({
  title,
  periodLabel,
  perf,
  onPrint,
}: {
  title: string;
  periodLabel: string;
  perf: Record<string, unknown>[];
  onPrint?: () => void;
}) {
  return (
    <div className="p-6 rounded-xl border print:block card-theme shadow-lg animate-fade-in-up dashboard-card" style={{ borderColor: 'var(--border)' }}>
      <div className="flex flex-wrap justify-between items-center gap-4 mb-5 no-print">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg" style={{ background: 'rgba(46, 125, 50, 0.1)' }}>
            <ChartIcon />
          </div>
          <div>
            <h2 className="text-xl font-bold" style={{ color: 'var(--primary-dark)' }}>
              {title}
            </h2>
            <p className="text-sm mt-1 font-semibold" style={{ color: 'var(--muted-foreground)' }}>
              {periodLabel}
            </p>
          </div>
        </div>
        {onPrint && (
          <button
            type="button"
            onClick={onPrint}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all duration-200 hover:scale-105 hover:shadow-lg font-semibold"
            style={{ background: 'var(--secondary)', color: 'var(--primary-dark)' }}
          >
            <PrintIcon />
            <span>Print</span>
          </button>
        )}
      </div>
      {perf.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-muted to-color-mix(in srgb, var(--muted) 70%, var(--primary) 30%) flex items-center justify-center">
            <ChartIcon />
          </div>
          <p className="text-sm font-semibold" style={{ color: 'var(--muted-foreground)' }}>No data for this period</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border" style={{ borderColor: 'var(--border)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderColor: 'var(--border)' }} className="border-b">
                <th className="text-left py-3 px-4 text-white font-bold text-xs uppercase tracking-wider" style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%)', borderBottom: '2px solid var(--primary-dark)' }}>Class</th>
                <th className="text-right py-3 px-4 text-white font-bold text-xs uppercase tracking-wider" style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%)', borderBottom: '2px solid var(--primary-dark)' }}>Present</th>
                <th className="text-right py-3 px-4 text-white font-bold text-xs uppercase tracking-wider" style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%)', borderBottom: '2px solid var(--primary-dark)' }}>Absent</th>
                <th className="text-right py-3 px-4 text-white font-bold text-xs uppercase tracking-wider" style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%)', borderBottom: '2px solid var(--primary-dark)' }}>Late</th>
                <th className="text-right py-3 px-4 text-white font-bold text-xs uppercase tracking-wider" style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%)', borderBottom: '2px solid var(--primary-dark)' }}>Cutting</th>
                <th className="text-right py-3 px-4 text-white font-bold text-xs uppercase tracking-wider" style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%)', borderBottom: '2px solid var(--primary-dark)' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {perf.map((row, i) => (
                <tr 
                  key={i} 
                  className="border-b transition-colors hover:bg-[var(--muted)]/50 animate-fade-in-up" 
                  style={{ 
                    borderColor: 'var(--border)',
                    animationDelay: `${i * 0.02}s`,
                  }}
                >
                  <td className="py-3 px-4">
                    <span className="font-bold" style={{ color: 'var(--primary-dark)' }}>{String(row.gradeLevel)}-{String(row.section)}</span>
                    <span className="text-sm font-medium ml-2" style={{ color: 'var(--muted-foreground)' }}>({String(row.subject)})</span>
                  </td>
                  <td className="text-right py-3 px-4 font-bold" style={{ color: 'var(--success)' }}>{Number(row.present)}</td>
                  <td className="text-right py-3 px-4 font-bold" style={{ color: 'var(--destructive)' }}>{Number(row.absent)}</td>
                  <td className="text-right py-3 px-4 font-bold" style={{ color: 'var(--accent)' }}>{Number(row.late)}</td>
                  <td className="text-right py-3 px-4 font-bold" style={{ color: 'var(--error)' }}>{Number(row.cutting)}</td>
                  <td className="text-right py-3 px-4 font-bold" style={{ color: 'var(--primary-dark)' }}>{Number(row.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [records, setRecords] = useState<Record<string, unknown>[]>([]);
  const [classPerf, setClassPerf] = useState<Record<string, unknown>[]>([]);

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
      const [recordsRes, schedules] = await Promise.all([
        getAttendanceRecords({ token, limit: 500 }),
        getTeacherSchedule({
          token,
          teacherId: data.teacherId,
          teacherName: data.teacherName,
        }),
      ]);
      const filtered = filterRecordsBySchedules(recordsRes.records, schedules);
      setRecords(filtered);
      setClassPerf(calcClassPerformance(filtered));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const exportAttendanceReport = () => {
    const headers = [
      'Date',
      'Student ID',
      'Student Name',
      'Grade',
      'Section',
      'Subject',
      'Status',
      'Scan Time',
    ];
    const rows = records.map((r) => [
      String(r.createdAt ?? '').slice(0, 10),
      String(r.studentId ?? ''),
      String(r.studentName ?? ''),
      String(r.gradeLevel ?? ''),
      String(r.section ?? ''),
      String(r.subject ?? ''),
      String(r.status ?? ''),
      r.scanTime
        ? new Date(String(r.scanTime)).toLocaleString()
        : '',
    ]);
    const csv =
      headers.join(',') +
      '\n' +
      rows.map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const date = new Date().toISOString().slice(0, 10);
    downloadCSV(csv, `attendance-report-${date}.csv`);
  };

  const exportClassReport = () => {
    const headers = [
      'Grade',
      'Section',
      'Subject',
      'Present',
      'Absent',
      'Late',
      'Cutting',
      'Total',
    ];
    const rows = classPerf.map((r) => [
      String(r.gradeLevel ?? ''),
      String(r.section ?? ''),
      String(r.subject ?? ''),
      String(r.present ?? 0),
      String(r.absent ?? 0),
      String(r.late ?? 0),
      String(r.cutting ?? 0),
      String(r.total ?? 0),
    ]);
    const csv =
      headers.join(',') +
      '\n' +
      rows.map((row) => row.join(',')).join('\n');
    const date = new Date().toISOString().slice(0, 10);
    downloadCSV(csv, `class-report-${date}.csv`);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div
          className="animate-spin w-12 h-12 border-[3px] border-t-transparent rounded-full"
          style={{ borderColor: 'var(--primary)' }}
        />
        <p className="text-sm font-semibold" style={{ color: 'var(--muted-foreground)' }}>
          Loading reports...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-6">
        <div className="p-6 rounded-xl border bg-red-50" style={{ borderColor: 'var(--error)' }}>
          <p className="text-base font-semibold" style={{ color: 'var(--error)' }}>{error}</p>
        </div>
        <button
          type="button"
          onClick={load}
          className="px-6 py-3 rounded-xl text-white transition-all duration-200 hover:scale-105 hover:shadow-lg font-semibold btn-primary"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader title="Reports" icon={<ReportsIcon />} />

      <div className="grid gap-4 sm:grid-cols-2 animate-fade-in-up animate-delay-1">
        <div className="p-6 rounded-xl border card-theme shadow-lg dashboard-card transition-all duration-200 hover:shadow-xl" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg" style={{ background: 'rgba(46, 125, 50, 0.1)' }}>
              <DownloadIcon />
            </div>
            <h2 className="text-xl font-bold" style={{ color: 'var(--primary-dark)' }}>
              Attendance Report
            </h2>
          </div>
          <p className="text-sm mb-5 font-medium" style={{ color: 'var(--muted-foreground)' }}>
            Export attendance records as CSV
          </p>
          <button
            type="button"
            onClick={exportAttendanceReport}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white btn-primary transition-all duration-200 hover:scale-105 hover:shadow-lg font-semibold"
          >
            <DownloadIcon />
            <span>Download CSV</span>
          </button>
        </div>

        <div className="p-6 rounded-xl border card-theme shadow-lg dashboard-card transition-all duration-200 hover:shadow-xl" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg" style={{ background: 'rgba(46, 125, 50, 0.1)' }}>
              <ChartIcon />
            </div>
            <h2 className="text-xl font-bold" style={{ color: 'var(--primary-dark)' }}>
              Class Report
            </h2>
          </div>
          <p className="text-sm mb-5 font-medium" style={{ color: 'var(--muted-foreground)' }}>
            Export class performance summary as CSV
          </p>
          <button
            type="button"
            onClick={exportClassReport}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white btn-primary transition-all duration-200 hover:scale-105 hover:shadow-lg font-semibold"
          >
            <DownloadIcon />
            <span>Download CSV</span>
          </button>
        </div>
      </div>

      {(() => {
        const week = getWeekRange();
        const month = getMonthRange();
        const weeklyRecords = filterRecordsByDateRange(records, week.start, week.end);
        const monthlyRecords = filterRecordsByDateRange(records, month.start, month.end);
        const monthlyPerf = calcClassPerformance(monthlyRecords);
        const weeklyBreakdownRows = calcWeeklyBreakdown(weeklyRecords, week.days);
        return (
          <>
            <WeeklyBreakdownTable
              rows={weeklyBreakdownRows}
              periodLabel={`Breakdown by day · ${week.label}`}
              onPrint={handlePrint}
            />
            <ClassPerfTable
              title="Monthly Class Performance Summary"
              periodLabel={month.label}
              perf={monthlyPerf}
              onPrint={handlePrint}
            />
            <ClassPerfTable
              title="Class Performance Summary (All time)"
              periodLabel="All records loaded"
              perf={classPerf}
              onPrint={handlePrint}
            />
          </>
        );
      })()}
    </div>
  );
}
