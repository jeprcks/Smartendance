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
            qrCodeData,
            location,
            deviceInfo,
            notes
        } = req.body;

        // Try to find the student to get additional information
        let student = null;
        try {
            student = await Student.findOne({ studentId });
        } catch (studentError) {
            console.log('Student lookup failed, proceeding with provided data:', studentError.message);
        }

        // Create new attendance record
        const attendanceRecord = new History({
            studentId,
            studentName: studentName || (student ? student.fullName : 'Unknown Student'),
            subject,
            status,
            scanTime: new Date(),
            gradeLevel: student ? student.gradeLevel : 'Unknown',
            section: student ? student.section : 'Unknown',
            shift: student ? student.shift : 'Unknown',
            qrCodeData,
            location,
            deviceInfo,
            notes
        });

        // Save the record
        await attendanceRecord.save();

        res.status(201).json({
            success: true,
            message: "Attendance record created successfully",
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
            search
        } = req.query;

        // Build filter object
        const filter = {};
        
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
        
        const filter = {};
        
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
            result[stat._id.toLowerCase()] = stat.count;
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

        const filter = { studentId };
        
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
        const records = await History.find(filter)
            .sort({ scanTime: -1 })
            .limit(parseInt(limit));

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
        const records = await History.find(filter)
            .sort({ scanTime: -1 })
            .skip(skip)
            .limit(parseInt(limit));

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
            statsResult[stat._id.toLowerCase()] = stat.count;
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
    exportAttendanceData
};
