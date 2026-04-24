import { historyService, AttendanceRecord } from './historyService';
import { studentService, Student } from './studentService';
import { format, isSameDay, parseISO, startOfDay } from 'date-fns';

export interface Notification {
  id: string;
  type: 'late' | 'absent' | 'cutting' | 'no_time_out' | 'unscanned';
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
  noTimeOut: number;
  unscanned: number;
}

export interface UnscannedStudentData extends Student {
  notificationId: string;
  message: string;
  lastScannedDate?: string;
  studentCreatedDate?: string;
  unscannedSinceDays?: number;
  firstMissedDate?: string;
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
   * Find students who scanned In but did not scan Out (abnormal scanning behavior).
   * Only checks the last `daysWindow` days so notifications stay actionable.
   */
  private checkNoTimeOut(
    records: AttendanceRecord[],
    daysWindow: number = 7
  ): Notification[] {
    const notifications: Notification[] = [];
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysWindow);

    // Group by student, then by date
    const studentByDate = new Map<string, Map<string, { in: AttendanceRecord[]; out: AttendanceRecord[] }>>();

    records.forEach((record) => {
      const dateKey = format(startOfDay(parseISO(record.scanTime)), 'yyyy-MM-dd');
      const recordDate = parseISO(dateKey + 'T00:00:00');
      if (recordDate < cutoff) return;

      if (!studentByDate.has(record.studentId)) {
        studentByDate.set(record.studentId, new Map());
      }
      const dates = studentByDate.get(record.studentId)!;
      if (!dates.has(dateKey)) {
        dates.set(dateKey, { in: [], out: [] });
      }
      const day = dates.get(dateKey)!;
      if (record.attendanceType === 'In') {
        day.in.push(record);
      } else if (record.attendanceType === 'Out') {
        day.out.push(record);
      }
    });

    studentByDate.forEach((dates, studentId) => {
      dates.forEach((day, dateKey) => {
        if (day.in.length > 0 && day.out.length === 0) {
          const inRecord = day.in[0];
          notifications.push({
            id: `no-time-out-${studentId}-${dateKey}`,
            type: 'no_time_out',
            studentId: inRecord.studentId,
            studentName: inRecord.studentName,
            gradeLevel: inRecord.gradeLevel,
            section: inRecord.section,
            consecutiveCount: 1,
            lastOccurrence: inRecord.scanTime,
            severity: 'warning',
            message: `${inRecord.studentName} scanned in but did not scan out (abnormal scanning behavior)`,
          });
        }
      });
    });

