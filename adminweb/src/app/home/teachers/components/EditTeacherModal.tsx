'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

const SUBJECT_OPTIONS = ['Mathematics', 'English', 'Science', 'Filipino', 'Social Studies', 'Physical Education', 'Values Education'];

interface EditTeacherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEdit: (teacherData: any) => void;
  teacher: {
    _id: string;
    teacherId: string;
    username: string;
    name: string;
    role: string;
    subject?: string;
    subjects?: string[];
    email: string;
    phoneNumber: string;
    gender?: string;
    birthDate?: string;
    password?: string;
    plainPassword?: string;
    profilePicture?: string;
    status?: string;
    address?: {
      street?: string;
      city?: string;
      province?: string;
      zipCode?: string;
    };
  } | null;
}

interface TeacherFormData {
  username: string;
  name: string;
  subjects: string[];
  email: string;
  phoneNumber: string;
  gender: string;
  birthDate: string;
  photo?: string; // Base64 encoded image
  address?: string;
  city?: string;
  province?: string;
  zipCode?: string;
  password: string;
  plainPassword: string;
  status: string;
}

interface ValidationErrors {
  username?: string;
  name?: string;
  subjects?: string;
  email?: string;
  phoneNumber?: string;
  gender?: string;
  birthDate?: string;
  photo?: string;
  address?: string;
  city?: string;
  province?: string;
  zipCode?: string;
  password?: string;
}

