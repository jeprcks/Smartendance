const TelegramBot = require('node-telegram-bot-api');

class TelegramService {
  constructor() {
    this.bot = null;
    this.isEnabled = process.env.TELEGRAM_NOTIFICATION_ENABLED === 'true';
    this.botToken = process.env.TELEGRAM_BOT_TOKEN;
    
    if (this.botToken) {
      try {
        // No polling - webhook mode on Vercel (POST /api/telegram/webhook receives updates)
        this.bot = new TelegramBot(this.botToken, { polling: false });
        console.log('Telegram bot initialized (webhook mode)');
        
        this.bot.getMe().then(botInfo => {
          console.log('Bot info:', botInfo.username);
        }).catch(err => {
          console.error('Bot verification failed:', err.message);
        });
      } catch (error) {
        console.error('Failed to initialize Telegram bot:', error.message);
      }
    } else {
      console.warn('Telegram bot token not provided. Telegram notifications disabled.');
    }
  }

  /**
   * Process incoming webhook update - direct command handling (awaitable).
   * Used on Vercel/serverless where we must complete work before responding.
   * @param {object} update - Telegram update object from webhook POST body
   * @returns {Promise<void>}
   */
  async handleWebhookUpdate(update) {
    if (!this.bot) return;
    const msg = update?.message;
    if (!msg?.chat?.id) return;
    const chatId = msg.chat.id;
    const text = (msg.text || '').trim();
    const firstName = msg.from?.first_name || 'there';

    const send = (t, opts = {}) => this.bot.sendMessage(chatId, t, { parse_mode: 'HTML', ...opts });

    if (text === '/start') {
      await send(`👋 Welcome to <b>Smartendance Bot</b>, ${this._escapeHtml(firstName)}!\n\nI can send you notifications about student attendance.\n\n<b>Commands:</b>\n/mychatid - Get your Chat ID\n/studentinfo - View your student's info\n/history - View attendance history\n/help - Show help\n\n<b>Your Chat ID:</b> <code>${chatId}</code>\n\n📝 Give this Chat ID to your school administrator to receive notifications.`);
      return;
    }
    if (text === '/mychatid') {
      await send(`👤 <b>${this._escapeHtml(firstName)}'s Chat ID</b>\n\n📱 Your Chat ID: <code>${chatId}</code>\n\n📋 Give this number to your school administrator - they will add it to your student's record.`);
      return;
    }
    if (text === '/help') {
      await send(`🤖 <b>Smartendance Bot Help</b>\n\n<b>Commands:</b>\n/start - Start & see your Chat ID\n/mychatid - Get your Chat ID\n/studentinfo - View student info\n/history - View attendance history\n/help - Show this help\n\n<b>How to get notifications:</b>\n1. Use /mychatid to get your Chat ID\n2. Share it with your school administrator\n3. They will add it to your student's record\n4. You'll receive attendance updates automatically!`);
      return;
    }
    if (text === '/history') {
      await this._handleHistory(chatId);
      return;
    }
    if (text === '/studentinfo') {
      await this._handleStudentInfo(chatId);
      return;
    }
    if (text && !text.startsWith('/')) {
      await send(`👋 Hi! I'm the Smartendance notification bot.\n\nYour Chat ID: <code>${chatId}</code>\n\n<b>Commands:</b> /mychatid | /studentinfo | /history | /help`);
    }
  }

