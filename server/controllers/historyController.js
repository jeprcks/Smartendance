const History = require("../models/historySchema");
const Student = require("../models/studentsSchema");
const Settings = require("../models/settingsSchema");
const telegramService = require("../services/telegramService");
const pendingAttendanceRequests = new Set();
const PH_TIME_OFFSET_MS = 8 * 60 * 60 * 1000; // Asia/Manila (UTC+8, no DST)

/**
 * Send Telegram notification to parent when student scans in/out
 * @param {Object} student - Student document from database
 * @param {Object} attendanceRecord - Attendance record created
 * @param {String} attendanceType - 'In' or 'Out'
 */
async function sendScanNotificationToParent(
  student,
  attendanceRecord,
  attendanceType,
) {
  try {
    // Get parent Chat ID from student record (check multiple fields for backward compatibility)
    const chatId =
      student.parentInfo?.telegramChatId ||
      student.parentTelegramChatId ||
      student.telegramChatId;

    if (!chatId) {
      console.log(
        `No Telegram Chat ID found for student ${student.studentId} - skipping scan notification`,
      );
      return;
    }

    // Format the notification message
    const phTime = new Date(
      attendanceRecord.scanTime.getTime() + PH_TIME_OFFSET_MS,
    );
    const dateStr = phTime.toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    const timeStr = phTime.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    let message = "";

    if (attendanceType === "In") {
      // Check-In Notification
      const statusEmoji = attendanceRecord.status === "Late" ? "⏰" : "✅";
      message =
        `🟢 *Student Check-In*\n\n` +
        `👤 ${student.fullName}\n` +
        `🆔 Student ID: \`${student.studentId}\`\n\n` +
        `📅 Date: ${dateStr}\n` +
        `🕐 Time: ${timeStr}\n` +
        `${statusEmoji} Status: ${attendanceRecord.status}\n\n` +
        `🎓 ${student.gradeLevel} - Section ${student.section}\n` +
        `🌅 ${student.shift} Shift\n\n` +
        `✅ Your child has checked in to school.`;
    } else {
      // Check-Out Notification
      let durationStr = "";
      if (attendanceRecord.durationMinutes) {
        const hours = Math.floor(attendanceRecord.durationMinutes / 60);
        const minutes = attendanceRecord.durationMinutes % 60;
        durationStr = `⏱️ Time at School: ${hours}h ${minutes}m\n\n`;
      }

      message =
        `🔴 *Student Check-Out*\n\n` +
        `👤 ${student.fullName}\n` +
        `🆔 Student ID: \`${student.studentId}\`\n\n` +
        `📅 Date: ${dateStr}\n` +
        `🕐 Time: ${timeStr}\n\n` +
        durationStr +
        `🎓 ${student.gradeLevel} - Section ${student.section}\n` +
        `🌅 ${student.shift} Shift\n\n` +
        `✅ Your child has checked out from school.`;
    }

    // Send notification asynchronously (non-blocking)
    await telegramService.sendMessage(chatId, message, {
      parse_mode: "Markdown",
    });
    console.log(
      `✅ Sent ${attendanceType} notification to parent (Chat ID: ${chatId})`,
    );
  } catch (error) {
    // Log error but don't throw - notification failure shouldn't break the scanner
    console.error(`Telegram scan notification error:`, error.message);
  }
}

function getStartAndEndOfDay(baseDate = new Date()) {
  // Build day boundaries based on Philippine time, then convert back to UTC dates for DB queries.
  const phDate = new Date(baseDate.getTime() + PH_TIME_OFFSET_MS);
  const year = phDate.getUTCFullYear();
  const month = phDate.getUTCMonth();
  const day = phDate.getUTCDate();

  const start = new Date(
    Date.UTC(year, month, day, 0, 0, 0, 0) - PH_TIME_OFFSET_MS,
  );
  const end = new Date(
    Date.UTC(year, month, day, 23, 59, 59, 999) - PH_TIME_OFFSET_MS,
  );
  return { start, end };
}

function parseTimeToMinutes(timeValue, fallbackMinutes) {
  if (!timeValue || typeof timeValue !== "string" || !timeValue.includes(":")) {
    return fallbackMinutes;
  }
  const [hours, minutes] = timeValue.split(":").map((v) => Number(v));
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return fallbackMinutes;
  return hours * 60 + minutes;
}

