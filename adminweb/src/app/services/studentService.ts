const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export interface Student {
  _id: string;
  studentId: string;
  fullName: string;
  phoneNumber: string;
  age: number;
  birthDate: string; // ISO string format
  gradeLevel: 'Grade 1' | 'Grade 2' | 'Grade 3' | 'Grade 4' | 'Grade 5' | 'Grade 6' | 'Graduated';
  section: string;
  gender: 'Male' | 'Female' | 'Other';
  shift: 'Morning' | 'Afternoon';
  /** Enrollment status: Active = in school, Inactive = stopped mid-year, Graduated = completed Grade 6 */
  status?: 'Active' | 'Inactive' | 'Graduated';
  graduationDate?: string;
  graduationSchoolYear?: string;
  photo?: string;
  // Address can be either a string or an object
  address?: string | {
    street?: string;
    city?: string;
    province?: string;
    zipCode?: string;
  };
  // Parent information
  parentName?: string;
  parentContact?: string;
  parentInfo?: {
    name?: string;
    email?: string;
    password?: string;
    contactNumber?: string;
  };
  // Emergency contact information
  emergencyContact?: {
    name?: string;
    contactNumber?: string;
    relationship?: string;
  };
  emergencyContactName?: string;
  relationship?: string;
  // QR Code information
  qrCode?: {
    data?: string;
    image?: string;
    generatedAt?: string;
    isActive?: boolean;
  };
  createdAt?: string;
  updatedAt?: string;
}

export const studentService = {
  async addStudent(studentData: Partial<Student>) {
    try {
      // Transform data to match backend expectations
      const transformedData = {
        ...studentData,
        // Ensure age is a valid number
        age: studentData.age ? Number(studentData.age) : undefined,
        // Keep birthDate as a string but ensure it's a valid date
        birthDate: studentData.birthDate
      };

      // Validate the transformed data
      if (transformedData.age && isNaN(transformedData.age)) {
        throw new Error('Age must be a valid number');
      }

      if (transformedData.birthDate && isNaN(Date.parse(transformedData.birthDate))) {
        throw new Error('Invalid birth date format');
      }

      // Validate required fields
      const requiredFields = ['studentId', 'fullName', 'phoneNumber', 'age', 'birthDate', 'gradeLevel', 'section', 'gender'];
      const missingFields = requiredFields.filter(field => 
        transformedData[field as keyof typeof transformedData] === undefined || 
        transformedData[field as keyof typeof transformedData] === ''
      );
      
      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }

      // Validate phone number format
      if (transformedData.phoneNumber && !/^\+?[\d\s-]{10,}$/.test(transformedData.phoneNumber)) {
        throw new Error('Invalid phone number format');
      }

      console.log('Service: Sending request to backend with data:', transformedData);
      const response = await fetch(`${API_BASE_URL}/api/students`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transformedData),
      });

      console.log('Service: Response status:', response.status);
      const data = await response.json();
      console.log('Service: Response data:', data);

      if (!response.ok) {
        console.log('Service: Request failed, throwing error');
        throw {
          isError: true,
          message: typeof data === 'string' ? data : data.error || data.message || 'Failed to add student'
        };
      }

      console.log('Service: Request successful, returning data');
      return data;
    } catch (error: any) {
      console.error('Error adding student:', error);
      
      if (error.isError) {
        // This is our custom error format
        throw new Error(error.message);
      } else if (error instanceof Error) {
        // If it's already an Error instance
        throw error;
      } else if (typeof error === 'string') {
        // If it's a string
        throw new Error(error);
      } else {
        // For any other type of error
        throw new Error('Failed to add student. Please try again.');
      }
    }
  },

  async getAllStudents(options?: { status?: 'Active' | 'Inactive' }): Promise<Student[]> {
    try {
      const params = new URLSearchParams();
      if (options?.status) params.set('status', options.status);
      const url = params.toString() ? `${API_BASE_URL}/api/students?${params}` : `${API_BASE_URL}/api/students`;
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as { error?: string; message?: string };
        throw new Error(errorData.error || errorData.message || `Failed to fetch students: ${response.status}`);
      }
      
      const data = await response.json();
      // Handle both array response and wrapped response
      return Array.isArray(data) ? data : (data.students || data.data || []);
    } catch (error) {
      console.error('Error fetching students:', error);
      // Return empty array instead of throwing to allow dashboard to continue
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.warn('Network error: API server may not be running');
        return [];
      }
      throw error;
    }
  },

  async getStudentById(id: string): Promise<Student> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/students/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch student details');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching student details:', error);
      throw error;
    }
  },

  async generateQRCode(id: string): Promise<{ qrCode: any; student: Student }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/students/${id}/qr-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error('Failed to generate QR code');
      }
      return await response.json();
    } catch (error) {
      console.error('Error generating QR code:', error);
      throw error;
    }
  },

  async getQRCode(id: string): Promise<{ qrCode: any; studentId: string; fullName: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/students/${id}/qr-code`);
      if (!response.ok) {
        throw new Error('Failed to fetch QR code');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching QR code:', error);
      throw error;
    }
  },

  async regenerateAllQRCodes(): Promise<{ message: string; successCount: number; errorCount: number; totalStudents: number }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/students/qr-codes/regenerate-all`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error('Failed to regenerate QR codes');
      }
      return await response.json();
    } catch (error) {
      console.error('Error regenerating QR codes:', error);
      throw error;
    }
  },

  async updateStudent(studentId: string, updateData: Partial<Student>): Promise<Student> {
    try {
      console.log('Updating student:', studentId, 'with data:', updateData);
      const response = await fetch(`${API_BASE_URL}/api/students/${studentId}`, {
        method: 'PATCH', // Changed to PATCH to match server implementation
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update student');
      }

      console.log('Student updated successfully:', data);
      return data;
    } catch (error) {
      console.error('Error updating student:', error);
      throw error instanceof Error ? error : new Error('Failed to update student');
    }
  },

  async bulkUpdateStudents(
    ids: string[],
    updates: { gradeLevel?: string; section?: string; shift?: string; status?: string; graduationDate?: string; graduationSchoolYear?: string }
  ): Promise<{ modifiedCount: number; matchedCount: number }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/students/bulk-update`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, updates }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to bulk update students');
      }
      return { modifiedCount: data.modifiedCount ?? 0, matchedCount: data.matchedCount ?? 0 };
    } catch (error) {
      console.error('Error bulk updating students:', error);
      throw error instanceof Error ? error : new Error('Failed to bulk update students');
    }
  },
};