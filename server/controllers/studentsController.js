const Student = require("../models/studentsSchema");
const History = require("../models/historySchema");
const QRCode = require('qrcode');

// Store pending requests to prevent duplicates
const pendingRequests = new Map();

// Create new student
const createStudent = async (req, res) => {
    let session;
    try {
        const {
            studentId,
            fullName,
            email,
            password,
            phoneNumber,
            age,
            birthDate,
            gradeLevel,
            section,
            gender,
            photo,
            shift,
            address,
            parentInfo,
            emergencyContact
        } = req.body;

        // Generate unique request ID for tracking
        const requestId = Math.random().toString(36).substr(2, 9);
        const requestKey = `${studentId}-${email}`;
        
        console.log('=== NEW REQUEST RECEIVED ===');
        console.log('Request ID:', requestId);
        console.log('Request key:', requestKey);
        console.log('Student ID:', studentId);
        console.log('Email:', email);
        
        // Check if this exact request is already being processed
        if (pendingRequests.has(requestKey)) {
            console.log('=== DUPLICATE REQUEST DETECTED ===');
            console.log('Request ID:', requestId);
            console.log('Request key:', requestKey);
            console.log('Returning 409 Conflict');
            return res.status(409).json({ error: "Request already being processed. Please wait..." });
        }

        // Mark request as pending with timeout
        pendingRequests.set(requestKey, requestId);
        console.log('=== REQUEST MARKED AS PENDING ===');
        console.log('Request ID:', requestId);
        console.log('Request key:', requestKey);
        
        // Set timeout to clean up after 30 seconds
        setTimeout(() => {
            pendingRequests.delete(requestKey);
            console.log('=== REQUEST TIMEOUT CLEANUP ===');
            console.log('Request ID:', requestId);
            console.log('Request key removed due to timeout:', requestKey);
        }, 30000);

        // Start a new session for transaction
        session = await Student.startSession();
        
        // Check if student ID already exists
        console.log('=== STUDENT ID VALIDATION DEBUG ===');
        console.log('Checking for existing student with ID:', studentId);
        console.log('Student ID type:', typeof studentId);
        console.log('Student ID length:', studentId?.length);
        console.log('Student ID char codes:', studentId?.split('').map(c => c.charCodeAt(0)));
        console.log('Student ID JSON:', JSON.stringify(studentId));
        
        // Check with exact match
        const existingStudent = await Student.findOne({ studentId: studentId });
        console.log('Existing student found (exact match):', existingStudent);
        
        // Also check all students to see what's in the database
        const allStudents = await Student.find({}, 'studentId');
        console.log('All student IDs in database:', allStudents.map(s => s.studentId));
        console.log('Database count:', allStudents.length);
        
        if (existingStudent) {
            console.log('Student ID already exists (exact match), returning error');
            console.log('Request ID:', requestId);
            // Clean up pending request before returning error
            pendingRequests.delete(requestKey);
            return res.status(400).json({ error: "Student ID already exists" });
        }
        
        console.log('Student ID is unique, proceeding with creation');

        // Check if email already exists
        const existingEmail = await Student.findOne({ email });
        if (existingEmail) {
            console.log('Email already exists, returning error');
            console.log('Request ID:', requestId);
            // Clean up pending request before returning error
            pendingRequests.delete(requestKey);
            return res.status(400).json({ error: "Email already exists" });
        }

        let student;
        await session.withTransaction(async () => {
            // Generate QR code data
            const qrCodeData = {
                id: studentId,
                name: fullName,
                grade: gradeLevel,
                section: section,
                shift: shift,
                email: email,
                contact: phoneNumber,
                emergencyContact: emergencyContact?.contactNumber || '',
                timestamp: new Date().toISOString()
            };

            // Generate QR code image
            let qrCodeImage = '';
            try {
                qrCodeImage = await QRCode.toDataURL(JSON.stringify(qrCodeData), {
                    errorCorrectionLevel: 'H',
                    type: 'image/png',
                    quality: 0.92,
                    margin: 1,
                    color: {
                        dark: '#000000',
                        light: '#FFFFFF'
                    }
                });
            } catch (qrError) {
                console.error('Error generating QR code:', qrError);
                // Continue without QR code if generation fails
            }

            const result = await Student.create([{
                studentId,
                fullName,
                email,
                password,
                plainPassword: password, // Store plain text for admin viewing
                phoneNumber,
                age,
                birthDate,
                gradeLevel,
                section,
                gender,
                photo,
                shift,
                address,
                parentInfo,
                emergencyContact,
                qrCode: {
                    data: JSON.stringify(qrCodeData),
                    image: qrCodeImage,
                    generatedAt: new Date(),
                    isActive: true
                }
            }], { session });
            student = result[0];
        });

        console.log('=== STUDENT CREATED SUCCESSFULLY ===');
        console.log('Request ID:', requestId);
        console.log('Student ID:', student.studentId);
        res.status(201).json(student);
    } catch (error) {
        console.error('Error creating student:', error);
        res.status(400).json({ error: error.message || "Failed to create student" });
    } finally {
        // Clean up pending request
        const requestKey = `${req.body.studentId}-${req.body.email}`;
        pendingRequests.delete(requestKey);
        console.log('=== REQUEST CLEANED UP ===');
        console.log('Request key removed:', requestKey);
        
        if (session) {
            await session.endSession();
        }
    }
};

