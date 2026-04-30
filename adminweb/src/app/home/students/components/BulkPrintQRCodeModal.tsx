'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Student, studentService } from '@/app/services/studentService';
import { exportBulkQRToPDF } from './exportBulkQRToPDF';

interface BulkPrintQRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
}

export default function BulkPrintQRCodeModal({ isOpen, onClose, students }: BulkPrintQRCodeModalProps) {
  const [qrMap, setQrMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen || students.length === 0) {
      setQrMap({});
      setErrors({});
      return;
    }
    let cancelled = false;

    const fetchAll = async () => {
      setLoading(true);
      setQrMap({});
      setErrors({});
      const nextQr: Record<string, string> = {};
      const nextErr: Record<string, string> = {};

      for (const student of students) {
        if (!student._id || cancelled) continue;
        try {
          try {
            const res = await studentService.getQRCode(student._id);
            if (res?.qrCode?.image) {
              nextQr[student._id] = res.qrCode.image;
            } else {
              const gen = await studentService.generateQRCode(student._id);
              if (gen?.qrCode?.image) nextQr[student._id] = gen.qrCode.image;
              else nextErr[student._id] = 'No QR image';
            }
          } catch {
            const gen = await studentService.generateQRCode(student._id);
            if (gen?.qrCode?.image) nextQr[student._id] = gen.qrCode.image;
            else nextErr[student._id] = 'Failed to load QR';
          }
        } catch (e) {
          nextErr[student._id] = e instanceof Error ? e.message : 'Failed to load QR';
        }
        if (cancelled) return;
        setQrMap({ ...nextQr });
        setErrors({ ...nextErr });
      }

      if (!cancelled) setLoading(false);
    };

    fetchAll();
    return () => { cancelled = true; };
  }, [isOpen, students]);

  const handleDownloadPDF = () => {
    exportBulkQRToPDF(students, qrMap, undefined, () => {
      onClose();
    });
  };

  if (!isOpen) return null;

  const loadedCount = students.filter(s => s._id && qrMap[s._id]).length;
  const canDownload = loadedCount > 0;

  const content = (
    <>
      <div id="bulk-print-root" className="fixed inset-0 flex items-center justify-center z-50">
        <div className="fixed inset-0 bg-black/50 print:hidden" aria-hidden onClick={onClose} />
        <div className="bg-[var(--surface)] rounded-lg shadow-lg border border-[var(--border)] p-8 max-w-2xl w-full mx-4 relative z-10 max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between print:hidden mb-4">
            <h2 className="text-xl font-bold text-[var(--foreground)]">Bulk Print QR Codes</h2>
            <button type="button" onClick={onClose} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] p-1">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <p className="text-sm text-[var(--foreground)]/80 print:hidden mb-4">
            {students.length} student{students.length !== 1 ? 's' : ''} selected. {loading ? 'Loading QR codes…' : canDownload ? `${loadedCount} ready to download.` : 'No QR codes loaded.'}
          </p>

          <div className="flex-1 overflow-y-auto space-y-2 print:hidden mb-4">
            {students.map(s => {
              const qr = s._id ? qrMap[s._id] : null;
              const err = s._id ? errors[s._id] : null;
              return (
                <div key={s._id || s.studentId} className="flex items-center gap-3 p-2 rounded-lg border border-[var(--border)] bg-[var(--muted)]/40">
                  <span className="text-sm font-medium text-[var(--foreground)] truncate flex-1">{s.fullName}</span>
                  <span className="text-xs text-[var(--foreground)]/70">{s.studentId}</span>
                  {loading && !qr && !err ? (
                    <span className="text-xs text-amber-600 dark:text-amber-400">Loading…</span>
                  ) : err ? (
                    <span className="text-xs text-[var(--destructive)]">{err}</span>
                  ) : qr ? (
                    <img src={qr} alt="" className="w-8 h-8 rounded border border-[var(--border)]" />
                  ) : null}
                </div>
              );
            })}
          </div>

          <div className="flex justify-end gap-3 print:hidden pt-4 border-t border-[var(--border)]">
            <button type="button" onClick={onClose} className="px-4 py-2 text-[var(--foreground)] border border-[var(--border)] rounded-lg hover:bg-[var(--muted)]">
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={!canDownload || loading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:pointer-events-none"
            >
              Download PDF ({loadedCount})
            </button>
          </div>
        </div>
      </div>
    </>
  );

  return mounted ? createPortal(content, document.body) : null;
}
