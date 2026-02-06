# Telegram Bot Quick Start Guide

## ✅ Setup Complete!

Your Telegram bot **SmartendanceBot** is now integrated and ready to use!

- **Bot Username**: `@SmartendanceBot`
- **Status**: ✅ Active and Connected

---

## 🚀 Quick Start for Parents

### Step 1: Find the Bot
1. Open Telegram app
2. Search for: **@SmartendanceBot** or **Smartendance**
3. Click on the bot to open the chat

### Step 2: Start the Bot
1. Click **START** button or send `/start` command
2. You'll receive a welcome message
3. Your connection is now established!

### Step 3: Get Your Chat ID
Parents need to share their Chat ID with the school:

**Method 1: Using Browser (Easiest)**
1. After starting the bot, open this link in your browser:
   ```
   https://api.telegram.org/bot8316357624:AAGVRFRafzyBEX4eWZVwcVISnPE1osaY_Qo/getUpdates
   ```
2. Look for your recent message
3. Find the number after `"chat":{"id":`
4. Example: If you see `"chat":{"id":123456789}`, your Chat ID is **123456789**

**Method 2: Ask Admin**
- The school admin can help you find your Chat ID

### Step 4: Provide Chat ID to School
1. Give your Chat ID to the school administrator
2. They will add it to your student's record
3. You'll start receiving notifications!

---

## 👨‍💼 Quick Start for Admins

### 1. Access the Messages Page
1. Login to admin panel: http://localhost:3000
2. Navigate to **Messages** from the sidebar
3. You'll see the list of students

### 2. Add Parent Chat IDs
For each student, you need to add their parent's Telegram Chat ID:

**Option A: Through Database (Temporary)**
Until we add an edit form, you can manually add chat IDs in the database:

```javascript
// In MongoDB, update student record:
{
  "parentInfo": {
    "telegramChatId": "123456789"  // Parent's chat ID
  },
  "emergencyContact": {
    "telegramChatId": "987654321"  // Emergency contact's chat ID
  }
}
```

**Option B: Through API**
You can use the student update API endpoint to add chat IDs programmatically.

### 3. Send Test Message

**Send to Individual Parent:**
1. Go to Messages page
2. Find a student with a Chat ID
3. Click **Send** button
4. Choose contact type (Parent or Emergency)
5. Type your message
6. Click **Send via Telegram**

**Send to All Parents:**
1. Click **Send to All** button
2. Select recipient type
3. Apply filters if needed
4. Type your message
5. Click **Send to All**

### 4. Set Your Admin Chat ID (Optional)
To receive notifications yourself:

1. Start the bot: `@SmartendanceBot`
2. Get your Chat ID (use the method above)
3. Open `server/.env` file
4. Update this line:
   ```env
   TELEGRAM_ADMIN_CHAT_ID=YOUR_CHAT_ID_HERE
   ```
5. Restart the server

---

## 📱 Testing the Integration

### Test 1: Verify Bot is Working
Open in browser:
```
http://localhost:4000/api/telegram/bot-info
```

You should see bot information including `"username":"SmartendanceBot"`

### Test 2: Send a Test Message
Use this API endpoint (replace CHAT_ID with your own):

```bash
curl -X POST http://localhost:4000/api/telegram/send \
  -H "Content-Type: application/json" \
  -d '{
    "chatId": "YOUR_CHAT_ID",
    "message": "Test message from Smartendance!"
  }'
```

### Test 3: Verify Chat ID
```bash
curl -X POST http://localhost:4000/api/telegram/verify-chat-id \
  -H "Content-Type: application/json" \
  -d '{
    "chatId": "YOUR_CHAT_ID"
  }'
```

---

## 🎯 Usage Scenarios

### Scenario 1: Daily Attendance Notification
Send attendance status to parents:
```
Message: "Your child checked in at 7:30 AM. Status: Present"
```

### Scenario 2: Absence Alert
```
Message: "Your child was marked absent for 3 consecutive days. Please contact the school."
```

### Scenario 3: Emergency Broadcast
```
Message: "Important: School will close early today due to weather. Please pick up your children by 1 PM."
```

### Scenario 4: Individual Reminder
```
Message: "Reminder: Parent-teacher meeting tomorrow at 2 PM."
```

---

## 🔧 Troubleshooting

### Problem: Parent Not Receiving Messages
**Solutions:**
1. ✅ Parent must start the bot first (`/start`)
2. ✅ Check if Chat ID is correctly added to student record
3. ✅ Verify Chat ID using the verify endpoint
4. ✅ Parent may have blocked the bot - ask them to unblock

### Problem: "Telegram bot not initialized"
**Solutions:**
1. ✅ Check if bot token is in `.env` file
2. ✅ Restart the server after changing `.env`
3. ✅ Check server logs for errors

### Problem: "Invalid Chat ID"
**Solutions:**
1. ✅ Double-check the Chat ID (it's a number)
2. ✅ Parent must start the bot first
3. ✅ Use the getUpdates URL to verify correct Chat ID

---

## 📊 Current Features

✅ **Implemented:**
- Send individual messages to parents
- Broadcast messages to all parents
- Filter by grade level and section
- Support for parent and emergency contacts
- Message delivery confirmation
- Bot status verification

🔄 **Coming Soon:**
- Automatic attendance notifications
- Two-way communication
- Message templates
- Scheduled messages
- Message history
- Rich media support (images, files)

---

## 🔐 Security Notes

⚠️ **Important:**
- Never share the bot token publicly
- Keep the `.env` file secure
- Don't commit bot token to version control
- Only share Chat IDs with authorized personnel

---

## 📞 Support

Need help?
1. Check the full documentation: `TELEGRAM_INTEGRATION_GUIDE.md`
2. Test the bot using the verify endpoint
3. Check server logs for detailed error messages
4. Review the troubleshooting section above

---

## 🎉 You're All Set!

Your Telegram bot integration is ready to use. Start by:
1. Having parents start the bot: `@SmartendanceBot`
2. Collecting their Chat IDs
3. Adding Chat IDs to student records
4. Sending your first test message!

**Happy Messaging! 📨**
