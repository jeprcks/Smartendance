const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const historySchema = new Schema(
    {
        studentId: {
            type: String,
            required: true,
            ref: 'Student'
        },
        studentName: {
            type: String,
            required: true
        },
        subject: {
            type: String,
            required: true,
            default: 'General'
        },
        // Attendance Type: 'In' for login/entry, 'Out' for logout/exit
        attendanceType: {
            type: String,
            required: true,
            enum: ['In', 'Out'],
            default: 'In'
        },
        // Check-in time (when student scans the 'In' tablet)
        checkInTime: {
            type: Date,
            required: function() { return this.attendanceType === 'In'; }
        },
        // Check-out time (when student scans the 'Out' tablet)
        checkOutTime: {
            type: Date,
            required: function() { return this.attendanceType === 'Out'; }
        },
        // Original scanTime field - kept for backward compatibility
        // For 'In' records: scanTime = checkInTime
        // For 'Out' records: scanTime = checkOutTime
        scanTime: {
            type: Date,
            required: true,
            default: Date.now
        },
        status: {
            type: String,
            required: true,
            enum: ['Present', 'Late', 'Absent', 'Cutting', 'Out'],
            default: 'Present'
        },
        // Duration in minutes between check-in and check-out
        durationMinutes: {
            type: Number,
            required: false,
            default: 0
        },
        // Linked attendance record (In and Out pair)
        linkedRecordId: {
            type: String,
            required: false,
            ref: 'History'
        },
        // Additional metadata
        gradeLevel: {
            type: String,
            required: true
        },
        section: {
            type: String,
            required: true
        },
        shift: {
            type: String,
            required: true,
            enum: ['Morning', 'Afternoon']
        },
        // QR Code scan details
        qrCodeData: {
            type: Object,
            required: false
        },
        // Location information (if available)
        location: {
            latitude: { type: Number },
            longitude: { type: Number },
            address: { type: String }
        },
        // Device information
        deviceInfo: {
            platform: { type: String },
            userAgent: { type: String },
            ipAddress: { type: String }
        },
        // Notes or comments
        notes: {
            type: String,
            maxlength: 500
        },
        // Status change tracking
        statusHistory: [{
            status: { type: String, enum: ['Present', 'Late', 'Absent', 'Cutting'] },
            changedAt: { type: Date, default: Date.now },
            changedBy: { type: String },
            reason: { type: String }
        }],
        // Verification flags
        isVerified: {
            type: Boolean,
            default: false
        },
        verifiedBy: {
            type: String,
            required: false
        },
        verifiedAt: {
            type: Date,
            required: false
        }
    },
    {
        timestamps: true
    }
);

// Indexes for better query performance
historySchema.index({ studentId: 1, scanTime: -1 });
historySchema.index({ scanTime: -1 });
historySchema.index({ status: 1 });
historySchema.index({ subject: 1 });
historySchema.index({ gradeLevel: 1, section: 1 });
historySchema.index({ attendanceType: 1 });
historySchema.index({ checkInTime: 1 });
historySchema.index({ checkOutTime: 1 });
historySchema.index({ studentId: 1, attendanceType: 1, scanTime: -1 });
historySchema.index({ linkedRecordId: 1 });

// Virtual field for formatted date
historySchema.virtual('formattedDate').get(function () {
    return this.scanTime.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: '2-digit'
    });
});

// Virtual field for formatted time
historySchema.virtual('formattedTime').get(function () {
    return this.scanTime.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
});

// Virtual field for ISO date string (for frontend)
historySchema.virtual('isoDate').get(function () {
    return this.scanTime.toISOString().split('T')[0];
});

// Method to determine if student is late based on scan time and shift
// Note: Status is determined by check-in time and shift
// 'In' records determine if student is Present or Late
// 'Out' records are always marked as Present (logged out)
historySchema.methods.determineStatus = function() {
    // For Out records, always mark as Present (successfully logged out)
    if (this.attendanceType === 'Out') {
        this.status = 'Present';
        return this.status;
    }
    
    // For In records, determine based on time and shift
    // This logic can be expanded based on school's specific timing rules
    this.status = 'Present';
    return this.status;
};

// Method to calculate duration between check-in and check-out
historySchema.methods.calculateDuration = function() {
    if (this.checkInTime && this.checkOutTime) {
        const duration = Math.round((this.checkOutTime - this.checkInTime) / (1000 * 60));
        this.durationMinutes = duration > 0 ? duration : 0;
    }
    return this.durationMinutes;
};

// Static method to get attendance statistics for a student
historySchema.statics.getStudentStats = async function(studentId, startDate, endDate) {
    const matchQuery = { 
        studentId,
        attendanceType: 'In'  // Only count 'In' records for attendance stats
    };
    
    if (startDate && endDate) {
        matchQuery.scanTime = {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
        };
    }
    
    const stats = await this.aggregate([
        { $match: matchQuery },
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
        cutting: 0
    };
    
    stats.forEach(stat => {
        if (stat._id) {
            result[stat._id.toLowerCase()] = stat.count;
        }
    });
    
    return result;
};

// Static method to get student's check-in and check-out for a specific day
historySchema.statics.getStudentDayAttendance = async function(studentId, date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    const records = await this.find({
        studentId,
        scanTime: {
            $gte: startOfDay,
            $lte: endOfDay
        }
    }).sort({ scanTime: 1 });
    
    return {
        checkIn: records.find(r => r.attendanceType === 'In'),
        checkOut: records.find(r => r.attendanceType === 'Out'),
        allRecords: records
    };
};

// Static method to get recent attendance for a student (In/Out pairs)
historySchema.statics.getRecentAttendance = async function(studentId, limit = 10) {
    return await this.find({ 
        studentId,
        attendanceType: 'In'  // Only return 'In' records as primary attendance
    })
        .sort({ scanTime: -1 })
        .limit(limit)
        .select('scanTime subject status checkInTime checkOutTime durationMinutes');
};

// Ensure virtuals are included when converting document to JSON
historySchema.set('toJSON', { virtuals: true });
historySchema.set('toObject', { virtuals: true });

module.exports = mongoose.model("History", historySchema);
