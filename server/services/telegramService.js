const TelegramBot = require('node-telegram-bot-api');

// Theme: separators and visual style for consistent messaging
const THEME = {
  sep: '━━━━━━━━━━━━━━━━━━━━',
  sepLight: '──────────────────',
  dot: '•',
  arrow: '›',
  check: '✓',
  cross: '✗',
  icons: {
    alert: '🔔',
    school: '🏫',
    user: '👤',
    student: '📚',
    calendar: '📅',
    clock: '⏰',
    id: '🆔',
    grade: '📖',
    phone: '📞',
    email: '📧',
    info: 'ℹ️',
    help: '💡',
    success: '✅',
    warning: '⚠️',
    error: '❌',
    in: '🟢',
    out: '🔴',
    present: '✅',
    late: '⏰',
    absent: '❌',
    cutting: '⚠️',
  },
};

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
    if (!this.bot) {
      console.error('[Telegram] Bot not initialized - TELEGRAM_BOT_TOKEN missing in environment?');
      return 'BOT_NOT_CONFIGURED';
    }
    const msg = update?.message;
    if (!msg?.chat?.id) return;
    const chatId = msg.chat.id;
    const text = (msg.text || '').trim();
    const firstName = msg.from?.first_name || 'there';

    const send = (t, opts = {}) => this.bot.sendMessage(chatId, t, { parse_mode: 'HTML', ...opts });

    if (text === '/start') {
      await send(
        `${THEME.icons.school} <b>Welcome to Smartendance Bot</b>\n` +
        `${THEME.sepLight}\n` +
        `Hi ${this._escapeHtml(firstName)}! I send you notifications about your child's attendance.\n\n` +
        `<b>Quick Commands</b>\n` +
        `${THEME.dot} /mychatid ${THEME.arrow} Get your Chat ID\n` +
        `${THEME.dot} /studentinfo ${THEME.arrow} View student details\n` +
        `${THEME.dot} /history ${THEME.arrow} Attendance history (last 15 days)\n` +
        `${THEME.dot} /help ${THEME.arrow} Show all commands\n\n` +
        `${THEME.icons.id} <b>Your Chat ID:</b> <code>${chatId}</code>\n\n` +
        `${THEME.icons.info} Share this Chat ID with your school admin to receive attendance alerts.`
      );
      return;
    }
    if (text === '/mychatid') {
      await send(
        `${THEME.icons.id} <b>Your Telegram Chat ID</b>\n` +
        `${THEME.sepLight}\n` +
        `${this._escapeHtml(firstName)}, your Chat ID is:\n\n` +
        `<code>${chatId}</code>\n\n` +
        `${THEME.icons.help} Tap to copy, then give it to your school administrator.`
      );
      return;
    }
    if (text === '/help') {
      await send(
        `${THEME.icons.help} <b>Smartendance Bot</b>\n` +
        `${THEME.sep}\n` +
        `<b>Commands</b>\n` +
        `${THEME.dot} /start ${THEME.arrow} Welcome & Chat ID\n` +
        `${THEME.dot} /mychatid ${THEME.arrow} Get your Chat ID\n` +
        `${THEME.dot} /studentinfo ${THEME.arrow} Student details\n` +
        `${THEME.dot} /history ${THEME.arrow} Last 15 days attendance\n` +
        `${THEME.dot} /help ${THEME.arrow} This message\n\n` +
        `<b>How to get notifications</b>\n` +
        `1. Use /mychatid to get your Chat ID\n` +
        `2. Share it with your school admin\n` +
        `3. They add it to your student's record\n` +
        `4. You receive attendance alerts automatically ${THEME.check}`
      );
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
      await send(
        `${THEME.icons.school} Hi! I'm the Smartendance bot.\n` +
        `${THEME.icons.id} Your Chat ID: <code>${chatId}</code>\n\n` +
        `${THEME.icons.help} Try: /mychatid /studentinfo /history /help`
      );
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
        await this.bot.sendMessage(chatId,
          `${THEME.icons.error} <b>No student linked</b>\n${THEME.sepLight}\n` +
          `Your Chat ID isn't linked to any student.\n\n${THEME.icons.help} Use /mychatid and share it with your school admin.`,
          { parse_mode: 'HTML' }
        );
        return;
      }

      for (const student of students) {
        const records = await History.find({ studentId: student.studentId })
          .sort({ scanTime: -1 })
          .limit(15)
          .lean();

        if (!records?.length) {
          await this.bot.sendMessage(chatId,
            `${THEME.icons.student} <b>${this._escapeHtml(student.fullName)}</b>\n` +
            `${THEME.icons.id} <code>${this._escapeHtml(student.studentId)}</code>\n${THEME.sepLight}\n` +
            `${THEME.icons.info} No attendance records yet.`,
            { parse_mode: 'HTML' }
          );
          continue;
        }

        const recordsByDate = {};
        records.forEach(record => {
          const date = new Date(record.scanTime).toISOString().split('T')[0];
          if (!recordsByDate[date]) recordsByDate[date] = { in: null, out: null };
          if (record.attendanceType === 'In') recordsByDate[date].in = record;
          else if (record.attendanceType === 'Out') recordsByDate[date].out = record;
        });

        const statusEmoji = (s) => ({ Present: THEME.icons.present, Late: THEME.icons.late, Cutting: THEME.icons.cutting }[s] || '');
        let historyMessage = `${THEME.icons.calendar} <b>Attendance History</b>\n`;
        historyMessage += `${THEME.icons.user} ${this._escapeHtml(student.fullName)} ${THEME.dot} <code>${this._escapeHtml(student.studentId)}</code>\n${THEME.sepLight}\n`;
        const dates = Object.keys(recordsByDate).sort().reverse();

        for (const date of dates) {
          const dayRecords = recordsByDate[date];
          const dateObj = new Date(date);
          const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric', weekday: 'short' });
          historyMessage += `\n<b>${formattedDate}</b>\n`;
          if (dayRecords.in) {
            const t = new Date(dayRecords.in.scanTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
            historyMessage += `  ${THEME.icons.in} In: ${t} ${statusEmoji(dayRecords.in.status) || ''}\n`;
          } else historyMessage += `  ${THEME.icons.in} In: —\n`;
          if (dayRecords.out) {
            const t = new Date(dayRecords.out.scanTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
            historyMessage += `  ${THEME.icons.out} Out: ${t}\n`;
          } else if (dayRecords.in) historyMessage += `  ${THEME.icons.out} Out: —\n`;
        }
        historyMessage += `\n${THEME.sepLight}\n${THEME.icons.info} ${records.length} records`;
        await this.bot.sendMessage(chatId, historyMessage, { parse_mode: 'HTML' });
        if (students.length > 1) await new Promise(r => setTimeout(r, 500));
      }
    } catch (error) {
      console.error('Telegram /history error:', error);
      await this.bot.sendMessage(chatId,
        `${THEME.icons.error} <b>Error</b>\n${THEME.sepLight}\nCould not fetch attendance. Please try again later.`,
        { parse_mode: 'HTML' }
      ).catch(() => {});
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
        await this.bot.sendMessage(chatId,
          `${THEME.icons.error} <b>No student linked</b>\n${THEME.sepLight}\n` +
          `Your Chat ID isn't linked to any student.\n\n${THEME.icons.help} Use /mychatid and share it with your school admin.`,
          { parse_mode: 'HTML' }
        );
        return;
      }

      for (const student of students) {
        const info =
          `${THEME.icons.student} <b>Student Information</b>\n${THEME.sep}\n` +
          `${THEME.icons.user} <b>${this._escapeHtml(student.fullName)}</b>\n` +
          `${THEME.icons.id} <code>${this._escapeHtml(student.studentId)}</code>\n` +
          `${THEME.icons.grade} Grade ${this._escapeHtml(student.gradeLevel)} - ${this._escapeHtml(student.section)}\n` +
          `${THEME.icons.phone} Parent: ${this._escapeHtml(student.parentInfo?.name || 'N/A')}\n` +
          `${THEME.icons.phone} Contact: ${this._escapeHtml(student.parentInfo?.contactNumber || 'N/A')}`;
        await this.bot.sendMessage(chatId, info, { parse_mode: 'HTML' });
        if (students.length > 1) await new Promise(r => setTimeout(r, 500));
      }
    } catch (error) {
      console.error('Telegram /studentinfo error:', error);
      await this.bot.sendMessage(chatId,
        `${THEME.icons.error} <b>Error</b>\n${THEME.sepLight}\nCould not fetch student info. Please try again later.`,
        { parse_mode: 'HTML' }
      ).catch(() => {});
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
    const icon = attendanceType === 'In' ? THEME.icons.in : THEME.icons.out;
    const statusIcon = {
      'Present': THEME.icons.present,
      'Late': THEME.icons.late,
      'Absent': THEME.icons.absent,
      'Cutting': THEME.icons.cutting,
      'Out': THEME.icons.out
    }[status] || THEME.icons.info;

    const timeStr = new Date(time).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
    const message =
      `${THEME.icons.alert} <b>Attendance Alert</b>\n${THEME.sep}\n` +
      `${THEME.icons.user} <b>${this._escapeHtml(studentName)}</b>\n` +
      `${THEME.icons.grade} ${this._escapeHtml(gradeLevel)} - ${this._escapeHtml(section)}\n` +
      `${icon} <b>${attendanceType}</b> ${statusIcon} ${status}\n` +
      `${THEME.icons.clock} ${timeStr}`;

    if (process.env.TELEGRAM_ADMIN_CHAT_ID) {
      await this.sendMessage(process.env.TELEGRAM_ADMIN_CHAT_ID, message, { parse_mode: 'HTML' });
    }

    return message;
  }

  /**
   * Send consecutive alert notification
   * @param {object} notification - Notification object
   */
  async sendConsecutiveAlert(notification) {
    if (!this.isEnabled || !this.bot) return;

    const typeIcon = {
      late: THEME.icons.late,
      absent: THEME.icons.absent,
      cutting: THEME.icons.cutting,
      no_time_out: '🚨'
    }[notification.type] || THEME.icons.warning;

    const header = notification.severity === 'critical' ? 'CRITICAL ALERT' : 'Warning';
    const lastOccurrence = new Date(notification.lastOccurrence).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
    const issue = notification.type.toUpperCase().replace(/_/g, ' ');

    const message =
      `${typeIcon} <b>${header}</b>\n${THEME.sep}\n` +
      `${THEME.icons.user} <b>${this._escapeHtml(notification.studentName)}</b>\n` +
      `${THEME.icons.grade} ${this._escapeHtml(notification.gradeLevel)} - ${this._escapeHtml(notification.section)}\n` +
      `${THEME.icons.info} Issue: ${issue}\n` +
      `${THEME.icons.clock} Consecutive: ${notification.consecutiveCount} days\n` +
      `${THEME.icons.calendar} Last: ${lastOccurrence}\n${THEME.sepLight}\n` +
      `${this._escapeHtml(notification.message)}`;

    if (process.env.TELEGRAM_ADMIN_CHAT_ID) {
      await this.sendMessage(process.env.TELEGRAM_ADMIN_CHAT_ID, message, { parse_mode: 'HTML' });
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

    const actionIcons = { created: THEME.icons.success, updated: '✏️', deleted: '🗑️', status_changed: '🔄' };
    const icon = actionIcons[action] || '📢';

    const message =
      `${icon} <b>Teacher ${action.toUpperCase()}</b>\n${THEME.sep}\n` +
      `${THEME.icons.user} ${this._escapeHtml(teacher.name)}\n` +
      `${THEME.icons.id} ${this._escapeHtml(teacher.teacherId || 'N/A')}\n` +
      `${THEME.icons.email} ${this._escapeHtml(teacher.email)}\n` +
      `${THEME.icons.phone} ${this._escapeHtml(teacher.phoneNumber || 'N/A')}\n` +
      `${THEME.icons.grade} ${this._escapeHtml(Array.isArray(teacher.subjects) ? teacher.subjects.join(', ') : (teacher.subject || 'N/A'))}\n` +
      `🎯 ${this._escapeHtml(teacher.role || 'N/A')}\n` +
      `${THEME.icons.info} Status: ${this._escapeHtml(teacher.status || 'N/A')}`;

    if (process.env.TELEGRAM_ADMIN_CHAT_ID) {
      await this.sendMessage(process.env.TELEGRAM_ADMIN_CHAT_ID, message, { parse_mode: 'HTML' });
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
      await this.bot.sendMessage(chatId, `${THEME.icons.success} <b>Telegram connected</b>\n${THEME.sepLight}\nYour Chat ID is valid.`, { parse_mode: 'HTML' });
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
