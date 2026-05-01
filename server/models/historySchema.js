const mongoose = require("mongoose");

const historySchema = new mongoose.Schema(
  {
    studentId: { type: String, required: true, ref: "Student" },
    studentName: { type: String, required: true },
    subject: { type: String, required: true, default: "General" },
    attendanceType: {
      type: String,
      required: true,
      enum: ["In", "Out"],
      default: "In",
    },
    status: {
      type: String,
      required: true,
      enum: ["Present", "Late", "Absent", "Cutting", "Out", "Unscanned"],
    },
    checkInTime: {
      type: Date,
      required: function () {
        return this.attendanceType === "In";
      },
    },
    checkOutTime: {
      type: Date,
      required: function () {
        return this.attendanceType === "Out";
      },
    },
    scanTime: { type: Date, required: true, default: Date.now },
    durationMinutes: { type: Number, default: 0 },
    linkedRecordId: { type: String, ref: "History" },
    gradeLevel: { type: String, required: true },
    section: { type: String, required: true },
    shift: { type: String, required: true, enum: ["Morning", "Afternoon"] },
    qrCodeData: { type: Object },
    location: {
      latitude: { type: Number },
      longitude: { type: Number },
      address: { type: String },
    },
    deviceInfo: {
      platform: { type: String },
      userAgent: { type: String },
      ipAddress: { type: String },
    },
    notes: { type: String, maxlength: 500 },
    scheduleDay: { type: String },
    scheduleTimeSlot: { type: String },
    scheduleTeacher: { type: String },
    scheduleSubject: { type: String },
    isVerified: { type: Boolean, default: false },
    verifiedBy: { type: String },
    verifiedAt: { type: Date },
    statusHistory: [
      {
        status: { type: String },
        changedAt: { type: Date },
        changedBy: { type: String },
        reason: { type: String },
      },
    ],
  },
  { timestamps: true },
);

historySchema.index({ studentId: 1, scanTime: -1 });
historySchema.index({ attendanceType: 1, scanTime: -1 });
historySchema.index({ linkedRecordId: 1 });
historySchema.index({ gradeLevel: 1, section: 1, subject: 1 });
// Composite indexes for common filter combinations
historySchema.index({ gradeLevel: 1, section: 1, scanTime: -1 });
historySchema.index({ shift: 1, scanTime: -1 });
historySchema.index({ status: 1, attendanceType: 1 });
historySchema.index({ scanTime: -1 }); // For date range queries

module.exports = mongoose.model("History", historySchema);
