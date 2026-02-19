const express = require('express');
const router = express.Router();
const {
  sendMessage,
  broadcastMessage,
  sendToStudent,
  sendToAllStudents,
  verifyChatId,
  getBotInfo,
  webhookHandler
} = require('../controllers/telegramController');

// Telegram webhook - receives updates for bot commands (/start, /mychatid, etc.)
router.post('/webhook', webhookHandler);

// GET for testing - verify webhook URL is reachable (Telegram only sends POST)
router.get('/webhook', (req, res) => {
  res.json({ ok: true, message: 'Telegram webhook endpoint. Send POST from Telegram.' });
});

// Diagnostic: check if bot is configured (TELEGRAM_BOT_TOKEN set on Vercel)
router.get('/status', (req, res) => {
  const telegramService = require('../services/telegramService');
  res.json({
    ok: true,
    botConfigured: !!telegramService.bot,
    hasToken: !!process.env.TELEGRAM_BOT_TOKEN,
  });
});

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
