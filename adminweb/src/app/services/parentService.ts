import { API_BASE_URL } from '@/app/config/api';

export interface Parent {
  _id: string;
  fullName: string;
  email: string;
  password?: string;
  phoneNumber: string;
  gender: 'Male' | 'Female' | 'Other';
  relationship: 'Mother' | 'Father' | 'Guardian' | 'Grandparent' | 'Other';
  occupation?: string;
  photo?: string;
  address?: {
    street?: string;
    city?: string;
    province?: string;
    zipCode?: string;
  };
  childrenIds?: string[];
  emergencyContact?: {
    name?: string;
    phoneNumber?: string;
    relationship?: string;
  };
  qrCode?: {
    data?: string;
    image?: string;
    generatedAt?: string;
    isActive?: boolean;
  };
  createdAt?: string;
  updatedAt?: string;
}

export const parentService = {
  async getAllParents(): Promise<Parent[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/parents`);
      if (!response.ok) {
        throw new Error('Failed to fetch parents');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching parents:', error);
      throw error;
    }
  },

  async getParentById(id: string): Promise<Parent> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/parents/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch parent details');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching parent details:', error);
      throw error;
    }
  },

  async createParent(parentData: Omit<Parent, '_id' | 'createdAt' | 'updatedAt'>): Promise<Parent> {
    try {
      const transformedData = {
        ...parentData,
      };

      // Validate required fields
      const requiredFields = ['fullName', 'email', 'password', 'phoneNumber', 'gender', 'relationship'];
      const missingFields = requiredFields.filter(field =>
        transformedData[field as keyof typeof transformedData] === undefined ||
        transformedData[field as keyof typeof transformedData] === ''
      );

      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }

      // Validate email format
      if (transformedData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(transformedData.email)) {
        throw new Error('Invalid email format');
      }

      // Validate phone number format
      if (transformedData.phoneNumber && !/^\+?[\d\s-]{10,}$/.test(transformedData.phoneNumber)) {
        throw new Error('Invalid phone number format');
      }

      const response = await fetch(`${API_BASE_URL}/api/parents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transformedData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to create parent');
      }

      return data;
    } catch (error) {
      console.error('Error creating parent:', error);
      throw error instanceof Error ? error : new Error('Failed to create parent');
    }
  },

  async updateParent(parentId: string, updateData: Partial<Parent>): Promise<Parent> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/parents/${parentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update parent');
      }

      return data;
    } catch (error) {
      console.error('Error updating parent:', error);
      throw error instanceof Error ? error : new Error('Failed to update parent');
    }
  },

  async deleteParent(parentId: string): Promise<{ message: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/parents/${parentId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete parent');
      }

      return data;
    } catch (error) {
      console.error('Error deleting parent:', error);
      throw error instanceof Error ? error : new Error('Failed to delete parent');
    }
  },
};
