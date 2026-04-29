const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const teacherSchema = new Schema(
    {
        teacherId: {
            type: String,
            required: false,
            unique: true
        },
        username: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },
        name: {
            type: String,
            required: true,
            trim: true
        },
        role: {
            type: String,
            required: true,
            enum: ['Teacher', 'Head Teacher', 'Department Head', 'Principal'],
            default: 'Teacher'
        },
        subjects: {
            type: [String],
            required: true,
            validate: {
                validator: function(v) {
                    return v && Array.isArray(v) && v.length > 0;
                },
                message: 'At least one subject is required'
            }
        },
        gender: {
            type: String,
            enum: ['Male', 'Female', 'Other'],
            required: false
        },
        birthDate: {
            type: String,
            required: false
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
        },
        phoneNumber: {
            type: String,
            required: true,
            trim: true,
            match: [/^[\d\s\-\(\)]+$/, 'Please enter a valid phone number']
        },
        password: {
            type: String,
            required: true,
            minlength: 6
        },
        dateJoined: {
            type: Date,
            required: true,
            default: Date.now
        },
        status: {
            type: String,
            required: true,
            enum: ['Active', 'Inactive', 'Suspended'],
            default: 'Active'
        },
        // Additional teacher information
        department: {
            type: String,
            required: false,
            trim: true
        },
        // Address information
        address: {
            street: { type: String },
            city: { type: String },
            province: { type: String },
            zipCode: { type: String }
        },
        // Teaching schedule (optional)
        schedule: [{
            day: { type: String, enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] },
            startTime: { type: String },
            endTime: { type: String },
            subject: { type: String },
            gradeLevel: { type: String }
        }],
        // Profile picture
        profilePicture: {
            type: String, // Base64 encoded image or URL
            required: false
        },
        // Last login tracking
        lastLogin: {
            type: Date,
            required: false
        },
        // Account verification
        isVerified: {
            type: Boolean,
            default: false
        },
        verificationToken: {
            type: String,
            required: false
        }
    },
    {
        timestamps: true
    }
);

// Virtual field for full name (first name + last name)
teacherSchema.virtual('fullName').get(function () {
    return this.name;
});

// Virtual field for full address
teacherSchema.virtual('fullAddress').get(function () {
    const address = this.address;
    if (!address.street && !address.city && !address.province && !address.zipCode) return '';
    
    return [
        address.street,
        address.city,
        address.province,
        address.zipCode
    ].filter(Boolean).join(', ');
});

// Virtual field for years of experience
teacherSchema.virtual('yearsOfExperience').get(function () {
    if (!this.dateJoined) return 0;
    const now = new Date();
    const joined = new Date(this.dateJoined);
    const diffTime = Math.abs(now - joined);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.floor(diffDays / 365);
});

// Indexes for better query performance
// Note: teacherId, username, and email already have indices from unique: true
teacherSchema.index({ subjects: 1 });
teacherSchema.index({ status: 1 });
teacherSchema.index({ role: 1 });

// Pre-save middleware to generate teacher ID if not provided
teacherSchema.pre('save', function(next) {
    if (!this.teacherId) {
        const year = new Date().getFullYear();
        const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        this.teacherId = `TCH-${year}${randomNum}`;
    }
    next();
});

// Method to update last login
teacherSchema.methods.updateLastLogin = function() {
    this.lastLogin = new Date();
    return this.save();
};

// Method to check if teacher is active
teacherSchema.methods.isActive = function() {
    return this.status === 'Active';
};

// Static method to find teachers by subject
teacherSchema.statics.findBySubject = function(subject) {
    return this.find({ subjects: new RegExp(subject, 'i'), status: 'Active' });
};

// Static method to get teacher statistics
teacherSchema.statics.getTeacherStats = async function() {
    const stats = await this.aggregate([
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 }
            }
        }
    ]);
    
    const result = {
        active: 0,
        inactive: 0,
        suspended: 0,
        total: 0
    };
    
    stats.forEach(stat => {
        result[stat._id.toLowerCase()] = stat.count;
        result.total += stat.count;
    });
    
    return result;
};

// Transform for backward compatibility: if subject (legacy) exists but subjects doesn't, derive subjects
const subjectTransform = function(doc, ret) {
    if (ret.subject && (!ret.subjects || ret.subjects.length === 0)) {
        ret.subjects = typeof ret.subject === 'string'
            ? ret.subject.split(/[,;]/).map(s => s.trim()).filter(Boolean)
            : Array.isArray(ret.subject) ? ret.subject : [ret.subject];
        if (ret.subjects.length === 0) ret.subjects = [ret.subject];
    }
};

// Ensure virtuals are included when converting document to JSON
teacherSchema.set('toJSON', { virtuals: true, transform: subjectTransform });
teacherSchema.set('toObject', { virtuals: true, transform: subjectTransform });

module.exports = mongoose.model("Teacher", teacherSchema);
