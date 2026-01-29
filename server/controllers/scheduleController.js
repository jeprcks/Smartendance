const Schedule = require('../models/scheduleSchema');

const ALLOWED_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

function normalizeDays({ day, days }) {
  // Prefer explicit days array; fallback to legacy day.
  const raw = Array.isArray(days) ? days : day ? [day] : [];
  // De-dupe + keep only allowed.
  const cleaned = Array.from(new Set(raw)).filter((d) => ALLOWED_DAYS.includes(d));
  return cleaned;
}

exports.createSchedule = async (req, res) => {
  try {
    const { gradeLevel, section, subject, teacher, timeSlot, room, day, days, shift } = req.body;
    const normalizedDays = normalizeDays({ day, days });
    const primaryDay = normalizedDays[0];

    // Validate required fields
    if (!gradeLevel || !section || !subject || !teacher || !timeSlot || !room || normalizedDays.length === 0 || !shift) {
      return res.status(400).json({ 
        error: 'All fields are required' 
      });
    }

    // Check for duplicate schedule across ANY selected day, matching subject and shift
    const existingSchedule = await Schedule.findOne({
      gradeLevel,
      section,
      subject,
      shift,
      timeSlot,
      isActive: true,
      $or: [
        // legacy single-day records
        { day: { $in: normalizedDays } },
        // multi-day records
        { days: { $elemMatch: { $in: normalizedDays } } }
      ]
    });

    if (existingSchedule) {
      return res.status(409).json({ 
        error: 'A schedule already exists for this grade, section, subject, shift, selected day(s), and time slot' 
      });
    }

    const newSchedule = new Schedule({
      gradeLevel,
      section,
      subject,
      teacher,
      timeSlot,
      room,
      day: primaryDay, // keep legacy field populated
      days: normalizedDays,
      shift,
      isActive: true
    });

    await newSchedule.save();

    res.status(201).json({
      success: true,
      message: 'Schedule created successfully',
      schedule: newSchedule
    });
  } catch (error) {
    console.error('Error creating schedule:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to create schedule' 
    });
  }
};

exports.getAllSchedules = async (req, res) => {
  try {
    const { gradeLevel, section, day, teacher, isActive } = req.query;
    
    const filter = {};
    if (gradeLevel) filter.gradeLevel = gradeLevel;
    if (section) filter.section = section;
    if (day) {
      // Support filtering legacy + multi-day schedules by a single day query param
      filter.$or = [
        { day: day },
        { days: day }
      ];
    }
    if (teacher) filter.teacher = teacher; // Filter by teacher name
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const schedules = await Schedule.find(filter).sort({ day: 1, timeSlot: 1 });

    res.status(200).json({
      success: true,
      count: schedules.length,
      schedules
    });
  } catch (error) {
    console.error('Error fetching schedules:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to fetch schedules' 
    });
  }
};

exports.getScheduleById = async (req, res) => {
  try {
    const { id } = req.params;

    const schedule = await Schedule.findById(id);

    if (!schedule) {
      return res.status(404).json({ 
        error: 'Schedule not found' 
      });
    }

    res.status(200).json({
      success: true,
      schedule
    });
  } catch (error) {
    console.error('Error fetching schedule:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to fetch schedule' 
    });
  }
};

exports.updateSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const { gradeLevel, section, subject, teacher, timeSlot, room, day, days, isActive, shift } = req.body;

    const schedule = await Schedule.findById(id);

    if (!schedule) {
      return res.status(404).json({ 
        error: 'Schedule not found' 
      });
    }

    // Update fields
    if (gradeLevel) schedule.gradeLevel = gradeLevel;
    if (section) schedule.section = section;
    if (subject) schedule.subject = subject;
    if (teacher) schedule.teacher = teacher;
    if (timeSlot) schedule.timeSlot = timeSlot;
    if (room) schedule.room = room;
    if (shift) schedule.shift = shift;

    // Update days/day (support both, keep day as primary)
    if (day !== undefined || days !== undefined) {
      const normalizedDays = normalizeDays({ day, days });
      if (normalizedDays.length === 0) {
        return res.status(400).json({
          error: 'At least one valid day is required'
        });
      }
      schedule.days = normalizedDays;
      schedule.day = normalizedDays[0];
    }

    if (isActive !== undefined) schedule.isActive = isActive;

    await schedule.save();

    res.status(200).json({
      success: true,
      message: 'Schedule updated successfully',
      schedule
    });
  } catch (error) {
    console.error('Error updating schedule:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to update schedule' 
    });
  }
};

