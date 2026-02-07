import { API_BASE_URL } from '@/app/config/api';

const TELEGRAM_API_URL = `${API_BASE_URL}/api/telegram`;

export interface TelegramSendResult {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
}

export interface BroadcastResult {
  success: boolean;
  message?: string;
  data?: {
    total: number;
    successCount: number;
    failureCount: number;
    results: Array<{
      chatId: string;
      success: boolean;
      error?: string;
    }>;
  };
  error?: string;
}

class TelegramService {
  /**
   * Send a message to a specific Telegram chat ID
   */
  async sendMessage(chatId: string, message: string): Promise<TelegramSendResult> {
    try {
      const response = await fetch(`${TELEGRAM_API_URL}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ chatId, message }),
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error sending message:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send message'
      };
    }
  }

  /**
   * Broadcast a message to multiple chat IDs
   */
  async broadcastMessage(chatIds: string[], message: string): Promise<BroadcastResult> {
    try {
      const response = await fetch(`${TELEGRAM_API_URL}/broadcast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ chatIds, message }),
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error broadcasting message:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to broadcast message'
      };
    }
  }

  /**
   * Send a message to a student's parent via Telegram
   */
  async sendToStudent(
    studentId: string,
    message: string,
    contactType: 'contact' | 'emergency'
  ): Promise<TelegramSendResult> {
    try {
      const response = await fetch(`${TELEGRAM_API_URL}/send-to-student`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ studentId, message, contactType }),
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error sending to student:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send message to student'
      };
    }
  }

  /**
   * Send a message to all students' parents
   */
  async sendToAllStudents(
    message: string,
    contactType: 'contact' | 'emergency' | 'both',
    filters?: {
      gradeLevel?: string;
      section?: string;
    }
  ): Promise<BroadcastResult> {
    try {
      const response = await fetch(`${TELEGRAM_API_URL}/send-to-all`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message, contactType, filters }),
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error sending to all students:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send message to all students'
      };
    }
  }

  /**
   * Verify if a Telegram chat ID is valid
   */
  async verifyChatId(chatId: string): Promise<TelegramSendResult> {
    try {
      const response = await fetch(`${TELEGRAM_API_URL}/verify-chat-id`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ chatId }),
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error verifying chat ID:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to verify chat ID'
      };
    }
  }

  /**
   * Get bot information
   */
  async getBotInfo(): Promise<any> {
    try {
      const response = await fetch(`${TELEGRAM_API_URL}/bot-info`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error getting bot info:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get bot information'
      };
    }
  }
}

export const telegramService = new TelegramService();
export default telegramService;
