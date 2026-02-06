# Telegram Bot Integration Guide

## Overview
This guide explains how to use the Telegram bot integration in the Smartendance system to send messages to parents.

## Bot Information
- **Bot Token**: `8316357624:AAGVRFRafzyBEX4eWZVwcVISnPE1osaY_Qo`
- **Bot Username**: Check by sending `/start` to the bot

## Setup Instructions

### 1. Get Your Telegram Chat ID

Parents need to get their Telegram Chat ID to receive messages:

1. **Find the Bot**: Search for your Smartendance bot on Telegram (using the bot username)
2. **Start the Bot**: Send `/start` command to the bot
3. **Get Chat ID**: 
   - Visit: `https://api.telegram.org/bot8316357624:AAGVRFRafzyBEX4eWZVwcVISnPE1osaY_Qo/getUpdates`
   - Look for the `"chat":{"id":YOUR_CHAT_ID}` in the response
   - The chat ID will be a number like `123456789`

### 2. Admin Setup

Admins can configure their own chat ID to receive notifications:

1. Get your admin Telegram chat ID using the method above
2. Update the `.env` file in the server folder:
   ```env
   TELEGRAM_ADMIN_CHAT_ID=your_admin_chat_id_here
   ```
3. Restart the server

### 3. Add Chat IDs to Student Records

There are two ways to add Telegram chat IDs:

#### Option A: Through Student Edit Modal (Recommended)
1. Go to Students page
2. Click Edit on a student
3. Add the parent's Telegram Chat ID in the appropriate field
4. Save changes

#### Option B: Direct Database Update
You can add chat IDs to these fields in the student document:
- `parentInfo.telegramChatId` - For parent/guardian
- `emergencyContact.telegramChatId` - For emergency contact

## Features

### 1. Send to Individual Student's Parent
- Navigate to **Home > Messages** (`/home/messages`)
- Find the student in the list
- Click **Send** button
- Choose contact type (Parent or Emergency)
- Type your message
- Click **Send via Telegram**

### 2. Broadcast to All Parents
- Navigate to **Home > Messages**
- Click **Send to All** button
- Choose recipient type:
  - **Parent Telegram**: Send to all parents
  - **Emergency Telegram**: Send to all emergency contacts
  - **Both Telegram Contacts**: Send to all available contacts
- Apply filters (optional):
  - Grade Level
  - Section
- Type your message
- Click **Send to All**

### 3. Automatic Notifications (Future)
The system can be configured to send automatic notifications for:
- Student check-in/check-out
- Late arrivals
- Consecutive absences
- No time-out warnings
- Teacher updates

## API Endpoints

### Base URL
```
http://localhost:4000/api/telegram
```

### Available Endpoints

#### 1. Send Message
```http
POST /api/telegram/send
Content-Type: application/json

{
  "chatId": "123456789",
  "message": "Your message here"
}
```

#### 2. Broadcast Message
```http
POST /api/telegram/broadcast
Content-Type: application/json

{
  "chatIds": ["123456789", "987654321"],
  "message": "Your broadcast message"
}
```

#### 3. Send to Student
```http
POST /api/telegram/send-to-student
Content-Type: application/json

{
  "studentId": "STU-001",
  "message": "Message for parent",
  "contactType": "contact"
}
```

#### 4. Send to All Students
```http
POST /api/telegram/send-to-all
Content-Type: application/json

{
  "message": "Broadcast message",
  "contactType": "both",
  "filters": {
    "gradeLevel": "Grade 1",
    "section": "A"
  }
}
```

#### 5. Verify Chat ID
```http
POST /api/telegram/verify-chat-id
Content-Type: application/json

{
  "chatId": "123456789"
}
```

#### 6. Get Bot Info
```http
GET /api/telegram/bot-info
```

## Message Format

### Individual Message
```
📢 Message from School

👤 Student: John Doe
🆔 Student ID: STU-001
📚 Grade: Grade 1 - A

Your custom message here
```

### Broadcast Message
```
📢 Important Message from School

Your custom message here

_This message was sent to all parents._
```

## Troubleshooting

### Bot Not Sending Messages
1. **Check Bot Token**: Verify the token in `.env` is correct
2. **Restart Server**: After changing `.env`, restart the server
3. **Check Chat ID**: Ensure the chat ID is correctly added to student records
4. **Bot Blocked**: Parent may have blocked the bot - they need to unblock it

### Invalid Chat ID Error
- The chat ID may be incorrect
- The parent hasn't started the bot yet
- Use the verify endpoint to test chat IDs

### Messages Not Received
1. Parent needs to start the bot first (`/start` command)
2. Check if bot is blocked by the user
3. Verify chat ID is correct in student record

## Testing

### Test Individual Message
1. Get your own Telegram chat ID
2. Add it to a test student record
3. Go to Messages page
4. Send a test message to that student

### Test Broadcast
1. Add your chat ID to multiple test students
2. Use the "Send to All" feature with filters
3. Check if you receive all messages

## Security Notes

⚠️ **Important Security Practices**:
- Never commit `.env` file with the bot token
- Keep bot token secure and private
- Validate all inputs before sending messages
- Monitor API usage to prevent abuse
- Consider implementing rate limiting for production

## Rate Limits

Telegram API has the following limits:
- **30 messages per second** to different users
- **1 message per second** to the same user
- The system includes a 50ms delay between broadcasts to respect rate limits

## Database Schema

### Student Schema Updates
```javascript
{
  parentInfo: {
    name: String,
    email: String,
    contactNumber: String,
    telegramChatId: String  // Added for Telegram
  },
  emergencyContact: {
    name: String,
    contactNumber: String,
    relationship: String,
    telegramChatId: String  // Added for Telegram
  },
  // Legacy fields for backward compatibility
  parentTelegramChatId: String,
  telegramChatId: String,
  parentContact: String
}
```

## Support

For issues or questions:
1. Check this documentation first
2. Verify bot token and chat IDs
3. Check server logs for errors
4. Test with the verify endpoint

## Future Enhancements

Planned features:
- Two-way communication (parents can reply)
- Message templates
- Scheduled messages
- Message history and tracking
- Delivery confirmation
- Rich media support (images, documents)
- Group messaging
- Automated attendance notifications
