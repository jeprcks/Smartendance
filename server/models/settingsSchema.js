const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const settingsSchema = new Schema(
  {
    // School branding (for navbar)
    schoolName: { type: String, default: "Umapad Elementary School" },
    logo: { type: String, required: false }, // Base64 or URL
    watermarkLogo: { type: String, required: false }, // Base64 – background watermark on pages

    // School info
    address: { type: String, default: "" },

    // Attendance rules
    lateThresholdMinutes: { type: Number, default: 15 },
    morningShiftTimeIn: { type: String, default: "07:00" }, // HH:mm - morning expected check-in start
    afternoonShiftTimeIn: { type: String, default: "13:00" }, // HH:mm - afternoon expected check-in start
    morningShiftCutoff: { type: String, default: "12:00" }, // HH:mm - after this = late for morning
    afternoonShiftCutoff: { type: String, default: "17:00" }, // HH:mm - after this = late for afternoon

    // Academic
    academicYear: { type: String, default: "" }, // e.g. "2024-2025"

    // Appearance
    theme: { type: String, default: "light", enum: ["light", "dark"] },
  },
  { timestamps: true }
);

// Ensure single document (singleton)
settingsSchema.statics.get = async function () {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

module.exports = mongoose.model("Settings", settingsSchema);
