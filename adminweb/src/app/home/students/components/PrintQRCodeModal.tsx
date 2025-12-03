'use client';

import { useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
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
  const [mounted, setMounted] = useState(false);

  // Fetch QR code when modal opens
  useEffect(() => {
    if (isOpen && student) {
      fetchQRCode();
    }
  }, [isOpen, student]);

  // Ensure we're mounted before using portals / window
  useEffect(() => {
    setMounted(true);
  }, []);

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

  const handlePrint = () => {
    if (!student) return;

    const initials = student.fullName
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

    const photoHtml = student.photo && student.photo.startsWith('data:image/')
      ? `<img src="${student.photo}" alt="${student.fullName}" style="width:100%;height:100%;object-fit:cover;" />`
      : `<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;background:#f0fdf4;color:#16a34a;font-weight:700;font-size:20px;">${initials}</div>`;

    const qrHtml = qrCodeData
      ? `<img src="${qrCodeData}" alt="Student QR Code" style="width:192px;height:192px;display:block;" />`
      : `<div style="width:192px;height:192px;display:flex;align-items:center;justify-content:center;background:#f3f4f6;border:2px solid #d1d5db;border-radius:8px;">No QR Code Available</div>`;

    const docHtml = `<!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title></title>
        <style>
          @page { size: A4; margin: 1in; }
          html, body { background: #ffffff; padding: 0; margin: 0; height: 100%; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"; color:#111827; }
          /* Center within the viewport so it works for A4 and Letter */
          .page { min-height: calc(100vh - 2in); display: flex; align-items: center; justify-content: center; }
          .container { max-width: 7.5in; margin: 0 auto; padding: 0; text-align: center; }
          h1 { margin: 0 0 6px; font-size: 24px; font-weight: 700; }
          .sub { margin: 0 0 20px; color: #4b5563; }
          .photo { width: 80px; height: 80px; border-radius: 9999px; overflow: hidden; border: 2px solid #d1d5db; margin: 0 auto 12px; }
          .name { font-size: 18px; font-weight: 700; margin: 0 0 4px; }
          .id { font-size: 16px; margin: 0 0 2px; }
          .muted { color: #4b5563; margin: 0; }
          .qr { display: inline-block; padding: 12px; border: 2px solid #d1d5db; border-radius: 10px; margin: 18px 0; }
          .footer { font-size: 12px; color: #4b5563; margin-top: 8px; }
        </style>
      </head>
      <body>
        <div class="page">
        <div class="container">
          <div>
            <h1>Smartendance System</h1>
            <div class="sub">Student QR Code</div>
          </div>
          <div class="photo">${photoHtml}</div>
          <div class="name">${student.fullName}</div>
          <div class="id">Student ID: ${student.studentId}</div>
          <p class="muted">${student.gradeLevel} - Section ${student.section}</p>
          <p class="muted">${student.shift} Shift</p>
          <div class="qr">${qrHtml}</div>
          <div class="footer">Scan this QR code with the mobile app to view student information</div>
        </div>
        </div>
      </body>
    </html>`;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);

    const iw = iframe.contentWindow as Window;
    const idoc = iw.document;
    idoc.open();
    idoc.write(docHtml);
    idoc.close();

    const removeIframe = () => {
      try { document.body.removeChild(iframe); } catch {}
    };

    // Close/remove the hidden iframe after the print dialog closes
    iw.onafterprint = removeIframe;
    try {
      const mql = iw.matchMedia && iw.matchMedia('print');
      if (mql) {
        if (mql.addEventListener) {
          mql.addEventListener('change', (e: MediaQueryListEvent) => { if (!e.matches) removeIframe(); });
        } else if ((mql as any).addListener) {
          (mql as any).addListener((e: MediaQueryListEvent) => { if (!e.matches) removeIframe(); });
        }
      }
    } catch {}

    // Trigger print
    try {
      iw.focus();
      iw.print();
    } catch {
      removeIframe();
    }

    // Hard fallback in case events don't fire
    setTimeout(removeIframe, 20000);
  };

  if (!isOpen || !student) return null;

  const content = (
    <>
      {/* Modal Overlay */}
      <div id="print-root" className="fixed inset-0 flex items-center justify-center z-50">
        <div className="fixed inset-0 bg-black opacity-50 print:hidden"></div>
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-8 max-w-2xl w-full mx-4 relative z-10">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between print:hidden">
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
            <div className="flex justify-end space-x-3 print:hidden">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePrint}
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

          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }

          /* Hide everything in the document except our print root to avoid extra pages */
          body > *:not(#print-root) {
            display: none !important;
          }

          /* Reset the modal overlay for print so it doesn't repeat on each page */
          #print-root {
            position: static !important;
            inset: auto !important;
            box-shadow: none !important;
            background: transparent !important;
            display: block !important;
          }

          /* Ensure the printable content is centered and uses the page width */
          #print-root .print-content {
            position: static !important;
            transform: none !important;
            width: 100% !important;
            max-width: 8.27in; /* A4 width */
            margin: 0 auto !important;
            background: white !important;
            page-break-inside: avoid !important;
          }

          #print-root .bg-white {
            background: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            color-adjust: exact;
          }

          #print-root .text-gray-900,
          #print-root .text-gray-800,
          #print-root .text-gray-700,
          #print-root .text-gray-600 {
            color: black !important;
          }

          #print-root .border-gray-300 {
            border-color: #d1d5db !important;
          }

          #print-root .border-green-200 {
            border-color: #bbf7d0 !important;
          }

          #print-root .bg-gradient-to-br {
            background: #f0fdf4 !important;
          }

          #print-root .text-green-600 {
            color: #16a34a !important;
          }
        }
      `}</style>
    </>
  );

  // Render using a portal so #print-root is a direct child of <body>
  return mounted ? createPortal(content, document.body) : null;
}