exports.deleteSchedule = async (req, res) => {
  try {
    const { id } = req.params;

    const schedule = await Schedule.findById(id);

    if (!schedule) {
      return res.status(404).json({ 
        error: 'Schedule not found' 
      });
    }

    // Soft delete by setting isActive to false
    schedule.isActive = false;
    await schedule.save();

    res.status(200).json({
      success: true,
      message: 'Schedule deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting schedule:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to delete schedule' 
    });
  }
};

exports.getSchedulesByGradeAndSection = async (req, res) => {
  try {
    const { gradeLevel, section } = req.params;

    const schedules = await Schedule.find({
      gradeLevel,
      section,
      isActive: true
    }).sort({ day: 1, timeSlot: 1 });

    res.status(200).json({
      success: true,
      count: schedules.length,
      schedules
    });
  } catch (error) {
    console.error('Error fetching schedules:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to fetch schedules' 
    });
  }
};

// Get attendance records for a specific schedule from History
exports.getScheduleAttendanceRecords = async (req, res) => {
  try {
    const { id } = req.params;
    const { date } = req.query;
    const History = require('../models/historySchema');

    // Get the schedule to get gradeLevel, section, shift
    const schedule = await Schedule.findById(id);

    if (!schedule) {
      return res.status(404).json({ 
        error: 'Schedule not found' 
      });
    }

    console.log('=== Attendance Fetch Debug ===');
    console.log('Schedule:', {
      id,
      subject: schedule.subject,
      gradeLevel: schedule.gradeLevel,
      section: schedule.section,
      shift: schedule.shift
    });

    // Build date range
    let dateFilter = {};
    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      
      dateFilter = {
        $gte: startDate,
        $lte: endDate
      };
    } else {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      
      dateFilter = {
        $gte: today,
        $lt: tomorrow
      };
    }

    console.log('Date filter:', dateFilter);

    // Query strategy: Get all attendance records for this SPECIFIC grade/section/shift
    // Include both 'General' (QR scanned) and subject-specific records
    // This allows QR scanned attendance (saved as 'General') to be found by teachers
    
    // Get all attendance records for this class (grade, section, shift) for today
    // Include both General (QR scanned) and subject-specific records
    const allRecords = await History.find({
      gradeLevel: schedule.gradeLevel,
      section: schedule.section,
      shift: schedule.shift,
      $or: [
        { subject: schedule.subject },  // Subject-specific records
        { subject: 'General' }          // QR scanned records
      ],
      scanTime: dateFilter
    })
      .select('studentId studentName status scanTime notes subject gradeLevel section shift statusHistory attendanceType')
      .sort({ scanTime: -1 });

    console.log('=== ATTENDANCE QUERY DEBUG ===');
    console.log(`Schedule: ${schedule.gradeLevel}-${schedule.section}-${schedule.shift} (${schedule.subject})`);
    console.log(`Date range: ${dateFilter.$gte} to ${dateFilter.$lt}`);
    console.log(`Subject filter: ${schedule.subject}`);
    console.log(`Records found: ${allRecords.length}`);
    if (allRecords.length > 0) {
      console.log('Sample records:');
      allRecords.slice(0, 3).forEach(r => {
        console.log(`  - Student ${r.studentId}: ${r.subject} - ${r.status} - ${r.scanTime}`);
      });
    }

    // Merge records: prioritize subject-specific records, fallback to General
    const recordMap = new Map();
    
    // Add all records
    allRecords.forEach(record => {
      const studentId = record.studentId;
      
      if (!recordMap.has(studentId)) {
        recordMap.set(studentId, record);
      } else {
        // If we have multiple records for same student, prefer subject-specific over General
        const existing = recordMap.get(studentId);
        const existingIsGeneral = existing.subject === 'General' || !existing.subject;
        const newIsSpecific = record.subject === schedule.subject;
        const newIsGeneral = record.subject === 'General' || !record.subject;
        
        // Prefer: Specific Subject > General, and most recent scan
        if (newIsSpecific && existingIsGeneral) {
          recordMap.set(studentId, record);
        } else if (newIsGeneral && !existingIsGeneral) {
          // Keep the specific subject record
        } else if (newIsGeneral && existingIsGeneral) {
          // Both are general, use most recent
          const newTime = new Date(record.scanTime || 0);
          const existingTime = new Date(existing.scanTime || 0);
          if (newTime > existingTime) {
            recordMap.set(studentId, record);
          }
        }
      }
    });
    
    const attendanceRecords = Array.from(recordMap.values())
      .sort((a, b) => {
        const timeA = new Date(a.scanTime || 0);
        const timeB = new Date(b.scanTime || 0);
        return timeB - timeA;
      });

    console.log(`Returning ${attendanceRecords.length} merged records for teacher ${schedule.teacher}`);

    // Enrich records with schedule information
    const enrichedRecords = attendanceRecords.map(record => ({
      ...record.toObject ? record.toObject() : record,
      scheduleDay: schedule.day,
      scheduleTimeSlot: schedule.timeSlot,
      scheduleTeacher: schedule.teacher
    }));

    res.status(200).json({
      success: true,
      records: enrichedRecords,
      attendance: enrichedRecords,
      count: enrichedRecords.length,
      scheduleInfo: {
        day: schedule.day,
        timeSlot: schedule.timeSlot,
        teacher: schedule.teacher
      },
      debug: {
        schedule: { 
          subject: schedule.subject, 
          gradeLevel: schedule.gradeLevel, 
          section: schedule.section, 
          shift: schedule.shift,
          teacher: schedule.teacher
        },
        totalRecordsQueried: allRecords.length,
        recordsAfterMerge: attendanceRecords.length,
        dateRange: {
          start: dateFilter.$gte,
          end: dateFilter.$lt
        }
      }
    });
  } catch (error) {
    console.error('Error fetching schedule attendance records:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to fetch attendance records' 
    });
  }
};

