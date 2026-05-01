# Midnight Reset - Quick Start Guide

## 🚀 Setup (2 Minutes)

### Step 1: Install Dependencies
```bash
cd server
npm install
```

This will install `node-cron` which is already added to `package.json`.

### Step 2: Start the Server
```bash
npm start
```

or for development with auto-reload:
```bash
npm run dev
```

### Step 3: Verify Installation
You should see these messages in the console:
```
Server is running on port 4000
✅ Midnight reset job initialized
⏰ Scheduled to run daily at 12:00 AM Philippine Time
📌 This will auto-close any unclosed check-ins from previous days
```

**That's it! The system is now active.** 🎉

## ✅ Test It Now (Don't Wait for Midnight!)

### Using Postman or Insomnia:
1. Create a new **POST** request
2. URL: `http://localhost:4000/api/history/manual-reset`
3. Click Send

### Using curl (Command Line):
```bash
curl -X POST http://localhost:4000/api/history/manual-reset
```

### Using Browser (install a REST client extension):
- Method: POST
- URL: `http://localhost:4000/api/history/manual-reset`

### Expected Response:
```json
{
  "success": true,
  "message": "Midnight reset completed successfully",
  "unclosedCheckInsReset": "Reset completed",
  "timestamp": "1/15/2025, 2:30:45 PM"
}
```

## 📊 What Happens Automatically

Every night at **12:00 AM Philippine Time**, the system:

1. ✅ Finds students who checked in but didn't check out
2. ✅ Automatically closes their check-in at 11:59 PM of that day
3. ✅ Adds a note: "Auto-closed at midnight reset"
4. ✅ Logs the activity in the console

**Result:** Students can check in fresh the next day without errors!

## 🔍 Check the Logs

### At Midnight, You'll See:
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

### If No Unclosed Check-ins:
```
========== MIDNIGHT RESET JOB ==========
🕛 Running at: 1/15/2025, 12:00:00 AM
✅ No unclosed check-ins found from previous days
=========================================
```

## ⚠️ Important Notes

### ✅ Works On:
- Local development server ✅
- VPS / Dedicated servers ✅
- Cloud instances (EC2, DigitalOcean, etc.) ✅
- PM2 managed processes ✅

### ❌ Does NOT Work On:
- Vercel (serverless) ❌
- Netlify Functions ❌
- AWS Lambda (without EventBridge) ❌

**Why?** Serverless platforms shut down when not in use. Cron jobs need a persistent process.

**Solution for Vercel:** Use an external cron service (like cron-job.org) to call the manual reset endpoint daily.

## 🎯 Common Scenarios

### Scenario 1: Student Forgot to Check Out Yesterday
**What happens:**
- Yesterday: Student checked in at 7:00 AM, forgot to check out
- At midnight: System auto-closes check-in at 11:59:59 PM yesterday
- Today: Student scans to check in → ✅ Works! No error!

### Scenario 2: Student Checked Out Properly
**What happens:**
- Student checked in at 7:00 AM, checked out at 3:00 PM
- At midnight: System sees checkout exists, does nothing
- Record remains unchanged

### Scenario 3: Multiple Days Unclosed
**What happens:**
- Monday: Checked in, didn't check out
- Tuesday: Checked in, didn't check out
- Wednesday midnight: System closes both Monday and Tuesday check-ins
- Wednesday: Student can check in normally

## 🛠️ Troubleshooting

### Problem: "Already checked in" error still appears
**Check:**
1. Is the server running continuously?
2. Did the midnight job run? (Check logs)
3. Run manual reset: `POST /api/history/manual-reset`

### Problem: Job not running at midnight
**Check:**
1. Server must be running at midnight (don't stop it)
2. Check initialization message on server start
3. Verify `node-cron` is installed: `npm list node-cron`

### Problem: Wrong timezone
**Fix:** The job uses `timezone: 'Asia/Manila'`. It's already configured for Philippine time.

## 📱 For Production

### Using PM2 (Recommended):
```bash
npm run start:pm2
```

PM2 keeps your server running 24/7 and restarts it if it crashes.

### Check PM2 Status:
```bash
pm2 status
pm2 logs smartendance
```

## 📚 Need More Details?

See the full documentation: **MIDNIGHT_RESET_SYSTEM.md**

## 🆘 Quick Help

**Question:** When does it run?  
**Answer:** Every day at 12:00 AM Philippine Time

**Question:** Can I test it now?  
**Answer:** Yes! Use: `POST /api/history/manual-reset`

**Question:** What gets reset?  
**Answer:** Check-ins from PREVIOUS days without checkout

**Question:** Does it delete records?  
**Answer:** No! It just adds a checkout time and note

**Question:** Will it work on Vercel?  
**Answer:** No, use external cron service instead

---

**You're all set! The midnight reset is now active.** 🎉
