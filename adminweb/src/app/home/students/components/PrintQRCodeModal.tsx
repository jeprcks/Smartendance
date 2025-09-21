'use client';

import { useRef, useEffect, useState } from 'react';
import { Student, studentService } from '@/app/services/studentService';

interface PrintQRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
}

export default function PrintQRCodeModal({ isOpen, onClose, student }: PrintQRCodeModalProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch QR code when modal opens
  useEffect(() => {
    if (isOpen && student) {
      fetchQRCode();
    }
  }, [isOpen, student]);

  const fetchQRCode = async () => {
    if (!student) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // First try to get existing QR code
      const qrResponse = await studentService.getQRCode(student._id);
      if (qrResponse.qrCode?.image) {
        setQrCodeData(qrResponse.qrCode.image);
      } else {
        // If no QR code exists, generate one
        const generateResponse = await studentService.generateQRCode(student._id);
        setQrCodeData(generateResponse.qrCode.image);
      }
    } catch (err) {
      console.error('Error fetching QR code:', err);
      setError('Failed to load QR code');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !student) return null;

  return (
    <>
      {/* Modal Overlay */}
      <div className="fixed inset-0 flex items-center justify-center z-50">
        <div className="fixed inset-0 bg-black opacity-50"></div>
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-8 max-w-2xl w-full mx-4 relative z-10">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Print QR Code</h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Print Content */}
            <div ref={printRef} className="print-content">
              <div className="bg-white p-8 text-center">
                {/* School Header */}
                <div className="mb-8">
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">Smartendance System</h1>
                  <p className="text-gray-600">Student QR Code</p>
                </div>

                {/* Student Information */}
                <div className="mb-8">
                  <div className="flex justify-center mb-4">
                    {student.photo && student.photo.startsWith('data:image/') ? (
                      <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-gray-300">
                        <img
                          src={student.photo}
                          alt={`${student.fullName}'s profile`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 flex items-center justify-center">
                        <span className="text-xl font-bold text-green-600">
                          {student.fullName.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                    )}
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mb-1">{student.fullName}</h2>
                  <p className="text-lg text-gray-700 mb-1">Student ID: {student.studentId}</p>
                  <p className="text-gray-600">{student.gradeLevel} - Section {student.section}</p>
                  <p className="text-gray-600">{student.shift} Shift</p>
                </div>

                {/* QR Code */}
                <div className="flex justify-center mb-6">
                  <div className="bg-white p-4 border-2 border-gray-300 rounded-lg">
                    {isLoading ? (
                      <div className="w-48 h-48 flex items-center justify-center bg-gray-100 border-2 border-gray-300 rounded">
                        <div className="text-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-2"></div>
                          <p className="text-gray-500 text-sm">Loading QR Code...</p>
                        </div>
                      </div>
                    ) : error ? (
                      <div className="w-48 h-48 flex items-center justify-center bg-red-50 border-2 border-red-300 rounded">
                        <div className="text-center">
                          <p className="text-red-500 text-sm mb-2">{error}</p>
                          <button
                            onClick={fetchQRCode}
                            className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                          >
                            Retry
                          </button>
                        </div>
                      </div>
                    ) : qrCodeData ? (
                      <img
                        src={qrCodeData}
                        alt="Student QR Code"
                        className="w-48 h-48"
                      />
                    ) : (
                      <div className="w-48 h-48 flex items-center justify-center bg-gray-100 border-2 border-gray-300 rounded">
                        <p className="text-gray-500 text-center">No QR Code Available</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Instructions */}
                <div className="text-sm text-gray-600">
                  <p className="mb-2">Scan this QR code with the mobile app to view student information</p>
            
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Print QR Code
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          @page {
            margin: 1in;
            size: A4;
          }
          
          body * {
            visibility: hidden;
          }
          
          .print-content,
          .print-content * {
            visibility: visible;
          }
          
          .print-content {
            position: absolute;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            width: 100%;
            max-width: 8.5in;
            background: white;
          }
          
          .print-content .bg-white {
            background: white !important;
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
          }
          
          .print-content .text-gray-900,
          .print-content .text-gray-800,
          .print-content .text-gray-700,
          .print-content .text-gray-600 {
            color: black !important;
          }
          
          .print-content .border-gray-300 {
            border-color: #d1d5db !important;
          }
          
          .print-content .border-green-200 {
            border-color: #bbf7d0 !important;
          }
          
          .print-content .bg-gradient-to-br {
            background: #f0fdf4 !important;
          }
          
          .print-content .text-green-600 {
            color: #16a34a !important;
          }
        }
      `}</style>
    </>
  );
}