async function resolveGeneralInStatus(studentId, shift, scanTime) {
  const { start, end } = getStartAndEndOfDay(scanTime);

  // Keep first General In decision for the same day+shift.
  const firstGeneralIn = await History.findOne({
    studentId,
    subject: "General",
    attendanceType: "In",
    shift,
    scanTime: { $gte: start, $lte: end },
  }).sort({ scanTime: 1 });

  if (
    firstGeneralIn &&
    ["Present", "Late"].includes(String(firstGeneralIn.status))
  ) {
    return firstGeneralIn.status;
  }

  // Defaults if settings are unavailable.
  const fallbackMorningStart = 7 * 60;
  const fallbackAfternoonStart = 13 * 60;
  const fallbackThreshold = 15;

  let settings;
  try {
    settings = await Settings.get();
  } catch (error) {
    settings = null;
  }

  const thresholdMinutes = Number.isFinite(
    Number(settings?.lateThresholdMinutes),
  )
    ? Number(settings.lateThresholdMinutes)
    : fallbackThreshold;

  const morningShiftTimeIn = parseTimeToMinutes(
    settings?.morningShiftCutoff,
    fallbackMorningStart,
  );
  const afternoonShiftTimeIn = parseTimeToMinutes(
    settings?.afternoonShiftCutoff,
    fallbackAfternoonStart,
  );

  // Compare scanner time against rules using Philippine local time.
  const phScanTime = new Date(scanTime.getTime() + PH_TIME_OFFSET_MS);
  const scanMinutes =
    phScanTime.getUTCHours() * 60 + phScanTime.getUTCMinutes();
  const baseTimeIn =
    shift === "Afternoon" ? afternoonShiftTimeIn : morningShiftTimeIn;
  const lateCutoff = baseTimeIn + Math.max(0, thresholdMinutes);

  return scanMinutes > lateCutoff ? "Late" : "Present";
}

/**
 * Check if daily reset should be performed
 * Returns true if today is a different day than lastDailyReset
 */
async function shouldPerformDailyReset() {
  try {
    const settings = await Settings.findOne({}).lean();
    if (!settings || !settings.lastDailyReset) {
      return true; // First time, should reset
    }

    const now = new Date();
    const phNow = new Date(now.getTime() + PH_TIME_OFFSET_MS);
    const today = phNow.getUTCDate();
    const thisMonth = phNow.getUTCMonth();
    const thisYear = phNow.getUTCFullYear();

    const lastResetPh = new Date(settings.lastDailyReset.getTime() + PH_TIME_OFFSET_MS);
    const lastResetDay = lastResetPh.getUTCDate();
    const lastResetMonth = lastResetPh.getUTCMonth();
    const lastResetYear = lastResetPh.getUTCFullYear();

    // Different day = should reset
    return (
      today !== lastResetDay ||
      thisMonth !== lastResetMonth ||
      thisYear !== lastResetYear
    );
  } catch (error) {
    console.error("Error checking if reset needed:", error);
    return false; // Don't reset on error
  }
}

/**
 * Perform daily reset: Create "Absent" records for all students
 * Called at first API call of the new day
 */
async function performDailyReset() {
  try {
    console.log("🔄 Performing daily reset - closing previous day check-ins and resetting to Unscanned...");

    const now = new Date();
    const { start, end } = getStartAndEndOfDay(now);

    // ✅ STEP 1: Close all unclosed check-ins from PREVIOUS DAYS
    const unclosedCheckIns = await History.find({
      attendanceType: "In",
      scanTime: { $lt: start }, // Before today
      $or: [{ checkOutTime: { $exists: false } }, { checkOutTime: null }],
    });

    let closedCount = 0;
    for (const record of unclosedCheckIns) {
      // Calculate approximate end-of-day for that day (shift end + 2 hours buffer)
      const recordDate = new Date(record.scanTime);
      const { end: dayEnd } = getStartAndEndOfDay(recordDate);
      const autoCheckOutTime = new Date(dayEnd.getTime() - 2 * 60 * 60 * 1000); // 2 hours before day end

      const duration = Math.max(
        0,
        Math.round(
          (autoCheckOutTime.getTime() - new Date(record.checkInTime).getTime()) / 60000,
        ),
      );

      await History.updateOne(
        { _id: record._id },
        {
          $set: {
            checkOutTime: autoCheckOutTime,
            durationMinutes: duration,
            notes: `${record.notes || "Auto-checkout"} - Auto-closed during daily reset`,
          },
        },
      );
      closedCount++;
      console.log(`  ✓ Auto-closed check-in for student ${record.studentId} from ${record.scanTime}`);
    }

    // ✅ STEP 2: Create "Unscanned" records for all active students for TODAY
    const allStudents = await Student.find({ isActive: true }).lean();

    let unscannedCount = 0;
    for (const student of allStudents) {
      // Check if student already has any record today
      const existingToday = await History.findOne({
        studentId: student.studentId,
        scanTime: { $gte: start, $lte: end },
      });

      // Only create Unscanned record if no record exists for today
      if (!existingToday) {
        const unscannedRecord = new History({
          studentId: student.studentId,
          studentName: student.fullName,
          subject: "General",
          attendanceType: "In",
          status: "Unscanned",
          checkInTime: now,
          scanTime: now,
          gradeLevel: student.gradeLevel,
          section: student.section,
          shift: student.shift,
          notes: "Auto-generated daily reset - student has not scanned",
        });

        await unscannedRecord.save();
        unscannedCount++;
      }
    }

    // Update lastDailyReset timestamp
    await Settings.updateOne({}, { $set: { lastDailyReset: now } }, { upsert: true });

    console.log(`✅ Daily reset completed: ${closedCount} previous check-ins closed, ${unscannedCount} students marked Unscanned`);
    return { success: true, closedCount, unscannedCount };
  } catch (error) {
    console.error("❌ Error during daily reset:", error);
    return { success: false, error: error.message };
  }
}

