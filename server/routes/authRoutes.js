const express = require("express");
const {
    studentLogin,
    parentLogin,
    teacherLogin,
    verifyToken
} = require("../controllers/authController");

const router = express.Router();

// Login routes
router.post("/student-login", studentLogin);
router.post("/parent-login", parentLogin);
router.post("/teacher-login", teacherLogin);

// Verify token route
router.post("/verify-token", verifyToken);

module.exports = router;
