const express = require("express");
const router = express.Router();
const {
  createStudent,
  getAllStudents,
  getStudent,
  getStudentsByClass,
  getStudentsByTeacherSchedule,
  updateStudent,
  deleteStudent,
  searchStudents,
  generateQRCode,
  getQRCode,
  regenerateAllQRCodes,
  getStudentByQRCode,
  clearDatabase
} = require("../controllers/studentsController");

// POST: Create a new student
router.post("/", createStudent);

// GET: Retrieve all students
router.get("/", getAllStudents);

// GET: Search students
router.get("/search", searchStudents);

// GET: Get students by grade and section
router.get("/class", getStudentsByClass);

// GET: Get students enrolled in a specific teacher's schedule
router.get("/teacher/schedule", getStudentsByTeacherSchedule);

// GET: Retrieve a single student by ID
router.get("/:id", getStudent);

// PATCH: Update a student
router.patch("/:id", updateStudent);

// DELETE: Delete a student
router.delete("/:id", deleteStudent);

// QR Code Routes
// POST: Generate QR code for a specific student
router.post("/:id/qr-code", generateQRCode);

// GET: Get QR code for a specific student
router.get("/:id/qr-code", getQRCode);

// POST: Regenerate QR codes for all students
router.post("/qr-codes/regenerate-all", regenerateAllQRCodes);

// POST: Get student information by QR code scan (for mobile app)
router.post("/scan-qr", getStudentByQRCode);

// DEBUG: Clear database (for testing only)
router.delete("/debug/clear", clearDatabase);

module.exports = router;
