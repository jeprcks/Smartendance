"use client";

import React from "react";
import { useState, useEffect, useCallback } from "react";
import {
  historyService,
  AttendanceRecord,
} from "@/app/services/historyService";
import { studentService } from "@/app/services/studentService";
import { teacherService } from "@/app/services/teacherService";
import { scheduleService } from "@/app/services/scheduleService";
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  subDays,
  parseISO,
} from "date-fns";
import LoadingSkeleton from "@/app/components/loading/LoadingSkeleton";
import {
  FileText,
  Download,
  Calendar,
  TrendingUp,
  Users,
  AlertCircle,
  BarChart3,
  PieChart,
  LineChart,
  FileDown,
} from "lucide-react";
import toast from "react-hot-toast";
import jsPDF from "jspdf";
import AttendanceCharts from "./components/AttendanceCharts";

interface ReportFilters {
  startDate: string;
  endDate: string;
  reportType: "daily" | "weekly" | "monthly" | "yearly" | "custom";
  gradeLevel?: string;
  section?: string;
}

export interface AttendancePattern {
  date: string;
  present: number;
  absent: number;
  late: number;
  cutting: number;
  total: number;
  attendanceRate: number;
}

export interface GradeLevelStats {
  gradeLevel: string;
  totalStudents: number;
  present: number;
  absent: number;
  late: number;
  cutting: number;
  attendanceRate: number;
  sections?: {
    section: string;
    totalStudents: number;
    present: number;
    absent: number;
    late: number;
    cutting: number;
    attendanceRate: number;
  }[];
}

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

