'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { getToken, getTeacherData } from '@/lib/auth';
import { getTeacherSchedule, getClassStudents } from '../../../lib/api';
import PageHeader from '@/components/PageHeader';
import { printStudentsList } from './components/pdfprint';
import { StudentDetailModal } from '@/components/StudentDetailModal';

// Icon Components
const SearchIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const FilterIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
  </svg>
);

const UserIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const CalendarIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const ClockIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const BookIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  </svg>
);

const XIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const ArrowRightIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
  </svg>
);

const CheckCircleIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const PrintIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
  </svg>
);

const StudentsIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

export default function StudentsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [schedules, setSchedules] = useState<Record<string, unknown>[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState<Record<string, unknown> | null>(null);
  const [students, setStudents] = useState<Record<string, unknown>[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [modalStudent, setModalStudent] = useState<Record<string, unknown> | null>(null);
  const [studentSearch, setStudentSearch] = useState('');

  const loadSchedules = async () => {
    const token = getToken();
    const data = getTeacherData();
    if (!token || !data.teacherName) {
      setError('Not authenticated');
      setLoading(false);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const list = await getTeacherSchedule({
        token,
        teacherId: data.teacherId ?? undefined,
        teacherName: data.teacherName,
      });
      setSchedules(list);
      if (list.length > 0 && !selectedSchedule) {
        setSelectedSchedule(list[0] as Record<string, unknown>);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load schedules');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSchedules();
  }, []);

  const loadStudents = async (sched: Record<string, unknown>) => {
    const token = getToken();
    const data = getTeacherData();
    if (!token || !data.teacherName) return;
    setLoadingStudents(true);
    try {
      const list = await getClassStudents({
        gradeLevel: String(sched.gradeLevel ?? ''),
        section: String(sched.section ?? ''),
        teacherName: data.teacherName,
        token,
        subject: String(sched.subject ?? '') || undefined,
        shift: String(sched.shift ?? '') || undefined,
      });
      setStudents(list);
    } catch (e) {
      setStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  };

  useEffect(() => {
    if (selectedSchedule) {
      loadStudents(selectedSchedule);
    } else {
      setStudents([]);
    }
  }, [selectedSchedule]);

  const scheduleLabel = (s: Record<string, unknown>) =>
    `${String(s.subject ?? 'N/A')} · ${String(s.gradeLevel ?? '')}-${String(s.section ?? '')} · ${String(s.shift ?? '')}`;

  const filteredStudents = studentSearch.trim()
    ? students.filter((st) => {
        const name = String(st.studentName ?? st.name ?? st.fullName ?? '').toLowerCase();
        const id = String(st.studentId ?? st.id ?? '').toLowerCase();
        const q = studentSearch.trim().toLowerCase();
        return name.includes(q) || id.includes(q);
      })
    : students;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div
          className="animate-spin w-12 h-12 border-[3px] border-t-transparent rounded-full"
          style={{ borderColor: 'var(--primary)' }}
        />
        <p className="text-sm font-medium" style={{ color: 'var(--muted-foreground)' }}>Loading students...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-6 animate-fade-in-up">
        <div className="p-6 rounded-xl border bg-red-50" style={{ borderColor: 'var(--error)' }}>
          <p className="text-base font-semibold" style={{ color: 'var(--error)' }}>{error}</p>
        </div>
        <button
          type="button"
          onClick={loadSchedules}
          className="px-6 py-3 rounded-xl text-white btn-primary transition-all duration-200 hover:scale-105 hover:shadow-lg flex items-center gap-2"
        >
          <span>Retry</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader title="Students" icon={<StudentsIcon />} />

      <div className="p-6 rounded-xl border-2 card-theme shadow-lg animate-fade-in-up animate-delay-1" style={{ borderColor: 'var(--primary)' }}>
      <div className="flex flex-wrap gap-6 items-end">
        <div className="min-w-0 flex-1 max-w-md">
          <label className="flex items-center gap-2 text-sm font-bold mb-3" style={{ color: 'var(--primary-dark)' }}>
            <FilterIcon />
            <span>Select Class</span>
          </label>
          <div className="relative">
            <select
              value={
                selectedSchedule
                  ? String(selectedSchedule._id ?? selectedSchedule.id ?? '')
                  : ''
              }
              onChange={(e) => {
                const id = e.target.value;
                const s = schedules.find(
                  (x) => String(x._id ?? x.id ?? '') === id
                );
                setSelectedSchedule((s ?? null) as Record<string, unknown> | null);
              }}
              className="w-full px-4 py-3 pl-12 rounded-xl border input-theme transition-all duration-200 hover:shadow-md focus:shadow-lg appearance-none cursor-pointer"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%232e7d32'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', backgroundSize: '1.5em 1.5em' }}
            >
              <option value="">Choose a class...</option>
              {schedules.map((s, i) => (
                <option
                  key={i}
                  value={String(s._id ?? s.id ?? i)}
                >
                  {scheduleLabel(s)}
                </option>
              ))}
            </select>
            <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
              <BookIcon />
            </div>
          </div>
        </div>
        <div className="min-w-0 flex-1 max-w-md">
          <label className="flex items-center gap-2 text-sm font-bold mb-3" style={{ color: 'var(--primary-dark)' }}>
            <SearchIcon />
            <span>Search Students</span>
          </label>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--muted-foreground)' }}>
              <SearchIcon />
            </div>
            <input
              type="search"
              placeholder="Search by name or student ID..."
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              className="w-full px-4 py-3 pl-12 rounded-xl border input-theme transition-all duration-200 hover:shadow-md focus:shadow-lg"
            />
          </div>
        </div>
      </div>
      </div>

      {selectedSchedule && (
        <div className="flex items-center gap-4 flex-wrap animate-fade-in-up animate-delay-2">
          <Link
            href={`/schedule/${selectedSchedule._id ?? selectedSchedule.id ?? ''}`}
            className="group flex items-center gap-2 px-4 py-2 rounded-xl border transition-all duration-200 hover:shadow-md hover:scale-[1.02]"
            style={{ 
              borderColor: 'var(--border)',
              background: 'linear-gradient(135deg, var(--muted) 0%, color-mix(in srgb, var(--muted) 90%, var(--primary) 10%) 100%)',
            }}
          >
            <CalendarIcon />
            <span className="text-sm font-bold transition-colors duration-200" style={{ color: 'var(--primary-dark)' }}>
              View attendance for this class
            </span>
            <ArrowRightIcon />
          </Link>
        </div>
      )}

      <div className="rounded-2xl border-2 overflow-hidden card-theme shadow-lg animate-fade-in-up animate-delay-3" style={{ borderColor: 'var(--primary)' }}>
        {loadingStudents ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div
              className="animate-spin w-10 h-10 border-[3px] border-t-transparent rounded-full"
              style={{ borderColor: 'var(--primary)' }}
            />
            <p className="text-sm font-medium" style={{ color: 'var(--muted-foreground)' }}>Loading students...</p>
          </div>
        ) : students.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-muted to-color-mix(in srgb, var(--muted) 70%, var(--primary) 30%) flex items-center justify-center">
              <StudentsIcon />
            </div>
            <p className="text-base font-semibold" style={{ color: 'var(--muted-foreground)' }}>
              {selectedSchedule
                ? 'No students in this class'
                : 'Select a class to view students'}
            </p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-muted to-color-mix(in srgb, var(--muted) 70%, var(--primary) 30%) flex items-center justify-center">
              <SearchIcon />
            </div>
            <p className="text-base font-semibold" style={{ color: 'var(--muted-foreground)' }}>
              No students match your search
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%)' }}>
                  <th className="text-left px-6 py-4 font-bold text-white text-xs uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <UserIcon />
                      <span>Name</span>
                    </div>
                  </th>
                  <th className="text-left px-6 py-4 font-bold text-white text-xs uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <UserIcon />
                      <span>Gender</span>
                    </div>
                  </th>
                  <th className="text-left px-6 py-4 font-bold text-white text-xs uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <CheckCircleIcon />
                      <span>Student ID</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((st, i) => (
                  <tr 
                    key={i} 
                    className="border-t transition-all duration-200 hover:bg-gradient-to-r hover:from-[var(--muted)]/60 hover:to-transparent animate-fade-in-up"
                    style={{ 
                      borderColor: 'var(--border)',
                      animationDelay: `${i * 0.03}s`,
                    }}
                  >
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        onClick={() => setModalStudent(st)}
                        className="group flex items-center gap-2 text-left w-full font-bold transition-all duration-200 hover:scale-[1.02]"
                        style={{ color: 'var(--primary-dark)' }}
                      >
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center transition-all duration-200 group-hover:from-primary/20 group-hover:to-primary/10">
                          <UserIcon />
                        </div>
                        <span className="text-base group-hover:underline">{String(st.studentName ?? st.name ?? st.fullName ?? 'Unknown')}</span>
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span 
                          className="text-sm font-semibold px-2 py-0.5 rounded-md" 
                          style={{ 
                            background: String(st.gender ?? '').toLowerCase() === 'female' 
                              ? 'rgba(236, 72, 153, 0.15)' 
                              : String(st.gender ?? '').toLowerCase() === 'male' 
                              ? 'rgba(59, 130, 246, 0.15)' 
                              : 'rgba(46, 125, 50, 0.1)',
                            color: String(st.gender ?? '').toLowerCase() === 'female' 
                              ? '#ec4899' 
                              : String(st.gender ?? '').toLowerCase() === 'male' 
                              ? '#3b82f6' 
                              : 'var(--primary-dark)',
                          }}
                        >
                          {String(st.gender ?? '-')}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                          {String(st.studentId ?? st.id ?? '')}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalStudent && (
        <StudentDetailModal
          student={modalStudent}
          subjectFilter={selectedSchedule ? String(selectedSchedule.subject ?? '') : ''}
          teacherSchedules={schedules}
          onClose={() => setModalStudent(null)}
        />
      )}
    </div>
  );
}
