const Teacher = require("../models/teacherSchema");
const bcrypt = require('bcryptjs');

// Create new teacher
const createTeacher = async (req, res) => {
    let session;
    try {
        const {
            username,
            name,
            role = 'Teacher',
            subjects,
            subject,
            email,
            phoneNumber,
            gender,
            birthDate,
            password,
            department,
            qualifications = [],
            address = {},
            emergencyContact = {},
            schedule = [],
            profilePicture
        } = req.body;

        // Normalize subjects: accept array or legacy single subject
        let subjectsArray = Array.isArray(subjects) ? subjects : (subject ? [subject] : []).filter(Boolean);
        if (subjectsArray.length === 0 && subject) {
            subjectsArray = subject.split(/[,;]/).map(s => s.trim()).filter(Boolean);
        }

        // Validate required fields
        if (!username || !name || !email || !phoneNumber || !password) {
            return res.status(400).json({ 
                error: "Missing required fields: username, name, email, phoneNumber, password are required" 
            });
        }
        if (!subjectsArray || subjectsArray.length === 0) {
            return res.status(400).json({ 
                error: "At least one subject is required" 
            });
        }

        // Start a new session for transaction
        session = await Teacher.startSession();

        await session.withTransaction(async () => {
            // Check if username already exists
            const existingUsername = await Teacher.findOne({ username });
            if (existingUsername) {
                throw new Error("Username already exists");
            }

            // Check if email already exists
            const existingEmail = await Teacher.findOne({ email });
            if (existingEmail) {
                throw new Error("Email already exists");
            }

            // Hash password
            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(password, saltRounds);

            // Create teacher
            const teacher = new Teacher({
                username,
                name,
                role,
                subjects: subjectsArray,
                email,
                phoneNumber,
                gender,
                birthDate,
                password: hashedPassword,
                plainPassword: password,
                department,
                qualifications,
                address,
                emergencyContact,
                schedule,
                profilePicture,
                status: 'Active'
            });

            await teacher.save();
            return teacher;
        });

        // Get the created teacher (without password)
        const createdTeacher = await Teacher.findOne({ username }).select('-password');
        
        res.status(201).json({
            success: true,
            message: "Teacher created successfully",
            teacher: createdTeacher
        });
    } catch (error) {
        console.error('Error creating teacher:', error);
        res.status(400).json({ 
            error: error.message || "Failed to create teacher" 
        });
    } finally {
        if (session) {
            await session.endSession();
        }
    }
};

// Get all teachers
const getAllTeachers = async (req, res) => {
    try {
        const { page = 1, limit = 50, search, subject, status, role } = req.query;
        
        console.log('getAllTeachers called with params:', { page, limit, search, subject, status, role });
        
        // Build filter object
        const filter = {};
        
        if (subject) filter.subjects = new RegExp(subject, 'i');
        if (status) filter.status = status;
        if (role) filter.role = role;
        
        // Search filter
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { teacherId: { $regex: search, $options: 'i' } },
                { username: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { subjects: { $regex: search, $options: 'i' } }
            ];
        }

        console.log('Filter:', JSON.stringify(filter));

        // Calculate pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        // Get total count for pagination
        const totalTeachers = await Teacher.countDocuments(filter);
        console.log('Total teachers:', totalTeachers);
        
        // Get teachers with pagination (excluding password)
        const teachers = await Teacher.find(filter)
            .select('-password')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        console.log('Teachers found:', teachers.length);

        // Backfill plainPassword for existing teachers that don't have it (only set, don't save on every request)
        // This prevents unnecessary database writes on every API call
        teachers.forEach(teacher => {
            if (!teacher.plainPassword) {
                teacher.plainPassword = 'N/A'; // Fallback for older records (virtual/display only)
            }
        });

        const response = {
            success: true,
            teachers,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(totalTeachers / parseInt(limit)),
                totalTeachers,
                hasNext: skip + teachers.length < totalTeachers,
                hasPrev: parseInt(page) > 1
            }
        };
        
        console.log('Sending response with', teachers.length, 'teachers');
        res.status(200).json(response);
    } catch (error) {
        console.error('Error getting teachers:', error);
        res.status(500).json({ error: error.message });
    }
};

// Get single teacher by ID
const getTeacher = async (req, res) => {
    try {
        const { id } = req.params;
        const teacher = await Teacher.findById(id).select('-password');

        if (!teacher) {
            return res.status(404).json({ error: "Teacher not found" });
        }

        res.status(200).json({
            success: true,
            teacher
        });
    } catch (error) {
        console.error('Error getting teacher:', error);
        res.status(400).json({ error: error.message });
    }
};

