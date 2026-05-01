"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getToken, getTeacherData } from "@/lib/auth";
import {
  getTeacherSchedule,
  getClassStudents,
  getScheduleAttendanceRecords,
  updateStudentAttendance,
} from "../../../../lib/api";
import AttendanceTable from "./AttendanceTable";
import BulkAttendanceActionBar, {
  applyBulkAttendanceStatus,
} from "./components/page";

export const STATUS_OPTIONS = ["Present", "Absent", "Late", "Cutting"];

function getLocalDateYmd(baseDate = new Date()): string {
  const year = baseDate.getFullYear();
  const month = String(baseDate.getMonth() + 1).padStart(2, "0");
  const day = String(baseDate.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Icon Components
const ArrowLeftIcon = () => (
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
      d="M10 19l-7-7m0 0l7-7m-7 7h18"
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

const CalendarIcon = () => (
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
      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
    />
  </svg>
);

const ClockIcon = () => (
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
      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const BookIcon = () => (
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
      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
    />
  </svg>
);

const UsersIcon = () => (
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
      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
    />
  </svg>
);

export default function ScheduleDetailsPage({
  params,
}: {
  params: Promise<{ scheduleId: string }>;
}) {
  const { scheduleId } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [schedule, setSchedule] = useState<Record<string, unknown> | null>(
    null,
  );
  const [students, setStudents] = useState<Record<string, unknown>[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<
    Record<string, Record<string, unknown>>
  >({});
  const [search, setSearch] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkApplying, setIsBulkApplying] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const load = async () => {
    const token = getToken();
    const data = getTeacherData();
    if (!token || !data.teacherName) {
      setError("Not authenticated");
      setLoading(false);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const schedules = await getTeacherSchedule({
        token,
        teacherId: data.teacherId ?? undefined,
        teacherName: data.teacherName,
      });
      const s = schedules.find(
        (x: Record<string, unknown>) =>
          String(x._id ?? x.id ?? "") === scheduleId,
      );
      if (!s) {
        setError("Schedule not found");
        setLoading(false);
        return;
      }
      setSchedule(s);

      const gradeLevel = String(s.gradeLevel ?? "");
      const section = String(s.section ?? "");
      const subject = String(s.subject ?? "");
      const shift = String(s.shift ?? "");

      const [studentList, attendance] = await Promise.all([
        getClassStudents({
          gradeLevel,
          section,
          teacherName: data.teacherName,
          token,
          subject: subject || undefined,
          shift: shift || undefined,
        }),
        getScheduleAttendanceRecords({
          token,
          scheduleId,
          // Use local date to avoid UTC day shift causing false "NOT SCANNED".
          date: getLocalDateYmd(),
        }),
      ]);

      setStudents(studentList);
      const map: Record<string, Record<string, unknown>> = {};
      for (const r of attendance) {
        const sid = String(r.studentId ?? r.student ?? "");
        if (sid) map[sid] = r;
      }
      setAttendanceMap(map);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();

    // Auto-refresh attendance every 10 seconds to show newly scanned QR codes
    const intervalId = setInterval(() => {
      // Only refresh attendance map, not the entire page
      refreshAttendance();
    }, 10000);

    return () => clearInterval(intervalId);
  }, [scheduleId]);

  // Refresh only attendance data without reloading students/schedule
  const refreshAttendance = async (showIndicator = false) => {
    const token = getToken();
    if (!token || !schedule) return;

    if (showIndicator) setIsRefreshing(true);

    try {
      const attendance = await getScheduleAttendanceRecords({
        token,
        scheduleId,
        date: getLocalDateYmd(),
      });

      const map: Record<string, Record<string, unknown>> = {};
      for (const r of attendance) {
        const sid = String(r.studentId ?? r.student ?? "");
        if (sid) map[sid] = r;
      }
      setAttendanceMap(map);
    } catch (e) {
      // Silently fail - don't disrupt the user experience
      console.error("Failed to refresh attendance:", e);
    } finally {
      if (showIndicator) {
        setTimeout(() => setIsRefreshing(false), 500);
      }
    }
  };

  const handleStatusChange = async (studentId: string, status: string) => {
    const token = getToken();
    const data = getTeacherData();
    if (!token || !schedule) return;
    setUpdating(studentId);
    try {
      await updateStudentAttendance({
        token,
        studentId,
        scheduleId,
        status,
        subject: String(schedule.subject ?? ""),
        gradeLevel: String(schedule.gradeLevel ?? ""),
        section: String(schedule.section ?? ""),
      });
      setAttendanceMap((prev) => ({
        ...prev,
        [studentId]: { ...prev[studentId], status, studentId },
      }));
    } catch (e) {
      console.error(e);
    } finally {
      setUpdating(null);
    }
  };

  const filtered = search
    ? students.filter((st) => {
        const name = String(
          st.studentName ?? st.name ?? st.fullName ?? "",
        ).toLowerCase();
        const id = String(st.studentId ?? st.id ?? "").toLowerCase();
        const q = search.toLowerCase();
        return name.includes(q) || id.includes(q);
      })
    : students;

  const isRowBulkSelectable = (status: string) => {
    const s = status.toLowerCase();
    if (s === "not scanned") return false;
    return s !== "" && s !== "-" && s !== "out";
  };

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
          Loading schedule details...
        </p>
      </div>
    );
  }

  if (error || !schedule) {
    return (
      <div className="space-y-6 animate-fade-in-up">
        <Link
          href="/schedule"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border transition-all duration-200 hover:shadow-md hover:scale-[1.02]"
          style={{
            borderColor: "var(--border)",
            background:
              "linear-gradient(135deg, var(--muted) 0%, color-mix(in srgb, var(--muted) 90%, var(--primary) 10%) 100%)",
          }}
        >
          <ArrowLeftIcon />
          <span
            className="font-semibold"
            style={{ color: "var(--primary-dark)" }}
          >
            Back to Schedule
          </span>
        </Link>
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-6">
          <div
            className="p-6 rounded-xl border bg-red-50"
            style={{ borderColor: "var(--error)" }}
          >
            <p
              className="text-base font-semibold"
              style={{ color: "var(--error)" }}
            >
              {error ?? "Schedule not found"}
            </p>
          </div>
          <button
            type="button"
            onClick={load}
            className="px-6 py-3 rounded-xl text-white transition-all duration-200 hover:scale-105 hover:shadow-lg font-semibold btn-primary"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const rows = filtered.map((st) => {
    const sid = String(st.studentId ?? st.id ?? "");
    const rec = attendanceMap[sid];
    const hasScanned = !!rec;
    const rawStatus = String(rec?.status ?? "");
    const isGeneralInRecord =
      String(rec?.subject ?? "").toLowerCase() === "general" &&
      String(rec?.attendanceType ?? "").toLowerCase() === "in";
    // Subject attendance view: QR-scanned General "Late" should still show Present.
    const normalizedStatus =
      isGeneralInRecord && rawStatus.toLowerCase() === "late"
        ? "Present"
        : rawStatus;
    const status = hasScanned
      ? String(normalizedStatus ?? "").toLowerCase()
        ? String(normalizedStatus ?? "")
        : "-"
      : "NOT SCANNED";
    const scanTime = rec?.scanTime
      ? new Date(String(rec.scanTime)).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "-";

    return {
      id: sid,
      studentName: String(
        st.studentName ?? st.name ?? st.fullName ?? "Unknown",
      ),
      studentId: sid,
      gender: String(st.gender ?? ""),
      status,
      scanTime,
      recordId:
        rec?._id != null
          ? String(rec._id)
          : rec?.id != null
            ? String(rec.id)
            : undefined,
    };
  });

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const toggleRowSelection = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const toggleAllRows = () => {
    const selectableIds = rows
      .filter((row) => isRowBulkSelectable(row.status))
      .map((row) => row.id);
    const isAllSelected =
      selectableIds.length > 0 &&
      selectableIds.every((id) => selectedIds.includes(id));

    setSelectedIds((prev) => {
      if (isAllSelected) {
        return prev.filter((id) => !selectableIds.includes(id));
      }
      const merged = new Set([...prev, ...selectableIds]);
      return Array.from(merged);
    });
  };

  const clearSelection = () => setSelectedIds([]);

  const handleApplyBulkStatus = async (status: string) => {
    const token = getToken();
    if (!token || !schedule || selectedIds.length === 0) return;

    setIsBulkApplying(true);
    try {
      await applyBulkAttendanceStatus({
        token,
        scheduleId,
        selectedStudentIds: selectedIds,
        status,
        subject: String(schedule.subject ?? ""),
        gradeLevel: String(schedule.gradeLevel ?? ""),
        section: String(schedule.section ?? ""),
        onEachUpdated: (studentId, nextStatus) => {
          setAttendanceMap((prev) => ({
            ...prev,
            [studentId]: { ...prev[studentId], status: nextStatus, studentId },
          }));
        },
      });
      clearSelection();
    } catch (e) {
      console.error(e);
    } finally {
      setIsBulkApplying(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center gap-4 animate-fade-in-up animate-delay-1">
        <Link
          href="/schedule"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border transition-all duration-200 hover:shadow-md hover:scale-[1.02]"
          style={{
            borderColor: "var(--border)",
            background:
              "linear-gradient(135deg, var(--muted) 0%, color-mix(in srgb, var(--muted) 90%, var(--primary) 10%) 100%)",
          }}
        >
          <ArrowLeftIcon />
          <span
            className="font-semibold"
            style={{ color: "var(--primary-dark)" }}
          >
            Back to Schedule
          </span>
        </Link>
      </div>

      <div
        className="p-6 rounded-2xl border shadow-xl animate-fade-in-up animate-delay-2"
        style={{
          background:
            "linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%)",
          borderColor: "rgba(255,255,255,0.2)",
          boxShadow: "0 8px 24px rgba(46, 125, 50, 0.3)",
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-xl bg-white/20 backdrop-blur-sm">
                <BookIcon />
              </div>
              <h1 className="text-3xl font-bold text-white">
                {String(schedule.subject ?? "N/A")}
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-white/90">
              <div className="flex items-center gap-2">
                <div className="px-3 py-1 rounded-lg bg-white/20 backdrop-blur-sm font-semibold">
                  {String(schedule.gradeLevel ?? "")}-
                  {String(schedule.section ?? "")}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <ClockIcon />
                <span className="font-medium">
                  {String(schedule.timeSlot ?? "")}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <CalendarIcon />
                <span className="font-medium">
                  {String(schedule.shift ?? "")}
                </span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-white/20">
              <p className="text-sm font-medium text-white/80 flex items-center gap-2">
                <CalendarIcon />
                <span>Today: {today}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="animate-fade-in-up animate-delay-3">
        <div className="flex items-center gap-3 max-w-3xl">
          <div className="relative flex-1">
            <div
              className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: "var(--muted-foreground)" }}
            >
              <SearchIcon />
            </div>
            <input
              type="search"
              placeholder="Search by name or student ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl border input-theme transition-all duration-200 hover:shadow-md focus:shadow-lg"
            />
          </div>
          <button
            type="button"
            onClick={() => refreshAttendance(true)}
            disabled={isRefreshing}
            className="px-4 py-3 rounded-xl border transition-all duration-200 hover:shadow-md hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-semibold"
            style={{
              borderColor: "var(--border)",
              background: "var(--card)",
              color: "var(--primary)",
            }}
            title="Refresh attendance data"
          >
            <svg
              className={`w-5 h-5 ${isRefreshing ? "animate-spin" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {(() => {
        const stats = {
          total: rows.length,
          present: rows.filter((r) => r.status.toLowerCase() === "present")
            .length,
          absent: rows.filter((r) => r.status.toLowerCase() === "absent")
            .length,
          late: rows.filter((r) => r.status.toLowerCase() === "late").length,
        };

        return (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in-up animate-delay-4">
              <div
                className="p-4 rounded-xl border-l-4 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 dashboard-card"
                style={{
                  background: "rgba(67, 160, 71, 0.22)",
                  borderLeftColor: "var(--success)",
                  borderColor: "var(--border)",
                }}
              >
                <p
                  className="text-xs font-bold uppercase tracking-wider mb-2"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  Present
                </p>
                <p
                  className="text-2xl font-bold"
                  style={{ color: "var(--success)" }}
                >
                  {stats.present}
                </p>
              </div>
              <div
                className="p-4 rounded-xl border-l-4 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 dashboard-card"
                style={{
                  background: "rgba(216, 67, 21, 0.22)",
                  borderLeftColor: "var(--destructive)",
                  borderColor: "var(--border)",
                }}
              >
                <p
                  className="text-xs font-bold uppercase tracking-wider mb-2"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  Absent
                </p>
                <p
                  className="text-2xl font-bold"
                  style={{ color: "var(--destructive)" }}
                >
                  {stats.absent}
                </p>
              </div>
              <div
                className="p-4 rounded-xl border-l-4 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 dashboard-card"
                style={{
                  background: "rgba(255, 193, 7, 0.28)",
                  borderLeftColor: "var(--accent)",
                  borderColor: "var(--border)",
                }}
              >
                <p
                  className="text-xs font-bold uppercase tracking-wider mb-2"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  Late
                </p>
                <p
                  className="text-2xl font-bold"
                  style={{ color: "var(--error)" }}
                >
                  {stats.late}
                </p>
              </div>
              <div
                className="p-4 rounded-xl border-l-4 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 dashboard-card"
                style={{
                  background: "var(--secondary)",
                  borderLeftColor: "var(--primary)",
                  borderColor: "var(--border)",
                }}
              >
                <p
                  className="text-xs font-bold uppercase tracking-wider mb-2"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  Total
                </p>
                <p
                  className="text-2xl font-bold"
                  style={{ color: "var(--primary-dark)" }}
                >
                  {stats.total}
                </p>
              </div>
            </div>

            <div
              className="rounded-2xl border overflow-hidden card-theme shadow-lg animate-fade-in-up animate-delay-5"
              style={{ borderColor: "var(--border)" }}
            >
              <div
                className="p-4 border-b flex items-center gap-3"
                style={{
                  borderColor: "var(--border)",
                  background:
                    "linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%)",
                }}
              >
                <div className="p-2 rounded-lg bg-white/20 backdrop-blur-sm">
                  <UsersIcon />
                </div>
                <h2 className="text-xl font-bold text-white">
                  Attendance List
                </h2>
                <span className="ml-auto text-sm font-semibold text-white/90">
                  {filtered.length}{" "}
                  {filtered.length === 1 ? "student" : "students"}
                </span>
              </div>
              <div
                className="p-4 border-b"
                style={{ borderColor: "var(--border)" }}
              >
                <BulkAttendanceActionBar
                  selectedCount={selectedIds.length}
                  applying={isBulkApplying}
                  onApplyBulkStatus={handleApplyBulkStatus}
                  onClearSelection={clearSelection}
                />
              </div>
              <AttendanceTable
                rows={rows}
                statusOptions={STATUS_OPTIONS}
                onStatusChange={handleStatusChange}
                updatingId={updating}
                mode="schedule"
                isActionDisabled={(row) => {
                  const s = (row.status ?? "").toLowerCase();
                  if (s === "not scanned") return true;
                  return s === "" || s === "-" || s === "out";
                }}
                selectedRowIds={selectedIds}
                onToggleRowSelection={toggleRowSelection}
                onToggleAllRows={toggleAllRows}
                isRowSelectable={(row) => isRowBulkSelectable(row.status ?? "")}
              />
            </div>
          </>
        );
      })()}
    </div>
  );
}
