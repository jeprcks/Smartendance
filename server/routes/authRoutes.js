const express = require("express");
const {
    studentLogin,
    teacherLogin,
    parentLogin,
    verifyToken
} = require("../controllers/authController");

const router = express.Router();

// Login routes
router.post("/student-login", studentLogin);
router.post("/teacher-login", teacherLogin);
router.post("/parent-login", parentLogin);

// Verify token route
router.post("/verify-token", verifyToken);

module.exports = router;
