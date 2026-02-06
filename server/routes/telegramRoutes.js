const express = require('express');
const router = express.Router();
const {
  sendMessage,
  broadcastMessage,
  sendToStudent,
  sendToAllStudents,
  verifyChatId,
  getBotInfo
} = require('../controllers/telegramController');

// Send message to a specific chat ID
router.post('/send', sendMessage);

// Broadcast message to multiple chat IDs
router.post('/broadcast', broadcastMessage);

// Send message to a student's parent
router.post('/send-to-student', sendToStudent);

// Send message to all students' parents
router.post('/send-to-all', sendToAllStudents);

// Verify a Telegram chat ID
router.post('/verify-chat-id', verifyChatId);

// Get bot information
router.get('/bot-info', getBotInfo);

module.exports = router;
