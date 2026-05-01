const cron = require('node-cron');
const History = require('../models/historySchema');

const PH_TIME_OFFSET_MS = 8 * 60 * 60 * 1000; // Asia/Manila (UTC+8, no DST)

/**
 * Get start and end of a specific day in Philippine time
 */
function getStartAndEndOfDay(date) {
  const phDate = new Date(date.getTime() + PH_TIME_OFFSET_MS);
  const year = phDate.getUTCFullYear();
  const month = phDate.getUTCMonth();
  const day = phDate.getUTCDate();

  const start = new Date(
    Date.UTC(year, month, day, 0, 0, 0, 0) - PH_TIME_OFFSET_MS,
  );
  const end = new Date(
    Date.UTC(year, month, day, 23, 59, 59, 999) - PH_TIME_OFFSET_MS,
  );

  return { start, end };
}

/**
 * Reset unclosed check-ins from previous days
 * This runs at midnight to clean up any check-ins where students forgot to check out
 */
async function resetUncloseCheckIns() {
  try {
    console.log('\n========== MIDNIGHT RESET JOB ==========');
    console.log('🕛 Running at:', new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' }));

    const now = new Date();
    const { start: todayStart } = getStartAndEndOfDay(now);

    // Find all check-ins from BEFORE today that don't have a checkout time
    const unclosedCheckIns = await History.find({
      attendanceType: 'In',
      scanTime: { $lt: todayStart }, // Before today
      $or: [
        { checkOutTime: { $exists: false } },
        { checkOutTime: null }
      ]
    });

    if (unclosedCheckIns.length === 0) {
      console.log('✅ No unclosed check-ins found from previous days');
      console.log('=========================================\n');
      return;
    }

    console.log(`📋 Found ${unclosedCheckIns.length} unclosed check-in(s) from previous days`);

    // Update each unclosed check-in by adding a checkout time at end of that day
    const updatePromises = unclosedCheckIns.map(async (record) => {
      const { end: recordDayEnd } = getStartAndEndOfDay(record.scanTime);

      // Set checkout time to 11:59:59 PM of that day
      const result = await History.updateOne(
        { _id: record._id },
        {
          $set: {
            checkOutTime: recordDayEnd,
            notes: record.notes
              ? `${record.notes} | Auto-closed at midnight reset`
              : 'Auto-closed at midnight reset - student forgot to check out'
          }
        }
      );

      console.log(`   ✓ Auto-closed check-in for ${record.studentName} (${record.studentId}) from ${record.scanTime.toLocaleDateString('en-PH')}`);
      return result;
    });

    await Promise.all(updatePromises);

    console.log(`✅ Successfully reset ${unclosedCheckIns.length} unclosed check-in(s)`);
    console.log('=========================================\n');

  } catch (error) {
    console.error('❌ Error in midnight reset job:', error);
    console.log('=========================================\n');
  }
}

/**
 * Initialize the midnight reset job
 * Runs every day at 12:00 AM Philippine Time (Asia/Manila)
 */
function initializeMidnightResetJob() {
  // Cron format: second minute hour day month weekday
  // '0 0 * * *' = At 00:00 (midnight) every day
  // timezone: 'Asia/Manila' ensures it runs at PH midnight
  const job = cron.schedule('0 0 * * *', resetUncloseCheckIns, {
    timezone: 'Asia/Manila',
    scheduled: true
  });

  console.log('✅ Midnight reset job initialized');
  console.log('⏰ Scheduled to run daily at 12:00 AM Philippine Time');
  console.log('📌 This will auto-close any unclosed check-ins from previous days\n');

  return job;
}

// Export both the initializer and the function for manual testing
module.exports = {
  initializeMidnightResetJob,
  resetUncloseCheckIns
};