// Get teacher by teacherId
const getTeacherByTeacherId = async (req, res) => {
    try {
        const { teacherId } = req.params;
        const teacher = await Teacher.findOne({ teacherId }).select('-password');

        if (!teacher) {
            return res.status(404).json({ error: "Teacher not found" });
        }

        // Include plainPassword if it exists (for profile display)
        const teacherData = teacher.toObject();
        if (teacherData.plainPassword) {
            // plainPassword is already included since we only excluded 'password'
        }

        res.status(200).json({
            success: true,
            teacher: teacherData
        });
    } catch (error) {
        console.error('Error getting teacher by teacherId:', error);
        res.status(400).json({ error: error.message });
    }
};

// Update teacher
const updateTeacher = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = { ...req.body };

        // Normalize subjects: accept subjects array or legacy subject string
        if (updates.subject !== undefined && !updates.subjects) {
            updates.subjects = typeof updates.subject === 'string'
                ? updates.subject.split(/[,;]/).map(s => s.trim()).filter(Boolean)
                : Array.isArray(updates.subject) ? updates.subject : [updates.subject];
            if (updates.subjects.length === 0) updates.subjects = [updates.subject];
            delete updates.subject;
        }

        // Handle password update if provided
        if (updates.password) {
            const saltRounds = 10;
            updates.password = await bcrypt.hash(updates.password, saltRounds);
            updates.plainPassword = req.body.password; // Store original plain text password
        }

        // If updating email or username, check for duplicates
        if (updates.email) {
            const existingEmail = await Teacher.findOne({
                email: updates.email,
                _id: { $ne: id }
            });
            if (existingEmail) {
                return res.status(400).json({ error: "Email already exists" });
            }
        }

        if (updates.username) {
            const existingUsername = await Teacher.findOne({
                username: updates.username,
                _id: { $ne: id }
            });
            if (existingUsername) {
                return res.status(400).json({ error: "Username already exists" });
            }
        }

        const teacher = await Teacher.findByIdAndUpdate(
            id,
            { ...updates },
            { new: true, runValidators: true }
        ).select('-password');

        if (!teacher) {
            return res.status(404).json({ error: "Teacher not found" });
        }

        res.status(200).json({
            success: true,
            message: "Teacher updated successfully",
            teacher
        });
    } catch (error) {
        console.error('Error updating teacher:', error);
        res.status(400).json({ error: error.message });
    }
};

// Delete teacher
const deleteTeacher = async (req, res) => {
    try {
        const { id } = req.params;
        const teacher = await Teacher.findByIdAndDelete(id);

        if (!teacher) {
            return res.status(404).json({ error: "Teacher not found" });
        }

        res.status(200).json({
            success: true,
            message: "Teacher deleted successfully"
        });
    } catch (error) {
        console.error('Error deleting teacher:', error);
        res.status(400).json({ error: error.message });
    }
};

// Change teacher password
const changePassword = async (req, res) => {
    try {
        const { id } = req.params;
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: "Current password and new password are required" });
        }

        const teacher = await Teacher.findById(id);
        if (!teacher) {
            return res.status(404).json({ error: "Teacher not found" });
        }

        // Verify current password
        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, teacher.password);
        if (!isCurrentPasswordValid) {
            return res.status(400).json({ error: "Current password is incorrect" });
        }

        // Hash new password
        const saltRounds = 10;
        const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

        // Update password
        teacher.password = hashedNewPassword;
        await teacher.save();

        res.status(200).json({
            success: true,
            message: "Password changed successfully"
        });
    } catch (error) {
        console.error('Error changing password:', error);
        res.status(400).json({ error: error.message });
    }
};

// Get teacher statistics
const getTeacherStats = async (req, res) => {
    try {
        const stats = await Teacher.getTeacherStats();
        res.status(200).json({
            success: true,
            stats
        });
    } catch (error) {
        console.error('Error getting teacher stats:', error);
        res.status(400).json({ error: error.message });
    }
};

// Search teachers
const searchTeachers = async (req, res) => {
    try {
        const { query } = req.query;
        const teachers = await Teacher.find({
            $or: [
                { name: { $regex: query, $options: 'i' } },
                { teacherId: { $regex: query, $options: 'i' } },
                { username: { $regex: query, $options: 'i' } },
                { email: { $regex: query, $options: 'i' } },
                { subjects: { $regex: query, $options: 'i' } }
            ]
        }).select('-password').sort({ name: 1 });

        res.status(200).json({
            success: true,
            teachers
        });
    } catch (error) {
        console.error('Error searching teachers:', error);
        res.status(400).json({ error: error.message });
    }
};

// Get teachers by subject
const getTeachersBySubject = async (req, res) => {
    try {
        const { subject } = req.query;
        const teachers = await Teacher.findBySubject(subject);
        
        res.status(200).json({
            success: true,
            teachers
        });
    } catch (error) {
        console.error('Error getting teachers by subject:', error);
        res.status(400).json({ error: error.message });
    }
};

module.exports = {
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
};
