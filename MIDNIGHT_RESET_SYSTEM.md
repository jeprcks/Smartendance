# Midnight Reset System Documentation

## Overview
The Midnight Reset System automatically handles unclosed check-ins from previous days, preventing "already checked in" errors when students scan on a new day.

## Problem Solved
**Before:** If a student checked in on Day 1 but forgot to check out, when they tried to check in on Day 2, they would get an error: "Already checked in. Please checkout first before checking in again."

**After:** The system automatically closes any unclosed check-ins from previous days at midnight, so students can check in fresh each day.

## How It Works

### Automatic Midnight Reset
- **Schedule:** Runs every day at **12:00 AM Philippine Time (Asia/Manila)**
- **Process:**
  1. Finds all check-in records from **before today** that don't have a checkout time
  2. Automatically adds a checkout time of **11:59:59 PM** on the day they checked in
  3. Adds a note: "Auto-closed at midnight reset - student forgot to check out"
  4. Logs the activity for monitoring

### What Gets Reset
The system finds and closes check-ins that match:
- `attendanceType` = "In"
- `scanTime` is before today (any previous day)
- `checkOutTime` is null or doesn't exist

### What Doesn't Get Affected
- Check-ins from **today** (current day) - these remain open
- Records that already have a checkout time
- Check-out records (attendanceType: "Out")

## Installation

### 1. Install Dependencies
```bash
cd server
npm install node-cron
```

### 2. Files Added/Modified

#### New Files:
- `server/jobs/midnightResetJob.js` - The midnight reset job logic

#### Modified Files:
- `server/package.json` - Added `node-cron` dependency
- `server/index.js` - Initialize the midnight reset job on server start
- `server/controllers/historyController.js` - Added manual reset endpoint
- `server/routes/historyRoutes.js` - Added route for manual testing

## Usage

### Automatic Operation
Once the server is running, the midnight reset job runs automatically. You'll see this on server startup:

```
Server is running on port 4000
✅ Midnight reset job initialized
⏰ Scheduled to run daily at 12:00 AM Philippine Time
📌 This will auto-close any unclosed check-ins from previous days
```

### Manual Testing
You can manually trigger the reset without waiting for midnight:

**Endpoint:** `POST /api/history/manual-reset`

**Example using curl:**
```bash
curl -X POST http://localhost:4000/api/history/manual-reset
```

**Example using Postman:**
- Method: POST
- URL: `http://localhost:4000/api/history/manual-reset`
- No body required

**Response:**
```json
{
  "success": true,
  "message": "Midnight reset completed successfully",
  "unclosedCheckInsReset": "Reset completed",
  "timestamp": "1/15/2025, 2:30:45 PM"
}
```

### Console Logs
When the reset runs, you'll see detailed logs:

```
========== MIDNIGHT RESET JOB ==========
🕛 Running at: 1/15/2025, 12:00:00 AM
📋 Found 3 unclosed check-in(s) from previous days
   ✓ Auto-closed check-in for Juan Dela Cruz (2024-001) from 1/14/2025
   ✓ Auto-closed check-in for Maria Santos (2024-002) from 1/14/2025
   ✓ Auto-closed check-in for Pedro Reyes (2024-003) from 1/13/2025
✅ Successfully reset 3 unclosed check-in(s)
=========================================
```

## Database Changes

### Before Reset
```javascript
{
  _id: "abc123",
  studentId: "2024-001",
  studentName: "Juan Dela Cruz",
  attendanceType: "In",
  scanTime: "2025-01-14T06:30:00.000Z",  // Yesterday 6:30 AM
  checkOutTime: null,  // Never checked out
  status: "Present",
  // ... other fields
}
```

### After Reset
```javascript
{
  _id: "abc123",
  studentId: "2024-001",
  studentName: "Juan Dela Cruz",
  attendanceType: "In",
  scanTime: "2025-01-14T06:30:00.000Z",  // Yesterday 6:30 AM
  checkOutTime: "2025-01-14T15:59:59.999Z",  // Auto-closed at 11:59:59 PM
  status: "Present",
  notes: "Auto-closed at midnight reset - student forgot to check out",
  // ... other fields
}
```

## Benefits

### 1. No More "Already Checked In" Errors
Students can check in fresh every day without errors from forgotten checkouts.

### 2. Clean Database
No open/dangling check-in records accumulating in the database.

### 3. Accurate Attendance Records
Each day's attendance is properly closed, making reports more accurate.

