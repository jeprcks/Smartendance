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
        this.setupCommands();
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
   * Process incoming webhook update (triggers command handlers)
   * @param {object} update - Telegram update object from webhook POST body
   */
  processUpdate(update) {
    if (!this.bot) return Promise.resolve();
    return Promise.resolve(this.bot.processUpdate(update));
  }

  /**
   * Set up bot command handlers (triggered via webhook processUpdate)
   */
  setupCommands() {
    if (!this.bot) return;

    // /start command
    this.bot.onText(/\/start/, (msg) => {
      const chatId = msg.chat.id;
      const firstName = msg.from?.first_name || 'there';
      const welcomeMessage = `
👋 Welcome to *Smartendance Bot*, ${firstName}!

I can send you notifications about student attendance.

*Available Commands:*
/mychatid - Get your Chat ID
/studentinfo - View your student's info
/history - View attendance history
/help - Show this help message

*Your Chat ID:* \`${chatId}\`

📝 *To receive notifications:*
1. Copy your Chat ID above
2. Give it to your school administrator
3. They will add it to your student's record

That's it! You'll start receiving attendance updates.
      `.trim();
      this.bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' }).catch(err => console.error('Telegram /start error:', err.message));
    });

    // /mychatid command
    this.bot.onText(/\/mychatid/, (msg) => {
      const chatId = msg.chat.id;
      const firstName = msg.from?.first_name || 'User';
      const message = `
👤 *${firstName}'s Chat ID*

📱 Your Telegram Chat ID is:
\`${chatId}\`

📋 *How to use it:*
1. Tap on the Chat ID above to copy it
2. Give this number to your school administrator
3. They will add it to your student's record in the system

✅ Once added, you'll receive attendance notifications here!
      `.trim();
      this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' }).catch(err => console.error('Telegram /mychatid error:', err.message));
    });

    // /history command
    this.bot.onText(/\/history/, async (msg) => {
      const chatId = msg.chat.id;
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
          const notFoundMessage = `❌ *No Student Found*\n\nYour Chat ID (\`${chatId}\`) is not linked to any student record yet.\n\n📝 Use /mychatid to get your Chat ID and give it to your school administrator.`;
          this.bot.sendMessage(chatId, notFoundMessage, { parse_mode: 'Markdown' });
          return;
        }

        for (const student of students) {
          const records = await History.find({ studentId: student.studentId })
            .sort({ scanTime: -1 })
            .limit(15)
            .lean();

          if (!records?.length) {
            const noHistoryMessage = `📚 *${student.fullName}*\nStudent ID: \`${student.studentId}\`\n\n📭 No attendance history found yet.`;
            await this.bot.sendMessage(chatId, noHistoryMessage, { parse_mode: 'Markdown' });
            continue;
          }

          const recordsByDate = {};
          records.forEach(record => {
            const date = new Date(record.scanTime).toISOString().split('T')[0];
            if (!recordsByDate[date]) recordsByDate[date] = { in: null, out: null };
            if (record.attendanceType === 'In') recordsByDate[date].in = record;
            else if (record.attendanceType === 'Out') recordsByDate[date].out = record;
          });

          let historyMessage = `📚 *Attendance History*\n👤 ${student.fullName}\n🆔 Student ID: \`${student.studentId}\`\n\n📅 *Last 15 Days:*\n━━━━━━━━━━━━━━━━━━━\n`;
          const dates = Object.keys(recordsByDate).sort().reverse();

          for (const date of dates) {
            const dayRecords = recordsByDate[date];
            const dateObj = new Date(date);
            const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric', weekday: 'short' });
            historyMessage += `\n📆 *${formattedDate}*\n`;

            if (dayRecords.in) {
              const checkInTime = new Date(dayRecords.in.scanTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
              const statusEmoji = dayRecords.in.status === 'Present' ? '✅' : dayRecords.in.status === 'Late' ? '⏰' : dayRecords.in.status === 'Cutting' ? '⚠️' : '❓';
              historyMessage += `   🟢 In: ${checkInTime} ${statusEmoji} ${dayRecords.in.status}\n`;
            } else {
              historyMessage += `   🟢 In: Not recorded\n`;
            }

            if (dayRecords.out) {
              const checkOutTime = new Date(dayRecords.out.scanTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
              historyMessage += `   🔴 Out: ${checkOutTime}\n`;
              if (dayRecords.in) {
                const duration = dayRecords.out.durationMinutes || Math.round((new Date(dayRecords.out.scanTime) - new Date(dayRecords.in.scanTime)) / (1000 * 60));
                historyMessage += `   ⏱️ Duration: ${Math.floor(duration / 60)}h ${duration % 60}m\n`;
              }
            } else if (dayRecords.in) {
              historyMessage += `   🔴 Out: Not recorded yet\n`;
            }
            historyMessage += '\n';
          }

          historyMessage += `━━━━━━━━━━━━━━━━━━━\n📊 *Summary:* ${records.length} records`;
          await this.bot.sendMessage(chatId, historyMessage, { parse_mode: 'Markdown' });
          if (students.length > 1) await new Promise(r => setTimeout(r, 500));
        }

        if (students.length > 1) {
          await this.bot.sendMessage(chatId, `✅ Showing attendance history for ${students.length} students.`, { parse_mode: 'Markdown' });
        }
      } catch (error) {
        console.error('Error fetching attendance history:', error);
        this.bot.sendMessage(chatId, '❌ Sorry, there was an error fetching attendance history. Please try again later.').catch(() => {});
      }
    });

    // /studentinfo command
    this.bot.onText(/\/studentinfo/, async (msg) => {
      const chatId = msg.chat.id;
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
          const notFoundMessage = `❌ *No Student Found*\n\nYour Chat ID is not linked to any student record.\n\n📝 Use /mychatid to get your Chat ID and give it to your school administrator.`;
          this.bot.sendMessage(chatId, notFoundMessage, { parse_mode: 'Markdown' });
          return;
        }

        for (const student of students) {
          const statusEmoji = student.status === 'Active' ? '✅' : '⚠️';
          const shiftEmoji = student.shift === 'Morning' ? '🌅' : '🌆';
          const studentInfo = `
📚 *Student Information*
${statusEmoji} *Status:* ${student.status}

👤 *Personal:* ${student.fullName} | ID: \`${student.studentId}\` | Age: ${student.age} | ${student.gender}
🎓 *Grade:* ${student.gradeLevel} - ${student.section} | Shift: ${shiftEmoji} ${student.shift}
📞 *Parent:* ${student.parentInfo?.name || 'N/A'} | ${student.parentInfo?.contactNumber || 'N/A'}
📍 *Address:* ${student.address?.street || 'N/A'} ${student.address?.city || ''}
          `.trim();
          await this.bot.sendMessage(chatId, studentInfo, { parse_mode: 'Markdown' });
          if (students.length > 1) await new Promise(r => setTimeout(r, 500));
        }

        if (students.length > 1) {
          await this.bot.sendMessage(chatId, `✅ Found ${students.length} students linked to your account.`, { parse_mode: 'Markdown' });
        }
      } catch (error) {
        console.error('Error fetching student info:', error);
        this.bot.sendMessage(chatId, '❌ Sorry, there was an error. Please try again later.').catch(() => {});
      }
    });

    // /help command
    this.bot.onText(/\/help/, (msg) => {
      const chatId = msg.chat.id;
      const helpMessage = `
🤖 *Smartendance Bot Help*

*Commands:*
/start - Start & see your Chat ID
/mychatid - Get your Telegram Chat ID
/studentinfo - View student information
/history - View attendance history (last 15 days)
/help - Show this help

*How to get notifications:*
1. Use /mychatid to get your Chat ID
2. Share it with your school administrator
3. They will add it to your student's record
4. You'll receive attendance updates automatically!
      `.trim();
      this.bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' }).catch(err => console.error('Telegram /help error:', err.message));
    });

    // Handle other messages
    this.bot.on('message', (msg) => {
      if (msg.text?.startsWith('/')) return;
      const chatId = msg.chat.id;
      const message = `👋 Hi! I'm the Smartendance notification bot.\n\nYour Chat ID: \`${chatId}\`\n\n📌 *Quick Commands:*\n/mychatid - Get your Chat ID\n/studentinfo - View student details\n/history - View attendance history\n/help - See all commands`;
      this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' }).catch(err => console.error('Telegram message handler error:', err.message));
    });
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
