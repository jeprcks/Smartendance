const History = require("../models/historySchema");
const Student = require("../models/studentsSchema");

// Create new attendance record
const createAttendanceRecord = async (req, res) => {
    try {
        const {
            studentId,
            studentName,
            subject = 'General',
            status = 'Present',
            attendanceType = 'In',  // 'In' for login, 'Out' for logout
            qrCodeData,
            location,
            deviceInfo,
            notes
        } = req.body;

        // Validate attendanceType
        if (!['In', 'Out'].includes(attendanceType)) {
            return res.status(400).json({ 
                error: "Invalid attendance type. Must be 'In' or 'Out'" 
            });
        }

        // Try to find the student to get additional information
        let student = null;
        try {
            student = await Student.findOne({ studentId });
        } catch (studentError) {
            console.log('Student lookup failed, proceeding with provided data:', studentError.message);
        }

        const now = new Date();

        // When type is checkout (Out), status should be Out
        const finalStatus = attendanceType === 'Out' ? 'Out' : status;

        // Create new attendance record
        const attendanceRecord = new History({
            studentId,
            studentName: studentName || (student ? student.fullName : 'Unknown Student'),
            subject,
            status: finalStatus,
            attendanceType,
            checkInTime: attendanceType === 'In' ? now : undefined,
            checkOutTime: attendanceType === 'Out' ? now : undefined,
            scanTime: now,
            gradeLevel: student ? student.gradeLevel : 'Unknown',
            section: student ? student.section : 'Unknown',
            shift: student ? student.shift : 'Unknown',
            qrCodeData,
            location,
            deviceInfo,
            notes
        });

        // If this is an 'Out' record, find and link to the matching 'In' record (required)
        if (attendanceType === 'Out') {
            const startOfDay = new Date(now);
            startOfDay.setHours(0, 0, 0, 0);
            
            const inRecord = await History.findOne({
                studentId,
                attendanceType: 'In',
                scanTime: {
                    $gte: startOfDay,
                    $lte: now
                },
                $or: [
                    { checkOutTime: { $exists: false } },
                    { checkOutTime: null }
                ]
            }).sort({ scanTime: -1 });

            if (inRecord) {
                console.log(`📍 Found matching check-in for ${studentId} at ${inRecord.checkInTime}`);
                
                // Link the records
                attendanceRecord.linkedRecordId = inRecord._id;
                
                // Calculate duration BEFORE updating
                const duration = Math.round((now - inRecord.checkInTime) / (1000 * 60));
                attendanceRecord.durationMinutes = duration > 0 ? duration : 0;
                
                // IMPORTANT: Update the 'In' record with checkOutTime using explicit update
                // This ensures the record is closed and student can check in again
                const updateResult = await History.updateOne(
                    { _id: inRecord._id },
                    { 
                        $set: { 
                            checkOutTime: now,
                            linkedRecordId: attendanceRecord._id,
                            durationMinutes: attendanceRecord.durationMinutes
                        }
                    }
                );
                
                console.log(`✓ Check-out recorded for ${studentId}`);
                console.log(`  - In record ID: ${inRecord._id}`);
                console.log(`  - CheckOutTime set: ${now}`);
                console.log(`  - Duration: ${attendanceRecord.durationMinutes} minutes`);
                console.log(`  - Update acknowledged: ${updateResult.acknowledged}`);
                console.log(`  - Docs modified: ${updateResult.modifiedCount}`);
            } else {
                // Reject check-out if no open check-in (handles concurrent scan race)
                console.log(`⚠️ No unclosed check-in found for ${studentId} checkout - rejecting`);
                return res.status(400).json({
                    error: 'No check-in found. Please check in first before checking out.',
                    code: 'NO_OPEN_CHECKIN'
                });
            }
        }

        // Save the record
        await attendanceRecord.save();

        res.status(201).json({
            success: true,
            message: `${attendanceType === 'In' ? 'Check-in' : 'Check-out'} record created successfully`,
            record: attendanceRecord
        });
    } catch (error) {
        console.error('Error creating attendance record:', error);
        res.status(400).json({ error: error.message || "Failed to create attendance record" });
    }
};

