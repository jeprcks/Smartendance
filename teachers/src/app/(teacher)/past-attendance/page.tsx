'use client';

import { useEffect, useState } from 'react';
import { getToken, getTeacherData } from '@/lib/auth';
import {
  getTeacherSchedule,
  getAttendanceRecords,
  updateAttendanceRecord,
} from '../../../lib/api';
import PageHeader from '@/components/PageHeader';
import PrintExcelModal from './components/printexcelmodal';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MAX_CUSTOM_RANGE_DAYS = 310;

function getDayName(weekday: number): string {
  return DAYS[weekday - 1];
}

function getDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function getLast7Days(): { date: Date; dateStr: string; dayName: string }[] {
  const days = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    days.push({
      date,
      dateStr: getDateString(date),
      dayName: getDayName(date.getDay() || 7),
    });
  }
  return days;
}

function getDateRange(days: number): { date: Date; dateStr: string; dayName: string }[] {
  const dateArray = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    dateArray.push({
      date,
      dateStr: getDateString(date),
      dayName: getDayName(date.getDay() || 7),
    });
  }
  return dateArray;
}

function getDatesBetween(start: string, end: string): { date: Date; dateStr: string; dayName: string }[] {
  if (!start || !end) return [];
  const startDate = new Date(`${start}T00:00:00`);
  const endDate = new Date(`${end}T00:00:00`);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || startDate > endDate) {
    return [];
  }

  const dateArray = [];
  const current = new Date(startDate);
  while (current <= endDate) {
    if (dateArray.length >= MAX_CUSTOM_RANGE_DAYS) {
      break;
    }
    dateArray.push({
      date: new Date(current),
      dateStr: getDateString(current),
      dayName: getDayName(current.getDay() || 7),
    });
    current.setDate(current.getDate() + 1);
  }
  return dateArray;
}

interface StudentAttendance {
  studentId: string;
  studentName: string;
  gradeLevel: string;
  section: string;
  subject: string;
  enrollmentDate: string; // earliest known attendance date (acts as enrollment boundary)
  attendance: Record<string, string>; // date -> status
  recordIds: Record<string, string>; // date -> recordId
}

interface EditModalState {
  isOpen: boolean;
  studentId: string;
  studentName: string;
  date: string;
  currentStatus: string;
  recordId: string;
}

const CalendarIconForHeader = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

