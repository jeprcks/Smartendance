// Quick script to check attendance records in database
const mongoose = require('mongoose');
require('dotenv').config();

const History = require('./models/historySchema');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smartendance');
    console.log('MongoDB connected');

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Find all records from today
    const records = await History.find({
      scanTime: {
        $gte: today,
        $lt: tomorrow
      }
    }).select('studentId studentName subject status gradeLevel section shift scanTime');

    console.log(`\n📊 Total attendance records for today: ${records.length}\n`);
    
    if (records.length > 0) {
      console.log('Sample records:');
      records.slice(0, 10).forEach(r => {
        console.log(`  - ${r.studentId} (${r.studentName}): ${r.subject} - ${r.status} - ${r.gradeLevel}-${r.section}-${r.shift}`);
      });
    } else {
      console.log('❌ No records found for today!');
    }

    // Group by grade/section/shift
    const groupedByClass = {};
    records.forEach(r => {
      const key = `${r.gradeLevel}-${r.section}-${r.shift}`;
      if (!groupedByClass[key]) groupedByClass[key] = [];
      groupedByClass[key].push(r);
    });

    console.log('\n📋 Records grouped by class:');
    Object.entries(groupedByClass).forEach(([key, recs]) => {
      console.log(`  ${key}: ${recs.length} students`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

connectDB();
