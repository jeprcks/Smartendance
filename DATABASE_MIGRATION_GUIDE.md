# Database Migration Guide - In/Out Attendance System

## Overview

This guide provides instructions for migrating existing attendance data to the new In/Out system or initializing the database with the new schema.

## Pre-Migration Checklist

- [ ] Backup current database
- [ ] Stop production server
- [ ] Test migration in staging environment first
- [ ] Have rollback plan ready

## Option 1: Fresh Start (Recommended for New Deployments)

If you're setting up for the first time, no migration needed. The schema is ready to use as-is.

### Steps:

1. **Ensure Server is Updated**
   ```bash
   cd server
   npm install
   ```

2. **Start Server**
   ```bash
   npm run dev
   # or
   node index.js
   ```

3. **Test Endpoints**
   ```bash
   # Create a test check-in
   curl -X POST http://localhost:3000/api/history \
     -H "Content-Type: application/json" \
     -d '{
       "studentId": "TEST001",
       "studentName": "Test Student",
       "attendanceType": "In"
     }'
   ```

4. **Verify Database**
   - Record should have `attendanceType: "In"`
   - Record should have `checkInTime` populated

---

## Option 2: Migrate Existing Data

If you have existing attendance data without the In/Out structure, follow this guide.

### Step 1: Backup Database

```bash
# Using MongoDB Atlas backup (recommended)
# Or local backup
mongodump --uri "mongodb://user:pass@host:port/db" --out ./backup

# Or using Docker if running MongoDB in container
docker exec <container_id> mongodump --archive > backup.archive
```

### Step 2: Add Default Values to Existing Records

Run this MongoDB aggregation pipeline to update existing records:

```javascript
// Connect to MongoDB
mongo your_database

// Update all records without attendanceType (if any exist)
db.histories.updateMany(
  { attendanceType: { $exists: false } },
  [
    {
      $set: {
        attendanceType: "In",
        checkInTime: "$scanTime",
        durationMinutes: 0,
        linkedRecordId: null
      }
    }
  ]
)
```

### Step 3: Verify Migration

```javascript
// Check total records
db.histories.countDocuments()

// Check records with attendanceType
db.histories.countDocuments({ attendanceType: { $exists: true } })

// These should match

// Sample records
db.histories.find().limit(3).pretty()

// Should see attendanceType field on all records
```

### Step 4: Verify Application

```bash
# Restart server
npm run dev

# Test getting attendance records
curl http://localhost:3000/api/history

# Test daily summary
curl "http://localhost:3000/api/history/daily-summary?date=2026-01-22"

# Check for errors in logs
```

---

## Option 3: Selective Migration (Some Data to In/Out)

If you want to keep old records as-is and only use new records for In/Out:

```javascript
// This is done automatically - no action needed
// New records created with attendanceType: "In" or "Out"
// Old records without attendanceType remain accessible
```

---

## Migration Verification Script

Create a Node.js script to verify migration completeness:

```javascript
// verify-migration.js
const mongoose = require('mongoose');
const History = require('./models/historySchema');

async function verifyMigration() {
  try {
    // Connect to DB
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Check total records
    const totalRecords = await History.countDocuments();
    console.log(`Total records: ${totalRecords}`);
    
    // Check records with attendanceType
    const withAttendanceType = await History.countDocuments({
      attendanceType: { $exists: true }
    });
    console.log(`Records with attendanceType: ${withAttendanceType}`);
    
    // Check In records
    const inRecords = await History.countDocuments({
      attendanceType: 'In'
    });
    console.log(`Check-in records: ${inRecords}`);
    
    // Check Out records
    const outRecords = await History.countDocuments({
      attendanceType: 'Out'
    });
    console.log(`Check-out records: ${outRecords}`);
    
    // Check linked records
    const linkedRecords = await History.countDocuments({
      linkedRecordId: { $exists: true, $ne: null }
    });
    console.log(`Linked record pairs: ${linkedRecords}`);
    
    // Check records without attendanceType (should be 0)
    const withoutAttendanceType = await History.countDocuments({
      attendanceType: { $exists: false }
    });
    console.log(`Records without attendanceType: ${withoutAttendanceType}`);
    
    // Sample check-in record
    const sampleInRecord = await History.findOne({
      attendanceType: 'In'
    });
    console.log('\nSample Check-In Record:');
    console.log(JSON.stringify(sampleInRecord, null, 2));
    
    // Sample check-out record
    const sampleOutRecord = await History.findOne({
      attendanceType: 'Out'
    });
    if (sampleOutRecord) {
      console.log('\nSample Check-Out Record:');
      console.log(JSON.stringify(sampleOutRecord, null, 2));
    }
    
    console.log('\n✓ Migration verification complete');
    
  } catch (error) {
    console.error('Migration verification failed:', error);
  } finally {
    await mongoose.connection.close();
  }
}

verifyMigration();
```

Run it:
```bash
node verify-migration.js
```

---

## Rolling Back Migration (If Needed)

### Option A: From Backup

```bash
# Restore from MongoDB backup
mongorestore --uri "mongodb://user:pass@host:port/db" ./backup

# Or restore from archive
mongorestore --archive=backup.archive
```

