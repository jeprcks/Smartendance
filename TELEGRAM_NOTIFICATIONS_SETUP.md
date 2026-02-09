# Telegram Notifications Setup for Scanner App

## ✅ Current Status

The Telegram notification code is **already implemented** in your backend. However, notifications require proper configuration.

## Why Notifications Aren't Working

Possible reasons:
1. ❌ Vercel environment variables not set correctly
2. ❌ Student records don't have Telegram Chat IDs
3. ❌ Telegram bot polling disabled in serverless environment

## Step-by-Step Setup

### 1. Configure Vercel Environment Variables

Go to: **Vercel Dashboard → Your Server Project → Settings → Environment Variables**

**Required Variables:**
```env
TELEGRAM_BOT_TOKEN=8316357624:AAGVRFRafzyBEX4eWZVwcVISnPE1osaY_Qo
TELEGRAM_NOTIFICATION_ENABLED=true
TELEGRAM_POLLING_ENABLED=false
```

⚠️ **Important:** Set `TELEGRAM_POLLING_ENABLED=false` for Vercel because:
- Serverless functions can't maintain long-polling connections
- The bot will work in **send-only mode** (perfect for notifications)
- Commands like `/start`, `/mychatid` won't work, but notifications will

After adding these, **redeploy your server** on Vercel.

### 2. Get Parent's Telegram Chat ID

Parents need to get their Chat ID first:

#### Option A: Using Your Bot (If Polling Enabled Locally)

1. Run your bot locally with polling:
   ```bash
   cd server
   # Set TELEGRAM_POLLING_ENABLED=true in .env
   npm start
   ```

2. Parent opens Telegram and searches for your bot: `@YourBotName`

3. Parent sends `/start` or `/mychatid`

4. Bot replies with their Chat ID (e.g., `123456789`)

#### Option B: Using @userinfobot (Quick Method)

1. Parent opens Telegram

2. Search for `@userinfobot`

3. Send `/start`

4. Bot replies with user info including Chat ID

5. Copy the Chat ID number

### 3. Add Chat ID to Student Record

#### Via Admin Web Interface:

1. Login to admin web: https://umapadelementaryschool.vercel.app/

2. Go to **Students** page

3. Find and edit the student

4. In the **Parent Info** section, look for "Telegram Chat ID" field

5. Paste the parent's Chat ID

6. Save the student record

#### Via Direct Database Update (MongoDB):

```javascript
// Update student with parent's Telegram Chat ID
db.students.updateOne(
  { studentId: "STUDENT_ID_HERE" },
  { 
    $set: { 
      "parentInfo.telegramChatId": "123456789" 
    } 
  }
)
```

### 4. Test the Notifications

#### Manual Test:

1. Use the scanner app to scan a student's QR code

2. Check backend logs in Vercel:
   ```
   - Go to Vercel Dashboard
   - Open your server project
   - Click "Functions" tab
   - View real-time logs
   ```

3. Look for these log messages:
   ```
   ✅ Telegram notification sent successfully
   OR
   ❌ No Telegram Chat ID found for student XXXXX - skipping notification
   ```

4. Parent should receive a notification like:
   ```
   🟢 Student Check-In
   
   👤 John Doe
   🆔 Student ID: 2024001
   ✅ Status: Present
   📅 Date: Thu, Jan 25, 2024
   ⏰ Time: 07:45 AM
   ```

## How Notifications Work

### Check-In (When student scans IN):
```
🟢 Student Check-In

👤 [Student Name]
🆔 Student ID: [ID]
✅ Status: Present (or ⏰ Late / ⚠️ Cutting)
📅 Date: [Date]
⏰ Time: [Time]
```

### Check-Out (When student scans OUT):
```
🔴 Student Check-Out

👤 [Student Name]
🆔 Student ID: [ID]
📅 Date: [Date]
⏰ Time: [Time]
⏱️ Duration: [X hours Y minutes]
```

## Troubleshooting

### No Notifications Received

**1. Check Vercel Environment Variables:**
```bash
# Verify these are set:
TELEGRAM_BOT_TOKEN=8316357624:AAGVRFRafzyBEX4eWZVwcVISnPE1osaY_Qo
TELEGRAM_NOTIFICATION_ENABLED=true
TELEGRAM_POLLING_ENABLED=false
```

