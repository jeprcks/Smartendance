import { API_BASE_URL } from '@/app/config/api';

export interface AttendanceRecord {
  _id: string;
  studentId: string;
  studentName: string;
  subject: string;
  scanTime: string;
  status: 'Present' | 'Late' | 'Absent' | 'Cutting' | 'Out';
  gradeLevel: string;
  section: string;
  shift: string;
  scheduleDay?: string;
  scheduleTimeSlot?: string;
  scheduleTeacher?: string;
  qrCodeData?: any;
  location?: {
    latitude?: number;
    longitude?: number;
    address?: string;
  };
  deviceInfo?: {
    platform?: string;
    userAgent?: string;
    ipAddress?: string;
  };
  notes?: string;
  statusHistory?: Array<{
    status: string;
    changedAt: string;
    changedBy: string;
    reason: string;
  }>;
  isVerified: boolean;
  verifiedBy?: string;
  verifiedAt?: string;
  // New In/Out fields
  attendanceType?: 'In' | 'Out';
  checkInTime?: string;
  checkOutTime?: string;
  durationMinutes?: number;
  linkedRecordId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceStats {
  present: number;
  absent: number;
  late: number;
  cutting: number;
  total: number;
}

export interface HistoryPageResponse {
  success: boolean;
  records: AttendanceRecord[];
  stats: AttendanceStats;
  pagination: {
    currentPage: number;
    totalPages: number;
    totalRecords: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface StudentAttendanceHistory {
  success: boolean;
  student: {
    id: string;
    name: string;
    gradeLevel: string;
    section: string;
    shift: string;
  };
  stats: AttendanceStats;
  records: AttendanceRecord[];
}

class HistoryService {
  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    try {
      const url = `${API_BASE_URL}/api/history${endpoint}`;
      
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      // Handle network errors (API server not running, CORS, etc.)
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.warn('Network error: API server may not be running or CORS issue');
        throw new Error('Network error: Unable to connect to server');
      }
      // Re-throw other errors
      throw error;
    }
  }

  // Get history page data with filtering and pagination
  async getHistoryPageData(params: {
    search?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<HistoryPageResponse> {
    try {
      const searchParams = new URLSearchParams();
      
      if (params.search) searchParams.append('search', params.search);
      if (params.status) searchParams.append('status', params.status);
      if (params.startDate) searchParams.append('startDate', params.startDate);
      if (params.endDate) searchParams.append('endDate', params.endDate);
      if (params.page) searchParams.append('page', params.page.toString());
      if (params.limit) searchParams.append('limit', params.limit.toString());

      const queryString = searchParams.toString();
      const endpoint = queryString ? `/history-page?${queryString}` : '/history-page';
      
      return await this.makeRequest<HistoryPageResponse>(endpoint);
    } catch (error) {
      console.error('Error fetching history page data:', error);
      // Return empty result instead of throwing
      return {
        success: false,
        records: [],
        stats: {
          present: 0,
          absent: 0,
          late: 0,
          cutting: 0,
          total: 0,
        },
        pagination: {
          currentPage: 1,
          totalPages: 0,
          totalRecords: 0,
          hasNext: false,
          hasPrev: false,
        },
      };
    }
  }

  // Get all attendance records
  async getAllRecords(params: {
    page?: number;
    limit?: number;
    studentId?: string;
    subject?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    gradeLevel?: string;
    section?: string;
    shift?: string;
    search?: string;
    attendanceType?: 'In' | 'Out' | 'All';
  } = {}): Promise<{ success: boolean; records: AttendanceRecord[]; pagination: any }> {
    try {
      const searchParams = new URLSearchParams();
      
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, value.toString());
        }
      });

      const queryString = searchParams.toString();
      const endpoint = queryString ? `?${queryString}` : '';
      
      return await this.makeRequest<{ success: boolean; records: AttendanceRecord[]; pagination: any }>(endpoint);
    } catch (error) {
      console.error('Error fetching all records:', error);
      // Return empty result instead of throwing to allow graceful degradation
      return {
        success: false,
        records: [],
        pagination: {
          currentPage: 1,
          totalPages: 0,
          totalRecords: 0,
          hasNext: false,
          hasPrev: false,
        },
      };
    }
  }

  // Get single attendance record
  async getRecord(id: string): Promise<{ success: boolean; record: AttendanceRecord }> {
    return this.makeRequest<{ success: boolean; record: AttendanceRecord }>(`/${id}`);
  }

  // Get attendance statistics
  async getStats(params: {
    startDate?: string;
    endDate?: string;
    gradeLevel?: string;
    section?: string;
    shift?: string;
  } = {}): Promise<{ success: boolean; stats: AttendanceStats }> {
    try {
      const searchParams = new URLSearchParams();
      
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, value.toString());
        }
      });

      const queryString = searchParams.toString();
      const endpoint = queryString ? `/stats?${queryString}` : '/stats';
      
      return await this.makeRequest<{ success: boolean; stats: AttendanceStats }>(endpoint);
    } catch (error) {
      console.error('Error fetching attendance stats:', error);
      // Return default stats instead of throwing
      return {
        success: false,
        stats: {
          present: 0,
          absent: 0,
          late: 0,
          cutting: 0,
          total: 0,
        },
      };
    }
  }

  // Get student attendance history
  async getStudentHistory(studentId: string, params: {
    startDate?: string;
    endDate?: string;
    limit?: number;
  } = {}): Promise<StudentAttendanceHistory> {
    const searchParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, value.toString());
      }
    });

    const queryString = searchParams.toString();
    const endpoint = queryString ? `/student/${studentId}?${queryString}` : `/student/${studentId}`;
    
    return this.makeRequest<StudentAttendanceHistory>(endpoint);
  }

  // Create attendance record
  async createRecord(data: {
    studentId: string;
    studentName?: string;
    subject?: string;
    status?: string;
    qrCodeData?: any;
    location?: any;
    deviceInfo?: any;
    notes?: string;
  }): Promise<{ success: boolean; message: string; record: AttendanceRecord }> {
    return this.makeRequest<{ success: boolean; message: string; record: AttendanceRecord }>('', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Update attendance record
  async updateRecord(id: string, data: {
    status?: string;
    subject?: string;
    notes?: string;
    reason?: string;
  }): Promise<{ success: boolean; message: string; record: AttendanceRecord }> {
    return this.makeRequest<{ success: boolean; message: string; record: AttendanceRecord }>(`/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Delete attendance record
  async deleteRecord(id: string): Promise<{ success: boolean; message: string }> {
    return this.makeRequest<{ success: boolean; message: string }>(`/${id}`, {
      method: 'DELETE',
    });
  }

  // Export attendance data
  async exportData(params: {
    startDate?: string;
    endDate?: string;
    format?: 'json' | 'csv';
  } = {}): Promise<Blob | { success: boolean; records: AttendanceRecord[]; exportedAt: string; totalRecords: number }> {
    const searchParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, value.toString());
      }
    });

    const queryString = searchParams.toString();
    const endpoint = queryString ? `/export?${queryString}` : '/export';
    
    if (params.format === 'csv') {
      const response = await fetch(`${API_BASE_URL}/api/history${endpoint}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.blob();
    } else {
      return this.makeRequest<{ success: boolean; records: AttendanceRecord[]; exportedAt: string; totalRecords: number }>(endpoint);
    }
  }
}

export const historyService = new HistoryService();
export default historyService;
