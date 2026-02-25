const Student = require("../models/studentsSchema");
const Teacher = require("../models/teacherSchema");
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRE = '7d';

// Student Login
const studentLogin = async (req, res) => {
    try {
        const { email, password } = req.body;

        console.log('\n========== STUDENT LOGIN ATTEMPT ==========');
        console.log('📧 Email received:', email);
        console.log('🔐 Password received:', password ? `[${password.length} chars]` : 'undefined');
        console.log('⏰ Timestamp:', new Date().toLocaleString());

        if (!email || !password) {
            console.log('❌ FAIL: Missing email or password');
            console.log('=========================================\n');
            return res.status(400).json({ error: "Email and password are required" });
        }

        // Find student by email
        console.log('🔍 Searching database for email:', email);
        const student = await Student.findOne({ email });
        
        if (!student) {
            console.log('❌ FAIL: No student found with email:', email);
            console.log('💡 Tip: Check if student was created in admin web at http://localhost:3000');
            console.log('=========================================\n');
            return res.status(401).json({ error: "Invalid email or password" });
        }

        console.log('✅ Student found!');
        console.log('👤 Student ID:', student._id);
        console.log('📝 Full Name:', student.fullName);
        console.log('🔒 Stored password hash exists:', !!student.password);
        console.log('🔒 Stored password field:', student.password ? `${student.password.substring(0, 20)}...` : 'undefined');
        console.log('🔒 Password field length:', student.password ? student.password.length : 0);
        console.log('📝 Plain password exists:', !!student.plainPassword);
        console.log('📝 Plain password value:', student.plainPassword);

        // Compare password
        console.log('🔐 Comparing passwords...');
        console.log('🔐 Input password:', password);
        console.log('🔐 Input password length:', password.length);
        console.log('🔐 Input password type:', typeof password);
        console.log('🔐 Stored password type:', typeof student.password);
        
        // Check if stored password looks like a bcrypt hash
        const isBcryptHash = student.password && (
            student.password.startsWith('$2a$') || 
            student.password.startsWith('$2b$') || 
            student.password.startsWith('$2x$') || 
            student.password.startsWith('$2y$')
        );
        console.log('🔐 Is password hashed (bcrypt):', isBcryptHash);
        
        // Ensure both are strings before comparing
        const storedPasswordStr = String(student.password);
        const inputPasswordStr = String(password);
        
        const isPasswordValid = await bcrypt.compare(inputPasswordStr, storedPasswordStr);
        console.log('🔐 Password valid:', isPasswordValid);
        
        if (!isPasswordValid) {
            console.log('❌ FAIL: Password does not match');
            console.log('💡 Tip: Check that password is exactly correct (case-sensitive)');
            console.log('=========================================\n');
            return res.status(401).json({ error: "Invalid email or password" });
        }

        // Generate JWT token
        console.log('🔐 Generating JWT token...');
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

        console.log('✅ SUCCESS: Student logged in successfully!');
        console.log('🎟️  Token generated (expires in 7 days)');
        console.log('=========================================\n');

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
        console.error('❌ ERROR in studentLogin:', error);
        console.log('=========================================\n');
        res.status(500).json({ error: error.message || "Error logging in" });
    }
};
// Teacher Login
const teacherLogin = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: "Email/Username/Teacher ID and password are required" });
        }

        console.log('\n========== TEACHER LOGIN ATTEMPT ==========');
        console.log('📧 Email/ID received:', email);
        console.log('🔐 Password received:', password ? `[${password.length} chars]` : 'undefined');
        console.log('⏰ Timestamp:', new Date().toLocaleString());

        // Find teacher by email, username, or teacherId
        console.log('🔍 Searching database for teacher...');
        let teacher = await Teacher.findOne({ email });
        
        // If not found by email, try username
        if (!teacher) {
            console.log('Not found by email, trying username...');
            teacher = await Teacher.findOne({ username: email.toLowerCase() });
        }
        
        // If not found by username, try teacherId
        if (!teacher) {
            console.log('Not found by username, trying teacherId...');
            teacher = await Teacher.findOne({ teacherId: email });
        }

        if (!teacher) {
            console.log('❌ FAIL: No teacher found with email/username/teacherId:', email);
            console.log('=========================================\n');
            return res.status(401).json({ error: "Invalid email, username, teacher ID or password" });
        }

        console.log('✅ Teacher found!');
        console.log('👤 Teacher ID:', teacher.teacherId);
        console.log('📝 Full Name:', teacher.name);
        console.log('📧 Email:', teacher.email);
        console.log('👤 Username:', teacher.username);

        // Compare password
        console.log('🔐 Comparing passwords...');
        const isPasswordValid = await bcrypt.compare(password, teacher.password);
        
        if (!isPasswordValid) {
            console.log('❌ FAIL: Password does not match');
            console.log('=========================================\n');
            return res.status(401).json({ error: "Invalid email, username, teacher ID or password" });
        }

        console.log('✅ Password valid!');

        // Generate JWT token
        console.log('🔐 Generating JWT token...');
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

        console.log('✅ SUCCESS: Teacher logged in successfully!');
        console.log('🎟️  Token generated (expires in 7 days)');
        console.log('=========================================\n');

        res.status(200).json({
            message: "Login successful",
            token,
            teacher: {
                _id: teacher._id,
                teacherId: teacher.teacherId,
                name: teacher.name,
                email: teacher.email,
                username: teacher.username,
                subjects: Array.isArray(teacher.subjects) ? teacher.subjects : (teacher.subject ? [teacher.subject] : []),
                role: teacher.role,
                profilePicture: teacher.profilePicture
            }
        });
    } catch (error) {
        console.error('❌ ERROR in teacherLogin:', error);
        console.log('=========================================\n');
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

        // Find all students with this parent email
        const students = await Student.find({ 
            'parentInfo.email': email 
        });

        if (students.length === 0) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        // Check if password matches any of the students' parent password
        let validStudent = null;
        for (let student of students) {
            if (student.parentInfo && student.parentInfo.password === password) {
                validStudent = student;
                break;
            }
        }

        if (!validStudent) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        // Generate JWT token for parent
        const token = jwt.sign(
            { 
                id: validStudent._id, 
                email: email, 
                role: 'parent',
                parentEmail: email,
                // Include IDs of all children for this parent
                childrenIds: students.map(s => s._id)
            },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRE }
        );

        // Return parent info and all their children
        const childrenData = students.map(student => ({
            _id: student._id,
            studentId: student.studentId,
            fullName: student.fullName,
            email: student.email,
            gradeLevel: student.gradeLevel,
            section: student.section,
            gender: student.gender,
            shift: student.shift,
            photo: student.photo,
            age: student.age,
            phoneNumber: student.phoneNumber,
            birthDate: student.birthDate
        }));

        res.status(200).json({
            message: "Login successful",
            token,
            parent: {
                email: validStudent.parentInfo.name || email,
                parentEmail: email,
                childrenCount: students.length
            },
            children: childrenData
        });
    } catch (error) {
        console.error('Error logging in parent:', error);
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
    teacherLogin,
    parentLogin,
    verifyToken
};
