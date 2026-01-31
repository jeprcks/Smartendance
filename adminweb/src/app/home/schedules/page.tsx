'use client';

import { useState, useEffect } from 'react';
import AddScheduleModal from './components/AddScheduleModal';
import ViewScheduleModal from './components/ViewScheduleModal';
import EditScheduleModal from './components/EditScheduleModal';
import { scheduleService, type Schedule } from '@/app/services/scheduleService';

export default function SchedulesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGradeLevel, setSelectedGradeLevel] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedShift, setSelectedShift] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
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

  const filteredSchedules = schedules.filter(schedule => {
    const days = Array.isArray(schedule.days)
      ? schedule.days
      : schedule.day
      ? [schedule.day]
      : [];
    const daysText = days.join(' ').toLowerCase();

    const query = searchQuery.toLowerCase();
    const matchesSearch =
      searchQuery === '' ||
      schedule.subject.toLowerCase().includes(query) ||
      schedule.teacher.toLowerCase().includes(query) ||
      schedule.gradeLevel.toLowerCase().includes(query) ||
      schedule.section.toLowerCase().includes(query) ||
      (schedule.shift ?? '').toLowerCase().includes(query) ||
      daysText.includes(query);

    const matchesGrade = selectedGradeLevel === '' || schedule.gradeLevel === selectedGradeLevel;
    const matchesSection = selectedSection === '' || schedule.section === selectedSection;
    const matchesShift = selectedShift === '' || schedule.shift === selectedShift;

    return matchesSearch && matchesGrade && matchesSection && matchesShift;
  });

  // Get unique grade levels and sections for filter dropdowns
  const uniqueGradeLevels = Array.from(new Set(schedules.map(s => s.gradeLevel))).sort();
  const uniqueSections = Array.from(new Set(schedules.map(s => s.section))).sort();
  const uniqueShifts = Array.from(
    new Set(schedules.map(s => s.shift))
  )
    .filter((shift): shift is "Morning" | "Afternoon" => !!shift)
    .sort();

  return (
    <div className="page-container">
      <header className="dashboard-header">
        <div className="dashboard-header-inner">
          <div className="dashboard-header-content">
            <h1>Schedules</h1>
            <p>Manage class schedules and time slots</p>
          </div>
          <div className="dashboard-header-refresh-box">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Add Schedule
            </button>
          </div>
        </div>
      </header>

      <div className="content-section">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-6">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-12 text-[var(--muted-foreground)]">
            <div className="inline-flex items-center gap-2">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-[var(--primary)] border-t-transparent" />
              Loading schedules...
            </div>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <div className="flex gap-4 items-end flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-[var(--muted-foreground)] group-focus-within:text-[var(--primary)] transition-colors duration-300" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      placeholder="Search schedules..."
                      className="w-full pl-12 pr-4 py-3 bg-[var(--muted)] border border-[var(--border)] rounded-[var(--radius)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--primary)] focus:bg-white transition-all duration-300"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
                <div className="w-40 lg:w-48">
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">Grade Level</label>
                  <select
                    className="w-full px-4 py-3 bg-[var(--muted)] border border-[var(--border)] rounded-[var(--radius)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--primary)] transition-all duration-300"
                    value={selectedGradeLevel}
                    onChange={(e) => setSelectedGradeLevel(e.target.value)}
                  >
                    <option value="">All Grades</option>
                    {uniqueGradeLevels.map((grade) => (
                      <option key={grade} value={grade}>{grade}</option>
                    ))}
                  </select>
                </div>
                <div className="w-40 lg:w-48">
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">Section</label>
                  <select
                    className="w-full px-4 py-3 bg-[var(--muted)] border border-[var(--border)] rounded-[var(--radius)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--primary)] transition-all duration-300"
                    value={selectedSection}
                    onChange={(e) => setSelectedSection(e.target.value)}
                  >
                    <option value="">All Sections</option>
                    {uniqueSections.map((section) => (
                      <option key={section} value={section}>{section}</option>
                    ))}
                  </select>
                </div>
                <div className="w-32 lg:w-40">
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">Shift</label>
                  <select
                    className="w-full px-4 py-3 bg-[var(--muted)] border border-[var(--border)] rounded-[var(--radius)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--primary)] transition-all duration-300"
                    value={selectedShift}
                    onChange={(e) => setSelectedShift(e.target.value)}
                  >
                    <option value="">All Shifts</option>
                    {uniqueShifts.map((shift) => (
                      <option key={shift} value={shift}>{shift}</option>
                    ))}
                  </select>
                </div>
                {(searchQuery || selectedGradeLevel || selectedSection || selectedShift) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedGradeLevel('');
                      setSelectedSection('');
                      setSelectedShift('');
                    }}
                    className="px-4 py-3 bg-[var(--muted)] text-[var(--foreground)] rounded-[var(--radius)] hover:bg-[var(--secondary)] border border-[var(--border)] transition-colors duration-200 font-medium whitespace-nowrap"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            </div>

            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Grade Level</th>
                    <th>Section</th>
                    <th>Subject</th>
                    <th>Teacher</th>
                    <th>Time Slot</th>
                    <th>Day</th>
                    <th>Shift</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSchedules.map((schedule) => (
                    <tr key={schedule._id} className="hover:bg-[var(--secondary)] transition-colors duration-200">
                      <td className="whitespace-nowrap font-medium">{schedule._id?.substring(0, 8)}...</td>
                      <td className="whitespace-nowrap font-medium">{schedule.gradeLevel}</td>
                      <td className="whitespace-nowrap">{schedule.section}</td>
                      <td className="whitespace-nowrap">{schedule.subject}</td>
                      <td className="whitespace-nowrap">{schedule.teacher}</td>
                      <td className="whitespace-nowrap">{schedule.timeSlot}</td>
                      <td className="whitespace-nowrap">
                        <div className="flex flex-wrap gap-2">
                          {(Array.isArray(schedule.days) ? schedule.days : schedule.day ? [schedule.day] : []).map((day) => (
                            <span
                              key={`${schedule._id}-${day}`}
                              className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 ring-1 ring-green-200/50"
                            >
                              {day}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="whitespace-nowrap">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 ring-1 ring-green-200/50">
                          {schedule.shift}
                        </span>
                      </td>
                      <td className="whitespace-nowrap">
                        <button
                          type="button"
                          className="inline-flex items-center px-4 py-2 bg-[var(--secondary)] text-[var(--primary)] text-sm font-medium rounded-lg hover:bg-[var(--primary)] hover:text-white transition-all duration-200"
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
                        <button
                          type="button"
                          className="ml-2 inline-flex items-center px-3 py-2 bg-blue-50 text-blue-600 text-sm font-medium rounded-lg hover:bg-blue-100 hover:text-blue-700 transition-all duration-200"
                          onClick={() => {
                            setSelectedSchedule(schedule);
                            setIsEditModalOpen(true);
                          }}
                        >
                          Edit
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

      <AddScheduleModal 
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={(scheduleData) => {
          console.log('New schedule data:', scheduleData);
          // Refetch schedules after adding a new one
          fetchSchedules();
        }}
        existingSchedules={schedules}
      />

      <ViewScheduleModal 
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedSchedule(null);
        }}
        schedule={selectedSchedule}
      />
      
      <EditScheduleModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedSchedule(null);
        }}
        schedule={selectedSchedule}
        onEdit={(updated) => {
          // Refresh schedules after edit
          fetchSchedules();
          setIsEditModalOpen(false);
          setSelectedSchedule(null);
        }}
        existingSchedules={schedules}
      />
    </div>
  );
}