  _escapeHtml(s) {
    return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  async _handleHistory(chatId) {
    try {
      const Student = require('../models/studentsSchema');
      const History = require('../models/historySchema');
      const students = await Student.find({
        $or: [
          { 'parentInfo.telegramChatId': chatId.toString() },
          { parentTelegramChatId: chatId.toString() },
          { telegramChatId: chatId.toString() }
        ],
        status: { $ne: 'Graduated' }
      }).select('studentId fullName');

      if (!students?.length) {
        await this.bot.sendMessage(chatId, `❌ No student found linked to your Chat ID.\n\nUse /mychatid to get your Chat ID and give it to your school administrator.`, { parse_mode: 'HTML' });
        return;
      }

      for (const student of students) {
        const records = await History.find({ studentId: student.studentId })
          .sort({ scanTime: -1 })
          .limit(15)
          .lean();

        if (!records?.length) {
          await this.bot.sendMessage(chatId, `📚 ${this._escapeHtml(student.fullName)} (${this._escapeHtml(student.studentId)})\n\nNo attendance history yet.`, { parse_mode: 'HTML' });
          continue;
        }

        const recordsByDate = {};
        records.forEach(record => {
          const date = new Date(record.scanTime).toISOString().split('T')[0];
          if (!recordsByDate[date]) recordsByDate[date] = { in: null, out: null };
          if (record.attendanceType === 'In') recordsByDate[date].in = record;
          else if (record.attendanceType === 'Out') recordsByDate[date].out = record;
        });

        let historyMessage = `📚 <b>Attendance History</b>\n👤 ${this._escapeHtml(student.fullName)} | ID: ${this._escapeHtml(student.studentId)}\n\n`;
        const dates = Object.keys(recordsByDate).sort().reverse();

        for (const date of dates) {
          const dayRecords = recordsByDate[date];
          const dateObj = new Date(date);
          const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric', weekday: 'short' });
          historyMessage += `📆 ${formattedDate}\n`;
          if (dayRecords.in) {
            const t = new Date(dayRecords.in.scanTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
            historyMessage += `   🟢 In: ${t} ${dayRecords.in.status || ''}\n`;
          } else historyMessage += `   🟢 In: Not recorded\n`;
          if (dayRecords.out) {
            const t = new Date(dayRecords.out.scanTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
            historyMessage += `   🔴 Out: ${t}\n`;
          } else if (dayRecords.in) historyMessage += `   🔴 Out: Not recorded\n`;
          historyMessage += '\n';
        }
        historyMessage += `📊 ${records.length} records`;
        await this.bot.sendMessage(chatId, historyMessage, { parse_mode: 'HTML' });
        if (students.length > 1) await new Promise(r => setTimeout(r, 500));
      }
    } catch (error) {
      console.error('Telegram /history error:', error);
      await this.bot.sendMessage(chatId, '❌ Error fetching attendance history. Please try again later.').catch(() => {});
    }
  }

  async _handleStudentInfo(chatId) {
    try {
      const Student = require('../models/studentsSchema');
      const students = await Student.find({
        $or: [
          { 'parentInfo.telegramChatId': chatId.toString() },
          { parentTelegramChatId: chatId.toString() },
          { telegramChatId: chatId.toString() }
        ],
        status: { $ne: 'Graduated' }
      }).select('-password -parentInfo.password');

      if (!students?.length) {
        await this.bot.sendMessage(chatId, `❌ No student found linked to your Chat ID.\n\nUse /mychatid to get your Chat ID and give it to your school administrator.`, { parse_mode: 'HTML' });
        return;
      }

      for (const student of students) {
        const info = `📚 <b>Student Information</b>\n\n👤 ${this._escapeHtml(student.fullName)} | ID: ${this._escapeHtml(student.studentId)}\n📚 Grade: ${this._escapeHtml(student.gradeLevel)} - ${this._escapeHtml(student.section)}\n📞 Parent: ${this._escapeHtml(student.parentInfo?.name || 'N/A')}`;
        await this.bot.sendMessage(chatId, info, { parse_mode: 'HTML' });
        if (students.length > 1) await new Promise(r => setTimeout(r, 500));
      }
    } catch (error) {
      console.error('Telegram /studentinfo error:', error);
      await this.bot.sendMessage(chatId, '❌ Error fetching student info. Please try again later.').catch(() => {});
    }
  }

  /** @deprecated Use handleWebhookUpdate instead - processUpdate does not wait for handlers on serverless */
  processUpdate(update) {
    if (!this.bot) return Promise.resolve();
    return Promise.resolve(this.bot.processUpdate(update));
  }

  /**
   * Send a message to a specific Telegram chat ID
   * @param {string} chatId - Telegram chat ID
   * @param {string} message - Message text
   * @param {object} options - Additional options
   * @returns {Promise<object>}
   */
  async sendMessage(chatId, message, options = {}) {
    if (!this.bot) {
      return {
        success: false,
        error: 'Telegram bot not initialized'
      };
    }

    try {
      const result = await this.bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        ...options
      });
      
      return {
        success: true,
        messageId: result.message_id,
        chatId: result.chat.id
      };
    } catch (error) {
      console.error('Telegram send error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send message to multiple chat IDs
   * @param {string[]} chatIds - Array of Telegram chat IDs
   * @param {string} message - Message text
   * @returns {Promise<object>}
   */
  async broadcast(chatIds, message) {
    if (!this.bot) {
      return {
        success: false,
        error: 'Telegram bot not initialized'
      };
    }

    const results = [];
    let successCount = 0;
    let failureCount = 0;

    for (const chatId of chatIds) {
      const result = await this.sendMessage(chatId, message);
      results.push({
        chatId,
        ...result
      });

      if (result.success) {
        successCount++;
      } else {
        failureCount++;
      }

      // Add a small delay to avoid rate limiting (30 messages per second limit)
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    return {
      success: true,
      total: chatIds.length,
      successCount,
      failureCount,
      results
    };
  }

  /**
   * Send attendance notification
   * @param {object} data - Attendance data
   */
  async sendAttendanceNotification(data) {
    if (!this.isEnabled || !this.bot) return;

    const { studentName, attendanceType, status, time, gradeLevel, section } = data;
    
    const icon = attendanceType === 'In' ? '➡️' : '⬅️';
    const statusIcon = {
      'Present': '✅',
      'Late': '⏰',
      'Absent': '❌',
      'Cutting': '⚠️',
      'Out': '⬅️'
    }[status] || '📊';

    const message = `
🔔 *Attendance Alert*

👤 *Student:* ${studentName}
📚 *Grade:* ${gradeLevel} - ${section}
${icon} *Type:* ${attendanceType}
${statusIcon} *Status:* ${status}
⏰ *Time:* ${new Date(time).toLocaleString('en-US', { 
      dateStyle: 'medium', 
      timeStyle: 'short' 
    })}
    `.trim();

    // Send to admin if configured
    if (process.env.TELEGRAM_ADMIN_CHAT_ID) {
      await this.sendMessage(process.env.TELEGRAM_ADMIN_CHAT_ID, message);
    }

    return message;
  }

  /**
   * Send consecutive alert notification
   * @param {object} notification - Notification object
   */
  async sendConsecutiveAlert(notification) {
    if (!this.isEnabled || !this.bot) return;

    const icons = {
      late: '⏰',
      absent: '❌',
      cutting: '⚠️',
      no_time_out: '🚨'
    };

    const message = `
${icons[notification.type]} *${notification.severity === 'critical' ? 'CRITICAL ALERT' : 'Warning'}*

👤 *Student:* ${notification.studentName}
📚 *Grade:* ${notification.gradeLevel} - ${notification.section}
📊 *Issue:* ${notification.type.toUpperCase().replace(/_/g, ' ')}
🔢 *Consecutive Days:* ${notification.consecutiveCount}
📅 *Last Occurrence:* ${new Date(notification.lastOccurrence).toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short'
    })}

${notification.message}
    `.trim();

    if (process.env.TELEGRAM_ADMIN_CHAT_ID) {
      await this.sendMessage(process.env.TELEGRAM_ADMIN_CHAT_ID, message);
    }

    return message;
  }

  /**
   * Send teacher update notification
   * @param {object} teacher - Teacher object
   * @param {string} action - Action performed (created, updated, deleted)
   */
  async sendTeacherUpdateNotification(teacher, action) {
    if (!this.isEnabled || !this.bot) return;

    const actionIcons = {
      created: '✅',
      updated: '✏️',
      deleted: '🗑️',
      status_changed: '🔄'
    };

    const message = `
${actionIcons[action] || '📢'} *Teacher ${action.toUpperCase()}*

👨‍🏫 *Name:* ${teacher.name}
🆔 *Teacher ID:* ${teacher.teacherId || 'N/A'}
📧 *Email:* ${teacher.email}
📱 *Phone:* ${teacher.phoneNumber}
📚 *Subject:* ${teacher.subject}
🎯 *Role:* ${teacher.role}
📊 *Status:* ${teacher.status}
    `.trim();

    if (process.env.TELEGRAM_ADMIN_CHAT_ID) {
      await this.sendMessage(process.env.TELEGRAM_ADMIN_CHAT_ID, message);
    }

    return message;
  }

  /**
   * Verify if a chat ID is valid by sending a test message
   * @param {string} chatId - Telegram chat ID to verify
   * @returns {Promise<object>}
   */
  async verifyChatId(chatId) {
    if (!this.bot) {
      return {
        success: false,
        error: 'Telegram bot not initialized'
      };
    }

    try {
      await this.bot.sendMessage(chatId, '✅ Telegram connection verified!');
      return {
        success: true,
        message: 'Chat ID is valid'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get bot information
   * @returns {Promise<object>}
   */
  async getBotInfo() {
    if (!this.bot) {
      return {
        success: false,
        error: 'Telegram bot not initialized'
      };
    }

    try {
      const botInfo = await this.bot.getMe();
      return {
        success: true,
        bot: botInfo
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new TelegramService();
