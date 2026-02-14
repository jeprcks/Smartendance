'use client';

import { useState, useEffect, useCallback } from 'react';
import { getToken, getTeacherData } from '@/lib/auth';
import { getStudentHistory } from '@/lib/api';
import { printStudentAttendanceHistory } from '@/app/(teacher)/students/components/pdfprint';

type HistoryRecord = Record<string, unknown>;

const UserIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);
const CheckCircleIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const BookIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  </svg>
);
const CalendarIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);
const ClockIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const PrintIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
  </svg>
);
const XIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

export interface StudentDetailModalProps {
  student: Record<string, unknown>;
  subjectFilter: string;
  teacherSchedules: Record<string, unknown>[];
  onClose: () => void;
}

export function StudentDetailModal({
  student,
  subjectFilter,
  teacherSchedules,
  onClose,
}: StudentDetailModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [historyData, setHistoryData] = useState<{
    student: Record<string, unknown>;
    records: HistoryRecord[];
  } | null>(null);

  const studentId = String(student.studentId ?? student.id ?? '');
  const studentName = String(student.studentName ?? student.name ?? student.fullName ?? 'Unknown');
  const currentTeacherData = getTeacherData();
  const currentTeacherName = String(currentTeacherData.teacherName ?? '').trim().toLowerCase();

  const loadHistory = useCallback(async () => {
    const token = getToken();
    if (!token || !studentId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getStudentHistory({ token, studentId, limit: 100 });
      setHistoryData({ student: data.student, records: data.records });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load history');
      setHistoryData(null);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const records = historyData?.records ?? [];
  const teacherScheduleKeys = new Set<string>();
  for (const s of teacherSchedules) {
    const gl = String(s.gradeLevel ?? '').toLowerCase();
    const sec = String(s.section ?? '').toLowerCase();
    const sub = String(s.subject ?? '').toLowerCase();
    if (gl && sec && sub) teacherScheduleKeys.add(`${gl}-${sec}-${sub}`);
  }
  const filtered = records.filter((r) => {
    const type = String(r.attendanceType ?? '').toLowerCase();
    const subject = String(r.subject ?? '').toLowerCase();
    const gradeLevel = String(r.gradeLevel ?? '').toLowerCase();
    const section = String(r.section ?? '').toLowerCase();
    const recordTeacher = String(r.scheduleTeacher ?? r.teacher ?? '').trim().toLowerCase();
    if (recordTeacher && recordTeacher !== currentTeacherName) return false;
    const isInOrOut = (type === 'in' || type === 'out') && subject === 'general';
    if (isInOrOut) return true;
    return teacherScheduleKeys.has(`${gradeLevel}-${section}-${subject}`);
  });

  const formatDate = (val: unknown) => {
    if (!val) return '—';
    const d = new Date(String(val));
    return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };
  const formatTime = (val: unknown) => {
    if (!val) return '—';
    const d = new Date(String(val));
    return Number.isNaN(d.getTime()) ? '—' : d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
  };
  const isInOrOutGeneral = (r: HistoryRecord) =>
    (String(r.attendanceType ?? '').toLowerCase() === 'in' || String(r.attendanceType ?? '').toLowerCase() === 'out') &&
    String(r.subject ?? '').toLowerCase() === 'general';
  const getTimeForRecord = (r: HistoryRecord) => {
    const statusHistory = r.statusHistory as Array<{ changedAt?: string }> | undefined;
    if (statusHistory?.length) {
      const last = statusHistory[statusHistory.length - 1];
      if (last?.changedAt) return last.changedAt;
    }
    if (String(r.attendanceType ?? '').toLowerCase() === 'in' && r.checkInTime) return r.checkInTime;
    if (String(r.attendanceType ?? '').toLowerCase() === 'out' && r.checkOutTime) return r.checkOutTime;
    return r.scanTime ?? r.checkInTime;
  };
  const getTypeLabel = (r: HistoryRecord) => {
    const statusHistory = r.statusHistory as Array<{ changedBy?: string }> | undefined;
    if (statusHistory?.length) {
      const last = statusHistory[statusHistory.length - 1];
      return `Teacher (${last?.changedBy ?? 'Unknown'})`;
    }
    return String(r.attendanceType ?? 'N/A');
  };
  const getTypePillClass = (r: HistoryRecord) => {
    const statusHistory = r.statusHistory as Array<unknown> | undefined;
    if (statusHistory?.length) return 'bg-green-50 text-green-700 ring-green-200/50';
    const type = String(r.attendanceType ?? '').toLowerCase();
    if (type === 'in') return 'bg-green-50 text-green-700 ring-green-200/50';
    if (type === 'out') return 'bg-purple-50 text-purple-700 ring-purple-200/50';
    return 'bg-gray-50 text-gray-700 ring-gray-200/50';
  };
  const getStatusPillClass = (status: string) => {
    const s = String(status).toLowerCase();
    if (s === 'present') return 'bg-green-50 text-green-700 ring-green-200/50';
    if (s === 'late') return 'bg-yellow-50 text-yellow-700 ring-yellow-200/50';
    if (s === 'absent') return 'bg-red-50 text-red-700 ring-red-200/50';
    if (s === 'out') return 'bg-purple-50 text-purple-700 ring-purple-200/50';
    if (s === 'cutting') return 'bg-orange-50 text-orange-700 ring-orange-200/50';
    return 'bg-gray-50 text-gray-700 ring-gray-200/50';
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-center p-2 sm:p-4 animate-fade-in-up"
      role="dialog"
      aria-modal="true"
      aria-labelledby="student-modal-title"
      style={{ zIndex: 9999, paddingTop: '6rem', paddingBottom: '1rem' }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300" onClick={onClose} style={{ zIndex: 9998 }} />
      <div
        className="relative w-full max-w-[95vw] lg:max-w-7xl max-h-[calc(100vh-7rem)] flex flex-col rounded-2xl border shadow-2xl overflow-hidden transform transition-all duration-300 scale-100"
        style={{
          background: 'linear-gradient(180deg, var(--surface) 0%, color-mix(in srgb, var(--surface) 98%, var(--primary) 2%) 100%)',
          borderColor: 'var(--border)',
          boxShadow: '0 20px 60px rgba(46, 125, 50, 0.3)',
          zIndex: 9999,
        }}
      >
        <div
          className="flex items-center justify-between gap-4 px-6 py-4 border-b shrink-0"
          style={{ borderColor: 'var(--border)', background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%)', boxShadow: '0 2px 8px rgba(46, 125, 50, 0.15)' }}
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm text-white">
              <UserIcon />
            </div>
            <h2 id="student-modal-title" className="text-2xl font-bold text-white">
              Student Details · <span className="font-bold">{studentName}</span>
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {filtered.length > 0 && (
              <button
                type="button"
                onClick={() =>
                  printStudentAttendanceHistory(
                    {
                      studentName,
                      studentId,
                      gender: String(historyData?.student?.gender ?? student.gender ?? ''),
                      gradeLevel: String(historyData?.student?.gradeLevel ?? student.gradeLevel ?? ''),
                      section: String(historyData?.student?.section ?? student.section ?? ''),
                    },
                    filtered,
                    subjectFilter
                  )
                }
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-all duration-200 text-white font-semibold"
                aria-label="Print"
              >
                <PrintIcon />
                <span>Print</span>
              </button>
            )}
            <button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-white/20 transition-all duration-200 text-white hover:rotate-90" aria-label="Close">
              <XIcon />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-visible p-6 space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl border-2 ring-2 ring-primary/10 bg-gradient-to-br from-white to-color-mix(in srgb, var(--muted) 50%, transparent) transition-all duration-200 hover:shadow-lg cursor-pointer student-info-card" style={{ borderColor: 'var(--primary)', boxShadow: '0 2px 8px rgba(46, 125, 50, 0.1), 0 0 0 1px rgba(46, 125, 50, 0.05)' }}>
              <div className="flex items-center gap-2 mb-2">
                <UserIcon />
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>Name</span>
              </div>
              <p className="text-base font-semibold" style={{ color: 'var(--foreground)' }}>{studentName}</p>
            </div>
            <div className="p-4 rounded-xl border-2 ring-2 ring-primary/10 bg-gradient-to-br from-white to-color-mix(in srgb, var(--muted) 50%, transparent) transition-all duration-200 hover:shadow-lg cursor-pointer student-info-card" style={{ borderColor: 'var(--primary)', boxShadow: '0 2px 8px rgba(46, 125, 50, 0.1), 0 0 0 1px rgba(46, 125, 50, 0.05)' }}>
              <div className="flex items-center gap-2 mb-2">
                <CheckCircleIcon />
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>Student ID</span>
              </div>
              <p className="text-base font-semibold" style={{ color: 'var(--foreground)' }}>{studentId || '—'}</p>
            </div>
            <div className="p-4 rounded-xl border-2 ring-2 ring-primary/10 bg-gradient-to-br from-white to-color-mix(in srgb, var(--muted) 50%, transparent) transition-all duration-200 hover:shadow-lg cursor-pointer student-info-card" style={{ borderColor: 'var(--primary)', boxShadow: '0 2px 8px rgba(46, 125, 50, 0.1), 0 0 0 1px rgba(46, 125, 50, 0.05)' }}>
              <div className="flex items-center gap-2 mb-2">
                <UserIcon />
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>Gender</span>
              </div>
              <p className="text-lg font-bold" style={{ color: String(historyData?.student?.gender ?? student.gender ?? '').toLowerCase() === 'female' ? '#ec4899' : String(historyData?.student?.gender ?? student.gender ?? '').toLowerCase() === 'male' ? '#3b82f6' : 'var(--primary-dark)' }}>{String(historyData?.student?.gender ?? student.gender ?? '—')}</p>
            </div>
            <div className="p-4 rounded-xl border-2 ring-2 ring-primary/10 bg-gradient-to-br from-white to-color-mix(in srgb, var(--muted) 50%, transparent) transition-all duration-200 hover:shadow-lg cursor-pointer student-info-card" style={{ borderColor: 'var(--primary)', boxShadow: '0 2px 8px rgba(46, 125, 50, 0.1), 0 0 0 1px rgba(46, 125, 50, 0.05)' }}>
              <div className="flex items-center gap-2 mb-2">
                <BookIcon />
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted-foreground)' }}>Class</span>
              </div>
              <p className="text-base font-semibold" style={{ color: 'var(--foreground)' }}>
                {String(historyData?.student?.gradeLevel ?? student.gradeLevel ?? '—')}-{String(historyData?.student?.section ?? student.section ?? '—')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 pb-3 border-b" style={{ borderColor: 'var(--border)' }}>
            <div className="p-2 rounded-lg" style={{ background: 'rgba(46, 125, 50, 0.1)' }}>
              <CalendarIcon />
            </div>
            <h3 className="text-xl font-bold" style={{ color: 'var(--primary-dark)' }}>
              Attendance History {subjectFilter ? <span className="text-base font-semibold text-primary-dark">· {subjectFilter}</span> : <span className="text-base font-normal text-muted-foreground">(all subjects)</span>}
            </h3>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="animate-spin w-10 h-10 border-[3px] border-t-transparent rounded-full" style={{ borderColor: 'var(--primary)' }} />
              <p className="text-sm font-medium" style={{ color: 'var(--muted-foreground)' }}>Loading history...</p>
            </div>
          ) : error ? (
            <div className="p-6 rounded-xl border bg-red-50" style={{ borderColor: 'var(--error)' }}>
              <p className="text-sm font-semibold" style={{ color: 'var(--error)' }}>{error}</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <CalendarIcon />
              </div>
              <p className="text-base font-medium" style={{ color: 'var(--muted-foreground)' }}>No attendance records found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border shadow-lg -mx-2" style={{ borderColor: 'var(--border)' }}>
              <div className="min-w-full inline-block">
                <table className="w-full text-sm divide-y min-w-[800px]" style={{ borderColor: 'var(--border)' }}>
                  <thead>
                    <tr style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%)', color: 'white' }}>
                      <th className="text-left px-5 py-4 text-xs font-bold uppercase tracking-wider">Schedule</th>
                      <th className="text-left px-5 py-4 text-xs font-bold uppercase tracking-wider">Date</th>
                      <th className="text-left px-5 py-4 text-xs font-bold uppercase tracking-wider">Type</th>
                      <th className="text-left px-5 py-4 text-xs font-bold uppercase tracking-wider">Time</th>
                      <th className="text-left px-5 py-4 text-xs font-bold uppercase tracking-wider">Subject</th>
                      <th className="text-left px-5 py-4 text-xs font-bold uppercase tracking-wider">Teacher</th>
                      <th className="text-left px-5 py-4 text-xs font-bold uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r, i) => (
                      <tr key={i} className="border-t transition-all duration-200 hover:bg-gradient-to-r hover:from-[var(--muted)]/60 hover:to-transparent animate-fade-in-up" style={{ borderColor: 'var(--border)', animationDelay: `${i * 0.03}s` }}>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <CalendarIcon />
                            <div>
                              <div className="text-sm font-bold" style={{ color: 'var(--primary-dark)' }}>{isInOrOutGeneral(r) ? 'N/A' : String(r.scheduleDay ?? r.day ?? 'N/A')}</div>
                              <div className="text-xs mt-0.5 font-medium" style={{ color: 'var(--muted-foreground)' }}>{isInOrOutGeneral(r) ? '' : String(r.scheduleTimeSlot ?? r.timeSlot ?? 'N/A')}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <CalendarIcon />
                            <span className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>{formatDate(r.checkInTime ?? r.scanTime ?? r.date)}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1.5 inline-flex items-center gap-1.5 text-xs leading-5 font-bold rounded-full ring-2 transition-all duration-200 hover:scale-105 ${getTypePillClass(r)}`}>{getTypeLabel(r)}</span>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <ClockIcon />
                            <span className="text-sm font-bold" style={{ color: 'var(--primary-dark)' }}>{formatTime(getTimeForRecord(r))}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <BookIcon />
                            <div>
                              <span className="text-sm font-bold" style={{ color: 'var(--primary-dark)' }}>{String(r.subject ?? '—')}</span>
                              {String(r.subject ?? '').toLowerCase() !== 'general' && (Boolean(r.gradeLevel) || Boolean(r.section)) && (
                                <span className="block text-xs mt-0.5 font-semibold px-1.5 py-0.5 rounded" style={{ background: 'rgba(46, 125, 50, 0.1)', color: 'var(--primary-dark)' }}>
                                  {[String(r.gradeLevel ?? '').trim(), String(r.section ?? '').trim()].filter(Boolean).join(' - ')}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <UserIcon />
                            <span className="text-sm font-semibold" style={{ color: 'var(--muted-foreground)' }}>{String(r.scheduleTeacher ?? r.teacher ?? 'N/A')}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1.5 inline-flex text-xs leading-5 font-bold rounded-full ring-2 transition-all duration-200 hover:scale-105 ${getStatusPillClass(String(r.status ?? ''))}`}>{String(r.status ?? '—')}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
