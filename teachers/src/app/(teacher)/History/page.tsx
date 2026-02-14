'use client';

import { useEffect, useState } from 'react';
import { getToken, getTeacherData } from '@/lib/auth';
import { getAttendanceRecords, getTeacherSchedule } from '../../../lib/api';
import PageHeader from '@/components/PageHeader';
import { StudentDetailModal } from '@/components/StudentDetailModal';

const HistoryIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const SearchIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const FilterIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
  </svg>
);

const DownloadIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);

const CalendarIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
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

function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function HistoryPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [records, setRecords] = useState<Record<string, unknown>[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<Record<string, unknown>[]>([]);
  const [schedules, setSchedules] = useState<Record<string, unknown>[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    gradeLevel: '',
    section: '',
    subject: '',
    status: '',
  });
  const [modalStudent, setModalStudent] = useState<Record<string, unknown> | null>(null);

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
      const [recordsRes, scheduleData] = await Promise.all([
        getAttendanceRecords({ token, limit: 1000 }),
        getTeacherSchedule({
          token,
          teacherId: data.teacherId,
          teacherName: data.teacherName,
        }),
      ]);
      const filtered = filterRecordsBySchedules(recordsRes.records, scheduleData);
      setRecords(filtered);
      setFilteredRecords(filtered);
      setSchedules(scheduleData);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    let filtered = [...records];

    // Apply search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((r) => {
        const name = String(r.studentName ?? '').toLowerCase();
        const id = String(r.studentId ?? '').toLowerCase();
        return name.includes(q) || id.includes(q);
      });
    }

    // Apply date filters
    if (filters.startDate) {
      const start = new Date(filters.startDate);
      start.setHours(0, 0, 0, 0);
      filtered = filtered.filter((r) => {
        const date = r.scanTime ?? r.checkInTime ?? r.createdAt ?? r.date;
        if (!date) return false;
        return new Date(String(date)) >= start;
      });
    }
    if (filters.endDate) {
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter((r) => {
        const date = r.scanTime ?? r.checkInTime ?? r.createdAt ?? r.date;
        if (!date) return false;
        return new Date(String(date)) <= end;
      });
    }

    // Apply other filters
    if (filters.gradeLevel) {
      filtered = filtered.filter((r) => String(r.gradeLevel ?? '') === filters.gradeLevel);
    }
    if (filters.section) {
      filtered = filtered.filter((r) => String(r.section ?? '') === filters.section);
    }
    if (filters.subject) {
      filtered = filtered.filter((r) => String(r.subject ?? '') === filters.subject);
    }
    if (filters.status) {
      filtered = filtered.filter((r) => String(r.status ?? '').toLowerCase() === filters.status.toLowerCase());
    }

    setFilteredRecords(filtered);
  }, [records, searchQuery, filters]);

  const getUniqueValues = (key: string): string[] => {
    const values = new Set<string>();
    records.forEach((r) => {
      const val = String(r[key] ?? '');
      if (val) values.add(val);
    });
    return Array.from(values).sort();
  };

  const exportCSV = () => {
    const headers = [
      'Schedule',
      'Date',
      'Time',
      'Student ID',
      'Student Name',
      'Grade',
      'Section',
      'Subject',
      'Status',
    ];
    const rows = filteredRecords.map((r) => {
      const date = r.scanTime ?? r.checkInTime ?? r.createdAt ?? r.date;
      const dateStr = date ? new Date(String(date)).toLocaleDateString() : '';
      const timeStr = date ? new Date(String(date)).toLocaleTimeString() : '';
      const schedule = getScheduleDisplay(r);
      return [
        schedule,
        dateStr,
        timeStr,
        String(r.studentId ?? ''),
        String(r.studentName ?? ''),
        String(r.gradeLevel ?? ''),
        String(r.section ?? ''),
        String(r.subject ?? ''),
        String(r.status ?? ''),
      ];
    });
    const csv =
      headers.join(',') +
      '\n' +
      rows.map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const date = new Date().toISOString().slice(0, 10);
    downloadCSV(csv, `history-${date}.csv`);
  };

  const getStatusClass = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'present') return { bg: 'rgba(67, 160, 71, 0.1)', color: 'var(--success)', border: 'var(--success)' };
    if (s === 'absent') return { bg: 'rgba(216, 67, 21, 0.1)', color: 'var(--destructive)', border: 'var(--destructive)' };
    if (s === 'late') return { bg: 'rgba(255, 193, 7, 0.1)', color: 'var(--accent)', border: 'var(--accent)' };
    if (s === 'cutting' || s === 'cut') return { bg: 'rgba(230, 81, 0, 0.1)', color: 'var(--error)', border: 'var(--error)' };
    return { bg: 'rgba(107, 114, 128, 0.1)', color: 'var(--muted-foreground)', border: 'var(--muted-foreground)' };
  };

  const formatDate = (date: unknown): string => {
    if (!date) return 'N/A';
    return new Date(String(date)).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (date: unknown): string => {
    if (!date) return 'N/A';
    return new Date(String(date)).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getScheduleDisplay = (record: Record<string, unknown>): string => {
    const subject = String(record.subject ?? '').toLowerCase();
    const type = String(record.attendanceType ?? '').toLowerCase();
    
    // For In/Out General records, show N/A
    if ((type === 'in' || type === 'out') && subject === 'general') {
      return 'N/A';
    }
    
    // Try to get schedule from record fields
    const scheduleSubject = String(record.scheduleSubject ?? record.subject ?? '');
    const scheduleGradeLevel = String(record.scheduleGradeLevel ?? record.gradeLevel ?? '');
    const scheduleSection = String(record.scheduleSection ?? record.section ?? '');
    const scheduleTimeSlot = String(record.scheduleTimeSlot ?? record.timeSlot ?? '');
    
    // If we have schedule info, format it
    if (scheduleSubject && scheduleGradeLevel && scheduleSection) {
      const parts = [scheduleSubject, `${scheduleGradeLevel}-${scheduleSection}`];
      if (scheduleTimeSlot) {
        parts.push(scheduleTimeSlot);
      }
      return parts.join(' · ');
    }
    
    // Fallback: try to match with schedules array
    const gradeLevel = String(record.gradeLevel ?? '');
    const section = String(record.section ?? '');
    const shift = String(record.shift ?? '');
    const recordSubject = String(record.subject ?? '');
    
    if (gradeLevel && section && recordSubject) {
      const matchedSchedule = schedules.find((s) => {
        const sGL = String(s.gradeLevel ?? '').toLowerCase();
        const sSec = String(s.section ?? '').toLowerCase();
        const sSub = String(s.subject ?? '').toLowerCase();
        const sShift = String(s.shift ?? '').toLowerCase();
        return (
          sGL === gradeLevel.toLowerCase() &&
          sSec === section.toLowerCase() &&
          sSub === recordSubject.toLowerCase() &&
          (!shift || sShift === shift.toLowerCase())
        );
      });
      
      if (matchedSchedule) {
        const timeSlot = String(matchedSchedule.timeSlot ?? '');
        const parts = [recordSubject, `${gradeLevel}-${section}`];
        if (timeSlot) {
          parts.push(timeSlot);
        }
        return parts.join(' · ');
      }
      
      // If no match but we have basic info, show it
      return `${recordSubject} · ${gradeLevel}-${section}`;
    }
    
    return 'N/A';
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div
          className="animate-spin w-12 h-12 border-[3px] border-t-transparent rounded-full"
          style={{ borderColor: 'var(--primary)' }}
        />
        <p className="text-sm font-semibold" style={{ color: 'var(--muted-foreground)' }}>
          Loading history...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader title="History" icon={<HistoryIcon />} />

      {error && (
        <div className="p-4 rounded-xl border bg-red-50" style={{ borderColor: 'var(--error)' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--error)' }}>{error}</p>
        </div>
      )}

      {/* Search and Filters */}
      <div className="p-6 rounded-xl border card-theme shadow-lg" style={{ borderColor: 'var(--border)' }}>
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <div className="flex-1 min-w-[200px] relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--muted-foreground)' }}>
              <SearchIcon />
            </div>
            <input
              type="search"
              placeholder="Search by student name or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl border input-theme"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl transition-all duration-200 hover:scale-105 hover:shadow-lg font-semibold ${
              showFilters ? 'btn-primary text-white' : ''
            }`}
            style={showFilters ? {} : { background: 'var(--secondary)', color: 'var(--primary-dark)' }}
          >
            <FilterIcon />
            <span>Filters</span>
          </button>
          <button
            type="button"
            onClick={exportCSV}
            className="flex items-center gap-2 px-5 py-3 rounded-xl text-white btn-primary transition-all duration-200 hover:scale-105 hover:shadow-lg font-semibold"
          >
            <DownloadIcon />
            <span>Export CSV</span>
          </button>
        </div>

        {showFilters && (
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
            <div>
              <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--muted-foreground)' }}>
                Start Date
              </label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border input-theme text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--muted-foreground)' }}>
                End Date
              </label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border input-theme text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--muted-foreground)' }}>
                Grade Level
              </label>
              <select
                value={filters.gradeLevel}
                onChange={(e) => setFilters({ ...filters, gradeLevel: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border input-theme text-sm"
              >
                <option value="">All</option>
                {getUniqueValues('gradeLevel').map((gl) => (
                  <option key={gl} value={gl}>
                    {gl}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--muted-foreground)' }}>
                Section
              </label>
              <select
                value={filters.section}
                onChange={(e) => setFilters({ ...filters, section: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border input-theme text-sm"
              >
                <option value="">All</option>
                {getUniqueValues('section').map((sec) => (
                  <option key={sec} value={sec}>
                    {sec}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--muted-foreground)' }}>
                Subject
              </label>
              <select
                value={filters.subject}
                onChange={(e) => setFilters({ ...filters, subject: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border input-theme text-sm"
              >
                <option value="">All</option>
                {getUniqueValues('subject').map((sub) => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--muted-foreground)' }}>
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border input-theme text-sm"
              >
                <option value="">All</option>
                <option value="Present">Present</option>
                <option value="Absent">Absent</option>
                <option value="Late">Late</option>
                <option value="Cutting">Cutting</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold" style={{ color: 'var(--muted-foreground)' }}>
          Showing {filteredRecords.length} of {records.length} records
        </p>
        {(filters.startDate || filters.endDate || filters.gradeLevel || filters.section || filters.subject || filters.status) && (
          <button
            type="button"
            onClick={() => setFilters({ startDate: '', endDate: '', gradeLevel: '', section: '', subject: '', status: '' })}
            className="text-sm font-semibold hover:underline"
            style={{ color: 'var(--primary)' }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Timeline View */}
      <div className="rounded-xl border overflow-hidden card-theme shadow-lg" style={{ borderColor: 'var(--border)' }}>
        {filteredRecords.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-muted to-color-mix(in srgb, var(--muted) 70%, var(--primary) 30%) flex items-center justify-center">
              <HistoryIcon />
            </div>
            <p className="text-sm font-semibold" style={{ color: 'var(--muted-foreground)' }}>
              No attendance records found
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderColor: 'var(--border)' }} className="border-b">
                  <th className="text-left py-3 px-4 text-white font-bold text-xs uppercase tracking-wider" style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%)', borderBottom: '2px solid var(--primary-dark)' }}>Schedule</th>
                  <th className="text-left py-3 px-4 text-white font-bold text-xs uppercase tracking-wider" style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%)', borderBottom: '2px solid var(--primary-dark)' }}>Date</th>
                  <th className="text-left py-3 px-4 text-white font-bold text-xs uppercase tracking-wider" style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%)', borderBottom: '2px solid var(--primary-dark)' }}>Time</th>
                  <th className="text-left py-3 px-4 text-white font-bold text-xs uppercase tracking-wider" style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%)', borderBottom: '2px solid var(--primary-dark)' }}>Student</th>
                  <th className="text-left py-3 px-4 text-white font-bold text-xs uppercase tracking-wider" style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%)', borderBottom: '2px solid var(--primary-dark)' }}>Class</th>
                  <th className="text-left py-3 px-4 text-white font-bold text-xs uppercase tracking-wider" style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%)', borderBottom: '2px solid var(--primary-dark)' }}>Subject</th>
                  <th className="text-left py-3 px-4 text-white font-bold text-xs uppercase tracking-wider" style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%)', borderBottom: '2px solid var(--primary-dark)' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((record, i) => {
                  const date = record.scanTime ?? record.checkInTime ?? record.createdAt ?? record.date;
                  const statusClass = getStatusClass(String(record.status ?? ''));
                  const schedule = getScheduleDisplay(record);
                  const studentForModal = {
                    studentId: record.studentId,
                    studentName: record.studentName,
                    fullName: record.studentName,
                    name: record.studentName,
                    gradeLevel: record.gradeLevel,
                    section: record.section,
                    gender: record.gender,
                  };
                  return (
                    <tr
                      key={i}
                      role="button"
                      tabIndex={0}
                      onClick={() => setModalStudent(studentForModal)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setModalStudent(studentForModal); } }}
                      className="border-b transition-colors hover:bg-[var(--muted)]/50 animate-fade-in-up cursor-pointer"
                      style={{
                        borderColor: 'var(--border)',
                        animationDelay: `${i * 0.01}s`,
                      }}
                    >
                      <td className="py-3 px-4 text-sm font-medium" style={{ color: 'var(--muted-foreground)' }}>
                        {schedule}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap font-semibold" style={{ color: 'var(--foreground)' }}>
                        {formatDate(date)}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap font-medium" style={{ color: 'var(--muted-foreground)' }}>
                        {formatTime(date)}
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <div className="font-bold" style={{ color: 'var(--foreground)' }}>
                            {String(record.studentName ?? 'Unknown')}
                          </div>
                          <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                            {String(record.studentId ?? '')}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold" style={{ color: 'var(--primary-dark)' }}>
                          {String(record.gradeLevel ?? '')}-{String(record.section ?? '')}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium" style={{ color: 'var(--foreground)' }}>
                        {String(record.subject ?? 'N/A')}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className="px-3 py-1 rounded-lg font-semibold text-xs border"
                          style={{
                            background: statusClass.bg,
                            color: statusClass.color,
                            borderColor: statusClass.border,
                          }}
                        >
                          {String(record.status ?? 'N/A')}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalStudent && (
        <StudentDetailModal
          student={modalStudent}
          subjectFilter={filters.subject}
          teacherSchedules={schedules}
          onClose={() => setModalStudent(null)}
        />
      )}
    </div>
  );
}
