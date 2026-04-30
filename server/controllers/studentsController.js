const Student = require("../models/studentsSchema");
const History = require("../models/historySchema");
const QRCode = require('qrcode');

// Store pending requests to prevent duplicates
const pendingRequests = new Map();

// Create new student
const createStudent = async (req, res) => {
    try {
        const {
            studentId,
            fullName,
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
        const requestKey = `${studentId}`;
        
        console.log('=== NEW REQUEST RECEIVED ===');
        console.log('Request ID:', requestId);
        console.log('Request key:', requestKey);
        console.log('Student ID:', studentId);
        
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

        // Clean up parentInfo to avoid null email causing unique constraint issues
        let cleanedParentInfo = parentInfo;
        if (parentInfo) {
            cleanedParentInfo = {
                ...parentInfo,
                // Don't include email if it's null/undefined
                ...(parentInfo.email ? { email: parentInfo.email } : {}),
            };
        }

        // Generate QR code data
        const qrCodeData = {
            id: studentId,
            name: fullName,
            grade: gradeLevel,
            section: section,
            shift: shift,
            contact: phoneNumber,
            emergencyContact: emergencyContact?.contactNumber || '',
            parentEmail: parentInfo?.email || '',
            parentPassword: parentInfo?.password || '',
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

        const student = await Student.create({
            studentId,
            fullName,
            phoneNumber,
            age,
            birthDate,
            gradeLevel,
            section,
            gender,
            photo,
            shift,
            address,
            parentInfo: cleanedParentInfo,
            emergencyContact,
            qrCode: {
                data: JSON.stringify(qrCodeData),
                image: qrCodeImage,
                generatedAt: new Date(),
                isActive: true
            }
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
        const requestKey = `${req.body.studentId}`;
        pendingRequests.delete(requestKey);
        console.log('=== REQUEST CLEANED UP ===');
        console.log('Request key removed:', requestKey);
    }
};

// Get all students (optional filter: status=Active|Inactive)
const getAllStudents = async (req, res) => {
    try {
        const { status, limit = 100, page = 1 } = req.query;
        const filter = {};
        if (status && ['Active', 'Inactive'].includes(status)) {
            filter.status = status;
        }
        
        // Add pagination to prevent loading too much data
        const skip = (Number(page) - 1) * Number(limit);
        const students = await Student.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));
        
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

// Get students by grade and section (optional status filter)
const getStudentsByClass = async (req, res) => {
    try {
        const { gradeLevel, section, status } = req.query;
        const filter = { gradeLevel, section };
        if (status && ['Active', 'Inactive'].includes(status)) {
            filter.status = status;
        }
        const students = await Student.find(filter).sort({ fullName: 1 });
        res.status(200).json(students);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Get students enrolled in a specific teacher's schedule (new endpoint)
const getStudentsByTeacherSchedule = async (req, res) => {
    try {
        const { teacherName, gradeLevel, section, subject, shift } = req.query;
        
        // Validate required parameters
        if (!teacherName || !gradeLevel || !section) {
            return res.status(400).json({ 
                error: "teacherName, gradeLevel, and section are required parameters" 
            });
        }

        // Import Schedule model
        const Schedule = require("../models/scheduleSchema");

        // Find all schedules for this teacher in this specific class (grade & section)
        const scheduleFilter = { 
            teacher: teacherName,
            gradeLevel: gradeLevel,
            section: section,
            isActive: true
        };
        
        if (subject) scheduleFilter.subject = subject;
        // If shift is provided, filter by it; otherwise get all shifts for this teacher in this class
        if (shift) scheduleFilter.shift = shift;
        
        const teacherSchedules = await Schedule.find(scheduleFilter);

        if (!teacherSchedules || teacherSchedules.length === 0) {
            console.log(`No schedules found for teacher: ${teacherName} in ${gradeLevel} ${section}`);
            return res.status(200).json([]);
        }

        console.log(`Found ${teacherSchedules.length} schedule(s) for teacher: ${teacherName} in ${gradeLevel} ${section}`);
        console.log('Teacher schedules:', teacherSchedules.map(s => ({ subject: s.subject, shift: s.shift, day: s.day })));

        // Get all unique shifts from teacher's schedules in this class
        const shiftsSet = new Set(teacherSchedules.map(s => s.shift));
        const shiftsArray = Array.from(shiftsSet);
        
        console.log(`Teacher teaches in shifts: ${shiftsArray.join(', ')}`);

        // Find students in this grade and section that match the teacher's shift(s) (active only)
        const studentFilter = {
            gradeLevel: gradeLevel,
            section: section,
            shift: { $in: shiftsArray },
            $or: [{ status: 'Active' }, { status: { $exists: false } }]  // Include legacy docs without status
        };

        const students = await Student.find(studentFilter).sort({ fullName: 1 });

        console.log(`Found ${students.length} students in ${gradeLevel} ${section} matching teacher's shift(s)`);
        console.log(`Returning ${students.length} students for ${teacherName}`);
        
        res.status(200).json(students);
    } catch (error) {
        console.error('Error getting students by teacher schedule:', error);
        res.status(400).json({ error: error.message });
    }
};

// Update student
const updateStudent = async (req, res) => {
    try {
        const { id } = req.params;
        let updates = req.body;

        // Remove email and password from updates if they exist
        delete updates.email;
        delete updates.password;
        delete updates.plainPassword;

        if (updates.studentId) {
            const existingStudent = await Student.findOne({
                studentId: updates.studentId,
                _id: { $ne: id }
            });
            if (existingStudent) {
                return res.status(400).json({ error: "Student ID already exists" });
            }
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
                { studentId: { $regex: query, $options: 'i' } }
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
            contact: student.phoneNumber,
            emergencyContact: student.emergencyContact?.contactNumber || '',
            parentEmail: student.parentInfo?.email || '',
            parentPassword: student.parentInfo?.password || '',
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
        console.log('=== GET QR CODE REQUEST ===');
        console.log('Student ID parameter:', id);
        
        let student;

        // Try to find by MongoDB _id first
        try {
            student = await Student.findById(id).select('qrCode studentId fullName parentInfo');
            console.log('Search by MongoDB _id - Found:', !!student);
        } catch (err) {
            // If not a valid MongoDB ObjectId, search by studentId instead
            console.log('MongoDB _id search failed (expected for non-ObjectId):', err.message);
            student = null;
        }

        // If not found by _id, try searching by studentId
        if (!student) {
            console.log('Searching by studentId instead...');
            student = await Student.findOne({ studentId: id }).select('qrCode studentId fullName parentInfo');
            console.log('Search by studentId - Found:', !!student);
            if (student) {
                console.log('Student details - ID:', student.studentId, 'Name:', student.fullName);
                console.log('QR Code present:', !!student.qrCode);
                if (student.qrCode) {
                    console.log('QR Code active:', student.qrCode.isActive);
                    console.log('QR Code data length:', student.qrCode.data?.length);
                    console.log('QR Code image length:', student.qrCode.image?.length);
                }
            }
        }

        if (!student) {
            console.log('Student not found with ID:', id);
            return res.status(404).json({ error: "Student not found" });
        }

        if (!student.qrCode || !student.qrCode.isActive) {
            console.log('QR code missing or inactive');
            console.log('QR Code exists:', !!student.qrCode);
            console.log('QR Code active:', student.qrCode?.isActive);
            
            // Generate QR code if it doesn't exist
            console.log('Generating new QR code for student:', student.studentId);
            const qrCodeData = {
                id: student.studentId,
                name: student.fullName,
                parentEmail: student.parentInfo?.email || '',
                parentPassword: student.parentInfo?.password || '',
                timestamp: new Date().toISOString()
            };

            const QRCodeLib = require('qrcode');
            let qrCodeImage = '';
            try {
                qrCodeImage = await QRCodeLib.toDataURL(JSON.stringify(qrCodeData), {
                    errorCorrectionLevel: 'H',
                    type: 'image/png',
                    quality: 0.92,
                    margin: 1,
                    color: {
                        dark: '#000000',
                        light: '#FFFFFF'
                    }
                });
                console.log('QR Code generated successfully');
            } catch (qrError) {
                console.error('Error generating QR code:', qrError);
                return res.status(500).json({ error: "Failed to generate QR code" });
            }

            // Update student with new QR code
            student = await Student.findByIdAndUpdate(
                student._id,
                {
                    qrCode: {
                        data: JSON.stringify(qrCodeData),
                        image: qrCodeImage,
                        generatedAt: new Date(),
                        isActive: true
                    }
                },
                { new: true }
            );
            console.log('Student updated with new QR code');
        }

        console.log('=== SENDING QR CODE RESPONSE ===');
        res.status(200).json({
            studentId: student.studentId,
            fullName: student.fullName,
            qrCode: student.qrCode
        });
    } catch (error) {
        console.error('=== ERROR FETCHING QR CODE ===');
        console.error('Error type:', error.constructor.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
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
                    contact: student.phoneNumber,
                    emergencyContact: student.emergencyContact?.contactNumber || '',
                    parentEmail: student.parentInfo?.email || '',
                    parentPassword: student.parentInfo?.password || '',
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

        // IMPORTANT:
        // This endpoint only validates QR and returns student info.
        // Attendance creation must happen only in /api/history to avoid duplicate records.

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

// Validate if student can check-in (check for open check-in without checkout)
const validateCheckIn = async (req, res) => {
    try {
        const { qrData } = req.body;

        if (!qrData) {
            return res.status(400).json({ error: "QR data is required" });
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

        // Find student
        const student = await Student.findOne({ studentId: studentId });

        if (!student) {
            return res.status(404).json({ error: "Student not found" });
        }

        // Check if student has an open check-in today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Find open check-in: Has 'In' attendanceType but no corresponding 'Out'
        // Use explicit query: attendanceType='In' AND (checkOutTime does not exist OR checkOutTime is null)
        const openCheckIn = await History.findOne({
            studentId: studentId,
            attendanceType: 'In',
            scanTime: {
                $gte: today,
                $lt: tomorrow
            },
            $or: [
                { checkOutTime: { $exists: false } },
                { checkOutTime: null }
            ]
        });

        console.log(`🔍 Check-in validation for ${studentId}:`);
        console.log(`  - Date range: ${today} to ${tomorrow}`);
        console.log(`  - Open check-in found: ${openCheckIn ? 'YES (BLOCKED)' : 'NO (ALLOWED)'}`);
        if (openCheckIn) {
            console.log(`  - In Record ID: ${openCheckIn._id}`);
            console.log(`  - Check-in Time: ${openCheckIn.checkInTime}`);
            console.log(`  - Check-out Time: ${openCheckIn.checkOutTime}`);
        }

        res.status(200).json({
            success: true,
            hasOpenCheckIn: openCheckIn !== null,
            studentName: student.fullName,
            studentId: student.studentId
        });

    } catch (error) {
        console.error('Error validating check-in:', error);
        res.status(500).json({ error: error.message || 'Failed to validate check-in' });
    }
};

// Validate checkout: must have open check-in and cannot checkout twice
const validateCheckOut = async (req, res) => {
    try {
        const { qrData } = req.body;

        if (!qrData) {
            return res.status(400).json({ error: "QR data is required" });
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

        // Find student
        const student = await Student.findOne({ studentId: studentId });

        if (!student) {
            return res.status(404).json({ error: "Student not found" });
        }

        // Check for checkout conditions today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Find open check-in (has 'In' but no checkout yet)
        const openCheckIn = await History.findOne({
            studentId: studentId,
            attendanceType: 'In',
            scanTime: {
                $gte: today,
                $lt: tomorrow
            },
            $or: [
                { checkOutTime: { $exists: false } },
                { checkOutTime: null }
            ]
        });

        // Check if student already checked out today
        // (has 'Out' attendanceType today - which means they checked out)
        const alreadyCheckedOut = await History.findOne({
            studentId: studentId,
            attendanceType: 'Out',
            scanTime: {
                $gte: today,
                $lt: tomorrow
            }
        });

        const hasNoCheckIn = !openCheckIn;
        // Only block checkout if there's NO open check-in AND already checked out
        // If there's an open check-in, allow checkout (even after 2nd check-in)
        const hasOpenCheckOut = hasNoCheckIn && alreadyCheckedOut !== null;

        console.log(`🔍 Check-out validation for ${studentId}:`);
        console.log(`  - Has open check-in: ${!hasNoCheckIn}`);
        console.log(`  - Previous 'Out' record exists: ${alreadyCheckedOut !== null}`);
        console.log(`  - Will block checkout: ${hasOpenCheckOut}`);
        if (openCheckIn) {
            console.log(`  - Open In Record ID: ${openCheckIn._id}`);
            console.log(`  - Check-in Time: ${openCheckIn.checkInTime}`);
        }
        if (alreadyCheckedOut) {
            console.log(`  - Previous Out Record ID: ${alreadyCheckedOut._id}`);
        }
        console.log(`  - Status: ${hasOpenCheckOut ? 'BLOCKED (no check-in but already checked out)' : hasNoCheckIn ? 'BLOCKED (no check-in)' : 'ALLOWED (has open check-in)'}`);

        res.status(200).json({
            success: true,
            alreadyCheckedOut: hasOpenCheckOut,
            hasNoCheckIn: hasNoCheckIn,
            studentName: student.fullName,
            studentId: student.studentId
        });

    } catch (error) {
        console.error('Error validating check-out:', error);
        res.status(500).json({ error: error.message || 'Failed to validate check-out' });
    }
};

// Bulk update students (grade level, section, shift)
const bulkUpdateStudents = async (req, res) => {
    try {
        const { ids, updates } = req.body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ error: 'ids array is required and must not be empty' });
        }
        if (!updates || typeof updates !== 'object') {
            return res.status(400).json({ error: 'updates object is required' });
        }

        const allowed = ['gradeLevel', 'section', 'shift', 'status', 'graduationDate', 'graduationSchoolYear'];
        const sanitized = {};
        for (const key of allowed) {
            if (updates[key] !== undefined && updates[key] !== null && updates[key] !== '') {
                sanitized[key] = key === 'graduationDate' ? new Date(updates[key]) : updates[key];
            }
        }
        if (Object.keys(sanitized).length === 0) {
            return res.status(400).json({ error: 'At least one of gradeLevel, section, shift, status, graduationDate, or graduationSchoolYear is required' });
        }

        const result = await Student.updateMany(
            { _id: { $in: ids } },
            { $set: sanitized }
        );

        res.status(200).json({
            success: true,
            message: `Updated ${result.modifiedCount} student(s)`,
            modifiedCount: result.modifiedCount,
            matchedCount: result.matchedCount
        });
    } catch (error) {
        console.error('Error bulk updating students:', error);
        res.status(400).json({ error: error.message || 'Failed to bulk update students' });
    }
};

module.exports = {
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
    validateCheckIn,
    validateCheckOut,
    clearDatabase,
    bulkUpdateStudents
};
