'use client';

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { historyService, AttendanceRecord, AttendanceStats } from '../../services/historyService';

// Remove duplicate interface - using the one from historyService

interface StudentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: {
    id: string;
    name: string;
    stats: AttendanceStats;
    recentAttendance: AttendanceRecord[];
  } | null;
}

function StudentDetailsModal({ isOpen, onClose, student }: StudentDetailsModalProps) {
  if (!isOpen || !student) return null;

  return (
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 p-6 w-full max-w-5xl max-h-[90vh] overflow-y-auto transform transition-all duration-300 scale-100">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight mb-1">{student.name}'s Attendance History</h2>
            <p className="text-sm text-gray-500">Detailed attendance records and statistics</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-all duration-200"
          >
            <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Attendance Statistics */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="group bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl border border-green-200/50 shadow-sm hover:shadow-md hover:from-green-100 hover:to-green-200 hover:border-green-300/50 transition-all duration-300">
            <div className="flex items-center justify-between mb-2">
              <div className="font-medium text-green-700">Present</div>
              <div className="h-2 w-2 rounded-full bg-green-400 group-hover:ring-4 ring-green-400/20 transition-all duration-300"></div>
            </div>
            <div className="text-2xl font-bold text-green-800 group-hover:scale-105 transform transition-transform duration-300">{student.stats.present}</div>
          </div>
          <div className="group bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-xl border border-red-200/50 shadow-sm hover:shadow-md hover:from-red-100 hover:to-red-200 hover:border-red-300/50 transition-all duration-300">
            <div className="flex items-center justify-between mb-2">
              <div className="font-medium text-red-700">Absent</div>
              <div className="h-2 w-2 rounded-full bg-red-400 group-hover:ring-4 ring-red-400/20 transition-all duration-300"></div>
            </div>
            <div className="text-2xl font-bold text-red-800 group-hover:scale-105 transform transition-transform duration-300">{student.stats.absent}</div>
          </div>
          <div className="group bg-gradient-to-br from-yellow-50 to-yellow-100 p-4 rounded-xl border border-yellow-200/50 shadow-sm hover:shadow-md hover:from-yellow-100 hover:to-yellow-200 hover:border-yellow-300/50 transition-all duration-300">
            <div className="flex items-center justify-between mb-2">
              <div className="font-medium text-yellow-700">Late</div>
              <div className="h-2 w-2 rounded-full bg-yellow-400 group-hover:ring-4 ring-yellow-400/20 transition-all duration-300"></div>
            </div>
            <div className="text-2xl font-bold text-yellow-800 group-hover:scale-105 transform transition-transform duration-300">{student.stats.late}</div>
          </div>
          <div className="group bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-xl border border-orange-200/50 shadow-sm hover:shadow-md hover:from-orange-100 hover:to-orange-200 hover:border-orange-300/50 transition-all duration-300">
            <div className="flex items-center justify-between mb-2">
              <div className="font-medium text-orange-700">Cutting</div>
              <div className="h-2 w-2 rounded-full bg-orange-400 group-hover:ring-4 ring-orange-400/20 transition-all duration-300"></div>
            </div>
            <div className="text-2xl font-bold text-orange-800 group-hover:scale-105 transform transition-transform duration-300">{student.stats.cutting}</div>
          </div>
        </div>

        {/* Recent Attendance Records */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Attendance Records</h3>
            <div className="text-sm text-gray-500">{student.recentAttendance.length} records found</div>
          </div>
          <div className="overflow-x-auto rounded-xl border border-gray-200/80">
            <table className="w-full divide-y divide-gray-200/80">
              <thead className="bg-gradient-to-br from-gray-50/80 to-gray-100/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Schedule</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Time</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Duration</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Subject</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Teacher</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200/80">
                {student.recentAttendance.map((record) => (
                  <tr key={record._id} className="hover:bg-gray-50/80 group transition-all duration-200">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors duration-200">
                        {(record.attendanceType === 'In' || record.attendanceType === 'Out') && (!record.statusHistory || record.statusHistory.length === 0) ? 'N/A' : record.scheduleDay || 'N/A'}
                      </div>
                      <div className="text-xs text-gray-500 group-hover:text-gray-600 transition-colors duration-200">
                        {(record.attendanceType === 'In' || record.attendanceType === 'Out') && (!record.statusHistory || record.statusHistory.length === 0) ? '' : record.scheduleTimeSlot || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors duration-200">
                        {format(new Date(record.checkInTime || record.scanTime), 'MMM dd, yyyy')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ring-1 ${
                        record.statusHistory && record.statusHistory.length > 0 
                          ? 'bg-blue-50 text-blue-700 ring-blue-200/50'
                          : record.attendanceType === 'In' 
                          ? 'bg-green-50 text-green-700 ring-green-200/50' 
                          : record.attendanceType === 'Out' 
                          ? 'bg-purple-50 text-purple-700 ring-purple-200/50' 
                          : 'bg-gray-50 text-gray-700 ring-gray-200/50'
                      }`}>
                        {record.statusHistory && record.statusHistory.length > 0 
                          ? `Teacher (${record.statusHistory[record.statusHistory.length - 1].changedBy || 'Unknown'})` 
                          : record.attendanceType || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors duration-200">
                        {record.attendanceType === 'In' && record.checkInTime
                          ? format(new Date(record.checkInTime), 'HH:mm')
                          : record.attendanceType === 'Out' && record.checkOutTime
                          ? format(new Date(record.checkOutTime), 'HH:mm')
                          : format(new Date(record.scanTime), 'HH:mm')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors duration-200">
                        {record.durationMinutes ? `${Math.round(record.durationMinutes)} min` : '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors duration-200">
                        {record.subject}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors duration-200">
                        {record.scheduleTeacher || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ring-1 group-hover:shadow-sm ${
                        record.status === 'Present' ? 'bg-green-50 text-green-700 ring-green-200/50 group-hover:bg-green-100' :
                        record.status === 'Late' ? 'bg-yellow-50 text-yellow-700 ring-yellow-200/50 group-hover:bg-yellow-100' :
                        record.status === 'Absent' ? 'bg-red-50 text-red-700 ring-red-200/50 group-hover:bg-red-100' :
                        record.status === 'Out' ? 'bg-purple-50 text-purple-700 ring-purple-200/50 group-hover:bg-purple-100' :
                        'bg-orange-50 text-orange-700 ring-orange-200/50 group-hover:bg-orange-100'
                      } transition-all duration-200`}>
                        {record.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

import AttendanceStatsComponent from './components/AttendanceStats';
import ExportData from './components/ExportData';

export default function HistoryPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<AttendanceRecord['status'] | ''>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  type SelectedStudent = {
    id: string;
    name: string;
    stats: AttendanceStats;
    recentAttendance: AttendanceRecord[];
  };
  const [selectedStudent, setSelectedStudent] = useState<SelectedStudent | null>(null);

  // State for API data
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([
    {
      _id: '1',
      studentId: '12233',
      studentName: 'Francis Rey R Ampoon',
      subject: 'Mathematics',
      scanTime: new Date(2024, 0, 14, 9, 0, 0).toISOString(),
      status: 'Present',
      gradeLevel: '10',
      section: 'A',
      shift: 'Morning',
      isVerified: true,
      createdAt: new Date(2024, 0, 14, 9, 0, 0).toISOString(),
      updatedAt: new Date(2024, 0, 14, 9, 0, 0).toISOString()
    },
    {
      _id: '2',
      studentId: 'STU-303',
      studentName: 'John Doe',
      subject: 'English',
      scanTime: new Date(2024, 0, 14, 8, 45, 0).toISOString(),
      status: 'Late',
      gradeLevel: '10',
      section: 'B',
      shift: 'Morning',
      isVerified: true,
      createdAt: new Date(2024, 0, 14, 8, 45, 0).toISOString(),
      updatedAt: new Date(2024, 0, 14, 8, 45, 0).toISOString()
    },
    {
      _id: '3',
      studentId: 'STU-897',
      studentName: 'Jane Smith',
      subject: 'Science',
      scanTime: new Date(2024, 0, 14, 10, 15, 0).toISOString(),
      status: 'Present',
      gradeLevel: '11',
      section: 'A',
      shift: 'Morning',
      isVerified: true,
      createdAt: new Date(2024, 0, 14, 10, 15, 0).toISOString(),
      updatedAt: new Date(2024, 0, 14, 10, 15, 0).toISOString()
    },
    {
      _id: '4',
      studentId: 'STU-455',
      studentName: 'Black Rice',
      subject: 'History',
      scanTime: new Date(2024, 0, 14, 7, 30, 0).toISOString(),
      status: 'Absent',
      gradeLevel: '9',
      section: 'C',
      shift: 'Morning',
      isVerified: true,
      createdAt: new Date(2024, 0, 14, 7, 30, 0).toISOString(),
      updatedAt: new Date(2024, 0, 14, 7, 30, 0).toISOString()
    },
    {
      _id: '5',
      studentId: 'STU-789',
      studentName: 'Maria Garcia',
      subject: 'Physical Education',
      scanTime: new Date(2024, 0, 14, 8, 30, 0).toISOString(),
      status: 'Cutting',
      gradeLevel: '10',
      section: 'B',
      shift: 'Morning',
      isVerified: true,
      createdAt: new Date(2024, 0, 14, 8, 30, 0).toISOString(),
      updatedAt: new Date(2024, 0, 14, 8, 30, 0).toISOString()
    }
  ]);
  const [stats, setStats] = useState<AttendanceStats>({
    present: 2,
    absent: 1,
    late: 1,
    cutting: 1,
    total: 5
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalRecords: 0,
    hasNext: false,
    hasPrev: false
  });

  // Fetch data from API
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await historyService.getHistoryPageData({
        search: searchQuery || undefined,
        status: selectedStatus || undefined,
        startDate: selectedDate || undefined,
        endDate: selectedDate || undefined,
        page: 1,
        limit: 50
      });

      setAttendanceRecords(response.records);
      setStats(response.stats);
      setPagination(response.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
      console.error('Error fetching history data:', err);
      // Keep dummy data as fallback
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, selectedStatus, selectedDate]);

  // Fetch student details for modal
  const fetchStudentDetails = async (studentId: string) => {
    try {
      const response = await historyService.getStudentHistory(studentId, { limit: 10 });
      
      setSelectedStudent({
        id: response.student.id,
        name: response.student.name,
        stats: response.stats,
        recentAttendance: response.records
      });
      setIsModalOpen(true);
    } catch (err) {
      console.error('Error fetching student details:', err);
      setError('Failed to fetch student details');
    }
  };

  // Load data on component mount and when filters change
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="p-8">
      <div className="mb-6">
        <AttendanceStatsComponent 
          totalRecords={stats.total}
          present={stats.present}
          absent={stats.absent}
          late={stats.late}
          cutting={stats.cutting}
        />
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading data</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
              <div className="mt-4">
                <button
                  onClick={fetchData}
                  className="bg-red-100 px-3 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-200 transition-colors"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3"></div>
            <span className="text-blue-800">Loading attendance records...</span>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-md border border-gray-200/80 backdrop-blur-sm">
        <div className="p-6">
          <div className="mb-6">
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors duration-300" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Search by student name, ID, or subject..."
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-all duration-300"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              <div className="w-48">
                <label className="block text-sm font-medium text-gray-600 mb-1.5">Date</label>
                <input
                  type="date"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-all duration-300"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>
              <div className="w-48">
                <label className="block text-sm font-medium text-gray-600 mb-1.5">Status</label>
                <select
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-all duration-300"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value as AttendanceRecord['status'] | '')}
                >
                  <option value="">All Status</option>
                  <option value="Present">Present</option>
                  <option value="Late">Late</option>
                  <option value="Absent">Absent</option>
                  <option value="Cutting">Cutting</option>
                  <option value="Out">Out</option>
                </select>
              </div>
              <div className="flex items-center">
                <ExportData 
                  records={attendanceRecords}
                  onExport={async (format) => {
                    try {
                      const data = await historyService.exportData({
                        startDate: selectedDate || undefined,
                        endDate: selectedDate || undefined,
                        format: format as 'csv'
                      });
                      
                      const blob = data as Blob;
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `attendance_records_${new Date().toISOString().split('T')[0]}.csv`;
                      document.body.appendChild(a);
                      a.click();
                      window.URL.revokeObjectURL(url);
                      document.body.removeChild(a);
                    } catch (err) {
                      console.error('Export error:', err);
                      setError('Failed to export data');
                    }
                  }}
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-200/80">
            <table className="min-w-full divide-y divide-gray-200/80">
              <thead className="bg-gray-50/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Student ID</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Subject</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Time</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200/80">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
                        Loading records...
                      </div>
                    </td>
                  </tr>
                ) : attendanceRecords.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      No attendance records found
                    </td>
                  </tr>
                ) : (
                  attendanceRecords.map((record) => (
                    <tr 
                      key={record._id} 
                    className="hover:bg-gray-50/50 transition-colors duration-200 cursor-pointer"
                      onClick={() => fetchStudentDetails(record.studentId)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-800">{record.studentId}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-800">{record.studentName}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-700">{record.subject}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-700">{format(new Date(record.scanTime), 'MMM dd, yyyy')}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-700">{format(new Date(record.scanTime), 'HH:mm')}</span>
                    </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ring-1 ${
                          record.status === 'Present' ? 'bg-green-50 text-green-700 ring-green-200/50' :
                          record.status === 'Late' ? 'bg-yellow-50 text-yellow-700 ring-yellow-200/50' :
                          record.status === 'Absent' ? 'bg-red-50 text-red-700 ring-red-200/50' :
                          record.status === 'Out' ? 'bg-purple-50 text-purple-700 ring-purple-200/50' :
                          'bg-orange-50 text-orange-700 ring-orange-200/50'
                        } transition-colors duration-200`}>
                          {record.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <StudentDetailsModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedStudent(null);
        }}
        student={selectedStudent}
      />
    </div>
  );
}
