const telegramService = require('../services/telegramService');
const Student = require('../models/studentsSchema');

/**
 * Send a message to a specific Telegram chat ID
 */
const sendMessage = async (req, res) => {
  try {
    const { chatId, message } = req.body;

    if (!chatId || !message) {
      return res.status(400).json({
        success: false,
        message: 'Chat ID and message are required'
      });
    }

    const result = await telegramService.sendMessage(chatId, message);

    if (result.success) {
      return res.status(200).json({
        success: true,
        message: 'Message sent successfully',
        data: result
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'Failed to send message',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error in sendMessage controller:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Send a message to multiple Telegram chat IDs (broadcast)
 */
const broadcastMessage = async (req, res) => {
  try {
    const { chatIds, message } = req.body;

    if (!chatIds || !Array.isArray(chatIds) || chatIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Chat IDs array is required and must not be empty'
      });
    }

    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Message is required'
      });
    }

    const result = await telegramService.broadcast(chatIds, message);

    return res.status(200).json({
      success: true,
      message: `Message sent to ${result.successCount} out of ${result.total} recipients`,
      data: result
    });
  } catch (error) {
    console.error('Error in broadcastMessage controller:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Send message to student's parent via Telegram
 */
const sendToStudent = async (req, res) => {
  try {
    const { studentId, message, contactType } = req.body;

    if (!studentId || !message) {
      return res.status(400).json({
        success: false,
        message: 'Student ID and message are required'
      });
    }

    // Fetch student to get parent's Telegram chat ID
    const student = await Student.findOne({ studentId });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Get the appropriate contact based on contactType
    let chatId;
    if (contactType === 'emergency') {
      chatId = student.emergencyContact?.telegramChatId;
    } else {
      // Check multiple possible locations for parent Chat ID
      chatId = student.parentInfo?.telegramChatId || 
               student.parentTelegramChatId || 
               student.telegramChatId;
    }

    if (!chatId) {
      console.log('No Chat ID found. Student data:', {
        studentId: student.studentId,
        parentInfo: student.parentInfo,
        emergencyContact: student.emergencyContact,
        parentTelegramChatId: student.parentTelegramChatId,
        telegramChatId: student.telegramChatId
      });
      return res.status(400).json({
        success: false,
        message: `No Telegram chat ID found for ${contactType === 'emergency' ? 'emergency contact' : 'parent contact'}`
      });
    }

    // Format message with student info
    const formattedMessage = `
📢 *Message from School*

👤 *Student:* ${student.fullName}
🆔 *Student ID:* ${student.studentId}
📚 *Grade:* ${student.gradeLevel} - ${student.section}

${message}
    `.trim();

    const result = await telegramService.sendMessage(chatId, formattedMessage);

    if (result.success) {
      return res.status(200).json({
        success: true,
        message: 'Message sent successfully to parent',
        data: result
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'Failed to send message',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error in sendToStudent controller:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Send message to all students' parents based on filters
 */
const sendToAllStudents = async (req, res) => {
  try {
    const { message, contactType, filters } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Message is required'
      });
    }

    // Build query based on filters
    const query = {};
    if (filters?.gradeLevel) {
      query.gradeLevel = filters.gradeLevel;
    }
    if (filters?.section) {
      query.section = filters.section;
    }

    // Fetch students
    const students = await Student.find(query);

    if (students.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No students found matching the criteria'
      });
    }

    // Collect chat IDs based on contact type
    const chatIds = [];
    const studentInfo = [];

    students.forEach(student => {
      let chatId;
      
      if (contactType === 'emergency') {
        chatId = student.emergencyContact?.telegramChatId;
      } else if (contactType === 'both') {
        // Add both parent and emergency contacts
        const parentChatId = student.parentTelegramChatId || student.telegramChatId;
        const emergencyChatId = student.emergencyContact?.telegramChatId;
        
        if (parentChatId) {
          chatIds.push(parentChatId);
          studentInfo.push({ studentId: student.studentId, type: 'parent' });
        }
        if (emergencyChatId && emergencyChatId !== parentChatId) {
          chatIds.push(emergencyChatId);
          studentInfo.push({ studentId: student.studentId, type: 'emergency' });
        }
        return;
      } else {
        chatId = student.parentTelegramChatId || student.telegramChatId;
      }

      if (chatId) {
        chatIds.push(chatId);
        studentInfo.push({ studentId: student.studentId, type: contactType });
      }
    });

    if (chatIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No Telegram chat IDs found for the selected students'
      });
    }

    // Format broadcast message
    const formattedMessage = `
📢 *Important Message from School*

${message}

_This message was sent to all parents._
    `.trim();

    const result = await telegramService.broadcast(chatIds, formattedMessage);

    return res.status(200).json({
      success: true,
      message: `Message sent to ${result.successCount} out of ${result.total} recipients`,
      data: {
        ...result,
        studentsCount: students.length,
        recipientsWithChatId: chatIds.length
      }
    });
  } catch (error) {
    console.error('Error in sendToAllStudents controller:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Verify if a Telegram chat ID is valid
 */
const verifyChatId = async (req, res) => {
  try {
    const { chatId } = req.body;

    if (!chatId) {
      return res.status(400).json({
        success: false,
        message: 'Chat ID is required'
      });
    }

    const result = await telegramService.verifyChatId(chatId);

    if (result.success) {
      return res.status(200).json({
        success: true,
        message: 'Chat ID verified successfully',
        data: result
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid chat ID',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error in verifyChatId controller:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Webhook handler - receives updates from Telegram (for /start, /mychatid, /history, etc.)
 * Works on Vercel/serverless where polling cannot run.
 */
const webhookHandler = async (req, res) => {
  try {
    console.log('[Telegram webhook] Received request');
    // Optional: verify secret token if set (Telegram sends X-Telegram-Bot-Api-Secret-Token)
    const telegramSecret = req.headers['x-telegram-bot-api-secret-token'];
    const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (webhookSecret && telegramSecret !== webhookSecret) {
      return res.sendStatus(403);
    }

    let update = req.body;
    if (!update) {
      return res.sendStatus(400);
    }
    if (typeof update === 'string') {
      try {
        update = JSON.parse(update);
      } catch (e) {
        return res.sendStatus(400);
      }
    }

    await telegramService.handleWebhookUpdate(update);
    res.sendStatus(200);
  } catch (err) {
    console.error('Telegram webhook error:', err);
    if (!res.headersSent) res.sendStatus(200); // 200 to avoid Telegram retries
  }
};

/**
 * Get bot information
 */
const getBotInfo = async (req, res) => {
  try {
    const result = await telegramService.getBotInfo();

    if (result.success) {
      return res.status(200).json({
        success: true,
        data: result.bot
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'Failed to get bot information',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error in getBotInfo controller:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

module.exports = {
  sendMessage,
  broadcastMessage,
  sendToStudent,
  sendToAllStudents,
  verifyChatId,
  getBotInfo,
  webhookHandler
};
