"use client";

import { AttendancePattern, GradeLevelStats } from "../page";

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
        <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">Status Distribution</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: 'var(--accent-green-bg)' }}>
            <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Present</span>
            <span className="text-lg font-bold" style={{ color: 'var(--accent-green)' }}>{overallStats.present}</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: 'var(--accent-red-bg, #ffebee)' }}>
            <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Absent</span>
            <span className="text-lg font-bold" style={{ color: 'var(--accent-red)' }}>{overallStats.absent}</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: 'var(--accent-yellow-bg)' }}>
            <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Late</span>
            <span className="text-lg font-bold" style={{ color: 'var(--accent-yellow)' }}>{overallStats.late}</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: 'var(--accent-orange-bg)' }}>
            <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Cutting</span>
            <span className="text-lg font-bold" style={{ color: 'var(--accent-orange)' }}>{overallStats.cutting}</span>
          </div>
        </div>
      </div>

      {/* Grade Level Comparison - Will be Bar Chart */}
      <div className="content-section">
        <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">Grade Level Comparison</h3>
        <div className="space-y-2">
          {gradeLevelStats
            .filter((stat) => stat.gradeLevel.toLowerCase() !== "graduated")
            .map((stat, index) => {
            const filteredStats = gradeLevelStats.filter(s => s.gradeLevel.toLowerCase() !== 'graduated');
            const maxStudents = Math.max(...filteredStats.map(s => s.totalStudents), 1);
            const percentage = (stat.totalStudents / maxStudents) * 100;
            return (
              <div key={index} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium" style={{ color: 'var(--foreground)' }}>{stat.gradeLevel}</span>
                  <span style={{ color: 'var(--muted-foreground)' }}>{stat.attendanceRate}%</span>
                </div>
                <div className="w-full rounded-full h-2" style={{ backgroundColor: 'var(--muted)' }}>
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: stat.attendanceRate >= 90 ? 'var(--accent-green)' :
                        stat.attendanceRate >= 70 ? 'var(--accent-yellow)' : 'var(--accent-red)'
                    }}
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
