const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export interface Teacher {
  _id: string;
  teacherId: string;
  username: string;
  name: string;
  role: 'Teacher' | 'Head Teacher' | 'Department Head' | 'Principal';
  subject: string;
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
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return response.json();
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
    subject: string;
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
    return this.makeRequest<{ success: boolean; stats: TeacherStats }>('/stats');
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
