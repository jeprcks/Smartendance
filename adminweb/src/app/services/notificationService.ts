import { historyService, AttendanceRecord } from './historyService';
import { studentService, Student } from './studentService';
import { format, isSameDay, parseISO, startOfDay } from 'date-fns';

export interface Notification {
  id: string;
  type: 'late' | 'absent' | 'cutting';
  studentId: string;
  studentName: string;
  gradeLevel: string;
  section: string;
  consecutiveCount: number;
  lastOccurrence: string;
  severity: 'warning' | 'critical';
  message: string;
}

export interface NotificationStats {
  total: number;
  late: number;
  absent: number;
  cutting: number;
}

class NotificationService {
  /**
   * Check for consecutive DAYS with a specific status
   * Returns notifications for students who have the status on 3+ consecutive days
   */
  private checkConsecutiveStatus(
    records: AttendanceRecord[],
    status: 'Late' | 'Absent' | 'Cutting',
    minConsecutiveDays: number = 3
  ): Notification[] {
    const notifications: Notification[] = [];
    
    // Group records by student
    const studentRecords = new Map<string, AttendanceRecord[]>();
    
    records.forEach(record => {
      if (!studentRecords.has(record.studentId)) {
        studentRecords.set(record.studentId, []);
      }
      studentRecords.get(record.studentId)!.push(record);
    });

    // Check each student's records
    studentRecords.forEach((allRecords, studentId) => {
      // Get all records for this student, grouped by date
      const recordsByDate = new Map<string, AttendanceRecord[]>();
      
      allRecords.forEach(record => {
        const dateKey = format(startOfDay(parseISO(record.scanTime)), 'yyyy-MM-dd');
        if (!recordsByDate.has(dateKey)) {
          recordsByDate.set(dateKey, []);
        }
        recordsByDate.get(dateKey)!.push(record);
      });

      // Check each date to see if student has the specific status on that day
      const datesWithStatus = new Set<string>();
      
      recordsByDate.forEach((dayRecords, dateKey) => {
        // Check if student has the status on this day
        const hasStatus = dayRecords.some(r => r.status === status);
        if (hasStatus) {
          datesWithStatus.add(dateKey);
        }
      });

      if (datesWithStatus.size < minConsecutiveDays) {
        return;
      }

      // Sort dates descending (most recent first)
      const sortedDates = Array.from(datesWithStatus)
        .sort((a, b) => b.localeCompare(a));

      // Check for consecutive days starting from the most recent
      let maxConsecutiveDays = 1;
      let currentConsecutiveDays = 1;
      let consecutiveStartDate: string = sortedDates[0];
      let lastDate: Date | null = null;

      for (const dateKey of sortedDates) {
        const currentDate = parseISO(dateKey + 'T00:00:00');

        if (lastDate === null) {
          lastDate = currentDate;
          consecutiveStartDate = dateKey;
          continue;
        }

        const daysDiff = Math.round(
          (lastDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysDiff === 1) {
          // Consecutive day - increment counter
          currentConsecutiveDays++;
          if (currentConsecutiveDays > maxConsecutiveDays) {
            maxConsecutiveDays = currentConsecutiveDays;
            consecutiveStartDate = dateKey; // Update to the earliest date in the streak
          }
        } else {
          // Gap found - check if we found a streak, then reset
          if (currentConsecutiveDays >= minConsecutiveDays) {
            // We found a valid streak, but continue checking for longer streaks
            break;
          }
          // Reset counter for new potential streak
          currentConsecutiveDays = 1;
          consecutiveStartDate = dateKey;
        }

        lastDate = currentDate;
      }

      // If we found consecutive days, create notification
      if (maxConsecutiveDays >= minConsecutiveDays) {
        // Get the most recent record from the consecutive streak
        const mostRecentDate = sortedDates[0];
        const mostRecentDayRecords = recordsByDate.get(mostRecentDate) || [];
        const statusRecord = mostRecentDayRecords.find(r => r.status === status) || mostRecentDayRecords[0];
        
        if (statusRecord) {
          const notification: Notification = {
            id: `${studentId}-${status}-${maxConsecutiveDays}-${mostRecentDate}`,
            type: status.toLowerCase() as 'late' | 'absent' | 'cutting',
            studentId: statusRecord.studentId,
            studentName: statusRecord.studentName,
            gradeLevel: statusRecord.gradeLevel,
            section: statusRecord.section,
            consecutiveCount: maxConsecutiveDays,
            lastOccurrence: statusRecord.scanTime,
            severity: maxConsecutiveDays >= 5 ? 'critical' : 'warning',
            message: `${statusRecord.studentName} has been ${status.toLowerCase()} for ${maxConsecutiveDays} consecutive ${maxConsecutiveDays === 1 ? 'day' : 'days'}`,
          };
          notifications.push(notification);
        }
      }
    });

    return notifications;
  }

  /**
   * Get all notifications for consecutive late/absent/cutting
   */
  async getNotifications(daysToCheck: number = 30): Promise<{
    success: boolean;
    notifications: Notification[];
    stats: NotificationStats;
  }> {
    try {
      // Get all students
      const students = await studentService.getAllStudents().catch(() => []);

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysToCheck);

      // Fetch attendance records for the date range
      const response = await historyService.getAllRecords({
        startDate: format(startDate, 'yyyy-MM-dd'),
        endDate: format(endDate, 'yyyy-MM-dd'),
        limit: 10000, // Get enough records
      }).catch((error) => {
        console.warn('Error fetching attendance records for notifications:', error);
        return { success: false, records: [], pagination: {} };
      });

      const records = response.success ? response.records : [];

      // Check for consecutive late
      const lateNotifications = this.checkConsecutiveStatus(records, 'Late', 3);
      
      // Check for consecutive absent
      const absentNotifications = this.checkConsecutiveStatus(records, 'Absent', 3);
      
      // Check for consecutive cutting
      const cuttingNotifications = this.checkConsecutiveStatus(records, 'Cutting', 3);

      // Combine all notifications
      const allNotifications = [
        ...lateNotifications,
        ...absentNotifications,
        ...cuttingNotifications,
      ].sort((a, b) => new Date(b.lastOccurrence).getTime() - new Date(a.lastOccurrence).getTime());

      const stats: NotificationStats = {
        total: allNotifications.length,
        late: lateNotifications.length,
        absent: absentNotifications.length,
        cutting: cuttingNotifications.length,
      };

      return {
        success: true,
        notifications: allNotifications,
        stats,
      };
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return {
        success: false,
        notifications: [],
        stats: {
          total: 0,
          late: 0,
          absent: 0,
          cutting: 0,
        },
      };
    }
  }

  /**
   * Get notification count for navbar badge
   */
  async getNotificationCount(): Promise<number> {
    try {
      const result = await this.getNotifications(30);
      return result.success ? result.stats.total : 0;
    } catch (error) {
      console.error('Error getting notification count:', error);
      return 0;
    }
  }
}

export const notificationService = new NotificationService();
export default notificationService;