// Get all attendance records with filtering and pagination
const getAllAttendanceRecords = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 50,
            studentId,
            subject,
            status,
            startDate,
            endDate,
            gradeLevel,
            section,
            shift,
            search,
            attendanceType  // Optional: filter by 'In' or 'Out', default is 'In'
        } = req.query;

        // Build filter object
        const filter = {};
        
        // Default to 'In' records for main attendance view
        // Set attendanceType to 'All' in query to see both In and Out
        if (attendanceType !== 'All') {
            filter.attendanceType = attendanceType || 'In';
        }
        
        if (studentId) filter.studentId = studentId;
        if (subject) filter.subject = subject;
        if (status) filter.status = status;
        if (gradeLevel) filter.gradeLevel = gradeLevel;
        if (section) filter.section = section;
        if (shift) filter.shift = shift;
        
        // Date range filter
        if (startDate || endDate) {
            filter.scanTime = {};
            if (startDate) filter.scanTime.$gte = new Date(startDate);
            if (endDate) filter.scanTime.$lte = new Date(endDate);
        }
        
        // Search filter
        if (search) {
            filter.$or = [
                { studentName: { $regex: search, $options: 'i' } },
                { studentId: { $regex: search, $options: 'i' } },
                { subject: { $regex: search, $options: 'i' } }
            ];
        }

        // Calculate pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        // Get total count for pagination
        const totalRecords = await History.countDocuments(filter);
        
        // Get records with pagination
        const records = await History.find(filter)
            .sort({ scanTime: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        res.status(200).json({
            success: true,
            records,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(totalRecords / parseInt(limit)),
                totalRecords,
                hasNext: skip + records.length < totalRecords,
                hasPrev: parseInt(page) > 1
            }
        });
    } catch (error) {
        console.error('Error getting attendance records:', error);
        res.status(400).json({ error: error.message });
    }
};

// Get single attendance record
const getAttendanceRecord = async (req, res) => {
    try {
        const { id } = req.params;
        const record = await History.findById(id);

        if (!record) {
            return res.status(404).json({ error: "Attendance record not found" });
        }

        res.status(200).json({
            success: true,
            record
        });
    } catch (error) {
        console.error('Error getting attendance record:', error);
        res.status(400).json({ error: error.message });
    }
};

// Update attendance record
const updateAttendanceRecord = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        
        // Add status change to history if status is being updated
        if (updates.status) {
            const record = await History.findById(id);
            if (record && record.status !== updates.status) {
                updates.statusHistory = [
                    ...(record.statusHistory || []),
                    {
                        status: updates.status,
                        changedAt: new Date(),
                        changedBy: req.user?.id || 'System',
                        reason: updates.reason || 'Manual update'
                    }
                ];
            }
        }

        const updatedRecord = await History.findByIdAndUpdate(
            id,
            updates,
            { new: true, runValidators: true }
        );

        if (!updatedRecord) {
            return res.status(404).json({ error: "Attendance record not found" });
        }

        res.status(200).json({
            success: true,
            message: "Attendance record updated successfully",
            record: updatedRecord
        });
    } catch (error) {
        console.error('Error updating attendance record:', error);
        res.status(400).json({ error: error.message });
    }
};

// Delete attendance record
const deleteAttendanceRecord = async (req, res) => {
    try {
        const { id } = req.params;
        const record = await History.findByIdAndDelete(id);

        if (!record) {
            return res.status(404).json({ error: "Attendance record not found" });
        }

        res.status(200).json({
            success: true,
            message: "Attendance record deleted successfully"
        });
    } catch (error) {
        console.error('Error deleting attendance record:', error);
        res.status(400).json({ error: error.message });
    }
};

