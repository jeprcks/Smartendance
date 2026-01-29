const mongoose = require('mongoose');

const ALLOWED_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

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
      /**
       * Legacy single-day field.
       * For multi-day schedules, we keep this as the "primary" / first day
       * for backward compatibility and sorting.
       */
      required: function () {
        return !Array.isArray(this.days) || this.days.length === 0;
      },
      enum: ALLOWED_DAYS
    },
    days: {
      /**
       * New multi-day support.
       * When present, must contain at least one day.
       */
      type: [String],
      enum: ALLOWED_DAYS,
      default: undefined,
      validate: {
        validator: function (value) {
          if (value === undefined) return true;
          return Array.isArray(value) && value.length > 0;
        },
        message: 'days must be a non-empty array of valid weekdays'
      }
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
