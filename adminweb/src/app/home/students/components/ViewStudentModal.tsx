'use client';

import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';

import { Student, studentService } from '@/app/services/studentService';

interface ViewStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
}

export default function ViewStudentModal({ isOpen, onClose, student: initialStudent }: ViewStudentModalProps) {
  const [student, setStudent] = useState<Student | null>(initialStudent);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStudentDetails = async () => {
      if (!isOpen || !initialStudent?._id) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const data = await studentService.getStudentById(initialStudent._id);
        setStudent(data);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load student details';
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStudentDetails();
  }, [isOpen, initialStudent?._id]);

  if (!isOpen || (!student && !isLoading)) return null;

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center z-50">
        <div className="fixed inset-0 bg-black opacity-50"></div>
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-sm w-full mx-4 relative z-10">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
            <p className="mt-4 text-gray-600">Loading student details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 flex items-center justify-center z-50">
        <div className="fixed inset-0 bg-black opacity-50"></div>
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-sm w-full mx-4 relative z-10">
          <div className="flex flex-col items-center">
            <div className="text-red-600 mb-4">
              <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="text-gray-800 mb-4">{error}</p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!student) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="fixed inset-0 bg-black opacity-50"></div>
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-8 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto relative z-10">
        <div className="space-y-8">
          {/* Profile and Attendance Section */}
          <div className="flex gap-8 pb-6 border-b border-gray-200">
            {/* Profile Section - Left Side */}
            <div className="flex flex-col items-center w-1/3">
              <div className="relative mb-4">
                {student.photo && student.photo.startsWith('data:image/') ? (
                  <div className="w-32 h-32 rounded-lg overflow-hidden border-2 border-green-200 shadow-lg">
                    <img
                      src={student.photo}
                      alt={`${student.fullName}'s profile`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        console.error('Image failed to load in modal for student:', student.studentId);
                        // Hide the image and show fallback
                        e.currentTarget.style.display = 'none';
                        const parent = e.currentTarget.parentElement;
                        if (parent) {
                          parent.innerHTML = `
                            <div class="w-32 h-32 rounded-lg bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 flex items-center justify-center shadow-lg">
                              <span class="text-3xl font-bold text-green-600">${student.fullName.split(' ').map(n => n[0]).join('')}</span>
                            </div>
                          `;
                        }
                      }}
                      onLoad={() => {
                        console.log('Image loaded successfully in modal for student:', student.studentId);
                      }}
                    />
                  </div>
                ) : (
                  <div className="w-32 h-32 rounded-lg bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 flex items-center justify-center shadow-lg">
                    <span className="text-3xl font-bold text-green-600">
                      {student.fullName.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                )}
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-1 text-center">{student.fullName}</h2>
              <p className="text-gray-500 mb-2 text-center">{student.studentId}</p>
              <span className={`px-4 py-1 rounded-full text-sm font-semibold ${
                (student.status ?? '') === 'Graduated'
                  ? 'bg-gray-100 text-gray-600 ring-1 ring-gray-200/50'
                  : student.gender === 'Male'
                    ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200/50'
                    : 'bg-pink-50 text-pink-700 ring-1 ring-pink-200/50'
              }`}>
                {(student.status ?? '') === 'Graduated' ? 'N/A' : student.gender}
              </span>
            </div>

            {/* Attendance Tracking Section - Right Side */}
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                </svg>
                <h3 className="text-lg font-semibold text-gray-900">Attendance Summary</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-green-600 font-medium">Present</p>
                      <p className="text-2xl font-bold text-green-700">0</p>
                    </div>
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-red-600 font-medium">Absent</p>
                      <p className="text-2xl font-bold text-red-700">0</p>
                    </div>
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                  </div>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-yellow-600 font-medium">Late</p>
                      <p className="text-2xl font-bold text-yellow-700">0</p>
                    </div>
                    <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-orange-600 font-medium">Cutting</p>
                      <p className="text-2xl font-bold text-orange-700">0</p>
                    </div>
                    <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
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
                <p className="text-sm text-gray-500">Phone Number</p>
                <p className="text-base text-gray-900">{student.phoneNumber}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Birth Date</p>
                <p className="text-base text-gray-900">{typeof student.birthDate === 'string' ? student.birthDate.split('T')[0] : typeof student.birthDate === 'object' && student.birthDate !== null && 'toLocaleDateString' in student.birthDate ? (student.birthDate as Date).toLocaleDateString() : student.birthDate}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Age</p>
                <p className="text-base text-gray-900">{student.age}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Grade Level</p>
                <p className="text-base text-gray-900">{(student.status ?? '') === 'Graduated' ? 'N/A' : student.gradeLevel}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Section</p>
                <p className="text-base text-gray-900">{(student.status ?? '') === 'Graduated' ? 'N/A' : student.section}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Gender</p>
                <p className={`text-base font-medium ${(student.status ?? '') === 'Graduated' ? 'text-gray-900' : student.gender === 'Male' ? 'text-blue-700' : 'text-pink-700'}`}>{(student.status ?? '') === 'Graduated' ? 'N/A' : student.gender}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Shift</p>
                <p className="text-base text-gray-900">{(student.status ?? '') === 'Graduated' ? 'N/A' : student.shift}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Enrollment Status</p>
                <p className="text-base">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${
                    (student.status ?? 'Active') === 'Active'
                      ? 'bg-emerald-50 text-emerald-700'
                      : (student.status ?? '') === 'Graduated'
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'bg-amber-50 text-amber-700'
                  }`}>
                    {student.status ?? 'Active'}
                  </span>
                </p>
              </div>
              {(student.status ?? '') === 'Graduated' && (student.graduationSchoolYear || student.graduationDate) && (
                <div>
                  <p className="text-sm text-gray-500">School year graduated</p>
                  <p className="text-base text-gray-900">
                    {student.graduationSchoolYear
                      ? `SY ${student.graduationSchoolYear}`
                      : typeof student.graduationDate === 'string'
                        ? student.graduationDate.split('T')[0]
                        : new Date(student.graduationDate!).toLocaleDateString()}
                  </p>
                </div>
              )}
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
                <p className="text-base text-gray-900">
                  {typeof student.address === 'string' 
                    ? student.address 
                    : student.address?.street || 'N/A'
                  }
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">City/Municipality</p>
                <p className="text-base text-gray-900">
                  {typeof student.address === 'object' ? student.address?.city || 'N/A' : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Province</p>
                <p className="text-base text-gray-900">
                  {typeof student.address === 'object' ? student.address?.province || 'N/A' : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">ZIP Code</p>
                <p className="text-base text-gray-900">
                  {typeof student.address === 'object' ? student.address?.zipCode || 'N/A' : 'N/A'}
                </p>
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
                <p className="text-base text-gray-900">
                  {student.parentInfo?.name || student.parentName || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Parent/Guardian Contact</p>
                <p className="text-base text-gray-900">
                  {student.parentInfo?.contactNumber || student.parentContact || 'N/A'}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-gray-500 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                  </svg>
                  Telegram Chat ID
                </p>
                <p className="text-base text-gray-900 font-mono">
                  {(student.parentInfo as any)?.telegramChatId || (student as any).parentTelegramChatId || (student as any).telegramChatId || (
                    <span className="text-gray-400 italic font-sans">Not configured</span>
                  )}
                </p>
                {!((student.parentInfo as any)?.telegramChatId || (student as any).parentTelegramChatId || (student as any).telegramChatId) && (
                  <p className="text-xs text-blue-600 mt-1">
                    💡 Edit student to add Telegram Chat ID for notifications
                  </p>
                )}
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
                <p className="text-base text-gray-900">
                  {student.emergencyContact?.name || student.emergencyContactName || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Emergency Contact Number</p>
                <p className="text-base text-gray-900">
                  {student.emergencyContact?.contactNumber || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Relationship to Student</p>
                <p className="text-base text-gray-900">
                  {student.emergencyContact?.relationship || student.relationship || 'N/A'}
                </p>
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
              <div className="bg-white p-4 border border-green-200 rounded-lg shadow-md">
                <QRCodeSVG
                  value={JSON.stringify({
                    id: student.studentId,
                    name: student.fullName,
                    grade: student.gradeLevel,
                    section: student.section,
                    shift: student.shift,
                    contact: student.phoneNumber,
                    emergencyContact: student.emergencyContact,
                    timestamp: new Date().toISOString()
                  })}
                  size={256}
                  level="H"
                  includeMargin={true}
                  marginSize={4}
                  bgColor="#FFFFFF"
                  fgColor="#000000"
                />
              </div>
            </div>
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-600">
                Scan this QR code with the mobile app to view student information
              </p>
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