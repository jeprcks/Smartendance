const TelegramBot = require('node-telegram-bot-api');

class TelegramService {
  constructor() {
    this.bot = null;
    this.isEnabled = process.env.TELEGRAM_NOTIFICATION_ENABLED === 'true';
    this.botToken = process.env.TELEGRAM_BOT_TOKEN;
    
    if (this.botToken) {
      try {
        // Only one instance per bot token can use polling (getUpdates). On Railway we disable
        // polling so the API can still send messages; run one instance with
        // TELEGRAM_POLLING_ENABLED=true (e.g. local) to receive /start, /mychatid, etc.
        const polling = process.env.TELEGRAM_POLLING_ENABLED === 'true';
        this.bot = new TelegramBot(this.botToken, { polling });
        console.log('Telegram bot initialized successfully' + (polling ? ' (polling enabled)' : ' (polling disabled, send-only)'));
        console.log('Bot token:', this.botToken.substring(0, 15) + '...');
        
        // Test the bot immediately
        this.bot.getMe().then(botInfo => {
          console.log('Bot info:', botInfo.username);
        }).catch(err => {
          console.error('Bot verification failed:', err.message);
        });

        // Set up command handlers
        this.setupCommands();
      } catch (error) {
        console.error('Failed to initialize Telegram bot:', error.message);
      }
    } else {
      console.warn('Telegram bot token not provided. Telegram notifications disabled.');
    }
  }

