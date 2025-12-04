const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const studentSchema = new Schema(
    {
        studentId: {
            type: String,
            required: true,
            unique: true
        },
        fullName: {
            type: String,
            required: true
        },
        phoneNumber: {
            type: String,
            required: true
        },
        age: {
            type: Number,
            required: true,
            min: 12,
            max: 25
        },
        birthDate: {
            type: Date,
            required: true
        },
        gradeLevel: {
            type: String,
            required: true,
            enum: ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6']
        },
        section: {
            type: String,
            required: true,
        },
        gender: {
            type: String,
            required: true,
            enum: ['Male', 'Female', 'Other']
        },
        photo: {
            type: String, // Base64 encoded image
            required: false
        },
        shift: {
            type: String,
            required: true,
            enum: ['Morning', 'Afternoon']
        },
        // Address Information
        address: {
            street: { type: String },
            city: { type: String },
            province: { type: String },
            zipCode: { type: String }
        },
        // Parent/Guardian Information
        parentInfo: {
            name: { type: String },
            email: { type: String },
            password: { type: String },
            contactNumber: { type: String }
        },
        // Emergency Contact Information
        emergencyContact: {
            name: { type: String },
            contactNumber: { type: String },
            relationship: { type: String }
        },
        // QR Code Information
        qrCode: {
            data: { type: String }, // QR code data/content
            image: { type: String }, // Base64 encoded QR code image
            generatedAt: { type: Date, default: Date.now },
            isActive: { type: Boolean, default: true }
        }
    },
    {
        timestamps: true
    }
);

// Virtual field for full address
studentSchema.virtual('fullAddress').get(function () {
    const address = this.address;
    if (!address.street && !address.city && !address.province && !address.zipCode) return '';

    return [
        address.street,
        address.city,
        address.province,
        address.zipCode
    ].filter(Boolean).join(', ');
});

// Virtual field for QR code data
studentSchema.virtual('qrCodeData').get(function () {
    return {
        id: this.studentId,
        name: this.fullName,
        grade: this.gradeLevel,
        section: this.section,
        shift: this.shift,
        email: this.email,
        contact: this.phoneNumber,
        emergencyContact: this.emergencyContact?.contactNumber || '',
        timestamp: new Date().toISOString()
    };
});

// Hash password before saving
const bcrypt = require('bcryptjs');

studentSchema.pre('save', async function (next) {
    // Only hash the password if it has been modified (or is new)
    if (!this.isModified('password')) return next();

    try {
        // Generate salt and hash password
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Add sparse index for optional email to prevent duplicate null errors
studentSchema.index({ 'parentInfo.email': 1 }, { sparse: true });

// Ensure virtuals are included when converting document to JSON
studentSchema.set('toJSON', { virtuals: true });
studentSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model("Student", studentSchema);
