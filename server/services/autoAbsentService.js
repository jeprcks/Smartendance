const Student = require("../models/studentsSchema");
const History = require("../models/historySchema");
const Settings = require("../models/settingsSchema");

let intervalHandle = null;

function parseTimeToMinutes(timeValue, fallbackMinutes) {
  if (!timeValue || typeof timeValue !== "string" || !timeValue.includes(":")) {
    return fallbackMinutes;
  }
  const [h, m] = timeValue.split(":").map((v) => Number(v));
  if (Number.isNaN(h) || Number.isNaN(m)) return fallbackMinutes;
  return h * 60 + m;
}

function buildCutoffDate(baseDate, cutoffMinutes) {
  const cutoff = new Date(baseDate);
  cutoff.setHours(Math.floor(cutoffMinutes / 60), cutoffMinutes % 60, 0, 0);
  return cutoff;
}

async function markAbsentForShift({
  shift,
  now,
  cutoffMinutes,
  startOfDay,
  endOfDay,
}) {
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  if (nowMinutes < cutoffMinutes) return 0;

  const activeStudents = await Student.find({
    shift,
    $or: [{ status: "Active" }, { status: { $exists: false } }],
  }).select("studentId fullName gradeLevel section shift");

  if (!activeStudents.length) return 0;

  const studentIds = activeStudents.map((s) => s.studentId);

  // If a student has ANY "In" record today, they are considered scanned.
  const scannedTodayIds = await History.distinct("studentId", {
    attendanceType: "In",
    studentId: { $in: studentIds },
    scanTime: { $gte: startOfDay, $lte: endOfDay },
  });
  const scannedSet = new Set(scannedTodayIds);

  const cutoffDate = buildCutoffDate(now, cutoffMinutes);
  const absentDocs = activeStudents
    .filter((s) => !scannedSet.has(s.studentId))
    .map((s) => ({
      studentId: s.studentId,
      studentName: s.fullName,
      subject: "General",
      attendanceType: "In",
      checkInTime: cutoffDate,
      scanTime: cutoffDate,
      status: "Absent",
      gradeLevel: s.gradeLevel,
      section: s.section,
      shift: s.shift,
      notes: "Auto-marked absent after cutoff due to no QR scan.",
    }));

  if (!absentDocs.length) return 0;

  await History.insertMany(absentDocs, { ordered: false });
  return absentDocs.length;
}

async function runAutoAbsentPass() {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun, 6=Sat
  // Only run auto-absent on weekdays (Mon-Fri).
  if (dayOfWeek === 0 || dayOfWeek === 6) return;

  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  let settings = null;
  try {
    settings = await Settings.get();
  } catch (error) {
    console.warn("[AutoAbsent] Failed to load settings, using defaults.");
  }

  const morningCutoffMinutes = parseTimeToMinutes(settings?.morningShiftCutoff, 12 * 60);
  const afternoonCutoffMinutes = parseTimeToMinutes(settings?.afternoonShiftCutoff, 17 * 60);

  try {
    const morningMarked = await markAbsentForShift({
      shift: "Morning",
      now,
      cutoffMinutes: morningCutoffMinutes,
      startOfDay,
      endOfDay,
    });
    const afternoonMarked = await markAbsentForShift({
      shift: "Afternoon",
      now,
      cutoffMinutes: afternoonCutoffMinutes,
      startOfDay,
      endOfDay,
    });

    const totalMarked = morningMarked + afternoonMarked;
    if (totalMarked > 0) {
      console.log(`[AutoAbsent] Marked ${totalMarked} student(s) absent for ${now.toISOString().slice(0, 10)}.`);
    }
  } catch (error) {
    console.error("[AutoAbsent] Error while auto-marking absent:", error);
  }
}

function startAutoAbsentJob() {
  if (intervalHandle) return;

  // Run once shortly after startup, then every 5 minutes.
  runAutoAbsentPass().catch((error) => {
    console.error("[AutoAbsent] Initial run failed:", error);
  });

  intervalHandle = setInterval(() => {
    runAutoAbsentPass().catch((error) => {
      console.error("[AutoAbsent] Scheduled run failed:", error);
    });
  }, 5 * 60 * 1000);

  console.log("[AutoAbsent] Job started (runs every 5 minutes).");
}

module.exports = {
  startAutoAbsentJob,
  runAutoAbsentPass,
};

