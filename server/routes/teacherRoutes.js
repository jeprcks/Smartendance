const express = require('express');
const router = express.Router();
const {
    createTeacher,
    getAllTeachers,
    getTeacher,
    getTeacherByTeacherId,
    updateTeacher,
    deleteTeacher,
    changePassword,
    getTeacherStats,
    searchTeachers,
    getTeachersBySubject
} = require('../controllers/teacherController');

// Create new teacher
router.post('/', createTeacher);

// Get all teachers with filtering and pagination
router.get('/', getAllTeachers);

// Get teacher statistics
router.get('/stats', getTeacherStats);

// Search teachers
router.get('/search', searchTeachers);

// Get teachers by subject
router.get('/by-subject', getTeachersBySubject);

// Get single teacher by ID
router.get('/:id', getTeacher);

// Get teacher by teacherId
router.get('/teacher-id/:teacherId', getTeacherByTeacherId);

// Update teacher
router.put('/:id', updateTeacher);

// Change teacher password
router.put('/:id/change-password', changePassword);

// Delete teacher
router.delete('/:id', deleteTeacher);

module.exports = router;