exports.updateStudentAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    const { studentId, status, timestamp } = req.body;
    const History = require('../models/historySchema');

    // Validate required fields
    if (!studentId || !status) {
      return res.status(400).json({ 
        error: 'studentId and status are required' 
      });
    }

    const schedule = await Schedule.findById(id);

    if (!schedule) {
      return res.status(404).json({ 
        error: 'Schedule not found' 
      });
    }

    // Fetch student details to get the student name
    let studentName = 'Unknown';
    try {
      const Students = require('../models/studentsSchema');
      const student = await Students.findOne({ studentId: studentId });
      if (student) {
        studentName = student.fullName || student.name || 'Unknown';
        console.log('Found student:', studentId, 'Name:', studentName);
      } else {
        console.log('Student not found for ID:', studentId);
      }
    } catch (studentError) {
      console.error('Error fetching student details:', studentError.message);
      // Continue with 'Unknown' as name
    }

    // Initialize students array if it doesn't exist
    if (!schedule.students) {
      schedule.students = [];
    }

    // Find or create student entry in the schedule
    let studentEntry = schedule.students.find(s => s.studentId === studentId);
    
    if (!studentEntry) {
      studentEntry = {
        studentId,
        status: 'Not Scanned',
        scanTime: null,
        timeIn: null
      };
      schedule.students.push(studentEntry);
    }

    // Update student status
    studentEntry.status = status;
    studentEntry.timestamp = timestamp || new Date().toISOString();

    // Mark schedule as modified
    schedule.markModified('students');

    await schedule.save();

    // Also update/create History record for admin history page
    try {
      const dateString = new Date(timestamp || Date.now()).toISOString().split('T')[0];
      
      // Try to find existing history record for this student for today (In records only)
      let historyRecord = await History.findOne({
        studentId: studentId,
        gradeLevel: schedule.gradeLevel,
        section: schedule.section,
        shift: schedule.shift,
        subject: schedule.subject,
        attendanceType: 'In',  // Only update In records from teachers
        scanTime: {
          $gte: new Date(dateString + 'T00:00:00Z'),
          $lt: new Date(dateString + 'T23:59:59Z')
        }
      });

      if (historyRecord) {
        // Update existing record
        historyRecord.status = status;
        historyRecord.studentName = studentName; // Update student name
        historyRecord.statusHistory = historyRecord.statusHistory || [];
        historyRecord.statusHistory.push({
          status: status,
          changedAt: new Date(),
          changedBy: schedule.teacher,
          reason: 'Teacher updated status'
        });
        await historyRecord.save();
        console.log('Updated existing history record for student:', studentId);
      } else {
        // Create new history record if none exists
        historyRecord = new History({
          studentId: studentId,
          studentName: studentName,
          subject: schedule.subject,
          scanTime: new Date(timestamp || Date.now()),
          status: status,
          attendanceType: 'In',  // Default to In for teacher-recorded status
          checkInTime: new Date(timestamp || Date.now()),
          gradeLevel: schedule.gradeLevel,
          section: schedule.section,
          shift: schedule.shift,
          statusHistory: [{
            status: status,
            changedAt: new Date(),
            changedBy: schedule.teacher,
            reason: 'Teacher recorded status'
          }],
          isVerified: true,
          verifiedBy: schedule.teacher
        });
        await historyRecord.save();
        console.log('Created new history record for student:', studentId);
      }
    } catch (historyError) {
      console.error('Error updating history record:', historyError.message);
      // Don't throw error, continue even if history update fails
    }

    res.status(200).json({
      success: true,
      message: 'Student attendance updated successfully',
      result: {
        schedule,
        student: studentEntry
      }
    });
  } catch (error) {
    console.error('Error updating student attendance:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to update student attendance' 
    });
  }
};
