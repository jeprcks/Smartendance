const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema(
  {
    gradeLevel: {
      type: String,
      required: true,
      enum: ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6']
    },
    section: {
      type: String,
      required: true
    },
    subject: {
      type: String,
      required: true
    },
    teacher: {
      type: String,
      required: true
    },
    timeSlot: {
      type: String,
      required: true
    },
    room: {
      type: String,
      required: true
    },
    day: {
      type: String,
      required: true,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    },
    shift: {
      type: String,
      required: true,
      enum: ['Morning', 'Afternoon']
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Schedule', scheduleSchema);
