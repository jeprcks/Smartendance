'use client';

import { useState, useEffect } from 'react';
import { studentService, type Student } from '@/app/services/studentService';

interface ViewScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  schedule: {
    _id?: string;
    id?: string;
    gradeLevel: string;
    section: string;
    subject: string;
    teacher: string;
    timeSlot: string;
    room: string;
    day?: string;
    days?: string[];
    shift: string;
  } | null;
}

export default function ViewScheduleModal({ isOpen, onClose, schedule }: ViewScheduleModalProps) {
  const [enrolledStudents, setEnrolledStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [studentError, setStudentError] = useState<string | null>(null);

  // Fetch students enrolled in this schedule
  useEffect(() => {
    if (isOpen && schedule) {
      fetchEnrolledStudents();
    }
  }, [isOpen, schedule]);

  const fetchEnrolledStudents = async () => {
    if (!schedule) return;
    
    try {
      setLoadingStudents(true);
      setStudentError(null);
      
      // Fetch all students then filter by grade level, section, and SHIFT specifically
      const allStudents = await studentService.getAllStudents();
      const studentsArray: Student[] = allStudents;
      const filtered = studentsArray.filter((s: Student) => 
        s.gradeLevel === schedule.gradeLevel && 
        s.section === schedule.section &&
        s.shift === schedule.shift  // Only students with exact same shift
      );
      setEnrolledStudents(filtered);
    } catch (error) {
      setStudentError(error instanceof Error ? error.message : 'Failed to load students');
      console.error('Error fetching students:', error);
    } finally {
      setLoadingStudents(false);
    }
  };

  if (!isOpen || !schedule) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="fixed inset-0 bg-black opacity-50"></div>
      <div className="bg-[var(--surface)] rounded-lg shadow-lg border border-[var(--border)] p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto relative z-10">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-[var(--foreground)]">Schedule Details</h2>
          <button 
            onClick={onClose}
            className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-[var(--muted-foreground)] mb-1">Schedule ID</p>
              <p className="text-base font-medium text-[var(--foreground)]">{schedule._id || schedule.id || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-[var(--muted-foreground)] mb-1">Subject</p>
              <p className="text-base font-medium text-[var(--foreground)]">{schedule.subject}</p>
            </div>
            <div>
              <p className="text-sm text-[var(--muted-foreground)] mb-1">Grade Level</p>
              <p className="text-base font-medium text-[var(--foreground)]">{schedule.gradeLevel}</p>
            </div>
            <div>
              <p className="text-sm text-[var(--muted-foreground)] mb-1">Section</p>
              <p className="text-base font-medium text-[var(--foreground)]">{schedule.section}</p>
            </div>
            <div>
              <p className="text-sm text-[var(--muted-foreground)] mb-1">Teacher</p>
              <p className="text-base font-medium text-[var(--foreground)]">{schedule.teacher}</p>
            </div>
            <div>
              <p className="text-sm text-[var(--muted-foreground)] mb-1">Room</p>
              <p className="text-base font-medium text-[var(--foreground)]">{schedule.room}</p>
            </div>
            <div>
              <p className="text-sm text-[var(--muted-foreground)] mb-1">Days</p>
              <div className="flex flex-wrap gap-2">
                {(Array.isArray(schedule.days) ? schedule.days : schedule.day ? [schedule.day] : []).map((day) => (
                  <span
                    key={day}
                    className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 ring-1 ring-green-200/50"
                  >
                    {day}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm text-[var(--muted-foreground)] mb-1">Time Slot</p>
              <p className="text-base font-medium text-[var(--foreground)]">{schedule.timeSlot}</p>
            </div>
            <div>
              <p className="text-sm text-[var(--muted-foreground)] mb-1">Shift</p>
              <p className="text-base font-medium text-[var(--foreground)]">{schedule.shift}</p>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-[var(--border)]">
          <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">Enrolled Students ({schedule.shift} Shift)</h3>

          {loadingStudents ? (
            <p className="text-sm text-[var(--muted-foreground)]">Loading students...</p>
          ) : studentError ? (
            <p className="text-sm text-[var(--destructive)]">{studentError}</p>
          ) : enrolledStudents.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">No students found for this schedule.</p>
          ) : (
            <div className="overflow-x-auto border rounded-md">
              <table className="min-w-full divide-y divide-[var(--border)]">
                <thead className="bg-[var(--muted)]">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-[var(--muted-foreground)]">Student ID</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-[var(--muted-foreground)]">Full Name</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-[var(--muted-foreground)]">Grade</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-[var(--muted-foreground)]">Section</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-[var(--muted-foreground)]">Gender</th>
                  </tr>
                </thead>
                <tbody className="bg-[var(--surface)] divide-y divide-[var(--border)]">
                  {enrolledStudents.map((student) => (
                    <tr key={student._id} className="hover:bg-[var(--muted)]">
                      <td className="px-4 py-2 text-sm text-[var(--foreground)]">{student.studentId}</td>
                      <td className="px-4 py-2 text-sm text-[var(--foreground)]">{student.fullName}</td>
                      <td className="px-4 py-2 text-sm text-[var(--foreground)]">{student.gradeLevel}</td>
                      <td className="px-4 py-2 text-sm text-[var(--foreground)]">{student.section}</td>
                      <td className="px-4 py-2 text-sm font-medium">
                        <span style={{ color: student.gender === 'Male' ? 'var(--accent-blue, #1565c0)' : 'var(--accent-pink, #c2185b)' }}>{student.gender}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex justify-end mt-8 pt-6 border-t border-[var(--border)]">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-lg hover:bg-[var(--primary-dark)] transition-colors shadow-sm hover:shadow-md"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