### Option B: Remove New Fields

If you only added fields and want to remove them:

```javascript
db.histories.updateMany(
  {},
  {
    $unset: {
      attendanceType: "",
      checkInTime: "",
      checkOutTime: "",
      durationMinutes: "",
      linkedRecordId: ""
    }
  }
)
```

---

## Index Creation

The new indexes are created automatically by Mongoose when the server starts. To verify:

```javascript
// Check indexes
db.histories.getIndexes()

// You should see:
// - attendanceType_1
// - checkInTime_1
// - checkOutTime_1
// - studentId_1_attendanceType_1_scanTime_-1
// - linkedRecordId_1
```

---

## Performance Testing After Migration

### Test Query Performance

```javascript
// Time a query before optimization
const start = Date.now();

db.histories.find({ 
  attendanceType: 'In',
  scanTime: { 
    $gte: new Date('2026-01-22'),
    $lt: new Date('2026-01-23')
  }
}).count();

const duration = Date.now() - start;
console.log(`Query took: ${duration}ms`);
```

Expected: Should complete in < 100ms with new indexes

### Rebuild Indexes if Slow

```javascript
// Drop and recreate indexes if performance is poor
db.histories.dropIndex("attendanceType_1");
db.histories.createIndex({ attendanceType: 1 });
```

---

## Monitoring After Migration

### Watch for These Issues

**Issue 1: Orphaned Out Records**
```javascript
// Check for Out records without matching In
db.histories.find({
  attendanceType: 'Out',
  linkedRecordId: null
})
// These indicate students who checked out without checking in
```

**Issue 2: Unlinked In Records**
```javascript
// Check for In records without checkout by EOD
const today = new Date();
today.setHours(23, 59, 59, 999);

db.histories.find({
  attendanceType: 'In',
  scanTime: { $lt: today },
  linkedRecordId: null
})
// These indicate students still in building
```

**Issue 3: Multiple In Records Per Student Per Day**
```javascript
db.histories.aggregate([
  { $match: { attendanceType: 'In' } },
  { $group: { 
    _id: { studentId: '$studentId', date: { $dateToString: { format: '%Y-%m-%d', date: '$scanTime' } } },
    count: { $sum: 1 }
  }},
  { $match: { count: { $gt: 1 } } }
])
// Indicates potential duplicate check-ins
```

---

## Data Validation Queries

### Ensure Data Integrity

```javascript
// 1. All In records should have checkInTime
db.histories.find({
  attendanceType: 'In',
  checkInTime: { $exists: false }
}).count()
// Should return 0

// 2. All Out records should have checkOutTime
db.histories.find({
  attendanceType: 'Out',
  checkOutTime: { $exists: false }
}).count()
// Should return 0

// 3. All records should have attendanceType
db.histories.find({
  attendanceType: { $exists: false }
}).count()
// Should return 0

// 4. Duration should be positive for linked pairs
db.histories.find({
  linkedRecordId: { $ne: null },
  durationMinutes: { $lt: 0 }
}).count()
// Should return 0
```

---

## Troubleshooting Migration

### Problem: Indexes Not Created

**Solution:**
```javascript
// Manually create indexes
db.histories.createIndex({ attendanceType: 1 });
db.histories.createIndex({ checkInTime: 1 });
db.histories.createIndex({ checkOutTime: 1 });
db.histories.createIndex({ studentId: 1, attendanceType: 1, scanTime: -1 });
db.histories.createIndex({ linkedRecordId: 1 });

// Verify
db.histories.getIndexes()
```

### Problem: Records Not Migrated

**Solution:**
```javascript
// Check if schema fields exist
db.histories.findOne({}, { projection: { attendanceType: 1 } })

// If not, run update
db.histories.updateMany(
  { attendanceType: { $exists: false } },
  [{ $set: { 
    attendanceType: "In",
    checkInTime: "$scanTime",
    durationMinutes: 0
  }}]
)
```

### Problem: Server Won't Start

**Solution:**
1. Check MongoDB connection
2. Verify schema file is valid
3. Check for syntax errors in historySchema.js
4. Look at server logs: `tail -f logs/error.log`

---

## Post-Migration Checklist

- [ ] Database backup created
- [ ] New fields added to all records
- [ ] Indexes created successfully
- [ ] Migration verification script passed
- [ ] Performance tests acceptable
- [ ] No orphaned records detected
- [ ] API endpoints tested
- [ ] Daily summary endpoint working
- [ ] Server restarted successfully
- [ ] Logs show no errors
- [ ] Mobile app deployed with attendanceType
- [ ] Scanner app deployed with attendanceType
- [ ] Tablets configured (In vs Out)
- [ ] First test scan successful

---

## Support

For issues during migration:

1. Check MongoDB logs: `tail -f /var/log/mongodb/mongod.log`
2. Check server logs: `npm run dev` (watch console output)
3. Verify schema: `cat server/models/historySchema.js`
4. Test manually: Open MongoDB Atlas UI and inspect records
5. Roll back if needed from backup

---

**Database Migration Ready** ✓

Safe to proceed with tablet deployment after migration verification.