**2. Check Student Record:**
- Login to admin web
- Edit student record
- Verify "Telegram Chat ID" field has a number
- Field location: `parentInfo.telegramChatId`

**3. Check Vercel Logs:**
Look for messages like:
```
✅ Telegram notification sent to [CHAT_ID]
OR
❌ No Chat ID for student [ID] - skipping notification
OR
❌ Telegram notification error: [Error message]
```

**4. Verify Bot Token:**
Test your bot token manually:
```bash
curl https://api.telegram.org/bot8316357624:AAGVRFRafzyBEX4eWZVwcVISnPE1osaY_Qo/getMe
```

Should return bot info if token is valid.

### Bot Commands Don't Work

**This is NORMAL on Vercel** because:
- Vercel serverless functions can't maintain long-polling
- Bot is in send-only mode
- Notifications still work perfectly

**Solution for Commands:**
Run bot locally with `TELEGRAM_POLLING_ENABLED=true` when you need to help parents get their Chat IDs.

### Wrong Chat ID Error

```
Error: Bad Request: chat not found
```

**Solution:**
- Chat ID might be incorrect
- Parent must have interacted with the bot first (send `/start`)
- Use @userinfobot to verify correct Chat ID

### Rate Limiting

```
Error: Too Many Requests: retry after X
```

**Solution:**
- Telegram allows 30 messages per second
- Code already has 50ms delay between messages
- Usually not an issue unless sending to many parents at once

## Adding Chat IDs for Multiple Students

### Bulk Update (MongoDB):

```javascript
// Example: Update multiple students
db.students.updateMany(
  { 
    studentId: { $in: ["2024001", "2024002", "2024003"] }
  },
  { 
    $set: { 
      "parentInfo.telegramChatId": "123456789" 
    } 
  }
)
```

### CSV Import (Future Feature):

You can add a CSV import feature to bulk update Chat IDs:
1. Export students
2. Add Chat ID column
3. Import updated CSV

## Testing Checklist

✅ **Before Testing:**
- [ ] Vercel environment variables set
- [ ] Server redeployed on Vercel
- [ ] Parent has Chat ID from bot or @userinfobot
- [ ] Chat ID added to student record
- [ ] Student record saved

✅ **During Test:**
- [ ] Scan student QR code with scanner app
- [ ] Check Vercel logs for notification messages
- [ ] Parent checks Telegram for notification
- [ ] Verify notification content is correct

✅ **If Successful:**
- [ ] Parent receives check-in notification
- [ ] Notification has correct student info
- [ ] Time and date are accurate
- [ ] Status is correct (Present/Late/etc.)

## Advanced: Multiple Children

If a parent has multiple children:

1. **Single Chat ID works for all**:
   - Add same Chat ID to all children's records
   - Parent receives notifications for all children
   - Each notification clearly identifies which child

2. **Example**:
   ```javascript
   // Student 1
   db.students.updateOne(
     { studentId: "2024001" },
     { $set: { "parentInfo.telegramChatId": "123456789" } }
   )
   
   // Student 2 (same parent)
   db.students.updateOne(
     { studentId: "2024002" },
     { $set: { "parentInfo.telegramChatId": "123456789" } }
   )
   ```

## Notification Features

### Automatic Notifications for:
- ✅ Check-in (with status: Present/Late/Cutting)
- ✅ Check-out (with duration)
- ✅ Real-time (sent immediately after scan)
- ✅ Multiple children support

### Future Enhancements:
- Daily summary reports
- Weekly attendance stats
- Absence alerts
- Custom notification times

## Summary

**To Enable Notifications:**

1. Set Vercel env variables (TELEGRAM_BOT_TOKEN, TELEGRAM_NOTIFICATION_ENABLED=true, TELEGRAM_POLLING_ENABLED=false)
2. Redeploy server on Vercel
3. Get parent's Chat ID (use @userinfobot)
4. Add Chat ID to student record in admin web
5. Test by scanning student QR code

**Expected Result:**
Parent receives immediate Telegram notification when student checks in/out! ✅

---

**Your Bot Token:** `8316357624:AAGVRFRafzyBEX4eWZVwcVISnPE1osaY_Qo`
**Admin Web:** https://umapadelementaryschool.vercel.app/
**Server:** https://smartendance-lilac.vercel.app/
