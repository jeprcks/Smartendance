'use client';

import { AttendancePattern, GradeLevelStats } from '../page';

interface AttendanceChartsProps {
  attendancePatterns: AttendancePattern[];
  gradeLevelStats: GradeLevelStats[];
  overallStats: {
    present: number;
    absent: number;
    late: number;
    cutting: number;
  };
}

export default function AttendanceCharts({
  attendancePatterns,
  gradeLevelStats,
  overallStats,
}: AttendanceChartsProps) {
  // Chart components will be added here once recharts is installed
  // For now, showing data in table format
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      {/* Status Distribution - Will be Pie Chart */}
      <div className="content-section">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Status Distribution</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
            <span className="text-sm font-medium text-gray-700">Present</span>
            <span className="text-lg font-bold text-green-700">{overallStats.present}</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
            <span className="text-sm font-medium text-gray-700">Absent</span>
            <span className="text-lg font-bold text-red-700">{overallStats.absent}</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
            <span className="text-sm font-medium text-gray-700">Late</span>
            <span className="text-lg font-bold text-yellow-700">{overallStats.late}</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
            <span className="text-sm font-medium text-gray-700">Cutting</span>
            <span className="text-lg font-bold text-orange-700">{overallStats.cutting}</span>
          </div>
        </div>
      </div>

      {/* Grade Level Comparison - Will be Bar Chart */}
      <div className="content-section">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Grade Level Comparison</h3>
        <div className="space-y-2">
          {gradeLevelStats.map((stat, index) => {
            const maxStudents = Math.max(...gradeLevelStats.map(s => s.totalStudents), 1);
            const percentage = (stat.totalStudents / maxStudents) * 100;
            return (
              <div key={index} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{stat.gradeLevel}</span>
                  <span className="text-gray-600">{stat.attendanceRate}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      stat.attendanceRate >= 90 ? 'bg-green-500' :
                      stat.attendanceRate >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
