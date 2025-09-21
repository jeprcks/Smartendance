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
        scanTime: {
            type: Date,
            required: true,
            default: Date.now
        },
        status: {
            type: String,
            required: true,
            enum: ['Present', 'Late', 'Absent', 'Cutting'],
            default: 'Present'
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
// Note: QR code scans are always marked as "Present" for "General" subject
// Teachers can manually update status for specific subjects
historySchema.methods.determineStatus = function() {
    // For QR code scans, always mark as Present for General subject
    // Teachers will manually update status for specific subjects
    this.status = 'Present';
    return this.status;
};

// Static method to get attendance statistics for a student
historySchema.statics.getStudentStats = async function(studentId, startDate, endDate) {
    const matchQuery = { studentId };
    
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
        result[stat._id.toLowerCase()] = stat.count;
    });
    
    return result;
};

// Static method to get recent attendance for a student
historySchema.statics.getRecentAttendance = async function(studentId, limit = 10) {
    return await this.find({ studentId })
        .sort({ scanTime: -1 })
        .limit(limit)
        .select('scanTime subject status');
};

// Ensure virtuals are included when converting document to JSON
historySchema.set('toJSON', { virtuals: true });
historySchema.set('toObject', { virtuals: true });

module.exports = mongoose.model("History", historySchema);