### 4. Audit Trail
The system adds a note to show which records were auto-closed, maintaining transparency.

### 5. Zero Manual Intervention
Runs automatically - no admin action needed.

## Monitoring

### Check If Job Is Running
When you start the server, look for:
```
✅ Midnight reset job initialized
⏰ Scheduled to run daily at 12:00 AM Philippine Time
```

### View Reset Activity
Check the server logs around midnight to see if any records were reset:
```
========== MIDNIGHT RESET JOB ==========
```

### Verify in Database
Query for auto-closed records:
```javascript
db.histories.find({
  notes: { $regex: /Auto-closed at midnight reset/ }
})
```

## Troubleshooting

### Job Not Running
**Issue:** No logs at midnight
**Solution:** 
1. Check that server is running (not on Vercel - cron jobs don't work on serverless)
2. Verify `node-cron` is installed: `npm list node-cron`
3. Check console for initialization message on server start

### Timezone Issues
**Issue:** Reset running at wrong time
**Solution:** The job uses `timezone: 'Asia/Manila'` in the cron config. This ensures it runs at Philippine midnight regardless of server timezone.

### Testing
**Issue:** Want to test without waiting for midnight
**Solution:** Use the manual reset endpoint:
```bash
curl -X POST http://localhost:4000/api/history/manual-reset
```

## Technical Details

### Cron Expression
```javascript
'0 0 * * *'  // Runs at 00:00 (midnight) every day
```
- `0` - minute (0)
- `0` - hour (0 = midnight)
- `*` - day of month (every day)
- `*` - month (every month)
- `*` - day of week (every day)

### Timezone Configuration
```javascript
{
  timezone: 'Asia/Manila',
  scheduled: true
}
```

### Philippine Time Calculation
```javascript
const PH_TIME_OFFSET_MS = 8 * 60 * 60 * 1000; // UTC+8
```

## Important Notes

### ⚠️ Vercel / Serverless Limitations
This cron job **will NOT work on Vercel** or other serverless platforms because:
- Serverless functions spin down when not in use
- No persistent process to run scheduled jobs
- Alternative: Use external cron services (cron-job.org, AWS CloudWatch Events, etc.)

### ✅ Works On
- Local development server
- VPS (Virtual Private Server)
- Dedicated servers
- Cloud instances (EC2, DigitalOcean Droplets, etc.)
- Docker containers with persistent processes
- PM2 managed processes

### 🔄 Alternative for Serverless
If deploying to Vercel, consider:
1. **External Cron Service:** Use a service like cron-job.org to hit the manual reset endpoint daily
2. **AWS Lambda + CloudWatch:** Schedule Lambda function to call the reset endpoint
3. **Dedicated Worker Server:** Run a small VPS just for scheduled jobs

## Configuration

### Changing Reset Time
Edit `server/jobs/midnightResetJob.js`:

```javascript
// Change from midnight to 1 AM
const job = cron.schedule('0 1 * * *', resetUncloseCheckIns, {
  timezone: 'Asia/Manila',
  scheduled: true
});

// Or run every 6 hours
const job = cron.schedule('0 */6 * * *', resetUncloseCheckIns, {
  timezone: 'Asia/Manila',
  scheduled: true
});
```

### Disable Auto-Reset
Comment out in `server/index.js`:

```javascript
// initializeMidnightResetJob();  // Disabled
```

## API Reference

### Manual Reset Endpoint

**POST** `/api/history/manual-reset`

Manually triggers the midnight reset job.

**Request:**
- No body required
- No authentication (add if needed)

**Response:**
```json
{
  "success": true,
  "message": "Midnight reset completed successfully",
  "unclosedCheckInsReset": "Reset completed",
  "timestamp": "1/15/2025, 2:30:45 PM"
}
```

**Errors:**
```json
{
  "success": false,
  "error": "Error message here"
}
```

## Future Enhancements

Possible improvements:
- [ ] Email notifications when reset runs
- [ ] Dashboard widget showing last reset time
- [ ] Configuration UI for reset time
- [ ] Statistics on how many students forget to check out
- [ ] Option to auto-checkout at specific time instead of 11:59 PM
- [ ] Parent notifications for auto-closed check-ins

## Support

For issues or questions:
1. Check server logs for error messages
2. Test manually using the manual reset endpoint
3. Verify database records are being updated
4. Check that node-cron is properly installed

---

**Last Updated:** January 2025  
**Version:** 1.0.0