    return notifications;
  }

  /**
   * Check for students who haven't scanned (no attendance records)
   */
  private checkUnscannedStudents(
    students: Student[],
    records: AttendanceRecord[],
    daysToCheck: number = 1
  ): Notification[] {
    const notifications: Notification[] = [];
    
    // Get set of students who have scanned recently
    const scannedStudentIds = new Set<string>();
    records.forEach(record => {
      scannedStudentIds.add(record.studentId);
    });

    // Check each student to see if they haven't scanned
    students.forEach(student => {
      if (!scannedStudentIds.has(student.studentId)) {
        notifications.push({
          id: `unscanned-${student.studentId}`,
          type: 'unscanned',
          studentId: student.studentId,
          studentName: student.fullName || 'Unknown',
          gradeLevel: student.gradeLevel || 'N/A',
          section: student.section || 'N/A',
          consecutiveCount: 1,
          lastOccurrence: new Date().toISOString(),
          severity: 'warning',
          message: `${student.fullName || 'Student'} has not scanned in the last ${daysToCheck} day(s)`,
        });
      }
    });

    return notifications;
  }

  /**
   * Get all notifications for consecutive late/absent/cutting, no-time-out, and unscanned students
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

      // Fetch attendance records (both In and Out) for the date range
      const response = await historyService.getAllRecords({
        startDate: format(startDate, 'yyyy-MM-dd'),
        endDate: format(endDate, 'yyyy-MM-dd'),
        limit: 10000,
        attendanceType: 'All',
      }).catch((error) => {
        console.warn('Error fetching attendance records for notifications:', error);
        return { success: false, records: [], pagination: {} };
      });

      const records = response.success ? response.records : [];

      // Check for consecutive late (only In records have Late status)
      const lateNotifications = this.checkConsecutiveStatus(records, 'Late', 3);
      
      // Check for consecutive absent
      const absentNotifications = this.checkConsecutiveStatus(records, 'Absent', 3);
      
      // Check for consecutive cutting
      const cuttingNotifications = this.checkConsecutiveStatus(records, 'Cutting', 3);

      // Check for scanned in but no time out (abnormal scanning) – last 7 days
      const noTimeOutNotifications = this.checkNoTimeOut(records, 7);

      // Check for unscanned students (last 1 day)
      const unscannedNotifications = this.checkUnscannedStudents(students, records, 1);

      // Combine all notifications
      const allNotifications = [
        ...lateNotifications,
        ...absentNotifications,
        ...cuttingNotifications,
        ...noTimeOutNotifications,
        ...unscannedNotifications,
      ].sort((a, b) => new Date(b.lastOccurrence).getTime() - new Date(a.lastOccurrence).getTime());

      const stats: NotificationStats = {
        total: allNotifications.length,
        late: lateNotifications.length,
        absent: absentNotifications.length,
        cutting: cuttingNotifications.length,
        noTimeOut: noTimeOutNotifications.length,
        unscanned: unscannedNotifications.length,
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
          noTimeOut: 0,
          unscanned: 0,
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

  /**
   * Get all unscanned students with complete student data and date information
   */
  async getUnscannedStudents(daysToCheck: number = 1): Promise<{
    success: boolean;
    students: UnscannedStudentData[];
    count: number;
  }> {
    try {
      // Get all students
      const allStudents = await studentService.getAllStudents().catch(() => []);

      // Calculate date range for current period
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysToCheck);

      // Fetch attendance records for the current date range
      const currentResponse = await historyService.getAllRecords({
        startDate: format(startDate, 'yyyy-MM-dd'),
        endDate: format(endDate, 'yyyy-MM-dd'),
        limit: 10000,
        attendanceType: 'All',
      }).catch((error) => {
        console.warn('Error fetching attendance records for unscanned students:', error);
        return { success: false, records: [], pagination: {} };
      });

      const currentRecords = currentResponse.success ? currentResponse.records : [];

      // Also fetch all historical records to find last scan date
      const allHistoricalResponse = await historyService.getAllRecords({
        startDate: format(new Date('2020-01-01'), 'yyyy-MM-dd'), // Get all records from the beginning
        endDate: format(endDate, 'yyyy-MM-dd'),
        limit: 100000,
        attendanceType: 'All',
      }).catch((error) => {
        console.warn('Error fetching historical records:', error);
        return { success: false, records: [], pagination: {} };
      });

      const allHistoricalRecords = allHistoricalResponse.success ? allHistoricalResponse.records : [];

      // Get set of students who have scanned in current period
      const scannedStudentIds = new Set<string>();
      currentRecords.forEach(record => {
        scannedStudentIds.add(record.studentId);
      });

      // Create a map of student ID to their most recent scan date
      const lastScanMap = new Map<string, Date>();
      allHistoricalRecords.forEach(record => {
        const scanDate = new Date(record.scanTime);
        const existing = lastScanMap.get(record.studentId);
        if (!existing || scanDate > existing) {
          lastScanMap.set(record.studentId, scanDate);
        }
      });

      // Find unscanned students and combine with their full data
      const unscannedStudentsData: UnscannedStudentData[] = allStudents
        .filter(student => !scannedStudentIds.has(student.studentId))
        .map(student => {
          const lastScanDate = lastScanMap.get(student.studentId);
          const unscannedSinceDays = lastScanDate 
            ? Math.floor((endDate.getTime() - lastScanDate.getTime()) / (1000 * 60 * 60 * 24))
            : undefined;
          
          return {
            ...student,
            notificationId: `unscanned-${student.studentId}`,
            message: `${student.fullName} has not scanned in the last ${daysToCheck} day(s)`,
            lastScannedDate: lastScanDate ? lastScanDate.toISOString() : undefined,
            studentCreatedDate: student.birthDate, // Birth date is closest to when student was created
            unscannedSinceDays: unscannedSinceDays,
            firstMissedDate: startDate.toISOString(), // First missed date is the start of the period
          };
        })
        .sort((a, b) => a.fullName.localeCompare(b.fullName));

      return {
        success: true,
        students: unscannedStudentsData,
        count: unscannedStudentsData.length,
      };
    } catch (error) {
      console.error('Error getting unscanned students:', error);
      return {
        success: false,
        students: [],
        count: 0,
      };
    }
  }
}

export const notificationService = new NotificationService();
export default notificationService;
