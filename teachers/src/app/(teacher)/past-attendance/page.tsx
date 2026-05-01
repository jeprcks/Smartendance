"use client";

import { useEffect, useState } from "react";
import { getToken, getTeacherData } from "@/lib/auth";
import {
  getTeacherSchedule,
  getAttendanceRecords,
  updateAttendanceRecord,
  getClassStudents,
} from "../../../lib/api";
import PageHeader from "@/components/PageHeader";
import PrintExcelModal from "./components/printexcelmodal";

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

function getDayName(weekday: number): string {
  return DAYS[weekday - 1];
}

function getDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function toLocalDateString(value: unknown): string {
  if (!value) return "";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return "";
  return getDateString(d);
}

function getLast7Days(): { date: Date; dateStr: string; dayName: string }[] {
  const days = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    days.push({
      date,
      dateStr: getDateString(date),
      dayName: getDayName(date.getDay() || 7),
    });
  }
  return days;
}

function getDateRange(
  days: number,
): { date: Date; dateStr: string; dayName: string }[] {
  const dateArray = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    dateArray.push({
      date,
      dateStr: getDateString(date),
      dayName: getDayName(date.getDay() || 7),
    });
  }
  return dateArray;
}

function getCustomDateRange(
  startDate: string,
  endDate: string,
): { date: Date; dateStr: string; dayName: string }[] {
  if (!startDate || !endDate) return [];
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime()) ||
    start > end
  )
    return [];

  const dateArray = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    dateArray.push({
      date: new Date(cursor),
      dateStr: getDateString(cursor),
      dayName: getDayName(cursor.getDay() || 7),
    });
    cursor.setDate(cursor.getDate() + 1);
    if (dateArray.length > 366) break;
  }
  return dateArray;
}

interface StudentAttendance {
  studentId: string;
  studentName: string;
  gradeLevel: string;
  section: string;
  subject: string;
  attendance: Record<string, string>; // date -> status
  recordIds: Record<string, string>; // date -> recordId
}

interface EditModalState {
  isOpen: boolean;
  studentId: string;
  studentName: string;
  date: string;
  currentStatus: string;
  recordId: string;
}

const CalendarIconForHeader = () => (
  <svg
    className="w-6 h-6"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
    />
  </svg>
);

const SearchIcon = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
    />
  </svg>
);

const FilterIcon = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
    />
  </svg>
);

const DownloadIcon = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
    />
  </svg>
);

