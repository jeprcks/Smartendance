'use client';

import { useState, useEffect } from 'react';
import { Student } from '@/app/services/studentService';
import toast from 'react-hot-toast';
import { QRCodeSVG } from 'qrcode.react';

const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Window is not defined'));
      return;
    }
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = document.createElement('img');
      img.src = event.target?.result as string;
      img.onload = () => {
        const maxWidth = 800;
        const maxHeight = 800;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        } else {
          reject(new Error('Could not get canvas context'));
        }
      };
      img.onerror = () => reject(new Error('Failed to load image'));
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
  });
};

interface ValidationError {
  field: string;
  message: string;
}

interface EditStudentFormData {
  studentId: string;
  fullName: string;
  phoneNumber: string;
  age: number;
  birthDate: string;
  gradeLevel: 'Grade 1' | 'Grade 2' | 'Grade 3' | 'Grade 4' | 'Grade 5' | 'Grade 6' | 'Graduated';
  section: string;
  gender: 'Male' | 'Female' | 'Other';
  photo?: string;
  shift: 'Morning' | 'Afternoon';
  status?: 'Active' | 'Inactive' | 'Graduated';
  graduationDate?: string;
  address?: string | {
    street?: string;
    city?: string;
    province?: string;
    zipCode?: string;
  };
  parentName?: string;
  parentEmail?: string;
  parentPassword?: string;
  parentContact?: string;
  parentTelegramChatId?: string;
  emergencyContact?: {
    name?: string;
    contactNumber?: string;
    relationship?: string;
  };
}

interface EditStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (studentId: string, updatedData: Partial<Student>) => Promise<void>;
  student: Student | null;
}

const gradeLevels = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'];

