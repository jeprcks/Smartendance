const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export interface Schedule {
  _id?: string;
  gradeLevel: 'Grade 1' | 'Grade 2' | 'Grade 3' | 'Grade 4' | 'Grade 5' | 'Grade 6';
  section: string;
  subject: string;
  teacher: string;
  timeSlot: string;
  room: string;
  /**
   * Legacy single-day support (for existing records) plus multi-day array.
   * Prefer using `days` for new data.
   */
  day?: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday';
  days?: ('Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday')[];
  shift: 'Morning' | 'Afternoon';
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ScheduleResponse {
  success: boolean;
  message?: string;
  schedule?: Schedule;
  schedules?: Schedule[];
  count?: number;
  error?: string;
}

export const scheduleService = {
  async createSchedule(scheduleData: Omit<Schedule, '_id' | 'createdAt' | 'updatedAt'>): Promise<Schedule> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/schedules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...scheduleData,
          // send both for backward compatibility with single-day backend
          day: scheduleData.days && scheduleData.days.length > 0 ? scheduleData.days[0] : scheduleData.day,
        }),
      });

      const data: ScheduleResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create schedule');
      }

      return data.schedule as Schedule;
    } catch (error) {
      console.error('Error creating schedule:', error);
      throw error instanceof Error ? error : new Error('Failed to create schedule');
    }
  },

  async getAllSchedules(filters?: {
    gradeLevel?: string;
    section?: string;
    day?: string;
    isActive?: boolean;
  }): Promise<Schedule[]> {
    try {
      const queryParams = new URLSearchParams();
      if (filters?.gradeLevel) queryParams.append('gradeLevel', filters.gradeLevel);
      if (filters?.section) queryParams.append('section', filters.section);
      if (filters?.day) queryParams.append('day', filters.day);
      if (filters?.isActive !== undefined) queryParams.append('isActive', String(filters.isActive));

      const url = `${API_BASE_URL}/api/schedules${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as { error?: string; message?: string };
        throw new Error(errorData.error || errorData.message || `Failed to fetch schedules: ${response.status}`);
      }

      const data: ScheduleResponse = await response.json();
      return data.schedules || [];
    } catch (error) {
      console.error('Error fetching schedules:', error);
      // Return empty array instead of throwing to allow dashboard to continue
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.warn('Network error: API server may not be running');
        return [];
      }
      throw error;
    }
  },

  async getScheduleById(id: string): Promise<Schedule> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/schedules/${id}`);

      if (!response.ok) {
        throw new Error('Failed to fetch schedule');
      }

      const data: ScheduleResponse = await response.json();
      return data.schedule as Schedule;
    } catch (error) {
      console.error('Error fetching schedule:', error);
      throw error instanceof Error ? error : new Error('Failed to fetch schedule');
    }
  },

  async getSchedulesByGradeAndSection(gradeLevel: string, section: string): Promise<Schedule[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/schedules/grade/${gradeLevel}/section/${section}`);

      if (!response.ok) {
        throw new Error('Failed to fetch schedules');
      }

      const data: ScheduleResponse = await response.json();
      return data.schedules || [];
    } catch (error) {
      console.error('Error fetching schedules:', error);
      throw error instanceof Error ? error : new Error('Failed to fetch schedules');
    }
  },

  async updateSchedule(id: string, scheduleData: Partial<Schedule>): Promise<Schedule> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/schedules/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(scheduleData),
      });

      const data: ScheduleResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update schedule');
      }

      return data.schedule as Schedule;
    } catch (error) {
      console.error('Error updating schedule:', error);
      throw error instanceof Error ? error : new Error('Failed to update schedule');
    }
  },

  async deleteSchedule(id: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/schedules/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete schedule');
      }
    } catch (error) {
      console.error('Error deleting schedule:', error);
      throw error instanceof Error ? error : new Error('Failed to delete schedule');
    }
  },
};
