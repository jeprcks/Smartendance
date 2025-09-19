'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { QRCodeSVG } from 'qrcode.react';

interface AddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (studentData: any) => void;
}

interface StudentFormData {
  studentId: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  age: string;
  birthDate: string;
  gradeLevel: string;
  section: string;
  gender: string;
  photo?: string; // Base64 encoded image
  shift: string;
  address?: string;
  city?: string;
  province?: string;
  zipCode?: string;
  parentName?: string;
  parentContact?: string;
  emergencyContact?: string;
  emergencyContactName?: string;
  relationship?: string;
}


export default function AddStudentModal({ isOpen, onClose, onAdd }: AddStudentModalProps) {
  const [formData, setFormData] = useState<StudentFormData>({
    studentId: '',
    fullName: '',
    email: '',
    phoneNumber: '',
    age: '',
    birthDate: '',
    gradeLevel: '',
    section: '',
    gender: '',
    shift: '',
    address: '',
    city: '',
    province: '',
    zipCode: '',
    parentName: '',
    parentContact: '',
    emergencyContact: '',
    emergencyContactName: '',
    relationship: '',
    
  });
  
  const [showQR, setShowQR] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  const gradeLevels = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'];
  const sections = ['A', 'B', 'C', 'D'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd(formData);
    onClose();
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-8 max-w-7xl w-full mx-4 max-h-[95vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Add New Student</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Personal Information</h3>
          </div>
          {/* Profile Image Upload */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
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
                <h4 className="text-sm font-medium text-gray-700 mb-2">Student Photo</h4>
                <p className="text-sm text-gray-500 mb-4">Upload a clear photo of the student. The photo should be:</p>
                <ul className="text-sm text-gray-500 list-disc list-inside space-y-1">
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
            <div className="space-y-6 bg-gray-50 p-6 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Student ID*
                </label>
                <input
                  type="text"
                  name="studentId"
                  required
                  placeholder="Enter student ID"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={formData.studentId}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name*
                </label>
                <input
                  type="text"
                  name="fullName"
                  required
                  placeholder="Enter full name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={formData.fullName}
                  onChange={handleChange}
                />
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number*
                </label>
                <input
                  type="tel"
                  name="phoneNumber"
                  required
                  placeholder="Enter phone number"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Birth Date*
                </label>
                <input
                  type="date"
                  name="birthDate"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={formData.birthDate}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6 bg-gray-50 p-6 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Age*
                </label>
                <input
                  type="number"
                  name="age"
                  required
                  min="12"
                  max="25"
                  placeholder="Enter age"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={formData.age}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Grade Level*
                </label>
                <select
                  name="gradeLevel"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Section*
                </label>
                <select
                  name="section"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={formData.section}
                  onChange={handleChange}
                >
                  <option value="">Select Section</option>
                  {sections.map((section) => (
                    <option key={section} value={section}>
                      Section {section}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gender*
                </label>
                <select
                  name="gender"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Shift*
                </label>
                <select
                  name="shift"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={formData.shift}
                  onChange={handleChange}
                >
                  <option value="">Select Shift</option>
                  <option value="Morning">Morning</option>
                  <option value="Afternoon">Afternoon</option>
                </select>
              </div>

            </div>
          </div>

          {/* Additional Fields */}
            <div className="mt-6 space-y-8">
              {/* Address Information */}
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Address Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Street Address
                    </label>
                    <textarea
                      name="address"
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={formData.address}
                      onChange={handleChange}
                      placeholder="Enter street address"
                    />
                  </div>
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        City/Municipality
                      </label>
                      <input
                        type="text"
                        name="city"
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={formData.zipCode}
                        onChange={handleChange}
                        placeholder="Enter ZIP code"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Parent/Guardian Information */}
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Parent/Guardian Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Parent/Guardian Name
                    </label>
                    <input
                      type="text"
                      name="parentName"
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={formData.parentName}
                      onChange={handleChange}
                      placeholder="Enter parent/guardian name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Parent/Guardian Contact
                    </label>
                    <input
                      type="tel"
                      name="parentContact"
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={formData.parentContact}
                      onChange={handleChange}
                      placeholder="Enter contact number"
                    />
                  </div>
                </div>
              </div>

              {/* Emergency Contact Information */}
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Emergency Contact</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Emergency Contact Name
                    </label>
                    <input
                      type="text"
                      name="emergencyContactName"
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={formData.emergencyContactName}
                      onChange={handleChange}
                      placeholder="Enter emergency contact name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Emergency Contact Number
                    </label>
                    <input
                      type="tel"
                      name="emergencyContact"
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={formData.emergencyContact}
                      onChange={handleChange}
                      placeholder="Enter emergency number"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Relationship to Student
                    </label>
                    <input
                      type="text"
                      name="relationship"
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={formData.relationship}
                      onChange={handleChange}
                      placeholder="Enter relationship"
                    />
                  </div>
                </div>
              </div>


            </div>

          {/* QR Code Section */}
          <div className="mt-6 bg-gray-50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Student QR Code</h3>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center bg-white" ref={qrRef}>
              <div className="mb-4">
                {showQR && formData.studentId ? (
                  <div className="w-48 h-48 mx-auto flex items-center justify-center bg-white p-2">
                    <QRCodeSVG
                      value={JSON.stringify({
                        id: formData.studentId,
                        name: formData.fullName,
                        grade: formData.gradeLevel,
                        section: formData.section,
                        email: formData.email,
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
                  <div className="w-48 h-48 mx-auto bg-gray-50 flex items-center justify-center">
                    <p className="text-gray-500 text-sm">
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
                  className={`px-4 py-2 rounded-md text-sm ${
                    formData.studentId
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
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
                    className="px-4 py-2 rounded-md text-sm bg-green-600 text-white hover:bg-green-700 transition-colors"
                  >
                    Download QR
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-4 mt-8">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Add Student
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}