export default function EditStudentModal({ isOpen, onClose, onUpdate, student }: EditStudentModalProps) {
  const [formData, setFormData] = useState<EditStudentFormData>({} as EditStudentFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (student) {
      const birthDateValue = student.birthDate
        ? (typeof student.birthDate === 'string'
            ? student.birthDate.split('T')[0]
            : new Date(student.birthDate).toISOString().split('T')[0])
        : '';
      setFormData({
        studentId: student.studentId,
        fullName: student.fullName,
        phoneNumber: student.phoneNumber,
        age: student.age,
        birthDate: birthDateValue,
        gradeLevel: student.gradeLevel as EditStudentFormData['gradeLevel'],
        section: student.section as EditStudentFormData['section'],
        gender: student.gender as EditStudentFormData['gender'],
        photo: student.photo,
        shift: student.shift,
        status: (student.status ?? 'Active') as EditStudentFormData['status'],
        graduationDate: student.graduationDate ? (typeof student.graduationDate === 'string' ? student.graduationDate.split('T')[0] : new Date(student.graduationDate).toISOString().split('T')[0]) : '',
        address: typeof student.address === 'object' ? student.address : { street: student.address || '' },
        parentName: student.parentInfo?.name || student.parentName || '',
        parentEmail: student.parentInfo?.email || '',
        parentPassword: student.parentInfo?.password || '',
        parentContact: student.parentInfo?.contactNumber || student.parentContact || '',
        parentTelegramChatId: (student.parentInfo as any)?.telegramChatId || (student as any).parentTelegramChatId || (student as any).telegramChatId || '',
        emergencyContact: {
          name: student.emergencyContact?.name || '',
          contactNumber: student.emergencyContact?.contactNumber || '',
          relationship: student.emergencyContact?.relationship || ''
        }
      });
    }
  }, [student]);

  const validateForm = (): ValidationError[] => {
    const errors: ValidationError[] = [];

    const requiredFields: { [key: string]: string } = {
      studentId: 'Student ID',
      fullName: 'Full Name',
      phoneNumber: 'Phone Number',
      birthDate: 'Birth Date',
      gradeLevel: 'Grade Level',
      section: 'Section',
      gender: 'Gender',
      shift: 'Shift'
    };

    Object.entries(requiredFields).forEach(([field, label]) => {
      const value = formData[field as keyof EditStudentFormData];
      if (value === undefined || value === '' || value === null) {
        errors.push({
          field,
          message: `${label} is required`
        });
      }
    });

    const phoneRegex = /^\+?[\d\s-]{10,}$/;
    if (formData.phoneNumber && !phoneRegex.test(formData.phoneNumber)) {
      errors.push({
        field: 'phoneNumber',
        message: 'Please enter a valid phone number'
      });
    }

    const age = formData.age;
    if (age !== undefined && !Number.isNaN(age) && (age < 0 || age > 25)) {
      errors.push({
        field: 'age',
        message: 'Age must be between 0 and 25'
      });
    }

    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student) return;

    const errors = validateForm();
    if (errors.length > 0) {
      errors.forEach(error => {
        toast.error(error.message);
      });
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Transform data to match backend schema
      const transformedData = {
        ...formData,
        parentInfo: {
          name: formData.parentName || '',
          email: formData.parentEmail || '',
          password: formData.parentPassword || '',
          contactNumber: formData.parentContact || '',
          telegramChatId: formData.parentTelegramChatId || ''
        }
      };
      if (formData.status === 'Graduated') {
        transformedData.gradeLevel = 'Graduated';
      }
      // Remove the flat parent fields since we're using the nested object
      delete transformedData.parentName;
      delete transformedData.parentEmail;
      delete transformedData.parentPassword;
      delete transformedData.parentContact;
      delete transformedData.parentTelegramChatId;
      
      await onUpdate(student.studentId, transformedData);
      toast.success('Student updated successfully');
      onClose();
    } catch (error) {
      toast.error('Failed to update student');
      console.error('Error updating student:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    if (name.startsWith('address.')) {
      const addressField = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        address: {
          ...(typeof prev.address === 'object' ? prev.address : {}),
          [addressField]: value
        }
      }));
      return;
    }

    if (name.startsWith('emergency.')) {
      const emergencyField = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        emergencyContact: {
          ...(prev.emergencyContact || {}),
          [emergencyField]: value
        }
      }));
      return;
    }

    // If password is being changed, also update plainPassword
    if (name === 'password') {
      setFormData(prev => ({
        ...prev,
        [name]: value,
        plainPassword: value
      }));
      return;
    }

    if (name === 'status' && value === 'Graduated') {
      setFormData(prev => ({
        ...prev,
        status: 'Graduated' as const,
        gradeLevel: 'Graduated' as EditStudentFormData['gradeLevel']
      }));
      return;
    }

    setFormData(prev => ({
      ...prev,
      [name]: name === 'age'
        ? (value === '' ? undefined : parseInt(value))
        : (name === 'status' ? value as 'Active' | 'Inactive' | 'Graduated' : value)
    }));
  };

  if (!student || !isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm"></div>
      
      <div className="bg-[var(--surface)] rounded-xl shadow-xl border border-[var(--border)] p-6 max-w-5xl w-full mx-4 max-h-[90vh] overflow-y-auto relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[var(--border)] mb-6">
          <div className="flex items-center space-x-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" viewBox="0 0 20 20" fill="currentColor">
              <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
              <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
            </svg>
            <h3 className="text-xl font-semibold text-[var(--foreground)]">Edit Student Information</h3>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            type="button"
          >
            ✕
          </button>
        </div>
        
        {/* Main Content */}
        <form onSubmit={handleSubmit}>
          <div className="flex gap-10">
            {/* Left Side - Profile */}
            <div className="flex flex-col items-center w-1/4">
              <div className="relative mb-6">
                {(formData.photo ?? student.photo) && (formData.photo ?? student.photo)!.startsWith('data:image/') ? (
                  <div className="w-40 h-40 rounded-xl overflow-hidden border-2 border-green-200 shadow-lg">
                    <img
                      src={formData.photo ?? student.photo ?? ''}
                      alt={`${student.fullName}'s profile`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-40 h-40 rounded-xl bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 flex items-center justify-center shadow-lg">
                    <span className="text-4xl font-bold text-green-600">
                      {student.fullName.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                )}
                <input
                  type="file"
                  id="edit-student-photo"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      try {
                        if (file.size > 5 * 1024 * 1024) {
                          toast.error('Image size should be less than 5MB');
                          return;
                        }
                        const compressed = await compressImage(file);
                        setFormData(prev => ({ ...prev, photo: compressed }));
                        toast.success('Photo updated');
                      } catch (err) {
                        console.error(err);
                        toast.error('Error processing image. Try another image.');
                      }
                    }
                    e.target.value = '';
                  }}
                />
                <label
                  htmlFor="edit-student-photo"
                  className="mt-2 inline-block px-3 py-1.5 text-sm font-bold text-white bg-green-600 border border-green-600 rounded-lg cursor-pointer hover:bg-green-700 dark:bg-green-700 dark:border-green-600 dark:hover:bg-green-800 transition-colors shadow-sm hover:shadow-md"
                >
                  Change photo
                </label>
              </div>
              <h2 className="text-2xl font-bold text-[var(--foreground)] mb-2 text-center">{student.fullName}</h2>
              <p className="text-[var(--muted-foreground)] mb-3 text-center">{student.studentId}</p>
              <span className={`px-5 py-1.5 rounded-full text-sm font-medium ${
                student.gender === 'Male' 
                  ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200/60' 
                  : 'bg-pink-50 text-pink-700 ring-1 ring-pink-200/60'
              }`}>
                {student.gender}
              </span>
            </div>

            {/* Right Side - Form Fields */}
            <div className="flex-1">
              <div className="bg-[var(--surface)] rounded-xl p-6 shadow-sm border border-[var(--border)]">
                {/* Personal Information */}
                <div className="space-y-6">
                  <div className="flex items-center space-x-2 pb-2 border-b border-[var(--border)]">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                    <h3 className="text-lg font-semibold text-[var(--foreground)]">Personal Information</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    {/* Student ID */}
                    <div className="space-y-1.5">
                      <label htmlFor="studentId" className="block text-sm font-medium text-[var(--foreground)]">
                        Student ID
                      </label>
                      <input
                        type="text"
                        id="studentId"
                        name="studentId"
                        value={formData.studentId || ''}
                        onChange={handleChange}
                        className="block w-full rounded-lg border-[var(--border)] bg-[var(--muted)]/50 py-2 px-3 text-[var(--foreground)] shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
                        required
                      />
                    </div>

                    {/* Full Name */}
                    <div className="space-y-1.5">
                      <label htmlFor="fullName" className="block text-sm font-medium text-[var(--foreground)]">
                        Full Name
                      </label>
                      <input
                        type="text"
                        id="fullName"
                        name="fullName"
                        value={formData.fullName || ''}
                        onChange={handleChange}
                        className="block w-full rounded-lg border-[var(--border)] bg-[var(--muted)]/50 py-2 px-3 text-[var(--foreground)] shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
                        required
                      />
                    </div>

                    {/* Phone Number */}
                    <div className="space-y-1.5">
                      <label htmlFor="phoneNumber" className="block text-sm font-medium text-[var(--foreground)]">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        id="phoneNumber"
                        name="phoneNumber"
                        value={formData.phoneNumber || ''}
                        onChange={handleChange}
                        className="block w-full rounded-lg border-[var(--border)] bg-[var(--muted)]/50 py-2 px-3 text-[var(--foreground)] shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Academic Information */}
                <div className="space-y-6 mt-8">
                  <div className="flex items-center space-x-2 pb-2 border-b border-[var(--border)]">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
                    </svg>
                    <h3 className="text-lg font-semibold text-[var(--foreground)]">Academic Information</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    {/* Grade Level */}
                    <div className="space-y-1.5">
                      <label htmlFor="gradeLevel" className="block text-sm font-medium text-[var(--foreground)]">
                        Grade Level
                      </label>
                      {(formData.status ?? 'Active') === 'Graduated' ? (
                        <div className="block w-full rounded-lg border border-[var(--border)] bg-[var(--muted)] py-2 px-3 text-[var(--muted-foreground)] sm:text-sm">
                          Graduated
                        </div>
                      ) : (
                        <select
                          id="gradeLevel"
                          name="gradeLevel"
                          value={formData.gradeLevel === 'Graduated' ? '' : (formData.gradeLevel || '')}
                          onChange={handleChange}
                          className="block w-full rounded-lg border-[var(--border)] bg-[var(--muted)]/50 py-2 px-3 text-[var(--foreground)] shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
                          required
                        >
                          <option value="">Select Grade Level</option>
                          {gradeLevels.map(level => (
                            <option key={level} value={level}>{level}</option>
                          ))}
                        </select>
                      )}
                    </div>

                    {/* Section */}
                    <div className="space-y-1.5">
                      <label htmlFor="section" className="block text-sm font-medium text-[var(--foreground)]">
                        Section
                      </label>
                      {(formData.status ?? 'Active') === 'Graduated' ? (
                        <div className="block w-full rounded-lg border border-[var(--border)] bg-[var(--muted)] py-2 px-3 text-[var(--muted-foreground)] sm:text-sm">
                          N/A
                        </div>
                      ) : (
                        <input
                          type="text"
                          id="section"
                          name="section"
                          value={formData.section || ''}
                          onChange={handleChange}
                          className="block w-full rounded-lg border-[var(--border)] bg-[var(--muted)]/50 py-2 px-3 text-[var(--foreground)] shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
                          required
                        />
                      )}
                    </div>

                    {/* Age */}
                    <div className="space-y-1.5">
                      <label htmlFor="age" className="block text-sm font-medium text-[var(--foreground)]">
                        Age
                      </label>
                      <input
                        type="number"
                        id="age"
                        name="age"
                        value={formData.age || ''}
                        onChange={handleChange}
                        min="0"
                        max="25"
                        className="block w-full rounded-lg border-[var(--border)] bg-[var(--muted)]/50 py-2 px-3 text-[var(--foreground)] shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
                      />
                    </div>

                    {/* Birth Date */}
                    <div className="space-y-1.5">
                      <label htmlFor="birthDate" className="block text-sm font-medium text-[var(--foreground)]">
                        Birth Date
                      </label>
                      <input
                        type="date"
                        id="birthDate"
                        name="birthDate"
                        value={formData.birthDate || ''}
                        onChange={handleChange}
                        className="block w-full rounded-lg border-[var(--border)] bg-[var(--muted)]/50 py-2 px-3 text-[var(--foreground)] shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
                        required
                      />
                    </div>

                    {/* Gender */}
                    <div className="space-y-1.5">
                      <label htmlFor="gender" className="block text-sm font-medium text-[var(--foreground)]">
                        Gender
                      </label>
                      {(formData.status ?? 'Active') === 'Graduated' ? (
                        <div className="block w-full rounded-lg border border-[var(--border)] bg-[var(--muted)] py-2 px-3 text-[var(--muted-foreground)] sm:text-sm">
                          N/A
                        </div>
                      ) : (
                        <select
                          id="gender"
                          name="gender"
                          value={formData.gender || ''}
                          onChange={handleChange}
                          className="block w-full rounded-lg border-[var(--border)] bg-[var(--muted)]/50 py-2 px-3 text-[var(--foreground)] shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
                          required
                        >
                          <option value="">Select Gender</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      )}
                    </div>

                    {/* Shift */}
                    <div className="space-y-1.5">
                      <label htmlFor="shift" className="block text-sm font-medium text-[var(--foreground)]">
                        Shift
                      </label>
                      {(formData.status ?? 'Active') === 'Graduated' ? (
                        <div className="block w-full rounded-lg border border-[var(--border)] bg-[var(--muted)] py-2 px-3 text-[var(--muted-foreground)] sm:text-sm">
                          N/A
                        </div>
                      ) : (
                        <select
                          id="shift"
                          name="shift"
                          value={formData.shift || ''}
                          onChange={handleChange}
                          className="block w-full rounded-lg border-[var(--border)] bg-[var(--muted)]/50 py-2 px-3 text-[var(--foreground)] shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
                          required
                        >
                          <option value="">Select Shift</option>
                          <option value="Morning">Morning</option>
                          <option value="Afternoon">Afternoon</option>
                        </select>
                      )}
                    </div>

                    {/* Status (Active / Inactive / Graduated) */}
                    <div className="space-y-1.5">
                      <label htmlFor="status" className="block text-sm font-medium text-[var(--foreground)]">
                        Enrollment Status
                      </label>
                      <select
                        id="status"
                        name="status"
                        value={formData.status ?? 'Active'}
                        onChange={handleChange}
                        className="block w-full rounded-lg border-[var(--border)] bg-[var(--muted)]/50 py-2 px-3 text-[var(--foreground)] shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
                      >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                        <option value="Graduated">Graduated</option>
                      </select>
                    </div>
                    {(formData.status ?? 'Active') === 'Graduated' && (
                      <div className="space-y-1.5">
                        <label htmlFor="graduationDate" className="block text-sm font-medium text-[var(--foreground)]">
                          Graduation date
                        </label>
                        <input
                          type="date"
                          id="graduationDate"
                          name="graduationDate"
                          value={formData.graduationDate ?? ''}
                          onChange={handleChange}
                          className="block w-full rounded-lg border-[var(--border)] bg-[var(--muted)]/50 py-2 px-3 text-[var(--foreground)] shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Address Information */}
                <div className="space-y-6 mt-8">
                  <div className="flex items-center space-x-2 pb-2 border-b border-[var(--border)]">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                    <h3 className="text-lg font-semibold text-[var(--foreground)]">Address Information</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    {/* Street */}
                    <div className="space-y-1.5">
                      <label htmlFor="address.street" className="block text-sm font-medium text-[var(--foreground)]">
                        Street Address
                      </label>
                      <input
                        type="text"
                        id="address.street"
                        name="address.street"
                        value={typeof formData.address === 'object' ? formData.address.street || '' : ''}
                        onChange={handleChange}
                        className="block w-full rounded-lg border-[var(--border)] bg-[var(--muted)]/50 py-2 px-3 text-[var(--foreground)] shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
                      />
                    </div>

                    {/* City */}
                    <div className="space-y-1.5">
                      <label htmlFor="address.city" className="block text-sm font-medium text-[var(--foreground)]">
                        City
                      </label>
                      <input
                        type="text"
                        id="address.city"
                        name="address.city"
                        value={typeof formData.address === 'object' ? formData.address.city || '' : ''}
                        onChange={handleChange}
                        className="block w-full rounded-lg border-[var(--border)] bg-[var(--muted)]/50 py-2 px-3 text-[var(--foreground)] shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
                      />
                    </div>

                    {/* Province */}
                    <div className="space-y-1.5">
                      <label htmlFor="address.province" className="block text-sm font-medium text-[var(--foreground)]">
                        Province
                      </label>
                      <input
                        type="text"
                        id="address.province"
                        name="address.province"
                        value={typeof formData.address === 'object' ? formData.address.province || '' : ''}
                        onChange={handleChange}
                        className="block w-full rounded-lg border-[var(--border)] bg-[var(--muted)]/50 py-2 px-3 text-[var(--foreground)] shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
                      />
                    </div>

                    {/* Zip Code */}
                    <div className="space-y-1.5">
                      <label htmlFor="address.zipCode" className="block text-sm font-medium text-[var(--foreground)]">
                        Zip Code
                      </label>
                      <input
                        type="text"
                        id="address.zipCode"
                        name="address.zipCode"
                        value={typeof formData.address === 'object' ? formData.address.zipCode || '' : ''}
                        onChange={handleChange}
                        className="block w-full rounded-lg border-[var(--border)] bg-[var(--muted)]/50 py-2 px-3 text-[var(--foreground)] shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Parent/Guardian Information */}
                <div className="space-y-6 mt-8">
                  <div className="flex items-center space-x-2 pb-2 border-b border-[var(--border)]">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                    </svg>
                    <h3 className="text-lg font-semibold text-[var(--foreground)]">Parent/Guardian Information</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    {/* Parent/Guardian Name */}
                    <div className="space-y-1.5">
                      <label htmlFor="parentName" className="block text-sm font-medium text-[var(--foreground)]">
                        Parent/Guardian Name
                      </label>
                      <input
                        type="text"
                        id="parentName"
                        name="parentName"
                        value={formData.parentName || ''}
                        onChange={handleChange}
                        className="block w-full rounded-lg border-[var(--border)] bg-[var(--muted)]/50 py-2 px-3 text-[var(--foreground)] shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
                      />
                    </div>

                    {/* Parent/Guardian Contact */}
                    <div className="space-y-1.5">
                      <label htmlFor="parentContact" className="block text-sm font-medium text-[var(--foreground)]">
                        Parent/Guardian Contact
                      </label>
                      <input
                        type="tel"
                        id="parentContact"
                        name="parentContact"
                        value={formData.parentContact || ''}
                        onChange={handleChange}
                        className="block w-full rounded-lg border-[var(--border)] bg-[var(--muted)]/50 py-2 px-3 text-[var(--foreground)] shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
                      />
                    </div>

                    {/* Parent Telegram Chat ID */}
                    <div className="space-y-1.5 col-span-2">
                      <label htmlFor="parentTelegramChatId" className="block text-sm font-medium text-[var(--foreground)]">
                        <span className="inline-flex items-center gap-2">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                            <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                          </svg>
                          Parent Telegram Chat ID
                        </span>
                      </label>
                      <input
                        type="text"
                        id="parentTelegramChatId"
                        name="parentTelegramChatId"
                        value={formData.parentTelegramChatId || ''}
                        onChange={handleChange}
                        placeholder="e.g., 123456789"
                        className="block w-full rounded-lg border-[var(--border)] bg-blue-50/30 py-2 px-3 text-[var(--foreground)] shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      />
                      <p className="text-xs text-[var(--muted-foreground)] mt-1">
                        Parent must start @SmartendanceBot on Telegram to get their Chat ID
                      </p>
                    </div>
                  </div>
                </div>

                {/* Emergency Contact Information */}
                <div className="space-y-6 mt-8">
                  <div className="flex items-center space-x-2 pb-2 border-b border-[var(--border)]">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                    </svg>
                    <h3 className="text-lg font-semibold text-[var(--foreground)]">Emergency Contact</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    {/* Emergency Contact Name */}
                    <div className="space-y-1.5">
                      <label htmlFor="emergency.name" className="block text-sm font-medium text-[var(--foreground)]">
                        Contact Name
                      </label>
                      <input
                        type="text"
                        id="emergency.name"
                        name="emergency.name"
                        value={formData.emergencyContact?.name || ''}
                        onChange={handleChange}
                        className="block w-full rounded-lg border-[var(--border)] bg-[var(--muted)]/50 py-2 px-3 text-[var(--foreground)] shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
                      />
                    </div>

                    {/* Emergency Contact Number */}
                    <div className="space-y-1.5">
                      <label htmlFor="emergency.contactNumber" className="block text-sm font-medium text-[var(--foreground)]">
                        Contact Number
                      </label>
                      <input
                        type="tel"
                        id="emergency.contactNumber"
                        name="emergency.contactNumber"
                        value={formData.emergencyContact?.contactNumber || ''}
                        onChange={handleChange}
                        className="block w-full rounded-lg border-[var(--border)] bg-[var(--muted)]/50 py-2 px-3 text-[var(--foreground)] shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
                      />
                    </div>

                    {/* Emergency Contact Relationship */}
                    <div className="space-y-1.5">
                      <label htmlFor="emergency.relationship" className="block text-sm font-medium text-[var(--foreground)]">
                        Relationship
                      </label>
                      <input
                        type="text"
                        id="emergency.relationship"
                        name="emergency.relationship"
                        value={formData.emergencyContact?.relationship || ''}
                        onChange={handleChange}
                        className="block w-full rounded-lg border-[var(--border)] bg-[var(--muted)]/50 py-2 px-3 text-[var(--foreground)] shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 mt-8">
                  <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex items-center px-4 py-2 border border-[var(--border)] rounded-lg text-sm font-medium text-[var(--foreground)] bg-[var(--surface)] hover:bg-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}