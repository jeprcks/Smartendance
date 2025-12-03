const Student = require("../models/studentsSchema");
const Parent = require("../models/parentsSchema");
const Teacher = require("../models/teacherSchema");
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRE = '7d';

// Student Login
const studentLogin = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: "Email and password are required" });
        }

        // Find student by email
        const student = await Student.findOne({ email });
        if (!student) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        // Compare password
        const isPasswordValid = await bcrypt.compare(password, student.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        // Generate JWT token
        const token = jwt.sign(
            { 
                id: student._id, 
                email: student.email, 
                role: 'student',
                studentId: student.studentId
            },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRE }
        );

        res.status(200).json({
            message: "Login successful",
            token,
            student: {
                _id: student._id,
                studentId: student.studentId,
                fullName: student.fullName,
                email: student.email,
                gradeLevel: student.gradeLevel,
                section: student.section,
                photo: student.photo
            }
        });
    } catch (error) {
        console.error('Error logging in student:', error);
        res.status(500).json({ error: error.message || "Error logging in" });
    }
};

// Parent Login
const parentLogin = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: "Email and password are required" });
        }

        // Find parent by email
        const parent = await Parent.findOne({ email });
        if (!parent) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        // Compare password
        const isPasswordValid = await bcrypt.compare(password, parent.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        // Generate JWT token
        const token = jwt.sign(
            { 
                id: parent._id, 
                email: parent.email, 
                role: 'parent'
            },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRE }
        );

        res.status(200).json({
            message: "Login successful",
            token,
            parent: {
                _id: parent._id,
                fullName: parent.fullName,
                email: parent.email,
                relationship: parent.relationship,
                photo: parent.photo,
                childrenIds: parent.childrenIds
            }
        });
    } catch (error) {
        console.error('Error logging in parent:', error);
        res.status(500).json({ error: error.message || "Error logging in" });
    }
};

// Teacher Login
const teacherLogin = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: "Email and password are required" });
        }

        // Find teacher by email
        const teacher = await Teacher.findOne({ email });
        if (!teacher) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        // Compare password
        const isPasswordValid = await bcrypt.compare(password, teacher.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        // Generate JWT token
        const token = jwt.sign(
            { 
                id: teacher._id, 
                email: teacher.email, 
                role: 'teacher',
                teacherId: teacher.teacherId
            },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRE }
        );

        res.status(200).json({
            message: "Login successful",
            token,
            teacher: {
                _id: teacher._id,
                teacherId: teacher.teacherId,
                name: teacher.name,
                email: teacher.email,
                subject: teacher.subject,
                role: teacher.role,
                profilePicture: teacher.profilePicture
            }
        });
    } catch (error) {
        console.error('Error logging in teacher:', error);
        res.status(500).json({ error: error.message || "Error logging in" });
    }
};

// Verify Token
const verifyToken = (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(401).json({ error: "No token provided" });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        res.status(200).json({
            message: "Token is valid",
            decoded
        });
    } catch (error) {
        console.error('Error verifying token:', error);
        res.status(401).json({ error: "Invalid or expired token" });
    }
};

module.exports = {
    studentLogin,
    parentLogin,
    teacherLogin,
    verifyToken
};
