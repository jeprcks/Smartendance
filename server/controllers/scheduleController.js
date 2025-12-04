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
    const { gradeLevel, section, day, isActive } = req.query;
    
    const filter = {};
    if (gradeLevel) filter.gradeLevel = gradeLevel;
    if (section) filter.section = section;
    if (day) filter.day = day;
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
