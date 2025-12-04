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
    day: string;
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
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto relative z-10">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Schedule Details</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-500 mb-1">Schedule ID</p>
              <p className="text-base font-medium text-gray-900">{schedule._id || schedule.id || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Subject</p>
              <p className="text-base font-medium text-gray-900">{schedule.subject}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Grade Level</p>
              <p className="text-base font-medium text-gray-900">{schedule.gradeLevel}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Section</p>
              <p className="text-base font-medium text-gray-900">{schedule.section}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Teacher</p>
              <p className="text-base font-medium text-gray-900">{schedule.teacher}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Room</p>
              <p className="text-base font-medium text-gray-900">{schedule.room}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Day</p>
              <p className="text-base font-medium text-gray-900">{schedule.day}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Time Slot</p>
              <p className="text-base font-medium text-gray-900">{schedule.timeSlot}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Shift</p>
              <p className="text-base font-medium text-gray-900">{schedule.shift}</p>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Enrolled Students ({schedule.shift} Shift)</h3>

          {loadingStudents ? (
            <p className="text-sm text-gray-500">Loading students...</p>
          ) : studentError ? (
            <p className="text-sm text-red-600">{studentError}</p>
          ) : enrolledStudents.length === 0 ? (
            <p className="text-sm text-gray-500">No students found for this schedule.</p>
          ) : (
            <div className="overflow-x-auto border rounded-md">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Student ID</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Full Name</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Grade</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Section</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Gender</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {enrolledStudents.map((student) => (
                    <tr key={student._id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-sm text-gray-700">{student.studentId}</td>
                      <td className="px-4 py-2 text-sm text-gray-700">{student.fullName}</td>
                      <td className="px-4 py-2 text-sm text-gray-700">{student.gradeLevel}</td>
                      <td className="px-4 py-2 text-sm text-gray-700">{student.section}</td>
                      <td className="px-4 py-2 text-sm text-gray-700">{student.gender}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex justify-end mt-8 pt-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm hover:shadow-md"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