const createAttendanceRecord = async (req, res) => {
  let requestKey;
  try {
    const {
      studentId,
      studentName,
      subject = "General",
      attendanceType = "In",
      qrCodeData,
      location,
      deviceInfo,
      notes,
    } = req.body;

    if (!studentId) {
      return res
        .status(400)
        .json({ success: false, error: "studentId is required" });
    }
    if (!["In", "Out"].includes(attendanceType)) {
      return res
        .status(400)
        .json({
          success: false,
          error: "Invalid attendanceType. Use 'In' or 'Out'.",
        });
    }

    // ✅ DAILY RESET: Check if it's a new day and reset all students to Absent
    const needsReset = await shouldPerformDailyReset();
    if (needsReset) {
      const resetResult = await performDailyReset();
      if (resetResult.success) {
        console.log(`Daily reset triggered at ${new Date().toISOString()}`);
      }
    }

    const now = new Date();
    const phNow = new Date(now.getTime() + PH_TIME_OFFSET_MS);
    const dayKey = `${phNow.getUTCFullYear()}-${phNow.getUTCMonth() + 1}-${phNow.getUTCDate()}`;
    requestKey = `${studentId}:${attendanceType}:${dayKey}`;
    if (pendingAttendanceRequests.has(requestKey)) {
      return res.status(409).json({
        success: false,
        code: "DUPLICATE_SCAN",
        error: "Duplicate scan detected. Please wait a moment and try again.",
      });
    }
    pendingAttendanceRequests.add(requestKey);

    const student = await Student.findOne({ studentId });
    if (!student) {
      return res
        .status(404)
        .json({ success: false, error: "Student not found" });
    }

    const { start, end } = getStartAndEndOfDay(now);
    
    // Check for open check-in ONLY TODAY
    // Previous day's unclosed check-in is kept as a record (misbehavior tracking)
    const openCheckIn = await History.findOne({
      studentId,
      attendanceType: "In",
      scanTime: { $gte: start, $lte: end }, // Only TODAY
      $or: [{ checkOutTime: { $exists: false } }, { checkOutTime: null }],
    }).sort({ scanTime: -1 });

    // Check if student has unclosed check-in from previous days (for reporting)
    if (attendanceType === "In") {
      const previousDayUnclosedCheckIn = await History.findOne({
        studentId,
        attendanceType: "In",
        scanTime: { $lt: start }, // Any check-in BEFORE today
        $or: [{ checkOutTime: { $exists: false } }, { checkOutTime: null }],
      }).sort({ scanTime: -1 });

      if (previousDayUnclosedCheckIn) {
        console.log(
          `⚠️ MISBEHAVIOR: Student ${studentId} forgot to checkout on ${previousDayUnclosedCheckIn.scanTime}. Record kept for tracking.`,
        );
        // Just log it - don't auto-close. Let it stay as misbehavior record.
      }
    }

    if (attendanceType === "In" && openCheckIn) {
      return res.status(400).json({
        success: false,
        code: "ALREADY_CHECKED_IN",
        error:
          "You already checked in. Please checkout first before checking in again.",
      });
    }

    if (attendanceType === "Out" && !openCheckIn) {
      return res.status(400).json({
        success: false,
        code: "NO_OPEN_CHECKIN",
        error: "No check-in found. Please check in first before checking out.",
      });
    }

    const normalizedSubject =
      typeof subject === "string" ? subject.trim() : "General";
    const isGeneralSubject = normalizedSubject.toLowerCase() === "general";
    let inStatus = "Present";
    if (attendanceType === "In" && isGeneralSubject) {
      inStatus = await resolveGeneralInStatus(studentId, student.shift, now);
    }

    const record = new History({
      studentId,
      studentName: studentName || student.fullName,
      subject: normalizedSubject || "General",
      attendanceType,
      status: attendanceType === "Out" ? "Out" : inStatus,
      checkInTime: attendanceType === "In" ? now : undefined,
      checkOutTime: attendanceType === "Out" ? now : undefined,
      scanTime: now,
      gradeLevel: student.gradeLevel,
      section: student.section,
      shift: student.shift,
      qrCodeData,
      location,
      deviceInfo,
      notes,
    });

    if (attendanceType === "Out") {
      record.linkedRecordId = String(openCheckIn._id);
      record.durationMinutes = Math.max(
        0,
        Math.round(
          (now.getTime() - new Date(openCheckIn.checkInTime).getTime()) / 60000,
        ),
      );
    }

    await record.save();

    if (attendanceType === "Out" && openCheckIn) {
      await History.updateOne(
        { _id: openCheckIn._id },
        {
          $set: {
            checkOutTime: now,
            linkedRecordId: String(record._id),
            durationMinutes: record.durationMinutes,
          },
        },
      );
    }

    // Send Telegram notification to parent (non-blocking)
    sendScanNotificationToParent(student, record, attendanceType).catch((err) =>
      console.error("Error sending scan notification:", err),
    );

    return res.status(201).json({
      success: true,
      message:
        attendanceType === "In"
          ? "Check-in successful"
          : "Check-out successful",
      record,
    });
  } catch (error) {
    console.error("Error creating attendance record:", error);
    if (error?.code === 11000) {
      return res.status(400).json({
        success: false,
        code: "DUPLICATE_SCAN",
        error: "Duplicate scan detected. Please try again.",
      });
    }
    return res
      .status(400)
      .json({
        success: false,
        error: error.message || "Failed to create record",
      });
  } finally {
    if (requestKey) {
      pendingAttendanceRequests.delete(requestKey);
    }
  }
};

