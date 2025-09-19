'use client';

import { QRCodeSVG } from 'qrcode.react';

interface ViewStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: {
    studentId: string;
    fullName: string;
    email: string;
    phoneNumber: string;
    age: string;
    birthDate: string;
    gradeLevel: string;
    section: string;
    gender: string;
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
  } | null;
}

export default function ViewStudentModal({ isOpen, onClose, student }: ViewStudentModalProps) {
  if (!isOpen || !student) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="fixed inset-0 bg-black opacity-50"></div>
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-8 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto relative z-10">
        <div className="space-y-8">
          {/* Profile Section */}
          <div className="flex flex-col items-center pb-6 border-b border-gray-200">
            <div className="relative mb-4">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 flex items-center justify-center shadow-lg">
                <span className="text-2xl font-bold text-green-600">
                  {student.fullName.split(' ').map(n => n[0]).join('')}
                </span>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">{student.fullName}</h2>
            <p className="text-gray-500 mb-2">{student.studentId}</p>
            <span className={`px-4 py-1 rounded-full text-sm font-semibold ${
              student.gender === 'Male' 
                ? 'bg-green-50 text-green-700 ring-1 ring-green-200/50' 
                : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/50'
            }`}>
              {student.gender}
            </span>
          </div>

          {/* Personal Information */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900">Personal Information</h3>
            </div>
            <div className="grid grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-gray-500">Student ID</p>
                <p className="text-base text-gray-900">{student.studentId}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Full Name</p>
                <p className="text-base text-gray-900">{student.fullName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Email Address</p>
                <p className="text-base text-gray-900">{student.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Phone Number</p>
                <p className="text-base text-gray-900">{student.phoneNumber}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Birth Date</p>
                <p className="text-base text-gray-900">{student.birthDate}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Age</p>
                <p className="text-base text-gray-900">{student.age}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Grade Level</p>
                <p className="text-base text-gray-900">{student.gradeLevel}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Section</p>
                <p className="text-base text-gray-900">{student.section}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Gender</p>
                <p className="text-base text-gray-900">{student.gender}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Shift</p>
                <p className="text-base text-gray-900">{student.shift}</p>
              </div>
            </div>
          </div>

          {/* Address Information */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900">Address Information</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-green-50/30 p-4 rounded-lg">
              <div className="col-span-2">
                <p className="text-sm text-gray-500">Street Address</p>
                <p className="text-base text-gray-900">{student.address || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">City/Municipality</p>
                <p className="text-base text-gray-900">{student.city || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Province</p>
                <p className="text-base text-gray-900">{student.province || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">ZIP Code</p>
                <p className="text-base text-gray-900">{student.zipCode || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Parent/Guardian Information */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900">Parent/Guardian Information</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-green-50/30 p-4 rounded-lg">
              <div>
                <p className="text-sm text-gray-500">Parent/Guardian Name</p>
                <p className="text-base text-gray-900">{student.parentName || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Parent/Guardian Contact</p>
                <p className="text-base text-gray-900">{student.parentContact || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Emergency Contact Information */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900">Emergency Contact</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-green-50/30 p-4 rounded-lg">
              <div>
                <p className="text-sm text-gray-500">Emergency Contact Name</p>
                <p className="text-base text-gray-900">{student.emergencyContactName || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Emergency Contact Number</p>
                <p className="text-base text-gray-900">{student.emergencyContact || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Relationship to Student</p>
                <p className="text-base text-gray-900">{student.relationship || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* QR Code Section */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm2 2V5h1v1H5zM3 13a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1v-3zm2 2v-1h1v1H5zM13 3a1 1 0 00-1 1v3a1 1 0 001 1h3a1 1 0 001-1V4a1 1 0 00-1-1h-3zm1 2v1h1V5h-1z" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900">Student QR Code</h3>
            </div>
            <div className="flex justify-center bg-green-50/30 p-6 rounded-lg">
              <div className="w-48 h-48 bg-white p-2 border border-green-200 rounded-lg shadow-md">
                <QRCodeSVG
                  value={JSON.stringify({
                    id: student.studentId,
                    name: student.fullName,
                    grade: student.gradeLevel,
                    section: student.section,
                    shift: student.shift,
                    email: student.email,
                    contact: student.phoneNumber,
                    emergencyContact: student.emergencyContact,
                    timestamp: new Date().toISOString()
                  })}
                  size={192}
                  level="H"
                  includeMargin={true}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-8">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm hover:shadow-md"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}