'use client';

import { useEffect, useState, useRef, memo } from 'react';
import { studentService } from '@/app/services/studentService';
import { historyService, AttendanceRecord } from '@/app/services/historyService';
import { teacherService } from '@/app/services/teacherService';
import { scheduleService } from '@/app/services/scheduleService';
import { format, formatDistanceToNow, subDays, startOfDay } from 'date-fns';
import LoadingSkeleton from '@/app/components/loading/LoadingSkeleton';
import { Users, CheckCircle, XCircle, BookOpen, Clock, TrendingUp, AlertCircle, Activity, ArrowRight, Calendar } from 'lucide-react';
import Link from 'next/link';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from 'recharts';

interface DashboardStats {
  totalStudents: number;
  presentToday: number;
  absentToday: number;
  lateToday: number;
  totalClasses: number;
  totalTeachers: number;
  attendanceRate: number;
  onTimeRate: number;
}

interface WeeklyTrendData {
  date: string;
  day: string;
  present: number;
  absent: number;
  late: number;
  total: number;
  attendanceRate: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    presentToday: 0,
    absentToday: 0,
    lateToday: 0,
    totalClasses: 0,
    totalTeachers: 0,
    attendanceRate: 0,
    onTimeRate: 0,
  });
  const [recentActivity, setRecentActivity] = useState<AttendanceRecord[]>([]);
  const [weeklyTrends, setWeeklyTrends] = useState<WeeklyTrendData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get today's date in YYYY-MM-DD format
      const today = format(new Date(), 'yyyy-MM-dd');

      // Fetch all data in parallel
      const [students, teacherStats, schedules] = await Promise.all([
        studentService.getAllStudents().catch(() => []),
        teacherService.getTeacherStats().catch(() => ({ success: false, stats: { active: 0, inactive: 0, suspended: 0, total: 0 } })),
        scheduleService.getAllSchedules({ isActive: true }).catch(() => []),
      ]);

      // Fetch recent activity (only In/Out records for activity feed)
      const recentRecords = await historyService.getHistoryPageData({
        limit: 100,
        page: 1,
      }).catch(() => ({ success: false, records: [], stats: { present: 0, absent: 0, late: 0, cutting: 0, total: 0 }, pagination: {} }));

      // Debug: Log ALL records first
      console.log('📊 Dashboard Debug:');
      console.log('Today date:', today);
      console.log('Total records fetched:', recentRecords.records?.length);
      
      // Filter to only today's records
      const todayFilteredRecords = recentRecords.records?.filter(record => {
        const recordDate = format(new Date(record.scanTime), 'yyyy-MM-dd');
        return recordDate === today;
      }) || [];
      
      console.log('Total records TODAY (after filtering):', todayFilteredRecords.length);
      console.log('\n🔍 ALL Today\'s Records:');
      todayFilteredRecords.forEach((record, index) => {
        console.log(`${index + 1}. ${record.studentName} - Status: "${record.status}" - Type: "${record.attendanceType}" - Subject: "${record.subject}" - Time: ${format(new Date(record.scanTime), 'HH:mm:ss')}`);
      });
      
      // Filter to only get check-in/check-out records (QR scanner), not subject-specific
      // AND only for 'General' subject
      const checkInOutRecords = todayFilteredRecords.filter(record => 
        (record.attendanceType === 'In' || record.attendanceType === 'Out') &&
        record.subject?.toLowerCase() === 'general'
      );

      console.log('\n✅ Check-in/out records (filtered):', checkInOutRecords.length);
      checkInOutRecords.forEach((record, index) => {
        console.log(`  ${index + 1}. ${record.studentName} - Status: "${record.status}" - Subject: "${record.subject}" - Type: "${record.attendanceType}"`);
      });
      if (checkInOutRecords.length === 0) {
        console.log('⚠️ WARNING: No check-in/out records found!');
        console.log('Checking why - all today records with General subject:');
        const generalRecords = todayFilteredRecords.filter(r => r.subject?.toLowerCase() === 'general');
        console.log(`Total General subject records: ${generalRecords.length}`);
        generalRecords.forEach((record, index) => {
          console.log(`  ${index + 1}. ${record.studentName} - Type: "${record.attendanceType}" - Status: "${record.status}"`);
        });
      }

      // Track students: Get the LATEST status for each student
      const studentLatestStatus = new Map<string, { status: string; studentName: string; scanTime: Date }>();
      
      console.log('🔍 Processing student records to find LATEST status...');
      checkInOutRecords.forEach(record => {
        const studentId = record.studentId;
        const scanTime = new Date(record.scanTime);
        
        // Keep only the LATEST record for each student
        const existing = studentLatestStatus.get(studentId);
        if (!existing || scanTime > existing.scanTime) {
          studentLatestStatus.set(studentId, {
            status: record.status,
            studentName: record.studentName,
            scanTime: scanTime
          });
          console.log(`  📝 ${record.studentName} - Latest status: "${record.status}" at ${format(scanTime, 'HH:mm:ss')}`);
        }
      });
      
      console.log('\n📊 Student Latest Status Summary:');
      studentLatestStatus.forEach((data, studentId) => {
        console.log(`${data.studentName}: Status="${data.status}" at ${format(data.scanTime, 'HH:mm:ss')}`);
      });

      // Calculate statistics - only count ACTIVE students
      const activeStudents = Array.isArray(students) 
        ? students.filter(student => student.status === 'Active')
        : [];
      const totalStudents = activeStudents.length;
      
      // Present Today = Students whose LATEST status is NOT "Out"
      let presentToday = 0;
      console.log('\n🎯 Calculating Present Today:');
      studentLatestStatus.forEach((data, studentId) => {
        if (data.status !== 'Out') {
          presentToday++;
          console.log(`  ✅ PRESENT: ${data.studentName} (Status: "${data.status}")`);
        } else {
          console.log(`  ❌ NOT PRESENT: ${data.studentName} (Status: "Out" - checked out)`);
        }
      });
      console.log(`\n🎯 TOTAL PRESENT TODAY: ${presentToday}`);

      // Late Today = count unique students whose LATEST status is "Late"
      let lateToday = 0;
      console.log('\n🎯 Calculating Late Today:');
      studentLatestStatus.forEach((data, studentId) => {
        if (data.status === 'Late') {
          lateToday++;
          console.log(`  ⏰ LATE: ${data.studentName} (Status: "Late")`);
        }
      });
      console.log(`\n🎯 TOTAL LATE TODAY: ${lateToday}`);

      // Absent Today = Students who did NOT scan their QR code at all today
      const studentsWhoScanned = studentLatestStatus.size;
      const absentToday = totalStudents - studentsWhoScanned;

      // Debug: Log calculated values
      console.log('=== Dashboard Stats ===');
      console.log('Total active students:', totalStudents);
      console.log('Students who scanned (checked in):', studentsWhoScanned);
      console.log('Present today (IN school now):', presentToday);
      console.log('Absent today (never scanned):', absentToday);
      console.log('Student status details:', Array.from(studentLatestStatus.entries()).slice(0, 5).map(([id, data]) => ({
        id,
        name: data.studentName,
        status: data.status,
        time: format(data.scanTime, 'HH:mm:ss')
      })));
      
      const totalClasses = Array.isArray(schedules) ? schedules.length : 0;
      const totalTeachers = teacherStats.success ? (teacherStats.stats?.total || 0) : 0;

      // Calculate rates based on students who scanned QR
      const attendanceRate = totalStudents > 0 
        ? Math.round((studentsWhoScanned / totalStudents) * 100) 
        : 0;
      const onTimeRate = studentsWhoScanned > 0
        ? Math.round((presentToday / studentsWhoScanned) * 100)
        : 0;

      setStats({
        totalStudents,
        presentToday,
        absentToday,
        lateToday,
        totalClasses,
        totalTeachers,
        attendanceRate,
        onTimeRate,
      });

      setRecentActivity(recentRecords.records || []);

      // Fetch weekly trends (last 7 days) - only check-in/check-out records
      // Fetch records for the entire last 7 days in one go, then filter client-side
      const weeklyData: WeeklyTrendData[] = [];
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      
      try {
        // Fetch all records (we'll filter by date client-side)
        const allRecordsForWeek = await historyService.getHistoryPageData({
          limit: 500,
          page: 1,
        }).catch(() => ({ success: false, records: [], stats: {}, pagination: {} }));

        console.log('\n📊 Weekly Trends Debug:');
        console.log('Total records fetched for week:', allRecordsForWeek.records?.length);
        
        for (let i = 6; i >= 0; i--) {
          const date = subDays(new Date(), i);
          const dateStr = format(date, 'yyyy-MM-dd');
          const dayName = days[date.getDay()];
          
          // Filter records for this specific day
          const dayRecords = allRecordsForWeek.records?.filter(record => {
            const recordDate = format(new Date(record.scanTime), 'yyyy-MM-dd');
            return recordDate === dateStr;
          }) || [];
          
          console.log(`\n📅 ${dayName} (${dateStr}): ${dayRecords.length} records`);
          
          if (dayRecords.length > 0) {
            // Filter to only check-in/check-out records AND only 'General' subject
            const dayCheckInOuts = dayRecords.filter(
              record => (record.attendanceType === 'In' || record.attendanceType === 'Out') &&
              record.subject?.toLowerCase() === 'general'
            );
            
            console.log(`  └─ Check-in/out + General: ${dayCheckInOuts.length} records`);
            
            // Track students: Get LATEST status for each student this day
            const dayStudentLatestStatus = new Map<string, { status: string; scanTime: Date }>();
            
            dayCheckInOuts.forEach(record => {
              const studentId = record.studentId;
              const scanTime = new Date(record.scanTime);
              
              // Keep only the LATEST record for each student
              const existing = dayStudentLatestStatus.get(studentId);
              if (!existing || scanTime > existing.scanTime) {
                dayStudentLatestStatus.set(studentId, {
                  status: record.status,
                  scanTime: scanTime
                });
              }
            });
            
            // Count students by latest status
            let dayLateCount = 0;
            dayStudentLatestStatus.forEach((data) => {
              if (data.status === 'Late') {
                dayLateCount++;
              }
            });
            
            const studentsWhoCheckedIn = dayStudentLatestStatus.size;
            const absent = totalStudents - studentsWhoCheckedIn;
            const present = studentsWhoCheckedIn - dayLateCount; // Present = checked in but not late
            const late = dayLateCount;
            const total = totalStudents;
            const rate = total > 0 ? Math.round((studentsWhoCheckedIn / total) * 100) : 0;
            
            console.log(`  └─ Present: ${present}, Late: ${late}, Absent: ${absent}, Rate: ${rate}%`);
            
            weeklyData.push({
              date: dateStr,
              day: i === 0 ? 'Today' : dayName,
              present,
              absent,
              late,
              total,
              attendanceRate: rate,
            });
          } else {
            // Add empty data for days with no records
            weeklyData.push({
              date: dateStr,
              day: i === 0 ? 'Today' : dayName,
              present: 0,
              absent: 0,
              late: 0,
              total: 0,
              attendanceRate: 0,
            });
          }
        }
      } catch (err) {
        console.error('Error fetching weekly trends:', err);
        // Add empty data for all 7 days
        for (let i = 6; i >= 0; i--) {
          const date = subDays(new Date(), i);
          const dateStr = format(date, 'yyyy-MM-dd');
          const dayName = days[date.getDay()];
          
          weeklyData.push({
            date: dateStr,
            day: i === 0 ? 'Today' : dayName,
            present: 0,
            absent: 0,
            late: 0,
            total: 0,
            attendanceRate: 0,
          });
        }
      }
      
      setWeeklyTrends(weeklyData);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const statCards = [
    { 
      title: 'Total Students', 
      value: stats.totalStudents, 
      icon: Users, 
      color: 'bg-green-500',
      bgColor: 'bg-green-50',
      textColor: 'text-green-700'
    },
    { 
      title: 'Present Today', 
      value: stats.presentToday, 
      icon: CheckCircle, 
      color: 'bg-green-500',
      bgColor: 'bg-green-50',
      textColor: 'text-green-700'
    },
    { 
      title: 'Absent Today', 
      value: stats.absentToday, 
      icon: XCircle, 
      color: 'bg-red-500',
      bgColor: 'bg-red-50',
      textColor: 'text-red-700'
    },
    { 
      title: 'Late Today', 
      value: stats.lateToday, 
      icon: Clock, 
      color: 'bg-yellow-500',
      bgColor: 'bg-yellow-50',
      textColor: 'text-yellow-700'
    },
    { 
      title: 'Total Classes', 
      value: stats.totalClasses, 
      icon: BookOpen, 
      color: 'bg-purple-500',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-700'
    },
    { 
      title: 'Attendance Rate', 
      value: `${stats.attendanceRate}%`, 
      icon: TrendingUp, 
      color: 'bg-indigo-500',
      bgColor: 'bg-indigo-50',
      textColor: 'text-indigo-700'
    },
  ];

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { bg: string; text: string }> = {
      'Present': { bg: 'bg-green-100', text: 'text-green-700' },
      'Late': { bg: 'bg-yellow-100', text: 'text-yellow-700' },
      'Absent': { bg: 'bg-red-100', text: 'text-red-700' },
      'Cutting': { bg: 'bg-orange-100', text: 'text-orange-700' },
      'Out': { bg: 'bg-[var(--muted)]', text: 'text-[var(--foreground)]' },
    };
    const colors = statusMap[status] || { bg: 'bg-[var(--muted)]', text: 'text-[var(--foreground)]' };
    return (
      <span className={`px-2 py-1 ${colors.bg} ${colors.text} rounded text-sm font-semibold`}>
        {status}
      </span>
    );
  };

  const getTypeBadge = (record: AttendanceRecord) => {
    if (record.statusHistory && record.statusHistory.length > 0) {
      return (
        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ring-1 bg-green-50 text-green-700 ring-green-200/50">
          Teacher ({record.statusHistory[record.statusHistory.length - 1].changedBy || 'Unknown'})
        </span>
      );
    } else if (record.attendanceType === 'In') {
      return <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ring-1 bg-green-50 text-green-700 ring-green-200/50">In</span>;
    } else if (record.attendanceType === 'Out') {
      return <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ring-1 bg-purple-50 text-purple-700 ring-purple-200/50">Out</span>;
    }
    return <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ring-1 bg-[var(--muted)] text-[var(--foreground)] ring-[var(--border)]">N/A</span>;
  };

  if (isLoading && stats.totalStudents === 0) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Overview of school attendance statistics</p>
        </div>
        <LoadingSkeleton type="table" count={6} />
      </div>
    );
  }

  return (
    <div className="page-container">
      <header className="dashboard-header">
        <div className="dashboard-header-inner">
          <div className="dashboard-header-content">
            <h1>Dashboard</h1>
            <p>Overview of school attendance statistics</p>
          </div>
          <div className="dashboard-header-refresh-box">
            <span>Last updated: {formatDistanceToNow(lastUpdated, { addSuffix: true })}</span>
            <button
              onClick={() => fetchDashboardData()}
              disabled={isLoading}
              type="button"
            >
              {isLoading ? 'Refreshing...' : 'Refresh Now'}
            </button>
          </div>
        </div>
      </header>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <AlertCircle className="text-red-600" size={20} />
          <p className="text-red-700">{error}</p>
          <button
            onClick={() => fetchDashboardData()}
            className="ml-auto text-red-700 hover:text-red-900 underline text-sm"
          >
            Retry
          </button>
        </div>
      )}

      {/* Stat Cards Grid */}
      <div className="dashboard-grid mb-8">
        {statCards.map((stat, index) => {
          const IconComponent = stat.icon;
          const numericValues = statCards
            .map(s => typeof s.value === 'number' ? s.value : 0)
            .filter(v => v > 0);
          const maxValue = numericValues.length > 0 ? Math.max(...numericValues) : 1;
          const numericValue = typeof stat.value === 'number' ? stat.value : 0;
          const barHeight = maxValue > 0 
            ? `${(numericValue / maxValue) * 100}%` 
            : '0%';

          // Map stat types to theme-aware gradient styles
          const getStatStyle = (title: string) => {
            const styleMap: Record<string, string> = {
              'Total Students': 'linear-gradient(135deg, color-mix(in srgb, var(--surface) 95%, var(--primary) 5%) 0%, color-mix(in srgb, var(--surface) 90%, var(--primary) 10%) 100%)',
              'Present Today': 'linear-gradient(135deg, color-mix(in srgb, var(--surface) 95%, var(--primary) 5%) 0%, color-mix(in srgb, var(--surface) 90%, var(--primary) 10%) 100%)',
              'Absent Today': 'linear-gradient(135deg, color-mix(in srgb, var(--surface) 95%, var(--destructive) 5%) 0%, color-mix(in srgb, var(--surface) 90%, var(--destructive) 10%) 100%)',
              'Late Today': 'linear-gradient(135deg, color-mix(in srgb, var(--surface) 95%, var(--accent) 5%) 0%, color-mix(in srgb, var(--surface) 90%, var(--accent) 10%) 100%)',
              'Total Classes': 'linear-gradient(135deg, color-mix(in srgb, var(--surface) 95%, #7c4dff 5%) 0%, color-mix(in srgb, var(--surface) 90%, #7c4dff 10%) 100%)',
              'Attendance Rate': 'linear-gradient(135deg, color-mix(in srgb, var(--surface) 95%, #6366f1 5%) 0%, color-mix(in srgb, var(--surface) 90%, #6366f1 10%) 100%)',
            };
            return styleMap[title] || styleMap['Total Students'];
          };

          const getTextColor = (title: string) => {
            const colorMap: Record<string, string> = {
              'Total Students': 'text-[var(--primary)]',
              'Present Today': 'text-[var(--primary)]',
              'Absent Today': 'text-[var(--destructive)]',
              'Late Today': 'text-[var(--accent)]',
              'Total Classes': 'text-purple-600 dark:text-purple-400',
              'Attendance Rate': 'text-indigo-600 dark:text-indigo-400',
            };
            return colorMap[title] || colorMap['Total Students'];
          };

          return (
            <div
              key={index}
              className="stat-card"
              style={{
                animationDelay: `${index * 80}ms`,
                backgroundImage: getStatStyle(stat.title)
              }}
            >
              <div className="flex items-start justify-between mb-4">
                <div
                  className="p-3 rounded-lg"
                  style={{
                    backgroundColor: `color-mix(in srgb, var(--surface) 90%, var(--primary) 10%)`
                  }}
                >
                  <IconComponent className={`${getTextColor(stat.title)} transition-colors`} size={24} />
                </div>
                <div className="text-right">
                  <p className="text-sm text-[var(--muted-foreground)] mb-1">{stat.title}</p>
                  <p className={`text-3xl font-bold ${getTextColor(stat.title)} stat-value-transition transition-colors`} key={stat.value}>
                    {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
                  </p>
                </div>
              </div>
              {/* Mini progress bar */}
              <div className="w-full bg-[var(--muted)] rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all duration-500"
                  style={{
                    width: barHeight,
                    backgroundColor: 'var(--primary)'
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Section - Recharts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Bar Chart - Today's counts */}
        <div className="bg-[var(--surface)] rounded-xl shadow-md border border-[var(--border)] p-6 dashboard-section-animate" style={{ animationDelay: '400ms' }}>
          <h2 className="text-xl font-semibold text-[var(--foreground)] mb-6">Today&apos;s Statistics</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[
                  { name: 'Students', value: stats.totalStudents, fill: '#2e7d32' },
                  { name: 'Present', value: stats.presentToday, fill: '#43a047' },
                  { name: 'Absent', value: stats.absentToday, fill: '#e53935' },
                  { name: 'Late', value: stats.lateToday, fill: '#fbbf24' },
                  { name: 'Classes', value: stats.totalClasses, fill: '#7c4dff' },
                ]}
                margin={{ top: 12, right: 12, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#6b7280" />
                <YAxis tick={{ fontSize: 12 }} stroke="#6b7280" />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                  formatter={(value: number | undefined) => [(value ?? 0).toLocaleString(), 'Count']}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} animationDuration={600} animationEasing="ease-out" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart - Attendance distribution */}
        <div className="bg-[var(--surface)] rounded-xl shadow-md border border-[var(--border)] p-6 dashboard-section-animate" style={{ animationDelay: '500ms' }}>
          <h2 className="text-xl font-semibold text-[var(--foreground)] mb-6">Today&apos;s Attendance Distribution</h2>
          <div className="h-80">
            {stats.presentToday + stats.absentToday + stats.lateToday === 0 ? (
              <div className="flex items-center justify-center h-full text-[var(--muted-foreground)]">
                No attendance data yet today
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Present', value: stats.presentToday, color: '#43a047' },
                      { name: 'Absent', value: stats.absentToday, color: '#e53935' },
                      { name: 'Late', value: stats.lateToday, color: '#fbbf24' },
                    ].filter(d => d.value > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    animationDuration={600}
                    animationEasing="ease-out"
                    label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  >
                    {[
                      { name: 'Present', value: stats.presentToday, color: '#43a047' },
                      { name: 'Absent', value: stats.absentToday, color: '#e53935' },
                      { name: 'Late', value: stats.lateToday, color: '#fbbf24' },
                    ]
                      .filter(d => d.value > 0)
                      .map((entry, i) => (
                        <Cell key={`cell-${i}`} fill={entry.color} />
                      ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                    formatter={(value: number | undefined) => [(value ?? 0).toLocaleString(), 'Count']}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Weekly Trends */}
      <div className="bg-[var(--surface)] rounded-xl shadow-md border border-[var(--border)] p-6 dashboard-section-animate mb-8" style={{ animationDelay: '600ms' }}>
        <div className="flex items-center gap-2 mb-6">
          <Calendar className="text-green-600" size={24} />
          <h2 className="text-xl font-semibold text-[var(--foreground)]">Weekly Attendance Trends</h2>
          <span className="ml-auto text-sm text-[var(--muted-foreground)]">Last 7 days</span>
        </div>
        
        {isLoading ? (
          <LoadingSkeleton type="table" count={3} />
        ) : weeklyTrends.length === 0 || weeklyTrends.every(d => d.total === 0) ? (
          <div className="flex items-center justify-center h-80 text-[var(--muted-foreground)] bg-[var(--muted)]/50 rounded-lg border border-dashed border-[var(--border)]">
            <div className="text-center">
              <Calendar className="mx-auto text-[var(--muted-foreground)] mb-3" size={40} />
              <p className="font-medium">No weekly data available</p>
              <p className="text-sm mt-1">Attendance trends will appear as data is collected</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Line Chart */}
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={weeklyTrends}
                  margin={{ top: 12, right: 24, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="day" 
                    tick={{ fontSize: 12 }} 
                    stroke="#6b7280"
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }} 
                    stroke="#6b7280"
                    label={{ value: 'Students', angle: -90, position: 'insideLeft', style: { fontSize: 12, fill: '#6b7280' } }}
                  />
                  <Tooltip
                    contentStyle={{ 
                      borderRadius: '8px', 
                      border: '1px solid #e5e7eb',
                      boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                    }}
                    formatter={(value: number | undefined) => [(value ?? 0).toLocaleString(), '']}
                  />
                  <Legend 
                    wrapperStyle={{ paddingTop: '20px' }}
                    iconType="circle"
                  />
                  <Line
                    type="monotone"
                    dataKey="present"
                    stroke="#43a047"
                    strokeWidth={3}
                    dot={{ fill: '#43a047', r: 5 }}
                    activeDot={{ r: 7 }}
                    name="Present"
                    animationDuration={800}
                    animationEasing="ease-in-out"
                  />
                  <Line
                    type="monotone"
                    dataKey="late"
                    stroke="#fbbf24"
                    strokeWidth={3}
                    dot={{ fill: '#fbbf24', r: 5 }}
                    activeDot={{ r: 7 }}
                    name="Late"
                    animationDuration={800}
                    animationEasing="ease-in-out"
                  />
                  <Line
                    type="monotone"
                    dataKey="absent"
                    stroke="#e53935"
                    strokeWidth={3}
                    dot={{ fill: '#e53935', r: 5 }}
                    activeDot={{ r: 7 }}
                    name="Absent"
                    animationDuration={800}
                    animationEasing="ease-in-out"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-[var(--border)]">
              <div className="text-center">
                <p className="text-sm text-[var(--muted-foreground)] mb-1">Avg. Present</p>
                <p className="text-2xl font-bold text-green-600">
                  {weeklyTrends.length > 0 
                    ? Math.round(weeklyTrends.reduce((sum, d) => sum + d.present, 0) / weeklyTrends.length)
                    : 0}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-[var(--muted-foreground)] mb-1">Avg. Late</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {weeklyTrends.length > 0 
                    ? Math.round(weeklyTrends.reduce((sum, d) => sum + d.late, 0) / weeklyTrends.length)
                    : 0}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-[var(--muted-foreground)] mb-1">Avg. Absent</p>
                <p className="text-2xl font-bold text-red-600">
                  {weeklyTrends.length > 0 
                    ? Math.round(weeklyTrends.reduce((sum, d) => sum + d.absent, 0) / weeklyTrends.length)
                    : 0}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-[var(--muted-foreground)] mb-1">Avg. Rate</p>
                <p className="text-2xl font-bold text-indigo-600">
                  {weeklyTrends.length > 0 
                    ? Math.round(weeklyTrends.reduce((sum, d) => sum + d.attendanceRate, 0) / weeklyTrends.length)
                    : 0}%
                </p>
              </div>
            </div>

            {/* Trend Indicator */}
            {weeklyTrends.length >= 2 && (
              <div className="flex items-center justify-center gap-2 p-3 bg-[var(--muted)] rounded-lg">
                {(() => {
                  const recentRate = weeklyTrends[weeklyTrends.length - 1].attendanceRate;
                  const previousRate = weeklyTrends[weeklyTrends.length - 2].attendanceRate;
                  const diff = recentRate - previousRate;
                  const isPositive = diff > 0;
                  const isNeutral = diff === 0;
                  
                  return (
                    <>
                      <TrendingUp 
                        className={`${isPositive ? 'text-green-600 dark:text-green-400' : isNeutral ? 'text-[var(--muted-foreground)]' : 'text-red-600 dark:text-red-400'} ${!isPositive && !isNeutral ? 'rotate-180' : ''}`} 
                        size={20} 
                      />
                      <span className={`text-sm font-medium ${isPositive ? 'text-green-600 dark:text-green-400' : isNeutral ? 'text-[var(--muted-foreground)]' : 'text-red-600 dark:text-red-400'}`}>
                        {isNeutral 
                          ? 'Attendance rate unchanged from yesterday'
                          : `Attendance ${isPositive ? 'improved' : 'decreased'} by ${Math.abs(diff).toFixed(1)}% from yesterday`
                        }
                      </span>
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div className="bg-[var(--surface)] rounded-xl shadow-md border border-[var(--border)] p-6 dashboard-section-animate" style={{ animationDelay: '650ms' }}>
        <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Activity className="text-green-600" size={24} />
            <h2 className="text-xl font-semibold text-[var(--foreground)]">Recent Activity</h2>
          </div>
          <div className="flex items-center gap-3">
            {recentActivity.length > 0 && (
              <span className="text-sm text-[var(--muted-foreground)]">
                Last {recentActivity.length} records
              </span>
            )}
            <Link
              href="/home/history"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--primary)] hover:text-[var(--primary-dark)]"
            >
              View all
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
        {isLoading ? (
          <LoadingSkeleton type="table" count={5} />
        ) : recentActivity.length === 0 ? (
          <div className="text-center py-12 text-[var(--muted-foreground)] rounded-lg border border-dashed border-[var(--border)] bg-[var(--muted)]/50">
            <Activity className="mx-auto text-[var(--muted-foreground)] mb-3" size={40} />
            <p className="font-medium">No recent activity</p>
            <p className="text-sm mt-1">Attendance records will appear here as students check in or out</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
            <table className="min-w-[640px] w-full border-collapse">
              <thead>
                <tr className="bg-[var(--primary)] text-[var(--primary-foreground)]">
                  <th className="px-4 py-3 text-left text-sm font-semibold rounded-tl-lg">Time</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Student</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Subject</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Type</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold rounded-tr-lg">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentActivity.map((record, index) => (
                  <tr
                    key={record._id}
                    className={`dashboard-activity-row border-b border-[var(--border)] last:border-0 hover:bg-[var(--muted)] ${index % 2 === 1 ? 'bg-[var(--muted)]/50' : ''}`}
                  >
                    <td className="px-4 py-3 text-sm">
                      <span className="font-medium text-[var(--foreground)]">{format(new Date(record.scanTime), 'hh:mm a')}</span>
                      <span className="text-[var(--muted-foreground)] block text-xs mt-0.5">
                        {formatDistanceToNow(new Date(record.scanTime), { addSuffix: true })}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-[var(--foreground)]">{record.studentName}</td>
                    <td className="px-4 py-3 text-sm text-[var(--foreground)]">
                      {record.subject || '—'}
                      {record.subject?.toLowerCase() !== 'general' && record.gradeLevel && (record.gradeLevel.trim() !== '' || (record.section && record.section.trim() !== '')) && (
                        <span className="text-[var(--muted-foreground)] block text-xs mt-0.5">
                          {[record.gradeLevel?.trim(), record.section?.trim()].filter(Boolean).join(' - ')}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">{getTypeBadge(record)}</td>
                    <td className="px-4 py-3">{getStatusBadge(record.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}