// Get all attendance records with filtering and pagination
const getAllAttendanceRecords = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      studentId,
      subject,
      status,
      startDate,
      endDate,
      gradeLevel,
      section,
      shift,
      search,
      attendanceType,
    } = req.query;

    const filter = {};
    if (studentId) filter.studentId = studentId;
    if (subject) filter.subject = subject;
    if (status) filter.status = status;
    if (gradeLevel) filter.gradeLevel = gradeLevel;
    if (section) filter.section = section;
    if (shift) filter.shift = shift;
    if (attendanceType && attendanceType !== "All")
      filter.attendanceType = attendanceType;

    if (startDate || endDate) {
      filter.scanTime = {};
      if (startDate) filter.scanTime.$gte = new Date(startDate);
      if (endDate) filter.scanTime.$lte = new Date(endDate);
    }

    if (search) {
      filter.$or = [
        { studentName: { $regex: search, $options: "i" } },
        { studentId: { $regex: search, $options: "i" } },
        { subject: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    // Use fast estimation instead of full count (much faster on large collections)
    const totalRecords = await History.estimatedDocumentCount();
    const records = await History.find(filter)
      .sort({ scanTime: -1 })
      .skip(skip)
      .limit(Number(limit));

    // Keep response shape compatible with adminweb.
    const stats = {
      present: records.filter(
        (r) => String(r.status).toLowerCase() === "present",
      ).length,
      late: records.filter((r) => String(r.status).toLowerCase() === "late")
        .length,
      absent: 0,
      cutting: 0,
      total: totalRecords,
    };

    return res.status(200).json({
      success: true,
      records,
      stats,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(totalRecords / Number(limit)),
        totalRecords,
        hasNext: skip + records.length < totalRecords,
        hasPrev: Number(page) > 1,
      },
    });
  } catch (error) {
    console.error("Error getting attendance records:", error);
    return res.status(400).json({ success: false, error: error.message });
  }
};

// Get single attendance record
const getAttendanceRecord = async (req, res) => {
  try {
    const record = await History.findById(req.params.id);
    if (!record)
      return res
        .status(404)
        .json({ success: false, error: "Attendance record not found" });
    return res.status(200).json({ success: true, record });
  } catch (error) {
    return res.status(400).json({ success: false, error: error.message });
  }
};