export default function PastAttendancePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allStudents, setAllStudents] = useState<StudentAttendance[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<StudentAttendance[]>(
    [],
  );
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [selectedGrade, setSelectedGrade] = useState<string>("");
  const [selectedSection, setSelectedSection] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [dateRangeFilter, setDateRangeFilter] = useState<number>(7);
  const [isCustomDateRange, setIsCustomDateRange] = useState(false);
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [subjects, setSubjects] = useState<string[]>([]);
  const [grades, setGrades] = useState<string[]>([]);
  const [sections, setSections] = useState<string[]>([]);
  const [editModal, setEditModal] = useState<EditModalState>({
    isOpen: false,
    studentId: "",
    studentName: "",
    date: "",
    currentStatus: "",
    recordId: "",
  });
  const [updateLoading, setUpdateLoading] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const load = async () => {
    const token = getToken();
    const data = getTeacherData();
    if (!token || !data.teacherId || !data.teacherName) {
      setError("Not authenticated");
      setLoading(false);
      return;
    }

    setError(null);
    setLoading(true);

    // Calculate date range for API query
    let startDate: string | undefined;
    let endDate: string | undefined;

    if (isCustomDateRange && customStartDate && customEndDate) {
      startDate = customStartDate;
      endDate = customEndDate;
    } else if (dateRangeFilter > 0) {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - (dateRangeFilter - 1));
      startDate = getDateString(start);
      endDate = getDateString(end);
    }

    try {
      // First, get teacher's schedules to find their enrolled students
      const schedulesRes = await getTeacherSchedule({
        token,
        teacherId: data.teacherId,
        teacherName: data.teacherName,
      });

      // Extract unique student IDs from teacher's schedules
      const teacherStudentIds = new Set<string>();
      const teacherSubjects = new Set<string>();
      const teacherGrades = new Set<string>();
      const teacherSections = new Set<string>();
      const allEnrolledStudents = new Map<string, any>();

      if (schedulesRes && Array.isArray(schedulesRes)) {
        // Fetch students for each schedule and track which schedule they belong to
        const scheduleStudentMap = new Map<string, any>(); // studentId -> schedule info

        const studentFetchPromises = schedulesRes.map((schedule: any) => {
          if (schedule.subject) teacherSubjects.add(schedule.subject);
          if (schedule.gradeLevel) teacherGrades.add(schedule.gradeLevel);
          if (schedule.section) teacherSections.add(schedule.section);

          return getClassStudents({
            gradeLevel: String(schedule.gradeLevel ?? ""),
            section: String(schedule.section ?? ""),
            teacherName: data.teacherName || "",
            token,
            subject: String(schedule.subject ?? "") || undefined,
            shift: String(schedule.shift ?? "") || undefined,
          })
            .then((students) => {
              // Tag each student with their schedule info
              return students.map((student: any) => ({
                ...student,
                scheduleSubject: schedule.subject,
                scheduleGrade: schedule.gradeLevel,
                scheduleSection: schedule.section,
              }));
            })
            .catch(() => []); // Return empty array on error
        });

        // Wait for all student fetches to complete
        const studentsArrays = await Promise.all(studentFetchPromises);

        // Collect all unique student IDs and student details with schedule info

        studentsArrays.forEach((students) => {
          students.forEach((student: any) => {
            if (student.studentId) {
              const studentId = String(student.studentId);
              teacherStudentIds.add(studentId);

              // Store student details with schedule info for later use
              const key = `${studentId}-${student.scheduleGrade}-${student.scheduleSection}-${student.scheduleSubject}`;
              if (!allEnrolledStudents.has(key)) {
                allEnrolledStudents.set(key, {
                  studentId: student.studentId,
                  studentName: student.fullName || student.studentName,
                  gradeLevel: student.gradeLevel || student.scheduleGrade,
                  section: student.section || student.scheduleSection,
                  subject: student.scheduleSubject,
                });
              }
            }
          });
        });

        console.log(
          `Fetched students from ${schedulesRes.length} schedules. ` +
            `Total unique students: ${teacherStudentIds.size}`,
        );
      }

      // If teacher has no enrolled students, show empty state
      if (teacherStudentIds.size === 0) {
        setAllStudents([]);
        setFilteredStudents([]);
        setSubjects([]);
        setGrades([]);
        setSections([]);
        setLoading(false);
        return;
      }

      // Now fetch attendance records for only this teacher's students
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const historyUrl = new URL(`${apiUrl}/api/history`);
      historyUrl.searchParams.set("limit", "10000");
      if (startDate) historyUrl.searchParams.set("startDate", startDate);
      if (endDate) historyUrl.searchParams.set("endDate", endDate);

      console.log("Fetching attendance records from:", historyUrl.toString());
      
      const recordsRes = await fetch(historyUrl.toString(), {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })
        .then((res) => {
          if (!res.ok) {
            console.error("API Error:", res.status, res.statusText);
            throw new Error(`Failed to fetch records: ${res.status} ${res.statusText}`);
          }
          return res.json();
        })
        .then((data) => {
          console.log("API Response received:", { recordCount: data.records?.length, data });
          return {
            records: data.records || [],
            pagination: data.pagination || {},
          };
        })
        .catch((err) => {
          console.error("Error fetching attendance records:", err);
          throw err;
        });

      // Group records by student and date
      const studentMap = new Map<string, StudentAttendance>();
      const subjectsSet = new Set<string>();
      const gradesSet = new Set<string>();
      const sectionsSet = new Set<string>();

      const records = recordsRes.records || [];

      // Filter records to only include teacher's enrolled students
      // AND exclude "General" subject records (except In/Out attendance records)
      const teacherRecords = records.filter((record: any) => {
        const recordStudentId = String(record.studentId || "");
        const recordSubject = String(record.subject || "").toLowerCase();
        const recordType = String(record.attendanceType || "");

        // Only show records for enrolled students
        if (!teacherStudentIds.has(recordStudentId)) return false;

        // Allow In/Out attendance records (they use "General" as subject)
        if (recordType === "In" || recordType === "Out") return true;

        // For other records, filter out "General" subject - only show specific subjects
        if (recordSubject === "general") return false;

        return true;
      });

      console.log(
        `Teacher has ${teacherStudentIds.size} enrolled students. ` +
          `Found ${teacherRecords.length} attendance records out of ${records.length} total records.`,
      );
      
      // Count In/Out records
      const inOutRecords = teacherRecords.filter((r: any) => r.attendanceType === "In" || r.attendanceType === "Out");
      console.log(`In/Out records: ${inOutRecords.length}, Subject-specific records: ${teacherRecords.length - inOutRecords.length}`);

      teacherRecords.forEach((record: any) => {
        const studentId = String(record.studentId || "");
        const studentName = String(record.studentName || "");
        const gradeLevel = String(record.gradeLevel || "");
        const section = String(record.section || "");
        const subject = String(record.subject || "");

        // Determine status based on In/Out system
        let status = String(record.status || "Absent");
        
        // If this is an In/Out attendance record
        if (record.attendanceType) {
          if (record.attendanceType === "In" && record.checkInTime) {
            // Check-In record - show as Present
            status = "Present";
          } else if (record.attendanceType === "Out" && record.checkOutTime) {
            // Check-Out record - show as Out
            status = "Out";
          }
        } else if (record.scanTime || record.checkInTime) {
          // Legacy QR scan record
          status = "Present";
        }

        // Use checkInTime for display, fallback to checkOutTime or scanTime
        const dateStr = toLocalDateString(
          record.checkInTime || record.checkOutTime || record.scanTime || record.createdAt,
        );
        
        console.log(`Processing record - studentId: ${studentId}, type: ${record.attendanceType}, status: ${status}, date: ${dateStr}, checkInTime: ${record.checkInTime}, checkOutTime: ${record.checkOutTime}`);

        if (!studentId || !studentName) return;
        if (!dateStr) return;

        gradesSet.add(gradeLevel);
        sectionsSet.add(section);

        // Only add non-General subjects to the filter (In/Out uses General, so skip it)
        if (subject.toLowerCase() !== "general") {
          subjectsSet.add(subject);
        }

        const key = `${studentId}-${gradeLevel}-${section}-${subject}`;

        if (!studentMap.has(key)) {
          studentMap.set(key, {
            studentId,
            studentName,
            gradeLevel,
            section,
            subject,
            attendance: {},
            recordIds: {},
          });
        }

        const student = studentMap.get(key)!;
        student.attendance[dateStr] = status;
        student.recordIds[dateStr] = String(record._id || "");
        console.log(
          `Stored record - studentId: ${studentId}, date: ${dateStr}, recordId: ${student.recordIds[dateStr]}, createdAt: ${record.createdAt}`,
        );
      });

      // Add all enrolled students to the list, even if they have no attendance records
      allEnrolledStudents.forEach((enrolledStudent, key) => {
        // Check if this student-subject combination already exists in studentMap
        if (!studentMap.has(key)) {
          const subject = enrolledStudent.subject;

          // Only add if it's not a General subject
          if (subject && subject.toLowerCase() !== "general") {
            studentMap.set(key, {
              studentId: enrolledStudent.studentId,
              studentName: enrolledStudent.studentName,
              gradeLevel: enrolledStudent.gradeLevel,
              section: enrolledStudent.section,
              subject: subject,
              attendance: {}, // Empty attendance - will show as unmarked
              recordIds: {},
            });

            // Add subject to the set
            subjectsSet.add(subject);
            gradesSet.add(enrolledStudent.gradeLevel);
            sectionsSet.add(enrolledStudent.section);
          }
        }
      });

      // ✅ FIX: Propagate In/Out (General subject) records to all enrolled subjects
      // When a student scans, they should show as Present for ALL their subjects that day
      const generalRecordsByStudent = new Map<string, Map<string, any>>();
      
      // First, collect all General subject records by student and date
      teacherRecords.forEach((record: any) => {
        if (String(record.subject || "").toLowerCase() === "general") {
          const studentId = String(record.studentId || "");
          const dateStr = toLocalDateString(
            record.checkInTime || record.checkOutTime || record.scanTime || record.createdAt,
          );
          
          if (!generalRecordsByStudent.has(studentId)) {
            generalRecordsByStudent.set(studentId, new Map());
          }
          
          const studentGeneralRecords = generalRecordsByStudent.get(studentId)!;
          studentGeneralRecords.set(dateStr, record);
        }
      });

      // Then, propagate General records to all enrolled subjects for the same student
      Array.from(studentMap.values()).forEach((student) => {
        const generalRecords = generalRecordsByStudent.get(student.studentId);
        if (generalRecords) {
          generalRecords.forEach((record, dateStr) => {
            // Only override if this subject doesn't already have a specific record for this date
            if (!student.attendance[dateStr]) {
              let status = "Present"; // Default for scans
              
              if (record.attendanceType === "In" && record.checkInTime) {
                status = "Present";
              } else if (record.attendanceType === "Out" && record.checkOutTime) {
                status = "Out";
              }
              
              student.attendance[dateStr] = status;
              student.recordIds[dateStr] = String(record._id || "");
              
              console.log(
                `Propagated In/Out record: ${student.studentId} on ${dateStr} -> ${status}`,
              );
            }
          });
        }
      });

      const studentsList = Array.from(studentMap.values()).sort((a, b) =>
        a.studentId.localeCompare(b.studentId),
      );

      console.log(
        `Displaying attendance for ${studentsList.length} students (${teacherStudentIds.size} total enrolled).`,
      );

      setAllStudents(studentsList);
      setFilteredStudents(studentsList);
      setSubjects(Array.from(subjectsSet).sort());
      setGrades(Array.from(teacherGrades).sort());
      setSections(Array.from(teacherSections).sort());

      if (studentsList.length > 0) {
        const firstStudent = studentsList[0];
        setSelectedGrade(firstStudent.gradeLevel);
        setSelectedSection(firstStudent.section);
      }
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Failed to load past attendance",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Filter students based on criteria
  useEffect(() => {
    let filtered = allStudents;
    const activeDates = isCustomDateRange
      ? getCustomDateRange(customStartDate, customEndDate)
      : getDateRange(dateRangeFilter);

    if (selectedGrade) {
      filtered = filtered.filter((s) => s.gradeLevel === selectedGrade);
    }
    if (selectedSection) {
      filtered = filtered.filter((s) => s.section === selectedSection);
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.studentName.toLowerCase().includes(query) ||
          s.studentId.toLowerCase().includes(query),
      );
    }

    if (statusFilter !== "All") {
      filtered = filtered.filter((s) => {
        return activeDates.some(
          (day) => s.attendance[day.dateStr] === statusFilter,
        );
      });
    }

    setFilteredStudents(filtered);
  }, [
    allStudents,
    selectedGrade,
    selectedSection,
    searchQuery,
    statusFilter,
    dateRangeFilter,
    isCustomDateRange,
    customStartDate,
    customEndDate,
  ]);

  const handleEditClick = (
    studentId: string,
    studentName: string,
    date: string,
    currentStatus: string,
    subject: string,
    gradeLevel: string,
    section: string,
  ) => {
    // Find the exact student record by matching all identifying fields
    let student = filteredStudents.find(
      (s) =>
        s.studentId === studentId &&
        s.subject === subject &&
        s.gradeLevel === gradeLevel &&
        s.section === section,
    );
    if (!student) {
      student = allStudents.find(
        (s) =>
          s.studentId === studentId &&
          s.subject === subject &&
          s.gradeLevel === gradeLevel &&
          s.section === section,
      );
    }

    const recordId = student?.recordIds[date] || "";
    console.log("Edit click - Searching for:", {
      studentId,
      subject,
      gradeLevel,
      section,
      date,
    });
    console.log("Found student:", student);
    console.log("Student recordIds map:", student?.recordIds);
    console.log("Looking up recordId for date:", date, "-> result:", recordId);

    setEditModal({
      isOpen: true,
      studentId,
      studentName,
      date,
      currentStatus,
      recordId,
    });
  };

  const handleStatusChange = async (newStatus: string, recordId: string) => {
    setUpdateLoading(true);
    try {
      const token = getToken();

      if (!token) {
        throw new Error("Not authenticated - please login again");
      }

      if (!recordId) {
        console.error("Missing recordId in handleStatusChange", {
          editModal,
          recordId,
        });
        throw new Error(
          "Record ID not found. The attendance record could not be located.",
        );
      }

      // Call the API to update the record
      await updateAttendanceRecord({
        recordId: recordId,
        status: newStatus,
        token,
      });

      // Update local state only on success
      const studentIndex = filteredStudents.findIndex(
        (s) => s.studentId === editModal.studentId,
      );
      if (studentIndex !== -1) {
        const updatedStudents = [...filteredStudents];
        updatedStudents[studentIndex].attendance[editModal.date] = newStatus;
        setFilteredStudents(updatedStudents);
      }

      // Also update allStudents to keep them in sync
      const allStudentIndex = allStudents.findIndex(
        (s) => s.studentId === editModal.studentId,
      );
      if (allStudentIndex !== -1) {
        const updatedAllStudents = [...allStudents];
        updatedAllStudents[allStudentIndex].attendance[editModal.date] =
          newStatus;
        setAllStudents(updatedAllStudents);
      }

      setEditModal({ ...editModal, isOpen: false });
    } catch (e) {
      console.error("Failed to update status:", e);
      alert(
        `Failed to update attendance: ${e instanceof Error ? e.message : "Unknown error"}`,
      );
    } finally {
      setUpdateLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Present":
        return { bg: "#a7f3d0", text: "#059669" };
      case "Absent":
        return { bg: "#fca5a5", text: "#991b1b" };
      case "Late":
        return { bg: "#fcd34d", text: "#d97706" };
      case "Cutting":
        return { bg: "#ddd6fe", text: "#6d28d9" };
      case "Unscanned":
        return { bg: "#e5e7eb", text: "#6b7280" };
      default:
        return { bg: "#f3f4f6", text: "#6b7280" };
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "Present":
        return "✓ Present";
      case "Absent":
        return "✗ Absent";
      case "Late":
        return "⏰ Late";
      case "Cutting":
        return "⚠ Cutting";
      case "Unscanned":
        return "⊘ Unscanned";
      default:
        return status;
    }
  };

  const displayedDates = isCustomDateRange
    ? getCustomDateRange(customStartDate, customEndDate)
    : getDateRange(dateRangeFilter);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div
          className="animate-spin w-12 h-12 border-[3px] border-t-transparent rounded-full"
          style={{ borderColor: "var(--primary)" }}
        />
        <p
          className="text-sm font-semibold"
          style={{ color: "var(--muted-foreground)" }}
        >
          Loading past attendance...
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader title="Archive" icon={<CalendarIconForHeader />} />

      {error && (
        <div
          className="p-4 rounded-lg border-2"
          style={{
            borderColor: "var(--error)",
            backgroundColor: "transparent",
            color: "var(--error)",
          }}
        >
          <p className="font-semibold">Error</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Search + Actions */}
      <div
        className="rounded-lg border-2 p-4"
        style={{
          borderColor: "var(--primary)",
          backgroundColor: "transparent",
        }}
      >
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[220px] relative">
            <div
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: "var(--muted-foreground)" }}
            >
              <SearchIcon />
            </div>
            <input
              type="text"
              placeholder="Search by student name or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border"
              style={{
                borderColor: "var(--border)",
                backgroundColor: "var(--background)",
                color: "var(--foreground)",
              }}
            />
          </div>
          <button
            type="button"
            onClick={() => setShowFilters((prev) => !prev)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border font-medium transition-all hover:shadow-md"
            style={{
              borderColor: "var(--border)",
              backgroundColor: showFilters
                ? "var(--secondary)"
                : "var(--background)",
              color: "var(--foreground)",
            }}
          >
            <FilterIcon />
            Filters
          </button>
          <button
            type="button"
            onClick={() => setIsPrintModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all hover:shadow-md"
            style={{
              backgroundColor: "var(--primary)",
              color: "#ffffff",
            }}
          >
            <DownloadIcon />
            Export Excel
          </button>
        </div>

        {showFilters && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Grade Filter */}
            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: "var(--foreground)" }}
              >
                Grade
              </label>
              <select
                value={selectedGrade}
                onChange={(e) => setSelectedGrade(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border"
                style={{
                  borderColor: "var(--border)",
                  backgroundColor: "var(--background)",
                  color: "var(--foreground)",
                }}
              >
                <option value="">All Grades</option>
                {grades.map((grade) => (
                  <option key={grade} value={grade}>
                    Grade {grade}
                  </option>
                ))}
              </select>
            </div>

            {/* Section Filter */}
            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: "var(--foreground)" }}
              >
                Section
              </label>
              <select
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border"
                style={{
                  borderColor: "var(--border)",
                  backgroundColor: "var(--background)",
                  color: "var(--foreground)",
                }}
              >
                <option value="">All Sections</option>
                {sections.map((section) => (
                  <option key={section} value={section}>
                    {section}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range Filter */}
            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: "var(--foreground)" }}
              >
                Date Range
              </label>
              <select
                value={isCustomDateRange ? "custom" : String(dateRangeFilter)}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === "custom") {
                    setIsCustomDateRange(true);
                    const today = getDateString(new Date());
                    if (!customStartDate) setCustomStartDate(today);
                    if (!customEndDate) setCustomEndDate(today);
                    return;
                  }
                  setIsCustomDateRange(false);
                  setDateRangeFilter(Number(value));
                }}
                className="w-full px-3 py-2 rounded-lg border"
                style={{
                  borderColor: "var(--border)",
                  backgroundColor: "var(--background)",
                  color: "var(--foreground)",
                }}
              >
                <option value={7}>Last 7 Days</option>
                <option value={30}>Last 30 Days</option>
                <option value={999}>All History</option>
                <option value="custom">Custom Range</option>
              </select>
              {isCustomDateRange && (
                <div className="mt-3 grid grid-cols-1 gap-2">
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border"
                    style={{
                      borderColor: "var(--border)",
                      backgroundColor: "var(--background)",
                      color: "var(--foreground)",
                    }}
                  />
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border"
                    style={{
                      borderColor: "var(--border)",
                      backgroundColor: "var(--background)",
                      color: "var(--foreground)",
                    }}
                  />
                </div>
              )}
            </div>

            {/* Status Filter */}
            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: "var(--foreground)" }}
              >
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border"
                style={{
                  borderColor: "var(--border)",
                  backgroundColor: "var(--background)",
                  color: "var(--foreground)",
                }}
              >
                <option value="All">All</option>
                <option value="Present">Present</option>
                <option value="Absent">Absent</option>
                <option value="Late">Late</option>
                <option value="Cutting">Cutting</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Attendance Table */}
      {filteredStudents.length === 0 ? (
        <div
          className="text-center py-12"
          style={{ color: "var(--muted-foreground)" }}
        >
          <p className="text-base">No students found matching your criteria</p>
        </div>
      ) : (
        <div
          className="rounded-xl border-2 overflow-hidden card-theme"
          style={{ borderColor: "var(--primary)" }}
        >
          <div
            className="overflow-auto max-h-[70vh]"
            style={{
              overscrollBehavior: "contain",
              WebkitOverflowScrolling: "touch",
            }}
          >
            <table className="w-full text-sm">
              <thead>
                <tr
                  style={{
                    backgroundColor: "transparent",
                    borderBottom: "2px solid var(--border)",
                  }}
                >
                  <th
                    className="px-4 py-3 text-left font-semibold text-base"
                    style={{ color: "var(--foreground)" }}
                  >
                    ID
                  </th>
                  <th
                    className="px-4 py-3 text-left font-semibold text-base"
                    style={{ color: "var(--foreground)" }}
                  >
                    Student Name
                  </th>
                  <th
                    className="px-4 py-3 text-left font-semibold text-base"
                    style={{ color: "var(--foreground)" }}
                  >
                    Subject
                  </th>
                  {displayedDates.map((day) => (
                    <th
                      key={day.dateStr}
                      className="px-2 py-3 text-center font-semibold text-xs"
                      style={{ color: "var(--foreground)", minWidth: "110px" }}
                    >
                      <div>{day.dayName.slice(0, 3)}</div>
                      <div
                        className="text-xs"
                        style={{ color: "var(--muted-foreground)" }}
                      >
                        {day.dateStr.split("-")[2]}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student, idx) => (
                  <tr
                    key={`${student.studentId}-${idx}`}
                    style={{
                      backgroundColor: "transparent",
                      borderBottom: "1px solid var(--border)",
                    }}
                  >
                    <td
                      className="px-4 py-3 font-medium text-base"
                      style={{ color: "var(--foreground)" }}
                    >
                      {student.studentId}
                    </td>
                    <td
                      className="px-4 py-3 text-base"
                      style={{ color: "var(--foreground)" }}
                    >
                      {student.studentName}
                    </td>
                    <td
                      className="px-4 py-3 text-base font-medium"
                      style={{ color: "var(--primary)" }}
                    >
                      {student.subject}
                    </td>
                    {displayedDates.map((day) => {
                      const hasRecord = !!student.recordIds[day.dateStr];
                      const status = hasRecord
                        ? student.attendance[day.dateStr] || "Absent"
                        : "Unscanned";
                      const colors = getStatusColor(status);
                      return (
                        <td
                          key={`${student.studentId}-${day.dateStr}`}
                          className="px-2 py-3 text-center"
                        >
                          <button
                            onClick={() => {
                              if (hasRecord) {
                                handleEditClick(
                                  student.studentId,
                                  student.studentName,
                                  day.dateStr,
                                  status,
                                  student.subject,
                                  student.gradeLevel,
                                  student.section,
                                );
                              }
                            }}
                            disabled={!hasRecord}
                            className={`inline-block px-2 py-1 rounded-lg text-xs font-semibold transition-all ${
                              hasRecord
                                ? "hover:shadow-md cursor-pointer"
                                : "cursor-not-allowed opacity-60"
                            }`}
                            style={{
                              backgroundColor: colors.bg,
                              color: colors.text,
                            }}
                          >
                            {getStatusLabel(status)}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Export Excel Modal */}
      <PrintExcelModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        students={filteredStudents}
        dateRangeLabel={
          isCustomDateRange
            ? customStartDate && customEndDate
              ? `Custom: ${customStartDate} to ${customEndDate}`
              : "Custom Range"
            : dateRangeFilter === 7
              ? "Last 7 Days"
              : dateRangeFilter === 30
                ? "Last 30 Days"
                : "All History"
        }
        dateRangeFilter={
          isCustomDateRange
            ? Math.max(displayedDates.length, 1)
            : dateRangeFilter
        }
      />

      {/* Edit Modal */}
      {editModal.isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setEditModal({ ...editModal, isOpen: false })}
        >
          <div
            className="rounded-xl w-full max-w-md shadow-2xl p-6"
            onClick={(e) => e.stopPropagation()}
            style={{ backgroundColor: "var(--background)" }}
          >
            <h2
              className="text-xl font-bold mb-2"
              style={{ color: "var(--foreground)" }}
            >
              Change Attendance Status
            </h2>
            <p
              className="text-sm mb-4"
              style={{ color: "var(--muted-foreground)" }}
            >
              {editModal.studentName} on {editModal.date}
            </p>

            <div className="space-y-2 mb-6">
              {["Present", "Absent", "Late", "Cutting"].map((status) => {
                const colors = getStatusColor(status);
                const isSelected = status === editModal.currentStatus;
                return (
                  <button
                    key={status}
                    onClick={() =>
                      handleStatusChange(status, editModal.recordId)
                    }
                    disabled={updateLoading}
                    className="w-full px-4 py-2 rounded-lg text-base font-medium transition-all"
                    style={{
                      backgroundColor: colors.bg,
                      color: colors.text,
                      border: isSelected
                        ? "2px solid"
                        : "2px solid transparent",
                      borderColor: isSelected ? colors.text : "transparent",
                      opacity: updateLoading ? 0.5 : 1,
                    }}
                  >
                    {getStatusLabel(status)}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setEditModal({ ...editModal, isOpen: false })}
              className="w-full px-4 py-2 rounded-lg font-medium transition-colors"
              style={{
                backgroundColor: "var(--secondary)",
                color: "var(--foreground)",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
