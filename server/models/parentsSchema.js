const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const parentSchema = new Schema(
    {
        fullName: {
            type: String,
            required: true
        },
        email: {
            type: String,
            required: true,
            unique: true
        },
        password: {
            type: String,
            required: true,
            minlength: 6
        },
        phoneNumber: {
            type: String,
            required: true
        },
        gender: {
            type: String,
            required: true,
            enum: ['Male', 'Female', 'Other']
        },
        relationship: {
            type: String,
            required: true,
            enum: ['Mother', 'Father', 'Guardian', 'Grandparent', 'Other']
        },
        occupation: {
            type: String,
            required: false
        },
        photo: {
            type: String, // Base64 encoded image
            required: false
        },
        // Address Information
        address: {
            street: { type: String },
            city: { type: String },
            province: { type: String },
            zipCode: { type: String }
        },
        // Children Information
        childrenIds: [{
            type: String, // References to student IDs
            ref: 'Student'
        }],
        // Contact Information
        emergencyContact: {
            name: { type: String },
            phoneNumber: { type: String },
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
parentSchema.virtual('fullAddress').get(function () {
    const address = this.address;
    if (!address.street && !address.city && !address.province && !address.zipCode) return '';

    return [
        address.street,
        address.city,
        address.province,
        address.zipCode
    ].filter(Boolean).join(', ');
});

// Virtual field for parent info display
parentSchema.virtual('parentInfo').get(function () {
    return {
        name: this.fullName,
        email: this.email,
        contact: this.phoneNumber,
        relationship: this.relationship,
        children: this.childrenIds?.length || 0,
        timestamp: new Date().toISOString()
    };
});

// Hash password before saving
const bcrypt = require('bcryptjs');

parentSchema.pre('save', async function (next) {
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

// Ensure virtuals are included when converting document to JSON
parentSchema.set('toJSON', { virtuals: true });
parentSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model("Parent", parentSchema);