// Update attendance record
const updateAttendanceRecord = async (req, res) => {
  try {
    const updatedRecord = await History.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      },
    );
    if (!updatedRecord)
      return res
        .status(404)
        .json({ success: false, error: "Attendance record not found" });
    return res
      .status(200)
      .json({
        success: true,
        message: "Attendance record updated",
        record: updatedRecord,
      });
  } catch (error) {
    return res.status(400).json({ success: false, error: error.message });
  }
};

// Delete attendance record
const deleteAttendanceRecord = async (req, res) => {
  try {
    const record = await History.findByIdAndDelete(req.params.id);
    if (!record)
      return res
        .status(404)
        .json({ success: false, error: "Attendance record not found" });
    return res
      .status(200)
      .json({ success: true, message: "Attendance record deleted" });
  } catch (error) {
    return res.status(400).json({ success: false, error: error.message });
  }
};

// Get attendance statistics
const getAttendanceStats = async (req, res) => {
  try {
    const match = { attendanceType: "In" };
    const stats = await History.aggregate([
      { $match: match },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);
    const result = { present: 0, absent: 0, late: 0, cutting: 0, total: 0 };
    stats.forEach((s) => {
      const key = String(s._id || "").toLowerCase();
      if (Object.prototype.hasOwnProperty.call(result, key)) {
        result[key] = s.count;
      }
      result.total += s.count;
    });
    return res.status(200).json({ success: true, stats: result });
  } catch (error) {
    return res.status(400).json({ success: false, error: error.message });
  }
};

// Get student attendance history
const getStudentAttendanceHistory = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { limit = 50 } = req.query;
    const student = await Student.findOne({ studentId });
    if (!student)
      return res
        .status(404)
        .json({ success: false, error: "Student not found" });
    const records = await History.find({ studentId })
      .sort({ scanTime: -1 })
      .limit(Number(limit));
    const stats = {
      present: records.filter(
        (r) => String(r.status).toLowerCase() === "present",
      ).length,
      late: records.filter((r) => String(r.status).toLowerCase() === "late")
        .length,
      absent: 0,
      cutting: 0,
      total: records.filter(
        (r) => String(r.attendanceType).toLowerCase() === "in",
      ).length,
    };
    return res.status(200).json({
      success: true,
      student: {
        id: student.studentId,
        name: student.fullName,
        gradeLevel: student.gradeLevel,
        section: student.section,
        shift: student.shift,
        gender: student.gender,
        profilePicture: student.photo,
      },
      stats,
      records,
    });
  } catch (error) {
    return res.status(400).json({ success: false, error: error.message });
  }
};

// Get attendance records for history page (with student details)
const getHistoryPageData = async (req, res) =>
  getAllAttendanceRecords(req, res);

// Get daily attendance summary for all students (with check-in and check-out)
const getDailyAttendanceSummary = async (req, res) => {
  try {
    const baseDate = req.query.date ? new Date(req.query.date) : new Date();
    const { start, end } = getStartAndEndOfDay(baseDate);

    const inRecords = await History.find({
      attendanceType: "In",
      scanTime: { $gte: start, $lte: end },
    }).sort({ scanTime: 1 });

    const summary = await Promise.all(
      inRecords.map(async (inRec) => {
        const outRec = await History.findOne({
          attendanceType: "Out",
          linkedRecordId: String(inRec._id),
        });
        return {
          studentId: inRec.studentId,
          studentName: inRec.studentName,
          subject: inRec.subject,
          checkInTime: inRec.scanTime,
          checkOutTime: outRec ? outRec.scanTime : null,
          status: inRec.status,
          hasCheckedOut: !!outRec,
        };
      }),
    );

    return res
      .status(200)
      .json({ success: true, summary, total: summary.length });
  } catch (error) {
    return res.status(400).json({ success: false, error: error.message });
  }
};

// Export attendance data
const exportAttendanceData = async (req, res) => {
  try {
    const records = await History.find({}).sort({ scanTime: -1 }).lean();
    return res
      .status(200)
      .json({ success: true, records, totalRecords: records.length });
  } catch (error) {
    return res.status(400).json({ success: false, error: error.message });
  }
};

module.exports = {
  createAttendanceRecord,
  getAllAttendanceRecords,
  getAttendanceRecord,
  updateAttendanceRecord,
  deleteAttendanceRecord,
  getAttendanceStats,
  getStudentAttendanceHistory,
  getHistoryPageData,
  getDailyAttendanceSummary,
  exportAttendanceData,
};
