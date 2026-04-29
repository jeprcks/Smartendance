import { API_BASE_URL } from '@/app/config/api';

export interface Teacher {
  _id: string;
  teacherId: string;
  username: string;
  name: string;
  role: 'Teacher' | 'Head Teacher' | 'Department Head' | 'Principal';
  subjects: string[];
  /** @deprecated Use subjects. Kept for backward compatibility with legacy API responses */
  subject?: string;
  email: string;
  phoneNumber: string;
  password?: string; // Only included when creating/updating
  plainPassword?: string; // Plain text password for display
  dateJoined: string;
  status: 'Active' | 'Inactive' | 'Suspended';
  department?: string;
  qualifications?: Array<{
    degree: string;
    institution: string;
    year: number;
  }>;
  address?: {
    street?: string;
    city?: string;
    province?: string;
    zipCode?: string;
  };
  emergencyContact?: {
    name?: string;
    relationship?: string;
    contactNumber?: string;
  };
  schedule?: Array<{
    day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
    startTime: string;
    endTime: string;
    subject: string;
    gradeLevel: string;
  }>;
  profilePicture?: string;
  lastLogin?: string;
  isVerified: boolean;
  fullName: string;
  fullAddress: string;
  yearsOfExperience: number;
  createdAt: string;
  updatedAt: string;
}

export interface TeacherStats {
  active: number;
  inactive: number;
  suspended: number;
  total: number;
}

export interface TeachersResponse {
  success: boolean;
  teachers: Teacher[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalTeachers: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

class TeacherService {
  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    try {
      const url = `${API_BASE_URL}/api/teachers${endpoint}`;
      
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(errorData.error ?? `HTTP error! status: ${response.status}`);
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

  // Get all teachers with filtering and pagination
  async getAllTeachers(params: {
    page?: number;
    limit?: number;
    search?: string;
    subject?: string;
    status?: string;
    role?: string;
  } = {}): Promise<TeachersResponse> {
    const searchParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, value.toString());
      }
    });

    const queryString = searchParams.toString();
    const endpoint = queryString ? `?${queryString}` : '';
    
    return this.makeRequest<TeachersResponse>(endpoint);
  }

  // Get single teacher by ID
  async getTeacher(id: string): Promise<{ success: boolean; teacher: Teacher }> {
    return this.makeRequest<{ success: boolean; teacher: Teacher }>(`/${id}`);
  }

  // Get teacher by teacherId
  async getTeacherByTeacherId(teacherId: string): Promise<{ success: boolean; teacher: Teacher }> {
    return this.makeRequest<{ success: boolean; teacher: Teacher }>(`/teacher-id/${teacherId}`);
  }

  // Create new teacher
  async createTeacher(data: {
    username: string;
    name: string;
    role?: string;
    subjects: string[];
    gender?: string;
    birthDate?: string;
    email: string;
    phoneNumber: string;
    password: string;
    department?: string;
    qualifications?: Array<{
      degree: string;
      institution: string;
      year: number;
    }>;
    address?: {
      street?: string;
      city?: string;
      province?: string;
      zipCode?: string;
    };
    emergencyContact?: {
      name?: string;
      relationship?: string;
      contactNumber?: string;
    };
    schedule?: Array<{
      day: string;
      startTime: string;
      endTime: string;
      subject: string;
      gradeLevel: string;
    }>;
    profilePicture?: string;
  }): Promise<{ success: boolean; message: string; teacher: Teacher }> {
    return this.makeRequest<{ success: boolean; message: string; teacher: Teacher }>('', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Update teacher
  async updateTeacher(id: string, data: Partial<Teacher>): Promise<{ success: boolean; message: string; teacher: Teacher }> {
    return this.makeRequest<{ success: boolean; message: string; teacher: Teacher }>(`/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Delete teacher
  async deleteTeacher(id: string): Promise<{ success: boolean; message: string }> {
    return this.makeRequest<{ success: boolean; message: string }>(`/${id}`, {
      method: 'DELETE',
    });
  }

  // Change teacher password
  async changePassword(id: string, currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    return this.makeRequest<{ success: boolean; message: string }>(`/${id}/change-password`, {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  }

  // Get teacher statistics
  async getTeacherStats(): Promise<{ success: boolean; stats: TeacherStats }> {
    try {
      return await this.makeRequest<{ success: boolean; stats: TeacherStats }>('/stats');
    } catch (error) {
      console.error('Error fetching teacher stats:', error);
      // Return default stats instead of throwing
      return {
        success: false,
        stats: {
          active: 0,
          inactive: 0,
          suspended: 0,
          total: 0,
        },
      };
    }
  }

  // Search teachers
  async searchTeachers(query: string): Promise<{ success: boolean; teachers: Teacher[] }> {
    return this.makeRequest<{ success: boolean; teachers: Teacher[] }>(`/search?query=${encodeURIComponent(query)}`);
  }

  // Get teachers by subject
  async getTeachersBySubject(subject: string): Promise<{ success: boolean; teachers: Teacher[] }> {
    return this.makeRequest<{ success: boolean; teachers: Teacher[] }>(`/by-subject?subject=${encodeURIComponent(subject)}`);
  }
}

export const teacherService = new TeacherService();
export default teacherService;