export default function EditTeacherModal({ isOpen, onClose, onEdit, teacher }: EditTeacherModalProps) {
  const [formData, setFormData] = useState<TeacherFormData>({
    username: '',
    name: '',
    subjects: [],
    email: '',
    phoneNumber: '',
    gender: '',
    birthDate: '',
    photo: '',
    address: '',
    city: '',
    province: '',
    zipCode: '',
    password: '',
    plainPassword: '',
    status: ''
  });

  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string>('');

  // Populate form data when teacher changes
  useEffect(() => {
    if (teacher) {
      setFormData({
        username: teacher.username || '',
        name: teacher.name || '',
        subjects: Array.isArray(teacher.subjects) ? teacher.subjects : (teacher.subject ? [teacher.subject] : []),
        email: teacher.email || '',
        phoneNumber: teacher.phoneNumber || '',
        gender: teacher.gender || '',
        birthDate: teacher.birthDate || '',
        photo: teacher.profilePicture || '',
        address: teacher.address?.street || '',
        city: teacher.address?.city || '',
        province: teacher.address?.province || '',
        zipCode: teacher.address?.zipCode || '',
        password: '',
        plainPassword: teacher.plainPassword || 'N/A',
        status: teacher.status || 'Active'
      });
    }
  }, [teacher]);

  // Validation functions
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhoneNumber = (phone: string): boolean => {
    const phoneRegex = /^[\d\s\-\(\)\+]+$/;
    return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
  };

  const validateUsername = (username: string): boolean => {
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    return usernameRegex.test(username) && username.length >= 3;
  };

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    // Required field validations
    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (!validateUsername(formData.username)) {
      newErrors.username = 'Username must be at least 3 characters and contain only letters, numbers, and underscores';
    }

    if (!formData.name.trim()) {
      newErrors.name = 'Full name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Full name must be at least 2 characters long';
    }

    if (!formData.subjects || formData.subjects.length === 0) {
      newErrors.subjects = 'At least one subject is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = 'Phone number is required';
    } else if (!validatePhoneNumber(formData.phoneNumber)) {
      newErrors.phoneNumber = 'Please enter a valid phone number (at least 10 digits)';
    }

    // Gender is optional
    
    // Optional field validations
    if (formData.zipCode && !/^\d{4,6}$/.test(formData.zipCode)) {
      newErrors.zipCode = 'ZIP code must be 4-6 digits';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(''); // Clear any previous submit errors
    
    try {
      // Build clean payload with only the fields to update
      const dataToSubmit: any = {
        username: formData.username,
        name: formData.name,
        subjects: formData.subjects,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
        birthDate: formData.birthDate,
        status: formData.status,
        address: {
          street: formData.address,
          city: formData.city,
          province: formData.province,
          zipCode: formData.zipCode
        }
      };

      // Only include gender if it's provided (not blank)
      if (formData.gender && formData.gender.trim() !== '') {
        dataToSubmit.gender = formData.gender;
      }

      // Only include photo if it was changed (starts with data: for base64)
      if (formData.photo && formData.photo.startsWith('data:')) {
        dataToSubmit.profilePicture = formData.photo;
      }

      // Only include password if it's provided (not blank)
      if (formData.password && formData.password.trim() !== '') {
        dataToSubmit.password = formData.password;
      }

      await onEdit(dataToSubmit);
      onClose();
    } catch (error) {
      console.error('Error editing teacher:', error);
      setSubmitError(error instanceof Error ? error.message : 'Failed to edit teacher');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    
    // Clear error for this field when user starts typing
    if (errors[name as keyof ValidationErrors]) {
      setErrors({
        ...errors,
        [name]: undefined
      });
    }
    
    // Clear submit error when user makes any changes
    if (submitError) {
      setSubmitError('');
    }
  };

  // Helper component for displaying field errors
  const FieldError = ({ error }: { error?: string }) => {
    if (!error) return null;
    return (
      <p className="mt-1 text-sm text-red-600 flex items-center">
        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        {error}
      </p>
    );
  };

  // Clear all errors when modal is closed
  const handleClose = () => {
    setErrors({});
    setSubmitError('');
    onClose();
  };

  if (!isOpen || !teacher) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="fixed inset-0 bg-black opacity-50"></div>
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-8 max-w-7xl w-full mx-4 max-h-[95vh] overflow-y-auto relative z-10">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Edit Teacher</h2>
          <button 
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Profile Image Upload */}
          <div className="mb-6 p-6 bg-gray-50 rounded-lg">
            <div className="flex items-start space-x-6">
              <div className="flex-shrink-0">
                <div className="relative w-40 h-40">
                  {formData.photo ? (
                    <Image
                      src={formData.photo}
                      alt="Teacher photo"
                      fill
                      className="object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-40 h-40 bg-gray-200 rounded-lg flex items-center justify-center">
                      <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  id="photo-upload"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setFormData(prev => ({
                          ...prev,
                          photo: reader.result as string
                        }));
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
                <label
                  htmlFor="photo-upload"
                  className="mt-2 inline-block px-4 py-2 bg-white border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50 transition-colors text-sm text-gray-600"
                >
                  Upload Photo
                </label>
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Teacher Photo</h4>
                <p className="text-sm text-gray-500 mb-4">Upload a professional photo. The photo should be:</p>
                <ul className="text-sm text-gray-500 list-disc list-inside space-y-1">
                  <li>A recent photo (taken within the last 6 months)</li>
                  <li>Professional appearance</li>
                  <li>Clear and well-lit</li>
                  <li>Plain background</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Account Information */}
          <div className="bg-gray-50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Username*
                </label>
                <input
                  type="text"
                  name="username"
                  required
                  placeholder="Enter username"
                  className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                    errors.username ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'
                  }`}
                  value={formData.username}
                  onChange={handleChange}
                />
                <FieldError error={errors.username} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Teacher ID
                </label>
                <input
                  type="text"
                  value={teacher.teacherId}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-500"
                />
                <p className="mt-1 text-xs text-gray-500">Teacher ID cannot be changed</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address*
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="Enter email address"
                  className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                    errors.email ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'
                  }`}
                  value={formData.email}
                  onChange={handleChange}
                />
                <FieldError error={errors.email} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  name="password"
                  placeholder="Leave blank to keep current password"
                  className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                    errors.password ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'
                  }`}
                  value={formData.password}
                  onChange={handleChange}
                />
                <FieldError error={errors.password} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Current Password
                </label>
                <p className="text-base text-gray-900 font-mono bg-white px-4 py-2 rounded-md border border-gray-300">
                  {formData.plainPassword || 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Basic Information */}
          <div className="bg-gray-50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name*
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="Enter full name"
                  className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                    errors.name ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'
                  }`}
                  value={formData.name}
                  onChange={handleChange}
                />
                <FieldError error={errors.name} />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subjects*
                </label>
                <div className="flex flex-wrap gap-2">
                  {SUBJECT_OPTIONS.map((sub) => (
                    <label key={sub} className="inline-flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.subjects.includes(sub)}
                        onChange={(e) => {
                          const newSubjects = e.target.checked
                            ? [...formData.subjects, sub]
                            : formData.subjects.filter((s) => s !== sub);
                          setFormData({ ...formData, subjects: newSubjects });
                          if (errors.subjects) setErrors({ ...errors, subjects: undefined });
                        }}
                        className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">{sub}</span>
                    </label>
                  ))}
                </div>
                <FieldError error={errors.subjects} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gender
                </label>
                <select
                  name="gender"
                  className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                    errors.gender ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'
                  }`}
                  value={formData.gender}
                  onChange={handleChange}
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
                <FieldError error={errors.gender} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  name="status"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  value={formData.status}
                  onChange={handleChange}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">Mark as Inactive if the teacher is no longer in school</p>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-gray-50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number*
                </label>
                <input
                  type="tel"
                  name="phoneNumber"
                  required
                  placeholder="Enter phone number"
                  className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                    errors.phoneNumber ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'
                  }`}
                  value={formData.phoneNumber}
                  onChange={handleChange}
                />
                <FieldError error={errors.phoneNumber} />
              </div>
            </div>
          </div>

          {/* Address Information */}
          <div className="bg-gray-50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Address Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Street Address
                </label>
                <textarea
                  name="address"
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Enter street address"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City/Municipality
                </label>
                <input
                  type="text"
                  name="city"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="Enter city/municipality"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Province
                </label>
                <input
                  type="text"
                  name="province"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  value={formData.province}
                  onChange={handleChange}
                  placeholder="Enter province"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ZIP Code
                </label>
                <input
                  type="text"
                  name="zipCode"
                  className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                    errors.zipCode ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'
                  }`}
                  value={formData.zipCode}
                  onChange={handleChange}
                  placeholder="Enter ZIP code"
                />
                <FieldError error={errors.zipCode} />
              </div>
            </div>
          </div>

          {/* Submit Error Display */}
          {submitError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error editing teacher</h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{submitError}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-4 mt-8">
            <button
              type="button"
              onClick={handleClose}
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-6 py-2 rounded-md transition-colors flex items-center ${
                isSubmitting
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Updating...
                </>
              ) : (
                'Update Teacher'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
