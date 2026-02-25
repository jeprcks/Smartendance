'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';

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
        // Max dimensions
        const maxWidth = 800;
        const maxHeight = 800;

        let width = img.width;
        let height = img.height;

        // Calculate new dimensions
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

        // Create canvas
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        // Draw and compress image
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to base64 with reduced quality
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
          resolve(compressedBase64);
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

interface AddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (studentData: any) => void;
}

import { Student } from '@/app/services/studentService';

interface StudentFormData {
  studentId: string;
  fullName: string;
  phoneNumber: string;
  age: string;
  birthDate: string;
  gradeLevel: 'Grade 1' | 'Grade 2' | 'Grade 3' | 'Grade 4' | 'Grade 5' | 'Grade 6';
  section: string;
  gender: 'Male' | 'Female' | 'Other';
  photo?: string; // Base64 encoded image
  shift: string;
  status?: 'Active' | 'Inactive';
  address?: string;
  city?: string;
  province?: string;
  zipCode?: string;
  parentName?: string;
  parentEmail?: string;
  parentPassword?: string;
  parentContact?: string;
  parentTelegramChatId?: string;
  emergencyContact?: string;
  emergencyContactName?: string;
  relationship?: string;
}


export default function AddStudentModal({ isOpen, onClose, onAdd }: AddStudentModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const isSubmittingRef = useRef(false);
  const [formData, setFormData] = useState<StudentFormData>({
    studentId: '',
    fullName: '',
    phoneNumber: '',
    age: '',
    birthDate: '',
    gradeLevel: '' as any,
    section: '' as any,
    gender: '' as any,
    shift: '',
    status: 'Active',
    address: '',
    city: '',
    province: '',
    zipCode: '',
    parentName: '',
    parentEmail: '',
    parentPassword: '',
    parentContact: '',
    parentTelegramChatId: '',
    emergencyContact: '',
    emergencyContactName: '',
    relationship: ''
  });  const [showQR, setShowQR] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  const gradeLevels = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'];

  const validateForm = (): ValidationError[] => {
    const errors: ValidationError[] = [];

    // Required field validation
    const requiredFields: { [key: string]: string } = {
      studentId: 'Student ID',
      fullName: 'Full Name',
      phoneNumber: 'Phone Number',
      age: 'Age',
      birthDate: 'Birth Date',
      gradeLevel: 'Grade Level',
      section: 'Section',
      gender: 'Gender',
      shift: 'Shift'
    };

    Object.entries(requiredFields).forEach(([field, label]) => {
      if (!formData[field as keyof StudentFormData]) {
        errors.push({
          field,
          message: `${label} is required`
        });
      }
    });

    // Phone number validation
    const phoneRegex = /^\+?[\d\s-]{10,}$/;
    if (formData.phoneNumber && !phoneRegex.test(formData.phoneNumber)) {
      errors.push({
        field: 'phoneNumber',
        message: 'Please enter a valid phone number'
      });
    }

    // Age validation (allow any numeric value, no limits)
    const age = parseInt(formData.age);
    if (isNaN(age)) {
      errors.push({
        field: 'age',
        message: 'Please enter a valid age'
      });
    }

    // Photo validation
    if (formData.photo) {
      // Check if base64 string is too large (approximately 5MB)
      const base64Length = formData.photo.length;
      const sizeInBytes = (base64Length * 3) / 4;
      const sizeInMB = sizeInBytes / (1024 * 1024);

      if (sizeInMB > 5) {
        errors.push({
          field: 'photo',
          message: 'Photo size should be less than 5MB'
        });
      }
    }

    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setValidationErrors([]);

    // Validate form
    const errors = validateForm();
    if (errors.length > 0) {
      setValidationErrors(errors);
      toast.error('Please correct the errors in the form');
      return;
    }

    // Show confirmation dialog
    setShowConfirmation(true);
  };

  const handleConfirmedSubmit = async () => {
    // Prevent duplicate submissions
    if (isSubmittingRef.current) {
      console.log('Modal: Duplicate submission prevented');
      return;
    }

    setShowConfirmation(false);
    setIsSubmitting(true);
    isSubmittingRef.current = true;
    setError(null); // Clear any previous errors

    try {
      // Transform the data to match the backend schema (Add Student only supports Active/Inactive)
      const transformedData = {
        studentId: formData.studentId,
        fullName: formData.fullName,
        phoneNumber: formData.phoneNumber,
        age: parseInt(formData.age), // Convert age to number
        birthDate: new Date(formData.birthDate).toISOString(), // Ensure proper date format
        gradeLevel: formData.gradeLevel as 'Grade 1' | 'Grade 2' | 'Grade 3' | 'Grade 4' | 'Grade 5' | 'Grade 6',
        section: formData.section,
        gender: formData.gender as 'Male' | 'Female' | 'Other',
        photo: formData.photo,
        shift: formData.shift as 'Morning' | 'Afternoon',
        status: (formData.status ?? 'Active') as 'Active' | 'Inactive',
        // Transform flat address fields to nested object
        address: {
          street: formData.address || '',
          city: formData.city || '',
          province: formData.province || '',
          zipCode: formData.zipCode || ''
        },
        // Transform flat parent fields to nested object
        parentInfo: {
          name: formData.parentName || '',
          email: formData.parentEmail || '',
          password: formData.parentPassword || '',
          contactNumber: formData.parentContact || '',
          telegramChatId: formData.parentTelegramChatId || ''
        },
        // Transform flat emergency contact fields to nested object
        emergencyContact: {
          name: formData.emergencyContactName || '',
          contactNumber: formData.emergencyContact || '',
          relationship: formData.relationship || ''
        }
      };

      // Call the parent component's onAdd function to handle the API call
      console.log('Modal: Calling onAdd with transformed data:', transformedData.studentId);
      const response = await onAdd(transformedData);
      
      // Only if we get here (no error thrown), then show success and clear form
      console.log('Modal: Student added successfully via parent:', response);
      toast.success('Student added successfully!');
      
      // Reset form to initial state
      setFormData({
        studentId: '',
        fullName: '',
        phoneNumber: '',
        age: '',
        birthDate: '',
        gradeLevel: 'Grade 1',
        section: 'A',
        gender: 'Male',
        shift: 'Morning',
        photo: undefined,
        address: '',
        city: '',
        province: '',
        zipCode: '',
        parentName: '',
        parentEmail: '',
        parentPassword: '',
        parentContact: '',
        parentTelegramChatId: '',
        emergencyContact: '',
        emergencyContactName: '',
        relationship: ''
      });
      
      // Reset QR code display
      setShowQR(false);
      
      onClose();
    } catch (error: any) {
      // Handle any errors that occur during the process
      console.error('Error adding student:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to add student';
      
      // Handle specific validation errors with better user messages
      if (errorMessage.includes('Student ID already exists')) {
        setError('This Student ID is already in use. Please choose a different Student ID.');
        setValidationErrors([{ field: 'studentId', message: 'Student ID already exists' }]);
        toast.error('Student ID already exists. Please choose a different one.');
      } else if (errorMessage.includes('Email already exists')) {
        setError('This email address is already in use. Please choose a different email.');
        setValidationErrors([{ field: 'email', message: 'Email already exists' }]);
        toast.error('Email already exists. Please choose a different one.');
      } else if (errorMessage.includes('Request already being processed')) {
        setError('Please wait, your previous request is still being processed.');
        setValidationErrors([]);
        toast.error('Please wait, your previous request is still being processed.');
      } else {
        setError(errorMessage);
        setValidationErrors([]);
        toast.error(errorMessage);
      }
      
      setShowConfirmation(false); // Hide confirmation dialog on error
    } finally {
      setIsSubmitting(false);
      isSubmittingRef.current = false;
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

    // Clear validation errors for the field being changed
    if (validationErrors.some(err => err.field === name)) {
      setValidationErrors(prev => prev.filter(err => err.field !== name));
    }

    // Clear general error when user starts typing
    if (error) {
      setError(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed top-20 left-0 right-0 bottom-0 flex items-center justify-center z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        aria-hidden="true"
      />
      <div className="relative z-10 bg-[var(--surface)] rounded-[var(--radius)] shadow-xl border border-[var(--border)] p-8 max-w-7xl w-full mx-4 max-h-[calc(100vh-5rem)] overflow-y-auto">
        {/* Modal header */}
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-[var(--border)]">
          <h2 className="text-2xl font-bold text-[var(--primary-dark)]">Add New Student</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-[var(--radius)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-[var(--primary-dark)]">Personal Information</h3>
          </div>
          {/* Profile Image Upload */}
          <div className="mb-6 p-6 rounded-[var(--radius)] border border-[var(--border)]">
            <div className="flex items-start space-x-6">
              <div className="flex-shrink-0">
                <div className="relative w-40 h-40">
                  {formData.photo ? (
                    <Image
                      src={formData.photo}
                      alt="Student photo"
                      fill
                      className="object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-40 h-40 bg-[var(--muted)] rounded-[var(--radius)] flex items-center justify-center border-2 border-dashed border-[var(--border)]">
                      <svg className="w-12 h-12 text-[var(--muted-foreground)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      try {
                        // Check file size (max 5MB)
                        if (file.size > 5 * 1024 * 1024) {
                          toast.error('Image size should be less than 5MB');
                          return;
                        }

                        // Compress and resize image
                        const compressedImage = await compressImage(file);
                        setFormData(prev => ({
                          ...prev,
                          photo: compressedImage
                        }));
                      } catch (error) {
                        console.error('Error processing image:', error);
                        toast.error('Error processing image. Please try another image.');
                      }
                    }
                  }}
                />
                <label
                  htmlFor="photo-upload"
                  className="mt-2 inline-block px-4 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius)] cursor-pointer hover:bg-[var(--secondary)] transition-colors text-sm font-medium text-[var(--primary-dark)]"
                >
                  Upload Photo
                </label>
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-[var(--foreground)] mb-2">Student Photo</h4>
                <p className="text-sm text-[var(--muted-foreground)] mb-4">Upload a clear photo of the student. The photo should be:</p>
                <ul className="text-sm text-[var(--muted-foreground)] list-disc list-inside space-y-1">
                  <li>A recent photo (taken within the last 6 months)</li>
                  <li>Clear and well-lit</li>
                  <li>Shows full face, front view</li>
                  <li>Plain background</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left Column */}
            <div className="space-y-6 p-6 rounded-[var(--radius)] border border-[var(--border)]">
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                  Student ID*
                </label>
                <input
                  type="text"
                  name="studentId"
                  required
                  placeholder="Enter student ID"
                  className={`w-full px-4 py-2.5 border rounded-[var(--radius)] bg-[var(--surface)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--primary)] transition-colors ${
                    validationErrors.some(err => err.field === 'studentId') 
                      ? 'border-[var(--destructive)] bg-red-50/50' 
                      : 'border-[var(--border)]'
                  }`}
                  value={formData.studentId}
                  onChange={handleChange}
                />
                {validationErrors.some(err => err.field === 'studentId') && (
                  <p className="mt-1 text-sm text-[var(--destructive)]">
                    {validationErrors.find(err => err.field === 'studentId')?.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                  Full Name*
                </label>
                <input
                  type="text"
                  name="fullName"
                  required
                  placeholder="Enter full name"
                  className="w-full px-4 py-2.5 border border-[var(--border)] rounded-[var(--radius)] bg-[var(--surface)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--primary)]"
                  value={formData.fullName}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                  Phone Number*
                </label>
                <input
                  type="tel"
                  name="phoneNumber"
                  required
                  placeholder="Enter phone number"
                  className="w-full px-4 py-2.5 border border-[var(--border)] rounded-[var(--radius)] bg-[var(--surface)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--primary)]"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                  Birth Date*
                </label>
                <input
                  type="date"
                  name="birthDate"
                  required
                  className="w-full px-4 py-2.5 border border-[var(--border)] rounded-[var(--radius)] bg-[var(--surface)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--primary)]"
                  value={formData.birthDate}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6 p-6 rounded-[var(--radius)] border border-[var(--border)]">
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                  Age*
                </label>
                <input
                  type="number"
                  name="age"
                  required
                  max="25"
                  placeholder="Enter age"
                  className="w-full px-4 py-2.5 border border-[var(--border)] rounded-[var(--radius)] bg-[var(--surface)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--primary)]"
                  value={formData.age}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                  Grade Level*
                </label>
                <select
                  name="gradeLevel"
                  required
                  className="w-full px-4 py-2.5 border border-[var(--border)] rounded-[var(--radius)] bg-[var(--surface)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--primary)]"
                  value={formData.gradeLevel}
                  onChange={handleChange}
                >
                  <option value="">Select Grade Level</option>
                  {gradeLevels.map((grade) => (
                    <option key={grade} value={grade}>
                      {grade}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                  Section*
                </label>
                <input
                  type="text"
                  name="section"
                  required
                  className="w-full px-4 py-2.5 border border-[var(--border)] rounded-[var(--radius)] bg-[var(--surface)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--primary)]"
                  value={formData.section}
                  onChange={handleChange}
                  placeholder="Enter section (e.g., A, B, C)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                  Gender*
                </label>
                <select
                  name="gender"
                  required
                  className="w-full px-4 py-2.5 border border-[var(--border)] rounded-[var(--radius)] bg-[var(--surface)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--primary)]"
                  value={formData.gender}
                  onChange={handleChange}
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                  Shift*
                </label>
                <select
                  name="shift"
                  required
                  className="w-full px-4 py-2.5 border border-[var(--border)] rounded-[var(--radius)] bg-[var(--surface)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--primary)]"
                  value={formData.shift}
                  onChange={handleChange}
                >
                  <option value="">Select Shift</option>
                  <option value="Morning">Morning</option>
                  <option value="Afternoon">Afternoon</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                  Enrollment Status
                </label>
                <select
                  name="status"
                  className="w-full px-4 py-2.5 border border-[var(--border)] rounded-[var(--radius)] bg-[var(--surface)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--primary)]"
                  value={formData.status ?? 'Active'}
                  onChange={handleChange}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

            </div>
          </div>

          {/* Additional Fields */}
          <div className="mt-6 space-y-8">
            {/* Address Information */}
            <div className="p-6 rounded-[var(--radius)] border border-[var(--border)]">
              <h3 className="text-lg font-semibold text-[var(--primary-dark)] mb-4">Address Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                    Street Address
                  </label>
                  <textarea
                    name="address"
                    rows={3}
                    className="w-full px-4 py-2.5 border border-[var(--border)] rounded-[var(--radius)] bg-[var(--surface)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--primary)]"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="Enter street address"
                  />
                </div>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                      City/Municipality
                    </label>
                    <input
                      type="text"
                      name="city"
                      className="w-full px-4 py-2.5 border border-[var(--border)] rounded-[var(--radius)] bg-[var(--surface)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--primary)]"
                      value={formData.city}
                      onChange={handleChange}
                      placeholder="Enter city/municipality"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                      Province
                    </label>
                    <input
                      type="text"
                      name="province"
                      className="w-full px-4 py-2.5 border border-[var(--border)] rounded-[var(--radius)] bg-[var(--surface)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--primary)]"
                      value={formData.province}
                      onChange={handleChange}
                      placeholder="Enter province"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                      ZIP Code
                    </label>
                    <input
                      type="text"
                      name="zipCode"
                      className="w-full px-4 py-2.5 border border-[var(--border)] rounded-[var(--radius)] bg-[var(--surface)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--primary)]"
                      value={formData.zipCode}
                      onChange={handleChange}
                      placeholder="Enter ZIP code"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Parent/Guardian Information */}
            <div className="p-6 rounded-[var(--radius)] border border-[var(--border)]">
              <h3 className="text-lg font-semibold text-[var(--primary-dark)] mb-4">Parent/Guardian Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                    Parent/Guardian Name
                  </label>
                  <input
                    type="text"
                    name="parentName"
                    className="w-full px-4 py-2.5 border border-[var(--border)] rounded-[var(--radius)] bg-[var(--surface)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--primary)]"
                    value={formData.parentName}
                    onChange={handleChange}
                    placeholder="Enter parent/guardian name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                    Parent/Guardian Contact
                  </label>
                  <input
                    type="tel"
                    name="parentContact"
                    className="w-full px-4 py-2.5 border border-[var(--border)] rounded-[var(--radius)] bg-[var(--surface)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--primary)]"
                    value={formData.parentContact}
                    onChange={handleChange}
                    placeholder="Enter contact number"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                    <span className="inline-flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-[var(--primary)]" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                        <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                      </svg>
                      Parent Telegram Chat ID
                    </span>
                  </label>
                  <input
                    type="text"
                    name="parentTelegramChatId"
                    className="w-full px-4 py-2.5 border border-[var(--border)] rounded-[var(--radius)] bg-[var(--surface)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--primary)]"
                    value={formData.parentTelegramChatId}
                    onChange={handleChange}
                    placeholder="e.g., 123456789"
                  />
                  <p className="text-xs text-[var(--muted-foreground)] mt-1">
                    Parent must start @SmartendanceBot on Telegram to get their Chat ID
                  </p>
                </div>
              </div>
            </div>

            {/* Emergency Contact Information */}
            <div className="p-6 rounded-[var(--radius)] border border-[var(--border)]">
              <h3 className="text-lg font-semibold text-[var(--primary-dark)] mb-4">Emergency Contact</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                    Emergency Contact Name
                  </label>
                  <input
                    type="text"
                    name="emergencyContactName"
                    className="w-full px-4 py-2.5 border border-[var(--border)] rounded-[var(--radius)] bg-[var(--surface)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--primary)]"
                    value={formData.emergencyContactName}
                    onChange={handleChange}
                    placeholder="Enter emergency contact name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                    Emergency Contact Number
                  </label>
                  <input
                    type="tel"
                    name="emergencyContact"
                    className="w-full px-4 py-2.5 border border-[var(--border)] rounded-[var(--radius)] bg-[var(--surface)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--primary)]"
                    value={formData.emergencyContact}
                    onChange={handleChange}
                    placeholder="Enter emergency number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                    Relationship to Student
                  </label>
                  <input
                    type="text"
                    name="relationship"
                    className="w-full px-4 py-2.5 border border-[var(--border)] rounded-[var(--radius)] bg-[var(--surface)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--primary)]"
                    value={formData.relationship}
                    onChange={handleChange}
                    placeholder="Enter relationship"
                  />
                </div>
              </div>
            </div>


          </div>

          {/* QR Code Section */}
          <div className="mt-6 p-6 rounded-[var(--radius)] border border-[var(--border)]">
            <h3 className="text-lg font-semibold text-[var(--primary-dark)] mb-4">Student QR Code</h3>
            <div className="border-2 border-dashed border-[var(--border)] rounded-[var(--radius)] p-6 text-center bg-[var(--surface)]" ref={qrRef}>
              <div className="mb-4">
                {showQR && formData.studentId ? (
                  <div className="w-48 h-48 mx-auto flex items-center justify-center bg-[var(--surface)] p-2 rounded-[var(--radius)]">
                    <QRCodeSVG
                      value={JSON.stringify({
                        id: formData.studentId,
                        name: formData.fullName,
                        grade: formData.gradeLevel,
                        section: formData.section,
                        contact: formData.phoneNumber,
                        emergencyContact: formData.emergencyContact,
                        timestamp: new Date().toISOString()
                      })}
                      size={192}
                      level="H"
                      includeMargin={true}
                    />
                  </div>
                ) : (
                  <div className="w-48 h-48 mx-auto bg-[var(--muted)] rounded-[var(--radius)] flex items-center justify-center border border-dashed border-[var(--border)]">
                    <p className="text-[var(--muted-foreground)] text-sm">
                      {formData.studentId
                        ? 'Click generate to create QR code'
                        : 'Enter Student ID to generate QR code'}
                    </p>
                  </div>
                )}
              </div>
              <div className="space-x-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowQR(false); // First hide the QR
                    setTimeout(() => setShowQR(true), 100); // Then show it again to trigger re-render
                  }}
                  disabled={!formData.studentId}
                  className={`px-4 py-2 rounded-[var(--radius)] text-sm font-medium ${formData.studentId
                    ? 'btn-primary'
                    : 'bg-[var(--muted)] text-[var(--muted-foreground)] cursor-not-allowed'
                    } transition-colors`}
                >
                  Generate QR Code
                </button>
                {showQR && (
                  <button
                    type="button"
                    onClick={() => {
                      // Download QR code logic
                      const svg = qrRef.current?.querySelector('svg');
                      if (svg) {
                        const svgData = new XMLSerializer().serializeToString(svg);
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        const img = document.createElement('img');
                        img.width = 192;
                        img.height = 192;
                        img.onload = () => {
                          canvas.width = img.width;
                          canvas.height = img.height;
                          ctx?.drawImage(img, 0, 0);
                          const pngFile = canvas.toDataURL('image/png');
                          const downloadLink = document.createElement('a');
                          downloadLink.download = `${formData.studentId}_qr.png`;
                          downloadLink.href = pngFile;
                          downloadLink.click();
                        };
                        img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
                      }
                    }}
                    className="px-4 py-2 rounded-[var(--radius)] text-sm font-medium btn-primary transition-colors"
                  >
                    Download QR
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col space-y-4 mt-8 pt-6 border-t border-[var(--border)]">
            {validationErrors.length > 0 && (
              <div className="bg-red-50/80 border border-[var(--destructive)] text-[var(--destructive)] px-4 py-3 rounded-[var(--radius)]">
                <h4 className="font-semibold mb-2">Please correct the following errors:</h4>
                <ul className="list-disc list-inside space-y-1">
                  {validationErrors.map((error, index) => (
                    <li key={index}>{error.message}</li>
                  ))}
                </ul>
              </div>
            )}

            {error && (
              <div className="bg-red-50/80 border border-[var(--destructive)] text-[var(--destructive)] px-4 py-3 rounded-[var(--radius)]">
                {error}
              </div>
            )}

            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-6 py-2.5 border border-[var(--border)] rounded-[var(--radius)] text-[var(--foreground)] bg-[var(--surface)] hover:bg-[var(--muted)] transition-colors disabled:opacity-50 font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 btn-primary rounded-[var(--radius)] disabled:opacity-50 flex items-center font-medium"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Adding...
                  </>
                ) : (
                  'Add Student'
                )}
              </button>
            </div>
          </div>

          {/* Confirmation Dialog */}
          {showConfirmation && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60]">
              <div className="bg-[var(--surface)] rounded-[var(--radius)] p-6 max-w-md w-full mx-4 border border-[var(--border)] shadow-xl">
                <h3 className="text-lg font-semibold text-[var(--primary-dark)] mb-4">Confirm Student Addition</h3>
                <p className="text-[var(--muted-foreground)] mb-6">Are you sure you want to add this student?</p>
                <div className="flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={() => setShowConfirmation(false)}
                    className="px-4 py-2.5 border border-[var(--border)] rounded-[var(--radius)] text-[var(--foreground)] bg-[var(--surface)] hover:bg-[var(--muted)] font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmedSubmit}
                    className="px-4 py-2.5 btn-primary rounded-[var(--radius)] font-medium"
                  >
                    Confirm
                  </button>
                </div>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}