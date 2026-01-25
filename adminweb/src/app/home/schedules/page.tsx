'use client';

import { useState, useEffect } from 'react';
import AddScheduleModal from './components/AddScheduleModal';
import ViewScheduleModal from './components/ViewScheduleModal';
import { scheduleService, type Schedule } from '@/app/services/scheduleService';

export default function SchedulesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGradeLevel, setSelectedGradeLevel] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch schedules on mount
  useEffect(() => {
    fetchSchedules();
  }, []);

  const fetchSchedules = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await scheduleService.getAllSchedules({ isActive: true });
      setSchedules(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load schedules';
      setError(errorMessage);
      console.error('Error fetching schedules:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredSchedules = schedules.filter(schedule =>
    (searchQuery === '' || schedule.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      schedule.teacher.toLowerCase().includes(searchQuery.toLowerCase()) ||
      schedule.gradeLevel.toLowerCase().includes(searchQuery.toLowerCase()) ||
      schedule.section.toLowerCase().includes(searchQuery.toLowerCase())) &&
    (selectedGradeLevel === '' || schedule.gradeLevel === selectedGradeLevel) &&
    (selectedSection === '' || schedule.section === selectedSection)
  );

  // Get unique grade levels and sections for filter dropdowns
  const uniqueGradeLevels = Array.from(new Set(schedules.map(s => s.gradeLevel))).sort();
  const uniqueSections = Array.from(new Set(schedules.map(s => s.section))).sort();

  return (
    <div className="min-h-screen bg-green-50/30 p-8">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center space-x-4">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Class Schedules</h1>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center px-5 py-2.5 bg-green-600 text-sm font-semibold text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-md hover:shadow-lg"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Add Schedule
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-md border border-gray-200/80 backdrop-blur-sm">
        <div className="p-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-6">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Loading schedules...</p>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <div className="flex gap-4 items-end">
                  <div className="flex-1">
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-gray-400 group-focus-within:text-green-500 transition-colors duration-300" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <input
                        type="text"
                        placeholder="Search schedules..."
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:bg-white transition-all duration-300"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="w-48">
                    <label className="block text-sm font-medium text-gray-600 mb-1.5">Grade Level</label>
                    <select
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:bg-white transition-all duration-300"
                      value={selectedGradeLevel}
                      onChange={(e) => setSelectedGradeLevel(e.target.value)}
                    >
                      <option value="">All Grades</option>
                      {uniqueGradeLevels.map((grade) => (
                        <option key={grade} value={grade}>{grade}</option>
                      ))}
                    </select>
                  </div>
                  <div className="w-48">
                    <label className="block text-sm font-medium text-gray-600 mb-1.5">Section</label>
                    <select
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:bg-white transition-all duration-300"
                      value={selectedSection}
                      onChange={(e) => setSelectedSection(e.target.value)}
                    >
                      <option value="">All Sections</option>
                      {uniqueSections.map((section) => (
                        <option key={section} value={section}>{section}</option>
                      ))}
                    </select>
                  </div>
                  {(searchQuery || selectedGradeLevel || selectedSection) && (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedGradeLevel('');
                        setSelectedSection('');
                      }}
                      className="px-4 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors duration-200 font-medium whitespace-nowrap"
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-gray-200/80">
                <table className="min-w-full divide-y divide-gray-200/80">
                  <thead className="bg-gray-50/50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">ID</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Grade Level</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Section</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Subject</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Teacher</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Time Slot</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Day</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Shift</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200/80">
                    {filteredSchedules.map((schedule) => (
                      <tr key={schedule._id} className="hover:bg-gray-50/50 transition-colors duration-200">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-gray-800">{schedule._id?.substring(0, 8)}...</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-gray-800">{schedule.gradeLevel}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-700">{schedule.section}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-700">{schedule.subject}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-700">{schedule.teacher}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-700">{schedule.timeSlot}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 ring-1 ring-green-200/50">
                            {schedule.day}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 ring-1 ring-blue-200/50">
                            {schedule.shift}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button 
                            className="inline-flex items-center px-4 py-2 bg-green-50 text-green-600 text-sm font-medium rounded-lg hover:bg-green-100 hover:text-green-700 transition-all duration-200 shadow-sm hover:shadow-md"
                            onClick={() => {
                              setSelectedSchedule(schedule);
                              setIsViewModalOpen(true);
                            }}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                              <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                            </svg>
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      <AddScheduleModal 
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={(scheduleData) => {
          console.log('New schedule data:', scheduleData);
          // Refetch schedules after adding a new one
          fetchSchedules();
        }}
      />

      <ViewScheduleModal 
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedSchedule(null);
        }}
        schedule={selectedSchedule}
      />
    </div>
  );
}