// Get attendance statistics
const getAttendanceStats = async (req, res) => {
    try {
        const { startDate, endDate, gradeLevel, section, shift } = req.query;
        
        const filter = {
            attendanceType: 'In'  // Only count 'In' records for attendance stats
        };
        
        if (startDate || endDate) {
            filter.scanTime = {};
            if (startDate) filter.scanTime.$gte = new Date(startDate);
            if (endDate) filter.scanTime.$lte = new Date(endDate);
        }
        if (gradeLevel) filter.gradeLevel = gradeLevel;
        if (section) filter.section = section;
        if (shift) filter.shift = shift;

        const stats = await History.aggregate([
            { $match: filter },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);

        const result = {
            present: 0,
            absent: 0,
            late: 0,
            cutting: 0,
            total: 0
        };

        stats.forEach(stat => {
            if (stat._id) {
                result[stat._id.toLowerCase()] = stat.count;
            }
            result.total += stat.count;
        });

        res.status(200).json({
            success: true,
            stats: result
        });
    } catch (error) {
        console.error('Error getting attendance stats:', error);
        res.status(400).json({ error: error.message });
    }
};

// Get student attendance history
const getStudentAttendanceHistory = async (req, res) => {
    try {
        const { studentId } = req.params;
        const { startDate, endDate, limit = 50 } = req.query;
        const Schedule = require('../models/scheduleSchema');

        const filter = { 
            studentId
            // Return all records (both In and Out) to show complete attendance history
        };
        
        if (startDate || endDate) {
            filter.scanTime = {};
            if (startDate) filter.scanTime.$gte = new Date(startDate);
            if (endDate) filter.scanTime.$lte = new Date(endDate);
        }

        // Get student info
        const student = await Student.findOne({ studentId });
        if (!student) {
            return res.status(404).json({ error: "Student not found" });
        }

        // Get attendance records
        let records = await History.find(filter)
            .sort({ scanTime: -1 })
            .limit(parseInt(limit));

        // Enrich records with schedule information and check-out details
        records = await Promise.all(records.map(async (record) => {
            const recordObj = record.toObject ? record.toObject() : record;
            
            try {
                // Find the corresponding check-out record
                const checkOutRecord = await History.findOne({
                    studentId,
                    attendanceType: 'Out',
                    linkedRecordId: record._id
                });
                
                if (checkOutRecord) {
                    recordObj.checkOutTime = checkOutRecord.checkOutTime;
                    recordObj.durationMinutes = checkOutRecord.durationMinutes;
                }
                
                // Find the schedule for this student's grade/section/subject
                let schedule = await Schedule.findOne({
                    gradeLevel: recordObj.gradeLevel,
                    section: recordObj.section,
                    subject: recordObj.subject !== 'General' ? recordObj.subject : { $ne: 'General' },
                    isActive: true
                });
                
                if (schedule) {
                    recordObj.scheduleDay = schedule.day;
                    recordObj.scheduleTimeSlot = schedule.timeSlot;
                    recordObj.scheduleTeacher = schedule.teacher;
                } else {
                    // If no specific subject schedule, try to get any schedule for this class
                    schedule = await Schedule.findOne({
                        gradeLevel: recordObj.gradeLevel,
                        section: recordObj.section,
                        isActive: true
                    });
                    
                    if (schedule) {
                        recordObj.scheduleDay = schedule.day;
                        recordObj.scheduleTimeSlot = schedule.timeSlot;
                        recordObj.scheduleTeacher = schedule.teacher;
                    }
                }
            } catch (scheduleError) {
                console.log('Could not fetch schedule for subject:', recordObj.subject);
            }
            
            return recordObj;
        }));

        // Get student statistics
        const stats = await History.getStudentStats(studentId, startDate, endDate);

        res.status(200).json({
            success: true,
            student: {
                id: student.studentId,
                name: student.fullName,
                gradeLevel: student.gradeLevel,
                section: student.section,
                shift: student.shift
            },
            stats,
            records
        });
    } catch (error) {
        console.error('Error getting student attendance history:', error);
        res.status(400).json({ error: error.message });
    }
};

// Get attendance records for history page (with student details)
const getHistoryPageData = async (req, res) => {
    try {
        const {
            search,
            status,
            startDate,
            endDate,
            page = 1,
            limit = 50
        } = req.query;
        const Schedule = require('../models/scheduleSchema');

        // Build filter object
        const filter = {};
        
        if (status) filter.status = status;
        
        // Date range filter
        if (startDate || endDate) {
            filter.scanTime = {};
            if (startDate) {
                // If startDate is just a date (YYYY-MM-DD), set it to start of day
                const start = new Date(startDate);
                if (startDate.length === 10) { // YYYY-MM-DD format
                    start.setHours(0, 0, 0, 0);
                }
                filter.scanTime.$gte = start;
            }
            if (endDate) {
                // If endDate is just a date (YYYY-MM-DD), set it to end of day
                const end = new Date(endDate);
                if (endDate.length === 10) { // YYYY-MM-DD format
                    end.setHours(23, 59, 59, 999);
                }
                filter.scanTime.$lte = end;
            }
        }
        
        // Search filter
        if (search) {
            filter.$or = [
                { studentName: { $regex: search, $options: 'i' } },
                { studentId: { $regex: search, $options: 'i' } },
                { subject: { $regex: search, $options: 'i' } }
            ];
        }

        // Calculate pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        // Get total count for pagination
        const totalRecords = await History.countDocuments(filter);
        
        // Get records with pagination and populate student details
        let records = await History.find(filter)
            .sort({ scanTime: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        // Enrich records with schedule information for each specific subject
        records = await Promise.all(records.map(async (record) => {
            const recordObj = record.toObject ? record.toObject() : record;
            
            try {
                // Find the schedule for this student's grade/section/subject
                let schedule = await Schedule.findOne({
                    gradeLevel: recordObj.gradeLevel,
                    section: recordObj.section,
                    subject: recordObj.subject !== 'General' ? recordObj.subject : { $ne: 'General' },
                    isActive: true
                });
                
                if (schedule) {
                    recordObj.scheduleDay = schedule.day;
                    recordObj.scheduleTimeSlot = schedule.timeSlot;
                    recordObj.scheduleTeacher = schedule.teacher;
                } else {
                    // If no specific subject schedule, try to get any schedule for this class
                    schedule = await Schedule.findOne({
                        gradeLevel: recordObj.gradeLevel,
                        section: recordObj.section,
                        isActive: true
                    });
                    
                    if (schedule) {
                        recordObj.scheduleDay = schedule.day;
                        recordObj.scheduleTimeSlot = schedule.timeSlot;
                        recordObj.scheduleTeacher = schedule.teacher;
                    }
                }
            } catch (scheduleError) {
                console.log('Could not fetch schedule for subject:', recordObj.subject);
            }
            
            return recordObj;
        }));

        // Get statistics for the filtered data
        const stats = await History.aggregate([
            { $match: filter },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);

        const statsResult = {
            present: 0,
            absent: 0,
            late: 0,
            cutting: 0,
            total: 0
        };

        stats.forEach(stat => {
            if (stat._id) {
                statsResult[stat._id.toLowerCase()] = stat.count;
            }
            statsResult.total += stat.count;
        });

        res.status(200).json({
            success: true,
            records,
            stats: statsResult,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(totalRecords / parseInt(limit)),
                totalRecords,
                hasNext: skip + records.length < totalRecords,
                hasPrev: parseInt(page) > 1
            }
        });
    } catch (error) {
        console.error('Error getting history page data:', error);
        res.status(400).json({ error: error.message });
    }
};

// Get daily attendance summary for all students (with check-in and check-out)
const getDailyAttendanceSummary = async (req, res) => {
    try {
        const { date, gradeLevel, section, shift } = req.query;
        
        if (!date) {
            return res.status(400).json({ 
                error: "Date parameter is required (format: YYYY-MM-DD)" 
            });
        }

        const startDate = new Date(date);
        startDate.setHours(0, 0, 0, 0);
        
        const endDate = new Date(date);
        endDate.setHours(23, 59, 59, 999);

        const filter = {
            scanTime: {
                $gte: startDate,
                $lte: endDate
            }
        };

        if (gradeLevel) filter.gradeLevel = gradeLevel;
        if (section) filter.section = section;
        if (shift) filter.shift = shift;

        // Get all check-in records for the day
        const checkInRecords = await History.find({
            ...filter,
            attendanceType: 'In'
        }).sort({ scanTime: 1 });

        // Get all check-out records for the day
        const checkOutRecords = await History.find({
            ...filter,
            attendanceType: 'Out'
        }).sort({ scanTime: 1 });

        // Pair check-ins with check-outs
        const attendanceSummary = await Promise.all(checkInRecords.map(async (checkIn) => {
            let checkOut = null;
            let durationMinutes = 0;

            if (checkIn.linkedRecordId) {
                checkOut = await History.findById(checkIn.linkedRecordId);
            } else {
                // Try to find matching check-out
                checkOut = checkOutRecords.find(r => 
                    r.studentId === checkIn.studentId && 
                    r.scanTime > checkIn.scanTime
                );
            }

            if (checkOut) {
                durationMinutes = Math.round((checkOut.scanTime - checkIn.scanTime) / (1000 * 60));
            }

            return {
                studentId: checkIn.studentId,
                studentName: checkIn.studentName,
                gradeLevel: checkIn.gradeLevel,
                section: checkIn.section,
                shift: checkIn.shift,
                subject: checkIn.subject,
                checkInTime: checkIn.scanTime,
                checkOutTime: checkOut ? checkOut.scanTime : null,
                durationMinutes: durationMinutes,
                status: checkIn.status,
                hasCheckedOut: !!checkOut
            };
        }));

        // Sort by check-in time
        attendanceSummary.sort((a, b) => new Date(a.checkInTime) - new Date(b.checkInTime));

        res.status(200).json({
            success: true,
            date,
            summary: attendanceSummary,
            statistics: {
                totalPresent: attendanceSummary.filter(r => r.status === 'Present').length,
                totalAbsent: attendanceSummary.filter(r => r.status === 'Absent').length,
                totalLate: attendanceSummary.filter(r => r.status === 'Late').length,
                totalCutting: attendanceSummary.filter(r => r.status === 'Cutting').length,
                checkedOut: attendanceSummary.filter(r => r.hasCheckedOut).length,
                notCheckedOut: attendanceSummary.filter(r => !r.hasCheckedOut).length,
                total: attendanceSummary.length
            }
        });
    } catch (error) {
        console.error('Error getting daily attendance summary:', error);
        res.status(400).json({ error: error.message });
    }
};

// Export attendance data
const exportAttendanceData = async (req, res) => {
    try {
        const { startDate, endDate, format = 'json' } = req.query;
        
        const filter = {};
        
        if (startDate || endDate) {
            filter.scanTime = {};
            if (startDate) {
                // If startDate is just a date (YYYY-MM-DD), set it to start of day
                const start = new Date(startDate);
                if (startDate.length === 10) { // YYYY-MM-DD format
                    start.setHours(0, 0, 0, 0);
                }
                filter.scanTime.$gte = start;
            }
            if (endDate) {
                // If endDate is just a date (YYYY-MM-DD), set it to end of day
                const end = new Date(endDate);
                if (endDate.length === 10) { // YYYY-MM-DD format
                    end.setHours(23, 59, 59, 999);
                }
                filter.scanTime.$lte = end;
            }
        }

        const records = await History.find(filter)
            .sort({ scanTime: -1 })
            .select('studentId studentName subject scanTime status gradeLevel section shift');

        if (format === 'csv') {
            // Convert to CSV format
            const csvHeader = 'Student ID,Student Name,Subject,Date,Time,Status,Grade,Section,Shift\n';
            const csvData = records.map(record => {
                const date = record.scanTime.toLocaleDateString();
                const time = record.scanTime.toLocaleTimeString();
                return `${record.studentId},"${record.studentName}","${record.subject}","${date}","${time}","${record.status}","${record.gradeLevel}","${record.section}","${record.shift}"`;
            }).join('\n');
            
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=attendance_records.csv');
            res.send(csvHeader + csvData);
        } else {
            // Return JSON format
            res.status(200).json({
                success: true,
                records,
                exportedAt: new Date().toISOString(),
                totalRecords: records.length
            });
        }
    } catch (error) {
        console.error('Error exporting attendance data:', error);
        res.status(400).json({ error: error.message });
    }
};

module.exports = {
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
};
