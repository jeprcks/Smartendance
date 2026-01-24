const express = require('express');
const router = express.Router();
const {
    createAttendanceRecord,
    getAllAttendanceRecords,
    getAttendanceRecord,
    updateAttendanceRecord,
    deleteAttendanceRecord,
    getAttendanceStats,
    getStudentAttendanceHistory,
    getHistoryPageData,
    getDailyAttendanceSummary,
    exportAttendanceData
} = require('../controllers/historyController');

// Create new attendance record (In/Out)
router.post('/', createAttendanceRecord);

// Get all attendance records with filtering and pagination
router.get('/', getAllAttendanceRecords);

// Get history page data (optimized for frontend)
router.get('/history-page', getHistoryPageData);

// Get daily attendance summary (check-in/check-out pairs)
router.get('/daily-summary', getDailyAttendanceSummary);

// Get attendance statistics
router.get('/stats', getAttendanceStats);

// Export attendance data
router.get('/export', exportAttendanceData);

// Get single attendance record
router.get('/:id', getAttendanceRecord);

// Update attendance record
router.put('/:id', updateAttendanceRecord);

// Delete attendance record
router.delete('/:id', deleteAttendanceRecord);

// Get student attendance history
router.get('/student/:studentId', getStudentAttendanceHistory);

module.exports = router;