// Get all students
const getAllStudents = async (req, res) => {
    try {
        const students = await Student.find({}).sort({ createdAt: -1 });
        
        // Backfill plainPassword for students that don't have it
        for (let student of students) {
            if (!student.plainPassword && student.password) {
                student.plainPassword = student.password;
                await student.save();
            }
        }
        
        res.status(200).json(students);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Get single student by ID
const getStudent = async (req, res) => {
    try {
        const { id } = req.params;
        const student = await Student.findById(id);

        if (!student) {
            return res.status(404).json({ error: "Student not found" });
        }

        res.status(200).json(student);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Get students by grade and section
const getStudentsByClass = async (req, res) => {
    try {
        const { gradeLevel, section } = req.query;
        const students = await Student.find({ gradeLevel, section }).sort({ fullName: 1 });
        res.status(200).json(students);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Update student
const updateStudent = async (req, res) => {
    try {
        const { id } = req.params;
        let updates = req.body;

        // If updating email or studentId, check for duplicates
        if (updates.email) {
            const existingEmail = await Student.findOne({
                email: updates.email,
                _id: { $ne: id }
            });
            if (existingEmail) {
                return res.status(400).json({ error: "Email already exists" });
            }
        }

        if (updates.studentId) {
            const existingStudent = await Student.findOne({
                studentId: updates.studentId,
                _id: { $ne: id }
            });
            if (existingStudent) {
                return res.status(400).json({ error: "Student ID already exists" });
            }
        }

        // If password is being updated, update both password and plainPassword
        if (updates.password && updates.plainPassword) {
            // Keep plainPassword in sync with password
            updates.plainPassword = updates.password;
        } else if (updates.password && !updates.plainPassword) {
            // If only password provided, set plainPassword to match
            updates.plainPassword = updates.password;
        }

        const student = await Student.findByIdAndUpdate(
            id,
            { ...updates },
            { new: true, runValidators: true }
        );

        if (!student) {
            return res.status(404).json({ error: "Student not found" });
        }

        res.status(200).json(student);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Delete student
const deleteStudent = async (req, res) => {
    try {
        const { id } = req.params;
        const student = await Student.findByIdAndDelete(id);

        if (!student) {
            return res.status(404).json({ error: "Student not found" });
        }

        res.status(200).json({ message: "Student deleted successfully" });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Search students
const searchStudents = async (req, res) => {
    try {
        const { query } = req.query;
        const students = await Student.find({
            $or: [
                { fullName: { $regex: query, $options: 'i' } },
                { studentId: { $regex: query, $options: 'i' } },
                { email: { $regex: query, $options: 'i' } }
            ]
        }).sort({ fullName: 1 });

        res.status(200).json(students);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Generate QR code for a student
const generateQRCode = async (req, res) => {
    try {
        const { id } = req.params;
        const student = await Student.findById(id);

        if (!student) {
            return res.status(404).json({ error: "Student not found" });
        }

        // Generate QR code data
        const qrCodeData = {
            id: student.studentId,
            name: student.fullName,
            grade: student.gradeLevel,
            section: student.section,
            shift: student.shift,
            email: student.email,
            contact: student.phoneNumber,
            emergencyContact: student.emergencyContact?.contactNumber || '',
            timestamp: new Date().toISOString()
        };

        // Generate QR code image
        let qrCodeImage = '';
        try {
            qrCodeImage = await QRCode.toDataURL(JSON.stringify(qrCodeData), {
                errorCorrectionLevel: 'H',
                type: 'image/png',
                quality: 0.92,
                margin: 1,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                }
            });
        } catch (qrError) {
            console.error('Error generating QR code:', qrError);
            return res.status(500).json({ error: "Failed to generate QR code" });
        }

        // Update student with new QR code
        const updatedStudent = await Student.findByIdAndUpdate(
            id,
            {
                qrCode: {
                    data: JSON.stringify(qrCodeData),
                    image: qrCodeImage,
                    generatedAt: new Date(),
                    isActive: true
                }
            },
            { new: true, runValidators: true }
        );

        res.status(200).json({
            message: "QR code generated successfully",
            qrCode: updatedStudent.qrCode,
            student: updatedStudent
        });
    } catch (error) {
        console.error('Error generating QR code:', error);
        res.status(400).json({ error: error.message });
    }
};

// Get QR code for a student
const getQRCode = async (req, res) => {
    try {
        const { id } = req.params;
        const student = await Student.findById(id).select('qrCode studentId fullName');

        if (!student) {
            return res.status(404).json({ error: "Student not found" });
        }

        if (!student.qrCode || !student.qrCode.isActive) {
            return res.status(404).json({ error: "QR code not found or inactive" });
        }

        res.status(200).json({
            studentId: student.studentId,
            fullName: student.fullName,
            qrCode: student.qrCode
        });
    } catch (error) {
        console.error('Error fetching QR code:', error);
        res.status(400).json({ error: error.message });
    }
};

// Regenerate QR codes for all students
const regenerateAllQRCodes = async (req, res) => {
    try {
        const students = await Student.find({});
        let successCount = 0;
        let errorCount = 0;

        for (const student of students) {
            try {
                const qrCodeData = {
                    id: student.studentId,
                    name: student.fullName,
                    grade: student.gradeLevel,
                    section: student.section,
                    shift: student.shift,
                    email: student.email,
                    contact: student.phoneNumber,
                    emergencyContact: student.emergencyContact?.contactNumber || '',
                    timestamp: new Date().toISOString()
                };

                const qrCodeImage = await QRCode.toDataURL(JSON.stringify(qrCodeData), {
                    errorCorrectionLevel: 'H',
                    type: 'image/png',
                    quality: 0.92,
                    margin: 1,
                    color: {
                        dark: '#000000',
                        light: '#FFFFFF'
                    }
                });

                await Student.findByIdAndUpdate(student._id, {
                    qrCode: {
                        data: JSON.stringify(qrCodeData),
                        image: qrCodeImage,
                        generatedAt: new Date(),
                        isActive: true
                    }
                });

                successCount++;
            } catch (error) {
                console.error(`Error regenerating QR code for student ${student.studentId}:`, error);
                errorCount++;
            }
        }

        res.status(200).json({
            message: `QR codes regeneration completed`,
            successCount,
            errorCount,
            totalStudents: students.length
        });
    } catch (error) {
        console.error('Error regenerating QR codes:', error);
        res.status(400).json({ error: error.message });
    }
};

// Get student by QR code scan (for mobile app)
const getStudentByQRCode = async (req, res) => {
    try {
        const { qrData, subject = 'General', location, deviceInfo, notes } = req.body;
        
        if (!qrData) {
            return res.status(400).json({ error: "QR code data is required" });
        }

        let parsedData;
        try {
            parsedData = JSON.parse(qrData);
        } catch (parseError) {
            return res.status(400).json({ error: "Invalid QR code data format" });
        }

        const { id: studentId } = parsedData;
        
        if (!studentId) {
            return res.status(400).json({ error: "Student ID not found in QR code" });
        }

        // Find student by studentId
        const student = await Student.findOne({ studentId: studentId });
        
        if (!student) {
            return res.status(404).json({ error: "Student not found" });
        }

        // Create attendance record for QR code scan
        // QR code scans are always "General" subject and "Present" status
        // Teachers can manually update status for specific subjects later
        try {
            const attendanceRecord = new History({
                studentId,
                studentName: student.fullName,
                subject: 'General', // Always General for QR code scans
                scanTime: new Date(),
                gradeLevel: student.gradeLevel,
                section: student.section,
                shift: student.shift,
                status: 'Present', // Always Present for QR code scans
                qrCodeData: parsedData,
                location,
                deviceInfo,
                notes: notes || 'QR Code scanned - Teacher can update status for specific subjects'
            });

            // Save the attendance record
            await attendanceRecord.save();

            console.log(`QR Code attendance record created for student ${studentId}: General - Present`);
        } catch (attendanceError) {
            console.error('Error creating attendance record:', attendanceError);
            // Continue with student info even if attendance record creation fails
        }

        // Return only the essential information for mobile display
        const studentInfo = {
            _id: student._id,
            studentId: student.studentId,
            fullName: student.fullName,
            photo: student.photo,
            gradeLevel: student.gradeLevel,
            section: student.section,
            gender: student.gender,
            shift: student.shift,
            email: student.email,
            phoneNumber: student.phoneNumber,
            // Include QR code verification timestamp
            lastScanned: new Date().toISOString()
        };

        res.status(200).json({
            success: true,
            message: "Student information retrieved successfully",
            student: studentInfo
        });
    } catch (error) {
        console.error('Error getting student by QR code:', error);
        res.status(400).json({ error: error.message });
    }
};

// Debug endpoint to clear database (for testing only)
const clearDatabase = async (req, res) => {
    try {
        console.log('=== CLEARING DATABASE FOR DEBUG ===');
        const result = await Student.deleteMany({});
        console.log('Deleted students count:', result.deletedCount);
        res.status(200).json({ message: `Cleared ${result.deletedCount} students from database` });
    } catch (error) {
        console.error('Error clearing database:', error);
        res.status(400).json({ error: error.message });
    }
};

module.exports = {
    createStudent,
    getAllStudents,
    getStudent,
    getStudentsByClass,
    updateStudent,
    deleteStudent,
    searchStudents,
    generateQRCode,
    getQRCode,
    regenerateAllQRCodes,
    getStudentByQRCode,
    clearDatabase
};