  /**
   * Set up bot command handlers
   */
  setupCommands() {
    if (!this.bot) return;

    // /start command
    this.bot.onText(/\/start/, (msg) => {
      const chatId = msg.chat.id;
      const firstName = msg.from.first_name || 'there';
      
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

💡 *Tips:*
• Use /studentinfo to view student details
• Use /history to see attendance records
      `.trim();

      this.bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
    });

    // /mychatid command
    this.bot.onText(/\/mychatid/, (msg) => {
      const chatId = msg.chat.id;
      const firstName = msg.from.first_name || 'User';
      
      const message = `
👤 *${firstName}'s Chat ID*

📱 Your Telegram Chat ID is:
\`${chatId}\`

📋 *How to use it:*
1. Tap on the Chat ID above to copy it
2. Give this number to your school administrator
3. They will add it to your student's record in the system

✅ Once added, you'll receive attendance notifications here!

💡 *Tip:* Save this Chat ID somewhere safe in case you need it again.
      `.trim();

      this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    });

    // /history command
    this.bot.onText(/\/history/, async (msg) => {
      const chatId = msg.chat.id;
      
      try {
        // Import models dynamically
        const Student = require('../models/studentsSchema');
        const History = require('../models/historySchema');
        
        // Find student(s) associated with this Chat ID
        const students = await Student.find({
          $or: [
            { 'parentInfo.telegramChatId': chatId.toString() },
            { parentTelegramChatId: chatId.toString() },
            { telegramChatId: chatId.toString() }
          ],
          status: { $ne: 'Graduated' }
        }).select('studentId fullName');

        if (!students || students.length === 0) {
          const notFoundMessage = `
❌ *No Student Found*

Your Chat ID (\`${chatId}\`) is not linked to any student record yet.

📝 *To link your account:*
Use /mychatid to get your Chat ID and give it to your school administrator.

💡 *Available commands:* /help
          `.trim();
          
          this.bot.sendMessage(chatId, notFoundMessage, { parse_mode: 'Markdown' });
          return;
        }

        // Get attendance history for each student
        for (const student of students) {
          // Get last 15 attendance records
          const records = await History.find({
            studentId: student.studentId
          })
            .sort({ scanTime: -1 })
            .limit(15)
            .lean();

          if (!records || records.length === 0) {
            const noHistoryMessage = `
📚 *${student.fullName}*
Student ID: \`${student.studentId}\`

📭 No attendance history found yet.

Your attendance records will appear here once you start checking in and out at school.
            `.trim();
            
            await this.bot.sendMessage(chatId, noHistoryMessage, { parse_mode: 'Markdown' });
            continue;
          }

          // Group records by date
          const recordsByDate = {};
          records.forEach(record => {
            const date = new Date(record.scanTime).toISOString().split('T')[0];
            if (!recordsByDate[date]) {
              recordsByDate[date] = { in: null, out: null };
            }
            if (record.attendanceType === 'In') {
              recordsByDate[date].in = record;
            } else if (record.attendanceType === 'Out') {
              recordsByDate[date].out = record;
            }
          });

          // Build history message
          let historyMessage = `
📚 *Attendance History*
👤 ${student.fullName}
🆔 Student ID: \`${student.studentId}\`

📅 *Last 15 Days:*
━━━━━━━━━━━━━━━━━━━
`;

          const dates = Object.keys(recordsByDate).sort().reverse();
          
          for (const date of dates) {
            const dayRecords = recordsByDate[date];
            const dateObj = new Date(date);
            const formattedDate = dateObj.toLocaleDateString('en-US', {
              month: 'short',
              day: '2-digit',
              year: 'numeric',
              weekday: 'short'
            });

            historyMessage += `\n📆 *${formattedDate}*\n`;

            // Check-in
            if (dayRecords.in) {
              const checkInTime = new Date(dayRecords.in.scanTime).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
              });
              const statusEmoji = dayRecords.in.status === 'Present' ? '✅' : 
                                  dayRecords.in.status === 'Late' ? '⏰' : 
                                  dayRecords.in.status === 'Cutting' ? '⚠️' : '❓';
              historyMessage += `   🟢 In: ${checkInTime} ${statusEmoji} ${dayRecords.in.status}\n`;
            } else {
              historyMessage += `   🟢 In: Not recorded\n`;
            }

            // Check-out
            if (dayRecords.out) {
              const checkOutTime = new Date(dayRecords.out.scanTime).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
              });
              historyMessage += `   🔴 Out: ${checkOutTime}\n`;
              
              // Duration
              if (dayRecords.in && dayRecords.out) {
                const duration = dayRecords.out.durationMinutes || 
                  Math.round((new Date(dayRecords.out.scanTime) - new Date(dayRecords.in.scanTime)) / (1000 * 60));
                const hours = Math.floor(duration / 60);
                const minutes = duration % 60;
                historyMessage += `   ⏱️ Duration: ${hours}h ${minutes}m\n`;
              }
            } else if (dayRecords.in) {
              historyMessage += `   🔴 Out: Not recorded yet\n`;
            }

            historyMessage += '\n';
          }

          historyMessage += `━━━━━━━━━━━━━━━━━━━
📊 *Summary:*
• Total Records: ${records.length}
• Check-ins: ${records.filter(r => r.attendanceType === 'In').length}
• Check-outs: ${records.filter(r => r.attendanceType === 'Out').length}

💡 Use /studentinfo for student details
          `.trim();

          await this.bot.sendMessage(chatId, historyMessage, { parse_mode: 'Markdown' });
          
          // Small delay between multiple students
          if (students.length > 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }

        if (students.length > 1) {
          await this.bot.sendMessage(chatId, `✅ Showing attendance history for ${students.length} students.`, { parse_mode: 'Markdown' });
        }
        
      } catch (error) {
        console.error('Error fetching attendance history:', error);
        this.bot.sendMessage(chatId, '❌ Sorry, there was an error fetching attendance history. Please try again later or contact your school administrator.', { parse_mode: 'Markdown' });
      }
    });

    // /studentinfo command
    this.bot.onText(/\/studentinfo/, async (msg) => {
      const chatId = msg.chat.id;
      
      try {
        // Import Student model dynamically to avoid circular dependency
        const Student = require('../models/studentsSchema');
        
        // Find student(s) associated with this Chat ID
        const students = await Student.find({
          $or: [
            { 'parentInfo.telegramChatId': chatId.toString() },
            { parentTelegramChatId: chatId.toString() },
            { telegramChatId: chatId.toString() }
          ],
          status: { $ne: 'Graduated' } // Exclude graduated students
        }).select('-password -parentInfo.password');

        if (!students || students.length === 0) {
          const notFoundMessage = `
❌ *No Student Found*

Your Chat ID (\`${chatId}\`) is not linked to any student record yet.

📝 *To link your account:*
1. Make sure the school administrator has added your Chat ID to your student's record
2. Use /mychatid to verify your Chat ID
3. Contact the school if you need assistance

💡 *Need your Chat ID?* Use /mychatid
          `.trim();
          
          this.bot.sendMessage(chatId, notFoundMessage, { parse_mode: 'Markdown' });
          return;
        }

        // Send info for each student (in case parent has multiple children)
        for (const student of students) {
          const statusEmoji = student.status === 'Active' ? '✅' : '⚠️';
          const shiftEmoji = student.shift === 'Morning' ? '🌅' : '🌆';
          
          const studentInfo = `
📚 *Student Information*

${statusEmoji} *Status:* ${student.status}

👤 *Personal Details:*
• Name: ${student.fullName}
• Student ID: \`${student.studentId}\`
• Age: ${student.age} years old
• Gender: ${student.gender}

🎓 *Academic Information:*
• Grade: ${student.gradeLevel}
• Section: ${student.section}
• Shift: ${shiftEmoji} ${student.shift}

📞 *Contact Information:*
• Student Phone: ${student.phoneNumber || 'Not provided'}
• Parent: ${student.parentInfo?.name || 'Not provided'}
• Parent Phone: ${student.parentInfo?.contactNumber || 'Not provided'}

🚨 *Emergency Contact:*
• Name: ${student.emergencyContact?.name || 'Not provided'}
• Phone: ${student.emergencyContact?.contactNumber || 'Not provided'}
• Relationship: ${student.emergencyContact?.relationship || 'Not provided'}

📍 *Address:*
${student.address?.street || 'Not provided'}
${student.address?.city || ''}${student.address?.province ? ', ' + student.address.province : ''}${student.address?.zipCode ? ' ' + student.address.zipCode : ''}

---
_Use /help to see all available commands_
          `.trim();

          await this.bot.sendMessage(chatId, studentInfo, { parse_mode: 'Markdown' });
          
          // Small delay between multiple students
          if (students.length > 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }

        if (students.length > 1) {
          await this.bot.sendMessage(chatId, `✅ Found ${students.length} students linked to your account.`, { parse_mode: 'Markdown' });
        }
        
      } catch (error) {
        console.error('Error fetching student info:', error);
        this.bot.sendMessage(chatId, '❌ Sorry, there was an error fetching student information. Please try again later or contact your school administrator.', { parse_mode: 'Markdown' });
      }
    });

    // /help command
    this.bot.onText(/\/help/, (msg) => {
      const chatId = msg.chat.id;
      
      const helpMessage = `
🤖 *Smartendance Bot Help*

*Available Commands:*

/start - Start the bot and see your Chat ID
/mychatid - Get your Telegram Chat ID
/studentinfo - View your student's information
/history - View attendance history (last 15 days)
/help - Show this help message

*What is a Chat ID?*
Your Chat ID is a unique number that identifies your Telegram account. The school uses it to send you notifications.

*How to get notifications:*
1. Use /mychatid to get your Chat ID
2. Share it with your school administrator
3. They will add it to your student's record
4. You'll receive attendance updates automatically!

*View Student Info:*
Use /studentinfo to see your student's details including grade, section, contacts, and more.

*View Attendance History:*
Use /history to see check-in/check-out records, status, and duration for the last 15 days.

*Need help?*
Contact your school administrator if you have any questions.
      `.trim();

      this.bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
    });

    // Handle any other message
    this.bot.on('message', (msg) => {
      // Skip if it's a command (starts with /)
      if (msg.text && msg.text.startsWith('/')) return;

      const chatId = msg.chat.id;
      
      // Reply with helpful info
      const message = `
👋 Hi! I'm the Smartendance notification bot.

Your Chat ID: \`${chatId}\`

📌 *Quick Commands:*
/mychatid - Get your Chat ID
/studentinfo - View student details
/history - View attendance history
/help - See all commands
      `.trim();

      this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    });

    console.log('Bot commands set up successfully');
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
