const Schedule = require('../models/scheduleSchema');

exports.createSchedule = async (req, res) => {
  try {
    const { gradeLevel, section, subject, teacher, timeSlot, room, day, shift } = req.body;

    // Validate required fields
    if (!gradeLevel || !section || !subject || !teacher || !timeSlot || !room || !day || !shift) {
      return res.status(400).json({ 
        error: 'All fields are required' 
      });
    }

    // Check for duplicate schedule (same grade, section, day, and time slot)
    const existingSchedule = await Schedule.findOne({
      gradeLevel,
      section,
      day,
      timeSlot,
      isActive: true
    });

    if (existingSchedule) {
      return res.status(409).json({ 
        error: 'A schedule already exists for this grade, section, day, and time slot' 
      });
    }

    const newSchedule = new Schedule({
      gradeLevel,
      section,
      subject,
      teacher,
      timeSlot,
      room,
      day,
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
    if (day) filter.day = day;
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
    const { gradeLevel, section, subject, teacher, timeSlot, room, day, isActive } = req.body;

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
    if (day) schedule.day = day;
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

    // Query by gradeLevel, section, shift (matches all QR scans for this class)
    // Note: QR scans have subject='General', so we don't filter by subject
    const query = {
      gradeLevel: schedule.gradeLevel,
      section: schedule.section,
      shift: schedule.shift,
      scanTime: dateFilter
    };

    console.log('Query:', JSON.stringify(query, null, 2));

    const attendanceRecords = await History.find(query)
      .select('studentId studentName status scanTime notes subject gradeLevel section shift')
      .sort({ scanTime: -1 });

    console.log('Found records:', attendanceRecords.length);
    if (attendanceRecords.length > 0) {
      console.log('Sample records:', attendanceRecords.slice(0, 2));
    }

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
          shift: schedule.shift 
        },
        query: query,
        recordsFound: enrichedRecords.length
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
      
      // Try to find existing history record for this student for today
      let historyRecord = await History.findOne({
        studentId: studentId,
        gradeLevel: schedule.gradeLevel,
        section: schedule.section,
        shift: schedule.shift,
        subject: schedule.subject,
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
