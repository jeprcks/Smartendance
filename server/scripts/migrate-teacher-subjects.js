/**
 * Migration script: Convert teacher.subject (string) to teacher.subjects (array)
 * Run: node server/scripts/migrate-teacher-subjects.js
 * Or from server dir: node scripts/migrate-teacher-subjects.js
 */
const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/smartendance';

async function migrate() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const teachers = db.collection('teachers');

    // Find teachers that have 'subject' (string) but not 'subjects' (array)
    const docsToMigrate = await teachers.find({
      subject: { $exists: true },
      $or: [
        { subjects: { $exists: false } },
        { subjects: { $size: 0 } }
      ]
    }).toArray();

    console.log(`Found ${docsToMigrate.length} teachers to migrate`);

    let migrated = 0;
    for (const doc of docsToMigrate) {
      let subjectsArray = [];
      if (doc.subject) {
        if (typeof doc.subject === 'string') {
          subjectsArray = doc.subject.split(/[,;]/).map(s => s.trim()).filter(Boolean);
          if (subjectsArray.length === 0) {
            subjectsArray = [doc.subject.trim()];
          }
        } else if (Array.isArray(doc.subject)) {
          subjectsArray = doc.subject;
        }
      }
      if (subjectsArray.length === 0) {
        subjectsArray = ['General'];
      }

      await teachers.updateOne(
        { _id: doc._id },
        { 
          $set: { subjects: subjectsArray },
          $unset: { subject: '' }
        }
      );
      migrated++;
      console.log(`  Migrated: ${doc.name} -> [${subjectsArray.join(', ')}]`);
    }

    console.log(`\nMigration complete. Migrated ${migrated} teachers.`);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  }
}

migrate();
