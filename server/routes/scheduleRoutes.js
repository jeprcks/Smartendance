const express = require('express');
const router = express.Router();
const scheduleController = require('../controllers/scheduleController');

// Create a new schedule
router.post('/', scheduleController.createSchedule);

// Get all schedules (with optional filters)
router.get('/', scheduleController.getAllSchedules);

// Get schedule attendance records (specific route - must be before /:id)
router.get('/:id/attendance', scheduleController.getScheduleAttendanceRecords);

// Get schedule by ID
router.get('/:id', scheduleController.getScheduleById);

// Get schedules by grade level and section
router.get('/grade/:gradeLevel/section/:section', scheduleController.getSchedulesByGradeAndSection);

// Update student attendance within a schedule
router.patch('/:id/student-attendance', scheduleController.updateStudentAttendance);

// Update a schedule
router.patch('/:id', scheduleController.updateSchedule);

// Delete a schedule
router.delete('/:id', scheduleController.deleteSchedule);

module.exports = router;
