'use client';

import { useState, useEffect } from 'react';
import { Student } from '@/app/services/studentService';
import { scheduleService, Schedule } from '@/app/services/scheduleService';
import toast from 'react-hot-toast';

interface StudentScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
}

export default function StudentScheduleModal({ isOpen, onClose, student }: StudentScheduleModalProps) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [groupedClasses, setGroupedClasses] = useState<{ [key: string]: Schedule[] }>({});

  useEffect(() => {
    if (isOpen && student) {
      fetchSchedules();
    }
  }, [isOpen, student]);

  const fetchSchedules = async () => {
    if (!student) return;

    try {
      setLoading(true);
      setError(null);
      // Fetch schedules for this grade level and section from schedules table
      let data = await scheduleService.getSchedulesByGradeAndSection(
        student.gradeLevel,
        student.section
      );
      
      // Filter by student's shift
      if (student.shift) {
        data = data.filter(schedule => schedule.shift === student.shift);
      }
      
      setSchedules(data);
      
      groupClassesByDay(data);
    } catch (error) {
      console.error('Error fetching schedules:', error);
      setError('No schedule found for this grade and section.');
      setSchedules([]);
      setGroupedClasses({});
    } finally {
      setLoading(false);
    }
  };

  const groupClassesByDay = (schedulesList: Schedule[]) => {
    const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const grouped: { [key: string]: Schedule[] } = {};

    dayOrder.forEach(day => {
      grouped[day] = [];
    });

    schedulesList
      .filter(schedule => schedule.isActive !== false)
      .forEach(schedule => {
        // Handle both single day (legacy) and days array
        const daysToProcess = schedule.days && schedule.days.length > 0 
          ? schedule.days 
          : schedule.day 
            ? [schedule.day] 
            : [];
        
        daysToProcess.forEach(day => {
          if (day && grouped[day]) {
            grouped[day].push(schedule);
          }
        });
      });

    // Sort by timeSlot within each day
    Object.keys(grouped).forEach(day => {
      grouped[day].sort((a, b) => a.timeSlot.localeCompare(b.timeSlot));
    });

    setGroupedClasses(grouped);
  };

  if (!isOpen || !student) return null;

  return (
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 p-6 w-full max-w-4xl max-h-[90vh] flex flex-col transform transition-all duration-300 scale-100">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight mb-3">
              Schedule for {student.fullName}
            </h2>
            <div className="flex gap-3 flex-wrap">
              <div className="inline-flex items-center px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg">
                <svg className="w-4 h-4 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
                </svg>
                <span className="text-xs font-semibold text-green-900">{student.studentId}</span>
              </div>
              <div className="inline-flex items-center px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg">
                <svg className="w-4 h-4 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.5 1.5H5.75A2.25 2.25 0 003.5 3.75v12.5A2.25 2.25 0 005.75 18.5h8.5a2.25 2.25 0 002.25-2.25V6.5m-12-2h10m-10 4h10m-10 4h10m-10 4h6" />
                </svg>
                <span className="text-xs font-semibold text-green-900">{student.gradeLevel}</span>
              </div>
              <div className="inline-flex items-center px-3 py-1.5 bg-purple-50 border border-purple-200 rounded-lg">
                <svg className="w-4 h-4 text-purple-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v2a1 1 0 001 1h1.05A2.5 2.5 0 0110 6.5h4.05a1 1 0 001-1V5a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a2 2 0 100 4 2 2 0 000-4z" clipRule="evenodd" />
                </svg>
                <span className="text-xs font-semibold text-purple-900">{student.section}</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-all duration-200 flex-shrink-0"
          >
            <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Schedule content - scrollable */}
        <div className="space-y-6 overflow-y-auto flex-1 pr-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mr-3"></div>
              <span className="text-gray-600">Loading schedule...</span>
            </div>
          ) : error ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
              <svg className="h-12 w-12 text-yellow-400 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-yellow-800">{error}</p>
            </div>
          ) : schedules.length > 0 && Object.values(groupedClasses).some(day => day.length > 0) ? (
            <>
              {/* Days of week with classes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day) => (
                  <div
                    key={day}
                    className="bg-gradient-to-br from-green-50 to-green-100/50 border border-green-200/50 rounded-lg p-4"
                  >
                    <h3 className="font-semibold text-green-900 mb-3 flex items-center">
                      <span className="inline-flex items-center justify-center w-6 h-6 bg-green-600 text-white text-xs font-bold rounded-full mr-2">
                        {groupedClasses[day]?.length || 0}
                      </span>
                      {day}
                    </h3>
                    <div className="space-y-2">
                      {groupedClasses[day] && groupedClasses[day].length > 0 ? (
                        groupedClasses[day].map((schedule, idx) => (
                          <div
                            key={idx}
                            className="bg-white rounded p-3 text-sm border border-green-100 hover:shadow-md transition-shadow"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <div className="font-semibold text-gray-900">{schedule.subject}</div>
                                <div className="text-xs text-gray-500 mt-1">{schedule.day}</div>
                              </div>
                            </div>
                            <div className="mt-2 space-y-1">
                              <div className="flex items-center text-xs text-gray-700">
                                <svg className="w-4 h-4 mr-1.5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00-.293.707l-2.828 2.829a1 1 0 101.414 1.414L8 9.586V6z" clipRule="evenodd" />
                                </svg>
                                <span className="font-medium">{schedule.timeSlot}</span>
                              </div>
                              <div className="flex items-center text-xs text-gray-700">
                                <svg className="w-4 h-4 mr-1.5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                                </svg>
                                <span className="font-medium">Room {schedule.room}</span>
                              </div>
                              <div className="flex items-center text-xs text-gray-600">
                                <svg className="w-4 h-4 mr-1.5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                </svg>
                                <span>{schedule.teacher}</span>
                              </div>
                              <div className="flex items-center text-xs text-gray-600">
                                <svg className="w-4 h-4 mr-1.5 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                                </svg>
                                <span className="font-medium">{schedule.shift}</span>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="bg-white rounded p-3 text-sm border border-gray-200 text-gray-400">
                          No classes
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : schedules.length > 0 ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
              <svg className="h-12 w-12 text-blue-400 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <p className="text-blue-800">No classes scheduled for this grade/section yet</p>
            </div>
          ) : null}
        </div>

        {/* Action buttons - fixed at bottom */}
        <div className="flex items-center justify-between pt-6 border-t border-gray-200 mt-6 flex-shrink-0">
          <div className="text-sm text-gray-600">
            Grade: <span className="font-semibold text-gray-900">{student.gradeLevel}</span> • 
            Section: <span className="font-semibold text-gray-900">{student.section}</span> •
            Total Classes: <span className="font-semibold text-gray-900">{schedules.length} classes per week</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-all duration-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