export default function PastAttendancePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allStudents, setAllStudents] = useState<StudentAttendance[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<StudentAttendance[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedGrade, setSelectedGrade] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [dateRangeFilter, setDateRangeFilter] = useState<number>(7);
  const [startDateFilter, setStartDateFilter] = useState<string>('');
  const [endDateFilter, setEndDateFilter] = useState<string>('');
  const [dateInputError, setDateInputError] = useState<string>('');
  const [subjects, setSubjects] = useState<string[]>([]);
  const [grades, setGrades] = useState<string[]>([]);
  const [sections, setSections] = useState<string[]>([]);
  const [editModal, setEditModal] = useState<EditModalState>({
    isOpen: false,
    studentId: '',
    studentName: '',
    date: '',
    currentStatus: '',
    recordId: '',
  });
  const [updateLoading, setUpdateLoading] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

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
      const [schedulesRes, recordsRes] = await Promise.all([
        getTeacherSchedule({
          token,
          teacherId: data.teacherId,
          teacherName: data.teacherName,
        }),
        getAttendanceRecords({ token }),
      ]);

      // Group records by student and date
      const studentMap = new Map<string, StudentAttendance>();
      const subjectsSet = new Set<string>();
      const gradesSet = new Set<string>();
      const sectionsSet = new Set<string>();

      const records = recordsRes.records || [];

      records.forEach((record: any) => {
        const studentId = String(record.studentId || '');
        const studentName = String(record.studentName || '');
        const gradeLevel = String(record.gradeLevel || '');
        const section = String(record.section || '');
        const subject = String(record.subject || '');
        const status = String(record.status || 'Absent');
        const recordDateSource = String(record.scanTime || record.checkInTime || record.createdAt || '');
        const dateStr = recordDateSource.substring(0, 10);

        if (!studentId || !studentName) return;
        if (!dateStr) return;

        subjectsSet.add(subject);
        gradesSet.add(gradeLevel);
        sectionsSet.add(section);

        const key = `${studentId}-${gradeLevel}-${section}-${subject}`;

        if (!studentMap.has(key)) {
          studentMap.set(key, {
            studentId,
            studentName,
            gradeLevel,
            section,
            subject,
            enrollmentDate: dateStr,
            attendance: {},
            recordIds: {},
          });
        }

        const student = studentMap.get(key)!;
        if (!student.enrollmentDate || dateStr < student.enrollmentDate) {
          student.enrollmentDate = dateStr;
        }
        student.attendance[dateStr] = status;
        student.recordIds[dateStr] = String(record._id || '');
        console.log(`Stored record - studentId: ${studentId}, date: ${dateStr}, recordId: ${student.recordIds[dateStr]}, createdAt: ${record.createdAt}`);
      });

      const studentsList = Array.from(studentMap.values()).sort((a, b) =>
        a.studentId.localeCompare(b.studentId)
      );

      setAllStudents(studentsList);
      setFilteredStudents(studentsList);
      setSubjects(Array.from(subjectsSet).sort());
      setGrades(Array.from(gradesSet).sort());
      setSections(Array.from(sectionsSet).sort());

      if (studentsList.length > 0) {
        const firstStudent = studentsList[0];
        setSelectedGrade(firstStudent.gradeLevel);
        setSelectedSection(firstStudent.section);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load past attendance');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Filter students based on criteria
  useEffect(() => {
    let filtered = allStudents;
    const hasCustomDateInput = !!startDateFilter || !!endDateFilter;
    const customRangeDays =
      startDateFilter && endDateFilter
        ? Math.floor(
            (new Date(`${endDateFilter}T00:00:00`).getTime() -
              new Date(`${startDateFilter}T00:00:00`).getTime()) /
              86400000
          ) + 1
        : 0;
    const hasInvalidCustomRange =
      hasCustomDateInput &&
      (!startDateFilter ||
        !endDateFilter ||
        Number.isNaN(customRangeDays) ||
        customRangeDays <= 0 ||
        customRangeDays > MAX_CUSTOM_RANGE_DAYS);
    const activeDates =
      !hasInvalidCustomRange && startDateFilter && endDateFilter
        ? getDatesBetween(startDateFilter, endDateFilter)
        : getDateRange(dateRangeFilter);

    if (selectedGrade) {
      filtered = filtered.filter((s) => s.gradeLevel === selectedGrade);
    }
    if (selectedSection) {
      filtered = filtered.filter((s) => s.section === selectedSection);
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.studentName.toLowerCase().includes(query) ||
          s.studentId.toLowerCase().includes(query)
      );
    }

    if (statusFilter !== 'All') {
      filtered = filtered.filter((s) => {
        return activeDates.some((day) => day.dateStr >= s.enrollmentDate && s.attendance[day.dateStr] === statusFilter);
      });
    }

    setFilteredStudents(filtered);
  }, [allStudents, selectedGrade, selectedSection, searchQuery, statusFilter, dateRangeFilter, startDateFilter, endDateFilter]);

  useEffect(() => {
    const hasCustomDateInput = !!startDateFilter || !!endDateFilter;
    if (!hasCustomDateInput) {
      setDateInputError('');
      return;
    }
    if (!startDateFilter || !endDateFilter) {
      setDateInputError('Please select both start date and end date.');
      return;
    }

    const start = new Date(`${startDateFilter}T00:00:00`);
    const end = new Date(`${endDateFilter}T00:00:00`);
    const dayCount = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      setDateInputError('Invalid date range.');
      return;
    }
    if (start > end) {
      setDateInputError('Start date cannot be later than end date.');
      return;
    }
    if (dayCount > MAX_CUSTOM_RANGE_DAYS) {
      setDateInputError(`Custom date range is limited to ${MAX_CUSTOM_RANGE_DAYS} days.`);
      return;
    }

    setDateInputError('');
  }, [startDateFilter, endDateFilter]);

  const handleEditClick = (studentId: string, studentName: string, date: string, currentStatus: string, subject: string, gradeLevel: string, section: string) => {
    // Find the exact student record by matching all identifying fields
    let student = filteredStudents.find(
      (s) => s.studentId === studentId && s.subject === subject && s.gradeLevel === gradeLevel && s.section === section
    );
    if (!student) {
      student = allStudents.find(
        (s) => s.studentId === studentId && s.subject === subject && s.gradeLevel === gradeLevel && s.section === section
      );
    }
    
    const recordId = student?.recordIds[date] || '';
    console.log('Edit click - Searching for:', { studentId, subject, gradeLevel, section, date });
    console.log('Found student:', student);
    console.log('Student recordIds map:', student?.recordIds);
    console.log('Looking up recordId for date:', date, '-> result:', recordId);

    setEditModal({
      isOpen: true,
      studentId,
      studentName,
      date,
      currentStatus,
      recordId,
    });
  };

  const handleStatusChange = async (newStatus: string, recordId: string) => {
    setUpdateLoading(true);
    try {
      const token = getToken();
      
      if (!token) {
        throw new Error('Not authenticated - please login again');
      }
      
      if (!recordId) {
        console.error('Missing recordId in handleStatusChange', { editModal, recordId });
        throw new Error('Record ID not found. The attendance record could not be located.');
      }

      // Call the API to update the record
      await updateAttendanceRecord({
        recordId: recordId,
        status: newStatus,
        token,
      });

      // Update local state only on success
      const studentIndex = filteredStudents.findIndex(
        (s) => s.studentId === editModal.studentId
      );
      if (studentIndex !== -1) {
        const updatedStudents = [...filteredStudents];
        updatedStudents[studentIndex].attendance[editModal.date] = newStatus;
        setFilteredStudents(updatedStudents);
      }
      
      // Also update allStudents to keep them in sync
      const allStudentIndex = allStudents.findIndex(
        (s) => s.studentId === editModal.studentId
      );
      if (allStudentIndex !== -1) {
        const updatedAllStudents = [...allStudents];
        updatedAllStudents[allStudentIndex].attendance[editModal.date] = newStatus;
        setAllStudents(updatedAllStudents);
      }

      setEditModal({ ...editModal, isOpen: false });
    } catch (e) {
      console.error('Failed to update status:', e);
      alert(`Failed to update attendance: ${e instanceof Error ? e.message : 'Unknown error'}`);
    } finally {
      setUpdateLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Present':
        return { bg: '#a7f3d0', text: '#059669' };
      case 'Absent':
        return { bg: '#fca5a5', text: '#991b1b' };
      case 'Late':
        return { bg: '#fcd34d', text: '#d97706' };
      case 'Cutting':
        return { bg: '#ddd6fe', text: '#6d28d9' };
      case 'Unscanned':
        return { bg: '#e5e7eb', text: '#6b7280' };
      default:
        return { bg: '#f3f4f6', text: '#6b7280' };
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'Present':
        return '✓ Present';
      case 'Absent':
        return '✗ Absent';
      case 'Late':
        return '⏰ Late';
      case 'Cutting':
        return '⚠ Cutting';
      case 'Unscanned':
        return '⊘ Unscanned';
      default:
        return status;
    }
  };

  const displayedDates =
    !dateInputError && startDateFilter && endDateFilter
      ? getDatesBetween(startDateFilter, endDateFilter)
      : getDateRange(dateRangeFilter);
  const statusSummary = filteredStudents.reduce(
    (acc, student) => {
      displayedDates.forEach((day) => {
        if (day.dateStr < student.enrollmentDate) return;
        const status = student.attendance[day.dateStr];
        if (status === 'Present') {
          acc.present += 1;
          acc.total += 1;
        } else if (status === 'Absent') {
          acc.absent += 1;
          acc.total += 1;
        } else if (status === 'Late') {
          acc.late += 1;
          acc.total += 1;
        } else if (status === 'Cutting') {
          acc.cutting += 1;
          acc.total += 1;
        }
      });
      return acc;
    },
    { present: 0, absent: 0, late: 0, cutting: 0, total: 0 }
  );
  const exportDateRangeLabel =
    !dateInputError && startDateFilter && endDateFilter
      ? `${startDateFilter} to ${endDateFilter}`
      : dateRangeFilter === 7
        ? 'Last 7 Days'
        : dateRangeFilter === 30
          ? 'Last 30 Days'
          : 'All History';

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div
          className="animate-spin w-12 h-12 border-[3px] border-t-transparent rounded-full"
          style={{ borderColor: 'var(--primary)' }}
        />
        <p className="text-sm font-semibold" style={{ color: 'var(--muted-foreground)' }}>
          Loading past attendance...
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Past Attendance" icon={<CalendarIconForHeader />} />
        <button
          onClick={() => setIsPrintModalOpen(true)}
          className="px-4 py-2 rounded-lg font-medium transition-all hover:shadow-md"
          style={{
            backgroundColor: 'var(--primary)',
            color: '#ffffff',
          }}
        >
          � Export Excel
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-lg border-2" style={{ borderColor: 'var(--error)', backgroundColor: 'transparent', color: 'var(--error)' }}>
          <p className="font-semibold">Error</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <div
          className="p-4 rounded-xl border-l-4 transition-all duration-300 hover:shadow-lg dashboard-card"
          style={{ background: 'rgba(67, 160, 71, 0.22)', borderLeftColor: 'var(--success)', borderColor: 'var(--border)' }}
        >
          <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--muted-foreground)' }}>Present</p>
          <p className="text-2xl font-bold" style={{ color: 'var(--success)' }}>{statusSummary.present}</p>
        </div>
        <div
          className="p-4 rounded-xl border-l-4 transition-all duration-300 hover:shadow-lg dashboard-card"
          style={{ background: 'rgba(216, 67, 21, 0.22)', borderLeftColor: 'var(--destructive)', borderColor: 'var(--border)' }}
        >
          <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--muted-foreground)' }}>Absent</p>
          <p className="text-2xl font-bold" style={{ color: 'var(--destructive)' }}>{statusSummary.absent}</p>
        </div>
        <div
          className="p-4 rounded-xl border-l-4 transition-all duration-300 hover:shadow-lg dashboard-card"
          style={{ background: 'rgba(255, 193, 7, 0.28)', borderLeftColor: 'var(--accent)', borderColor: 'var(--border)' }}
        >
          <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--muted-foreground)' }}>Late</p>
          <p className="text-2xl font-bold" style={{ color: 'var(--error)' }}>{statusSummary.late}</p>
        </div>
        <div
          className="p-4 rounded-xl border-l-4 transition-all duration-300 hover:shadow-lg dashboard-card"
          style={{ background: 'rgba(230, 81, 0, 0.22)', borderLeftColor: 'var(--error)', borderColor: 'var(--border)' }}
        >
          <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--muted-foreground)' }}>Cutting</p>
          <p className="text-2xl font-bold" style={{ color: 'var(--error)' }}>{statusSummary.cutting}</p>
        </div>
        <div
          className="p-4 rounded-xl border-l-4 transition-all duration-300 hover:shadow-lg dashboard-card"
          style={{ background: 'var(--secondary)', borderLeftColor: 'var(--primary)', borderColor: 'var(--border)' }}
        >
          <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--muted-foreground)' }}>Total</p>
          <p className="text-2xl font-bold" style={{ color: 'var(--primary-dark)' }}>{statusSummary.total}</p>
        </div>
      </div>

      {/* Filters */}
      <div
        className="rounded-lg border-2 p-4 space-y-4"
        style={{ borderColor: 'var(--primary)', backgroundColor: 'transparent' }}
      >
        <h3 className="font-semibold text-base" style={{ color: 'var(--foreground)' }}>
          Filters
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Grade Filter */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
              Grade
            </label>
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border"
              style={{
                borderColor: 'var(--border)',
                backgroundColor: 'var(--background)',
                color: 'var(--foreground)',
              }}
            >
              <option value="">All Grades</option>
              {grades.map((grade) => (
                <option key={grade} value={grade}>
                  Grade {grade}
                </option>
              ))}
            </select>
          </div>

          {/* Section Filter */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
              Section
            </label>
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border"
              style={{
                borderColor: 'var(--border)',
                backgroundColor: 'var(--background)',
                color: 'var(--foreground)',
              }}
            >
              <option value="">All Sections</option>
              {sections.map((section) => (
                <option key={section} value={section}>
                  {section}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Filter */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
              Preset Range
            </label>
            <select
              value={dateRangeFilter}
              onChange={(e) => {
                setDateRangeFilter(Number(e.target.value));
                setStartDateFilter('');
                setEndDateFilter('');
              }}
              className="w-full px-3 py-2 rounded-lg border"
              style={{
                borderColor: 'var(--border)',
                backgroundColor: 'var(--background)',
                color: 'var(--foreground)',
              }}
            >
              <option value={7}>Last 7 Days</option>
              <option value={30}>Last 30 Days</option>
              <option value={999}>All History</option>
            </select>
          </div>

          {/* Start Date Filter */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
              Start Date
            </label>
            <input
              type="date"
              value={startDateFilter}
              onChange={(e) => setStartDateFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border"
              style={{
                borderColor: 'var(--border)',
                backgroundColor: 'var(--background)',
                color: 'var(--foreground)',
              }}
            />
          </div>

          {/* End Date Filter */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
              End Date
            </label>
            <input
              type="date"
              value={endDateFilter}
              onChange={(e) => setEndDateFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border"
              style={{
                borderColor: 'var(--border)',
                backgroundColor: 'var(--background)',
                color: 'var(--foreground)',
              }}
            />
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border"
              style={{
                borderColor: 'var(--border)',
                backgroundColor: 'var(--background)',
                color: 'var(--foreground)',
              }}
            >
              <option value="All">All</option>
              <option value="Present">Present</option>
              <option value="Absent">Absent</option>
              <option value="Late">Late</option>
              <option value="Cutting">Cutting</option>
            </select>
          </div>

          {/* Search */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
              Search Student
            </label>
            <input
              type="text"
              placeholder="Name or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border"
              style={{
                borderColor: 'var(--border)',
                backgroundColor: 'var(--background)',
                color: 'var(--foreground)',
              }}
            />
          </div>
        </div>

        {dateInputError && (
          <div
            className="rounded-lg border px-3 py-2 text-sm"
            style={{
              borderColor: 'var(--error)',
              color: 'var(--error)',
              backgroundColor: 'color-mix(in srgb, var(--error) 8%, transparent)',
            }}
          >
            {dateInputError}
          </div>
        )}
      </div>

      {/* Attendance Table */}
      {filteredStudents.length === 0 ? (
        <div className="text-center py-12" style={{ color: 'var(--muted-foreground)' }}>
          <p className="text-base">No students found matching your criteria</p>
        </div>
      ) : (
        <div
          className="rounded-xl border-2 overflow-hidden card-theme"
          style={{ borderColor: 'var(--primary)' }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: 'transparent', borderBottom: '2px solid var(--border)' }}>
                  <th
                    className="px-4 py-3 text-left font-semibold text-base"
                    style={{ color: 'var(--foreground)' }}
                  >
                    ID
                  </th>
                  <th
                    className="px-4 py-3 text-left font-semibold text-base"
                    style={{ color: 'var(--foreground)' }}
                  >
                    Student Name
                  </th>
                  <th
                    className="px-4 py-3 text-left font-semibold text-base"
                    style={{ color: 'var(--foreground)' }}
                  >
                    Subject
                  </th>
                  {displayedDates.map((day) => (
                    <th
                      key={day.dateStr}
                      className="px-2 py-3 text-center font-semibold text-xs"
                      style={{ color: 'var(--foreground)', minWidth: '110px' }}
                    >
                      <div>{day.dayName.slice(0, 3)}</div>
                      <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                        {day.dateStr.split('-')[2]}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student, idx) => (
                  <tr
                    key={`${student.studentId}-${idx}`}
                    style={{
                      backgroundColor: 'transparent',
                      borderBottom: '1px solid var(--border)',
                    }}
                  >
                    <td className="px-4 py-3 font-medium text-base" style={{ color: 'var(--foreground)' }}>
                      {student.studentId}
                    </td>
                    <td className="px-4 py-3 text-base" style={{ color: 'var(--foreground)' }}>
                      {student.studentName}
                    </td>
                    <td className="px-4 py-3 text-base font-medium" style={{ color: 'var(--primary)' }}>
                      {student.subject}
                    </td>
                    {displayedDates.map((day) => {
                      const isBeforeEnrollment = day.dateStr < student.enrollmentDate;
                      if (isBeforeEnrollment) {
                        return (
                          <td
                            key={`${student.studentId}-${day.dateStr}`}
                            className="px-2 py-3 text-center"
                          />
                        );
                      }

                      const hasRecord = !!student.recordIds[day.dateStr];
                      const status = hasRecord
                        ? (student.attendance[day.dateStr] || 'Absent')
                        : 'Unscanned';
                      const colors = getStatusColor(status);
                      return (
                        <td
                          key={`${student.studentId}-${day.dateStr}`}
                          className="px-2 py-3 text-center"
                        >
                        <button
                            onClick={() => {
                              if (hasRecord) {
                                handleEditClick(
                                  student.studentId,
                                  student.studentName,
                                  day.dateStr,
                                  status,
                                  student.subject,
                                  student.gradeLevel,
                                  student.section
                                );
                              }
                            }}
                            disabled={!hasRecord}
                            className={`inline-block px-2 py-1 rounded-lg text-xs font-semibold transition-all ${
                              hasRecord ? 'hover:shadow-md cursor-pointer' : 'cursor-not-allowed opacity-60'
                            }`}
                            style={{
                              backgroundColor: colors.bg,
                              color: colors.text,
                            }}
                          >
                            {getStatusLabel(status)}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Export Excel Modal */}
      <PrintExcelModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        students={filteredStudents}
        dateRangeLabel={exportDateRangeLabel}
        exportDates={displayedDates.map((d) => d.dateStr)}
      />

      {/* Edit Modal */}
      {editModal.isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setEditModal({ ...editModal, isOpen: false })}
        >
          <div
            className="rounded-xl w-full max-w-md shadow-2xl p-6"
            onClick={(e) => e.stopPropagation()}
            style={{ backgroundColor: 'var(--background)' }}
          >
            <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--foreground)' }}>
              Change Attendance Status
            </h2>
            <p className="text-sm mb-4" style={{ color: 'var(--muted-foreground)' }}>
              {editModal.studentName} on {editModal.date}
            </p>

            <div className="space-y-2 mb-6">
              {['Present', 'Absent', 'Late', 'Cutting'].map((status) => {
                const colors = getStatusColor(status);
                const isSelected = status === editModal.currentStatus;
                return (
                  <button
                    key={status}
                    onClick={() => handleStatusChange(status, editModal.recordId)}
                    disabled={updateLoading}
                    className="w-full px-4 py-2 rounded-lg text-base font-medium transition-all"
                    style={{
                      backgroundColor: colors.bg,
                      color: colors.text,
                      border: isSelected ? '2px solid' : '2px solid transparent',
                      borderColor: isSelected ? colors.text : 'transparent',
                      opacity: updateLoading ? 0.5 : 1,
                    }}
                  >
                    {getStatusLabel(status)}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setEditModal({ ...editModal, isOpen: false })}
              className="w-full px-4 py-2 rounded-lg font-medium transition-colors"
              style={{
                backgroundColor: 'var(--secondary)',
                color: 'var(--foreground)',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