export default function ReportsPage() {
  const [filters, setFilters] = useState<ReportFilters>({
    startDate: format(new Date(), "yyyy-MM-dd"),
    endDate: format(new Date(), "yyyy-MM-dd"),
    reportType: "daily",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [attendancePatterns, setAttendancePatterns] = useState<
    AttendancePattern[]
  >([]);
  const [gradeLevelStats, setGradeLevelStats] = useState<GradeLevelStats[]>([]);
  const [overallStats, setOverallStats] = useState({
    totalStudents: 0,
    totalRecords: 0,
    present: 0,
    absent: 0,
    late: 0,
    cutting: 0,
    attendanceRate: 0,
  });
  const [records, setRecords] = useState<AttendanceRecord[]>([]);

  const getAttendanceRateColor = (rate: number) => {
    if (rate >= 90) return 'text-green-600';
    if (rate >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Excel export function using CSV
  const generateExcelReport = async () => {
    try {
      setIsLoading(true);
      
      // Create CSV data
      let csvContent = 'data:text/csv;charset=utf-8,';
      
      // Title and period
      csvContent += 'Attendance Report\n';
      const reportStartDate = filters.startDate ? format(parseISO(filters.startDate), 'MMM dd, yyyy') : format(new Date(), 'MMM dd, yyyy');
      const reportEndDate = filters.endDate ? format(parseISO(filters.endDate), 'MMM dd, yyyy') : format(new Date(), 'MMM dd, yyyy');
      csvContent += `Period: ${reportStartDate} - ${reportEndDate}\n`;
      csvContent += `Generated: ${format(new Date(), 'MMM dd, yyyy HH:mm')}\n\n`;
      
      // Overall Statistics
      csvContent += 'OVERALL STATISTICS\n';
      csvContent += 'Metric,Value\n';
      csvContent += `Total Students,${overallStats.totalStudents}\n`;
      csvContent += `Total Records,${overallStats.totalRecords}\n`;
      csvContent += `Present,${overallStats.present}\n`;
      csvContent += `Absent,${overallStats.absent}\n`;
      csvContent += `Late,${overallStats.late}\n`;
      csvContent += `Cutting,${overallStats.cutting}\n`;
      csvContent += `Attendance Rate (%),${overallStats.attendanceRate}\n\n`;
      
      // Grade Level Statistics
      if (gradeLevelStats.length > 0) {
        csvContent += 'GRADE LEVEL BREAKDOWN\n';
        csvContent += 'Grade,Total Students,Present,Absent,Late,Cutting,Attendance Rate (%)\n';
        gradeLevelStats
          .filter((stat) => stat.gradeLevel.toLowerCase() !== "graduated")
          .forEach((stat) => {
            csvContent += `${stat.gradeLevel},${stat.totalStudents},${stat.present},${stat.absent},${stat.late},${stat.cutting},${stat.attendanceRate}\n`;
            
            // Add sections
            if (Array.isArray(stat.sections) && stat.sections.length > 0) {
              stat.sections.forEach((sectionStat) => {
                csvContent += `  ${sectionStat.section},${sectionStat.totalStudents},${sectionStat.present},${sectionStat.absent},${sectionStat.late},${sectionStat.cutting},${sectionStat.attendanceRate}\n`;
              });
            }
          });
        csvContent += '\n';
      }
      
      // Daily Patterns
      if (attendancePatterns.length > 0) {
        csvContent += 'DAILY ATTENDANCE PATTERN\n';
        csvContent += 'Date,Present,Absent,Late,Cutting,Total Records,Attendance Rate (%)\n';
        attendancePatterns.forEach((pattern) => {
          const dateStr = pattern.date ? format(parseISO(pattern.date), 'MMM dd, yyyy') : '';
          csvContent += `${dateStr},${pattern.present},${pattern.absent},${pattern.late},${pattern.cutting},${pattern.total},${pattern.attendanceRate}\n`;
        });
      }
      
      // Download CSV as Excel file
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `attendance_report_${filters.startDate}_to_${filters.endDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Excel report downloaded successfully');
    } catch (error) {
      console.error('Error generating Excel:', error);
      toast.error('Failed to generate Excel report');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchReportData = useCallback(async () => {
    try {
      setIsLoading(true);

      // Calculate date range based on report type
      let startDate = filters.startDate;
      let endDate = filters.endDate;

      if (filters.reportType === "weekly") {
        startDate = format(startOfWeek(new Date()), "yyyy-MM-dd");
        endDate = format(endOfWeek(new Date()), "yyyy-MM-dd");
      } else if (filters.reportType === "monthly") {
        startDate = format(startOfMonth(new Date()), "yyyy-MM-dd");
        endDate = format(endOfMonth(new Date()), "yyyy-MM-dd");
      } else if (filters.reportType === "yearly") {
        startDate = format(startOfYear(new Date()), "yyyy-MM-dd");
        endDate = format(endOfYear(new Date()), "yyyy-MM-dd");
      }

      // Fetch students for total count (excluding graduated)
      const students = await studentService.getAllStudents().catch(() => []);
      const activeStudents = Array.isArray(students)
        ? students.filter(
            (s: any) => s.gradeLevel?.toLowerCase() !== "graduated",
          )
        : [];
      const totalStudents = activeStudents.length;

      // Fetch all attendance records (without date parameters, filter client-side)
      const response = await historyService
        .getHistoryPageData({
          limit: 5000,
          page: 1,
        })
        .catch(() => ({ success: false, records: [], pagination: {} }));

      // Parse dates for filtering
      const startDateTime = parseISO(startDate);
      const endDateTime = parseISO(endDate);
      
      // Filter records by date range client-side
      const filteredRecords = (response.records || []).filter(record => {
        const recordDateStr = format(new Date(record.scanTime), 'yyyy-MM-dd');
        // Compare as strings to avoid timezone issues
        return recordDateStr >= startDate && recordDateStr <= endDate;
      });

      const fetchedRecords = filteredRecords;
      setRecords(fetchedRecords);

      console.log('📊 Reports Debug:');
      console.log('Total records fetched:', response.records?.length);
      console.log(`Date range: ${startDate} to ${endDate}`);
      console.log('Records after date filtering:', fetchedRecords.length);
      console.log('Sample records:', fetchedRecords.slice(0, 3).map(r => ({
        name: r.studentName,
        date: format(new Date(r.scanTime), 'yyyy-MM-dd HH:mm:ss'),
        status: r.status,
        grade: r.gradeLevel,
        section: r.section
      })));

      // Calculate overall stats from records
      const stats = fetchedRecords.reduce<{
        present: number;
        absent: number;
        late: number;
        cutting: number;
        total: number;
      }>(
        (acc, record) => {
          acc.total++;
          if (record.status === "Present") acc.present++;
          else if (record.status === "Absent") acc.absent++;
          else if (record.status === "Late") acc.late++;
          else if (record.status === "Cutting") acc.cutting++;
          return acc;
        },
        {
          present: 0,
          absent: 0,
          late: 0,
          cutting: 0,
          total: 0,
        },
      );

      const attendanceRate =
        totalStudents > 0
          ? Math.round((stats.present / totalStudents) * 100)
          : 0;

      setOverallStats({
        totalStudents,
        totalRecords: fetchedRecords.length,
        present: stats.present,
        absent: stats.absent,
        late: stats.late,
        cutting: stats.cutting,
        attendanceRate,
      });

      // Calculate attendance patterns (daily breakdown)
      const patternsMap = new Map<string, AttendancePattern>();
      const start = parseISO(startDate);
      const end = parseISO(endDate);

      // Create date range properly without mutating in loop condition
      let currentDate = new Date(start);
      while (currentDate <= end) {
        const dateKey = format(currentDate, 'yyyy-MM-dd');
        patternsMap.set(dateKey, {
          date: dateKey,
          present: 0,
          absent: 0,
          late: 0,
          cutting: 0,
          total: 0,
          attendanceRate: 0,
        });
        currentDate.setDate(currentDate.getDate() + 1);
      }

      fetchedRecords.forEach((record) => {
        const dateKey = format(new Date(record.scanTime), "yyyy-MM-dd");
        const pattern = patternsMap.get(dateKey);
        if (pattern) {
          pattern.total++;
          if (record.status === "Present") pattern.present++;
          else if (record.status === "Absent") pattern.absent++;
          else if (record.status === "Late") pattern.late++;
          else if (record.status === "Cutting") pattern.cutting++;
        }
      });

      // Calculate attendance rates for each day
      patternsMap.forEach((pattern, dateKey) => {
        pattern.attendanceRate =
          totalStudents > 0
            ? Math.round((pattern.present / totalStudents) * 100)
            : 0;
      });

      setAttendancePatterns(
        Array.from(patternsMap.values()).sort((a, b) =>
          a.date.localeCompare(b.date),
        ),
      );

      // Calculate grade-level and section stats
      // Build maps: grade -> section -> stats
      const gradeMap = new Map<
        string,
        Map<
          string,
          {
            totalStudents: number;
            present: number;
            absent: number;
            late: number;
            cutting: number;
          }
        >
      >();

      // Initialize from active students list to capture totalStudents per section
      activeStudents.forEach((student: any) => {
        const grade = student.gradeLevel || "Unknown";
        const sectionVal = student.section || "Unknown";
        if (!gradeMap.has(grade)) gradeMap.set(grade, new Map());
        const secMap = gradeMap.get(grade)!;
        if (!secMap.has(sectionVal)) {
          secMap.set(sectionVal, {
            totalStudents: 0,
            present: 0,
            absent: 0,
            late: 0,
            cutting: 0,
          });
        }
        secMap.get(sectionVal)!.totalStudents++;
      });

      // Tally statuses from fetchedRecords into section stats
      fetchedRecords.forEach((record) => {
        const grade = record.gradeLevel || "Unknown";
        const sectionVal = record.section || "Unknown";
        if (!gradeMap.has(grade)) gradeMap.set(grade, new Map());
        const secMap = gradeMap.get(grade)!;
        if (!secMap.has(sectionVal)) {
          secMap.set(sectionVal, {
            totalStudents: 0,
            present: 0,
            absent: 0,
            late: 0,
            cutting: 0,
          });
        }
        const stats = secMap.get(sectionVal)!;
        if (record.status === "Present") stats.present++;
        else if (record.status === "Absent") stats.absent++;
        else if (record.status === "Late") stats.late++;
        else if (record.status === "Cutting") stats.cutting++;
      });

      // Convert to GradeLevelStats with section list
      const gradeStatsArr: GradeLevelStats[] = [];
      gradeMap.forEach((secMap, grade) => {
        let gradeTotalStudents = 0;
        let gradePresent = 0;
        let gradeAbsent = 0;
        let gradeLate = 0;
        let gradeCutting = 0;
        const sections: GradeLevelStats["sections"] = [];
        secMap.forEach((s, sectionName) => {
          const attendanceRate =
            s.totalStudents > 0
              ? Math.round((s.present / s.totalStudents) * 100)
              : 0;
          sections.push({
            section: sectionName,
            totalStudents: s.totalStudents,
            present: s.present,
            absent: s.absent,
            late: s.late,
            cutting: s.cutting,
            attendanceRate,
          });
          gradeTotalStudents += s.totalStudents;
          gradePresent += s.present;
          gradeAbsent += s.absent;
          gradeLate += s.late;
          gradeCutting += s.cutting;
        });
        const gradeAttendanceRate =
          gradeTotalStudents > 0
            ? Math.round((gradePresent / gradeTotalStudents) * 100)
            : 0;
        gradeStatsArr.push({
          gradeLevel: grade,
          totalStudents: gradeTotalStudents,
          present: gradePresent,
          absent: gradeAbsent,
          late: gradeLate,
          cutting: gradeCutting,
          attendanceRate: gradeAttendanceRate,
          sections,
        });
      });

      // Filter out "Graduated" grade level
      const filteredGradeStats = gradeStatsArr
        .filter((stat) => stat.gradeLevel.toLowerCase() !== "graduated")
        .sort((a, b) => a.gradeLevel.localeCompare(b.gradeLevel));

      setGradeLevelStats(filteredGradeStats);
    } catch (error) {
      console.error("Error fetching report data:", error);
      toast.error("Failed to load report data");
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  const generatePDFReport = async () => {
    try {
      setIsLoading(true);
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 20;
      let yPosition = 20;

      // Title
      pdf.setFontSize(20);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(46, 125, 50); // Green color
      pdf.text("Attendance Report", margin, yPosition);
      yPosition += 10;

      // Report period
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(0, 0, 0);
      const pdfStartDate = filters.startDate ? format(parseISO(filters.startDate), "MMM dd, yyyy") : format(new Date(), "MMM dd, yyyy");
      const pdfEndDate = filters.endDate ? format(parseISO(filters.endDate), "MMM dd, yyyy") : format(new Date(), "MMM dd, yyyy");
      pdf.text(
        `Period: ${pdfStartDate} - ${pdfEndDate}`,
        margin,
        yPosition,
      );
      yPosition += 8;
      pdf.text(
        `Generated: ${format(new Date(), "MMM dd, yyyy HH:mm")}`,
        margin,
        yPosition,
      );
      yPosition += 15;

      // Overall Statistics
      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      pdf.text("Overall Statistics", margin, yPosition);
      yPosition += 10;

      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.text(
        `Total Students: ${overallStats.totalStudents}`,
        margin,
        yPosition,
      );
      yPosition += 6;
      pdf.text(
        `Total Records: ${overallStats.totalRecords}`,
        margin,
        yPosition,
      );
      yPosition += 6;
      pdf.text(`Present: ${overallStats.present}`, margin, yPosition);
      yPosition += 6;
      pdf.text(`Absent: ${overallStats.absent}`, margin, yPosition);
      yPosition += 6;
      pdf.text(`Late: ${overallStats.late}`, margin, yPosition);
      yPosition += 6;
      pdf.text(`Cutting: ${overallStats.cutting}`, margin, yPosition);
      yPosition += 6;
      pdf.setFont("helvetica", "bold");
      pdf.text(
        `Attendance Rate: ${overallStats.attendanceRate}%`,
        margin,
        yPosition,
      );
      yPosition += 15;

      // Grade Level Statistics
      if (gradeLevelStats.length > 0) {
        pdf.setFontSize(14);
        pdf.setFont("helvetica", "bold");
        pdf.text("Grade Level Breakdown", margin, yPosition);
        yPosition += 10;

        pdf.setFontSize(9);
        pdf.setFont("helvetica", "bold");
        pdf.text("Grade", margin, yPosition);
        pdf.text("Students", margin + 30, yPosition);
        pdf.text("Present", margin + 50, yPosition);
        pdf.text("Absent", margin + 65, yPosition);
        pdf.text("Late", margin + 80, yPosition);
        pdf.text("Rate %", margin + 95, yPosition);
        yPosition += 6;

        pdf.setFont("helvetica", "normal");
        // Filter out "Graduated" from PDF
        gradeLevelStats
          .filter((stat) => stat.gradeLevel.toLowerCase() !== "graduated")
          .forEach((stat) => {
            if (yPosition > 270) {
              pdf.addPage();
              yPosition = 20;
            }
            // Grade row
            pdf.text(stat.gradeLevel, margin, yPosition);
            pdf.text(stat.totalStudents.toString(), margin + 30, yPosition);
            pdf.text(stat.present.toString(), margin + 50, yPosition);
            pdf.text(stat.absent.toString(), margin + 65, yPosition);
            pdf.text(stat.late.toString(), margin + 80, yPosition);
            pdf.text(`${stat.attendanceRate}%`, margin + 95, yPosition);
            yPosition += 6;

            // Sections (indented)
            if (Array.isArray(stat.sections) && stat.sections.length > 0) {
              pdf.setFontSize(9);
              stat.sections.forEach((sectionStat) => {
                if (yPosition > 270) {
                  pdf.addPage();
                  yPosition = 20;
                }
                // Indent section line
                pdf.text(`- ${sectionStat.section}`, margin + 6, yPosition);
                pdf.text(
                  sectionStat.totalStudents.toString(),
                  margin + 30,
                  yPosition,
                );
                pdf.text(
                  sectionStat.present.toString(),
                  margin + 50,
                  yPosition,
                );
                pdf.text(sectionStat.absent.toString(), margin + 65, yPosition);
                pdf.text(sectionStat.late.toString(), margin + 80, yPosition);
                pdf.text(
                  `${sectionStat.attendanceRate}%`,
                  margin + 95,
                  yPosition,
                );
                yPosition += 6;
              });
              pdf.setFontSize(10);
            }
          });
        yPosition += 10;
      }

      // Daily Patterns (if space allows)
      if (attendancePatterns.length > 0 && yPosition < 250) {
        pdf.setFontSize(14);
        pdf.setFont("helvetica", "bold");
        pdf.text("Daily Attendance Pattern", margin, yPosition);
        yPosition += 10;

        pdf.setFontSize(8);
        pdf.setFont("helvetica", "bold");
        pdf.text("Date", margin, yPosition);
        pdf.text("Present", margin + 30, yPosition);
        pdf.text("Absent", margin + 45, yPosition);
        pdf.text("Late", margin + 55, yPosition);
        pdf.text("Rate %", margin + 70, yPosition);
        yPosition += 5;

        pdf.setFont("helvetica", "normal");
        attendancePatterns.slice(-10).forEach((pattern) => {
          if (yPosition > 270) {
            pdf.addPage();
            yPosition = 20;
          }
          pdf.text(pattern.date ? format(parseISO(pattern.date), "MMM dd") : "", margin, yPosition);
          pdf.text(pattern.present.toString(), margin + 30, yPosition);
          pdf.text(pattern.absent.toString(), margin + 45, yPosition);
          pdf.text(pattern.late.toString(), margin + 55, yPosition);
          pdf.text(`${pattern.attendanceRate}%`, margin + 70, yPosition);
          yPosition += 5;
        });
      }

      // Save PDF
      const filename = `attendance_report_${filters.startDate}_to_${filters.endDate}.pdf`;
      pdf.save(filename);
      toast.success("PDF report generated successfully");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF report");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReportTypeChange = (
    type: "daily" | "weekly" | "monthly" | "yearly" | "custom",
  ) => {
    let startDate = filters.startDate;
    let endDate = filters.endDate;

    if (type === "daily") {
      startDate = format(new Date(), "yyyy-MM-dd");
      endDate = format(new Date(), "yyyy-MM-dd");
    } else if (type === "weekly") {
      startDate = format(startOfWeek(new Date()), "yyyy-MM-dd");
      endDate = format(endOfWeek(new Date()), "yyyy-MM-dd");
    } else if (type === "monthly") {
      startDate = format(startOfMonth(new Date()), "yyyy-MM-dd");
      endDate = format(endOfMonth(new Date()), "yyyy-MM-dd");
    } else if (type === "yearly") {
      startDate = format(startOfYear(new Date()), "yyyy-MM-dd");
      endDate = format(endOfYear(new Date()), "yyyy-MM-dd");
    }

    setFilters({ ...filters, reportType: type, startDate, endDate });
  };

  return (
    <div className="page-container">
      <header className="dashboard-header">
        <div className="dashboard-header-inner">
          <div className="dashboard-header-content">
            <h1>Reports</h1>
            <p>Comprehensive attendance reports and analytics</p>
          </div>
          <div className="dashboard-header-refresh-box">
            <button
              type="button"
              onClick={generateExcelReport}
              disabled={isLoading}
              className="inline-flex items-center gap-2 mr-2"
            >
              <FileDown size={18} />
              Export Excel
            </button>
            <button
              type="button"
              onClick={generatePDFReport}
              disabled={isLoading}
              className="inline-flex items-center gap-2"
            >
              <Download size={18} />
              Export PDF
            </button>
          </div>
        </div>
      </header>

      {/* Report Filters */}
      <div className="content-section mb-6">
        <h2 className="text-xl font-semibold text-[var(--foreground)] mb-4">
          Report Filters
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
              Report Type
            </label>
            <select
              value={filters.reportType}
              onChange={(e) => handleReportTypeChange(e.target.value as any)}
              aria-label="Select report type"
              className="w-full px-4 py-2 bg-[var(--muted)] border border-[var(--border)] rounded-[var(--radius)] focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--primary)] transition-all duration-300"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={filters.startDate || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFilters({
                  ...filters,
                  startDate: e.target.value || format(new Date(), 'yyyy-MM-dd'),
                  reportType: "custom",
                })
              }
              aria-label="Start date"
              className="w-full px-4 py-2 bg-[var(--muted)] border border-[var(--border)] rounded-[var(--radius)] focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--primary)] transition-all duration-300"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
              End Date
            </label>
            <input
              type="date"
              value={filters.endDate || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFilters({
                  ...filters,
                  endDate: e.target.value || format(new Date(), 'yyyy-MM-dd'),
                  reportType: "custom",
                })
              }
              aria-label="End date"
              className="w-full px-4 py-2 bg-[var(--muted)] border border-[var(--border)] rounded-[var(--radius)] focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--primary)] transition-all duration-300"
            />
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={fetchReportData}
              disabled={isLoading}
              className="w-full px-4 py-2 bg-[var(--primary)] text-white rounded-[var(--radius)] hover:bg-[var(--primary-dark)] transition-colors disabled:opacity-50 font-medium"
            >
              {isLoading ? "Loading..." : "Apply Filters"}
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <LoadingSkeleton type="card" count={3} />
      ) : (
        <>
          {/* Overall Statistics */}
          <div className="dashboard-grid mb-6">
            <div className="stat-card">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950">
                  <Users className="text-green-600 dark:text-green-400" size={24} />
                </div>
                <div className="text-right">
                  <p className="text-sm text-[var(--muted-foreground)] mb-1">Total Students</p>
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400">{overallStats.totalStudents}</p>
                </div>
              </div>
            </div>
            <div className="stat-card">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950">
                  <FileText className="text-blue-600 dark:text-blue-400" size={24} />
                </div>
                <div className="text-right">
                  <p className="text-sm text-[var(--muted-foreground)] mb-1">Total Records</p>
                  <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{overallStats.totalRecords}</p>
                </div>
              </div>
            </div>
            <div className="stat-card">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950">
                  <TrendingUp className="text-green-600 dark:text-green-400" size={24} />
                </div>
                <div className="text-right">
                  <p className="text-sm text-[var(--muted-foreground)] mb-1">Attendance Rate</p>
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400">{overallStats.attendanceRate}%</p>
                </div>
              </div>
            </div>
            <div className="stat-card">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950">
                  <AlertCircle className="text-red-600 dark:text-red-400" size={24} />
                </div>
                <div className="text-right">
                  <p className="text-sm text-[var(--muted-foreground)] mb-1">Absent</p>
                  <p className="text-3xl font-bold text-red-600 dark:text-red-400">{overallStats.absent}</p>
                </div>
              </div>
            </div>
            <div className="stat-card">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950">
                  <BarChart3 className="text-purple-600 dark:text-purple-400" size={24} />
                </div>
                <div className="text-right">
                  <p className="text-sm text-[var(--muted-foreground)] mb-1">Total Classes</p>
                  <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{gradeLevelStats.length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Charts Section */}
          {(attendancePatterns.length > 0 || gradeLevelStats.length > 0) && (
            <AttendanceCharts
              attendancePatterns={attendancePatterns}
              gradeLevelStats={gradeLevelStats}
              overallStats={{
                present: overallStats.present,
                absent: overallStats.absent,
                late: overallStats.late,
                cutting: overallStats.cutting,
              }}
            />
          )}

          {/* Grade Level Statistics */}
          {gradeLevelStats.length > 0 && (
            <div className="content-section mb-6">
              <h2 className="text-xl font-semibold text-[var(--foreground)] mb-4 flex items-center gap-2">
                <BarChart3 size={20} className="text-[var(--primary)]" />
                Grade Level Breakdown
              </h2>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Grade Level</th>
                      <th>Total Students</th>
                      <th>Present</th>
                      <th>Absent</th>
                      <th>Late</th>
                      <th>Cutting</th>
                      <th>Attendance Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gradeLevelStats.map((stat, index) => (
                      <React.Fragment key={index}>
                        <tr className="bg-[var(--muted)]/50 hover:bg-[var(--secondary)] transition-colors duration-200">
                          <td className="font-medium">{stat.gradeLevel}</td>
                          <td>{stat.totalStudents}</td>
                          <td className="font-semibold text-green-600 dark:text-green-400">{stat.present}</td>
                          <td className="font-semibold text-red-600 dark:text-red-400">{stat.absent}</td>
                          <td className="font-semibold text-yellow-600 dark:text-yellow-400">{stat.late}</td>
                          <td className="font-semibold text-orange-600 dark:text-orange-400">{stat.cutting}</td>
                          <td>
                            <span className={`font-semibold ${getAttendanceRateColor(stat.attendanceRate)}`}>
                              {stat.attendanceRate}%
                            </span>
                          </td>
                        </tr>
                        {stat.sections && stat.sections.map((s, si) => (
                          <tr key={`${index}-${si}`} className="text-sm hover:bg-[var(--secondary)] transition-colors duration-200">
                            <td className="pl-8">— {s.section}</td>
                            <td>{s.totalStudents}</td>
                            <td className="font-semibold text-green-600 dark:text-green-400">{s.present}</td>
                            <td className="font-semibold text-red-600 dark:text-red-400">{s.absent}</td>
                            <td className="font-semibold text-yellow-600 dark:text-yellow-400">{s.late}</td>
                            <td className="font-semibold text-orange-600 dark:text-orange-400">{s.cutting}</td>
                            <td>
                              <span className={`font-semibold ${getAttendanceRateColor(s.attendanceRate)}`}>
                                {s.attendanceRate}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Attendance Patterns */}
          {attendancePatterns.length > 0 && (
            <div className="content-section">
              <h2 className="text-xl font-semibold text-[var(--foreground)] mb-4 flex items-center gap-2">
                <LineChart size={20} className="text-[var(--primary)]" />
                Daily Attendance Pattern
              </h2>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Present</th>
                      <th>Absent</th>
                      <th>Late</th>
                      <th>Cutting</th>
                      <th>Total Records</th>
                      <th>Attendance Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendancePatterns.map((pattern, index) => (
                      <tr key={index} className="hover:bg-[var(--secondary)] transition-colors duration-200">
                        <td className="font-medium">{format(parseISO(pattern.date), 'MMM dd, yyyy')}</td>
                        <td className="font-semibold text-green-600 dark:text-green-400">{pattern.present}</td>
                        <td className="font-semibold text-red-600 dark:text-red-400">{pattern.absent}</td>
                        <td className="font-semibold text-yellow-600 dark:text-yellow-400">{pattern.late}</td>
                        <td className="font-semibold text-orange-600 dark:text-orange-400">{pattern.cutting}</td>
                        <td>{pattern.total}</td>
                        <td>
                          <span className={`font-semibold ${getAttendanceRateColor(pattern.attendanceRate)}`}>
                            {pattern.attendanceRate}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
