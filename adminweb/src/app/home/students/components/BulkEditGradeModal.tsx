'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';

const gradeLevels = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'] as const;

export type BulkEditUpdates = {
  gradeLevel?: string;
  section?: string;
  shift?: string;
  status?: string;
  graduationDate?: string;
  graduationSchoolYear?: string;
};

interface BulkEditGradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  count: number;
  onApply: (updates: BulkEditUpdates) => Promise<void>;
}

export default function BulkEditGradeModal({
  isOpen,
  onClose,
  count,
  onApply,
}: BulkEditGradeModalProps) {
  const [status, setStatus] = useState('');
  const [gradeLevel, setGradeLevel] = useState('');
  const [section, setSection] = useState('');
  const [shift, setShift] = useState('');
  const [schoolYearFrom, setSchoolYearFrom] = useState('');
  const [schoolYearTo, setSchoolYearTo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isGraduated = status === 'Graduated';

  const handleApply = async () => {
    const updates: BulkEditUpdates = {};
    if (status) updates.status = status;
    if (isGraduated) {
      updates.gradeLevel = 'Graduated';
      updates.section = 'N/A';
      if (schoolYearFrom.trim() && schoolYearTo.trim()) {
        updates.graduationSchoolYear = `${schoolYearFrom.trim()}-${schoolYearTo.trim()}`;
      }
    } else {
      if (gradeLevel) updates.gradeLevel = gradeLevel;
      if (section.trim()) updates.section = section.trim();
      if (shift) updates.shift = shift;
    }

    if (Object.keys(updates).length === 0) {
      toast.error('Select at least one field to update (status, grade, section, or shift).');
      return;
    }
    if (isGraduated && (!schoolYearFrom.trim() || !schoolYearTo.trim())) {
      toast.error('Please enter school year (from and to) when marking as Graduated.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onApply(updates);
      toast.success(`Updated ${count} student(s)`);
      onClose();
      setStatus('');
      setGradeLevel('');
      setSection('');
      setShift('');
      setSchoolYearFrom('');
      setSchoolYearTo('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update students');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setStatus('');
      setGradeLevel('');
      setSection('');
      setShift('');
      setSchoolYearFrom('');
      setSchoolYearTo('');
      onClose();
    }
  };

  const hasAnyChange = status || gradeLevel || section.trim() || shift;
  const canApplyGraduated = !isGraduated || (schoolYearFrom.trim() && schoolYearTo.trim());

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} aria-hidden />
      <div className="relative z-10 bg-[var(--surface)] rounded-xl shadow-xl border border-[var(--border)] p-6 w-full max-w-md mx-4">
        <h3 className="text-lg font-semibold text-[var(--foreground)] mb-1">Bulk edit grade / section / shift</h3>
        <p className="text-sm text-[var(--foreground)]/80 mb-4">{count} student(s) selected. Set the fields you want to apply to all.</p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                if (e.target.value !== 'Graduated') {
                  setSchoolYearFrom('');
                  setSchoolYearTo('');
                }
              }}
              className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--surface)] text-[var(--foreground)] focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--primary)] [color-scheme:light]"
            >
              <option value="">— No change —</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Graduated">Graduated</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Grade Level</label>
            {isGraduated ? (
              <div className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--muted)] text-[var(--muted-foreground)] font-medium text-sm">
                N/A
              </div>
            ) : (
              <select
                value={gradeLevel}
                onChange={(e) => setGradeLevel(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--surface)] text-[var(--foreground)] focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--primary)] [color-scheme:light]"
              >
                <option value="">— No change —</option>
                {gradeLevels.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            )}
          </div>

          {isGraduated && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">School year (from)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  value={schoolYearFrom}
                  onChange={(e) => setSchoolYearFrom(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="e.g. 2023"
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--surface)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--primary)]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">School year (to)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  value={schoolYearTo}
                  onChange={(e) => setSchoolYearTo(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="e.g. 2024"
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--surface)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--primary)]"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Section</label>
            {isGraduated ? (
              <div className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--muted)] text-[var(--muted-foreground)] font-medium text-sm">
                N/A
              </div>
            ) : (
              <input
                type="text"
                value={section}
                onChange={(e) => setSection(e.target.value)}
                placeholder="e.g. A, B, C — leave blank to skip"
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--surface)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--primary)]"
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Shift</label>
            {isGraduated ? (
              <div className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--muted)] text-[var(--muted-foreground)] font-medium text-sm">
                N/A
              </div>
            ) : (
              <select
                value={shift}
                onChange={(e) => setShift(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--surface)] text-[var(--foreground)] focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--primary)] [color-scheme:light]"
              >
                <option value="">— No change —</option>
                <option value="Morning">Morning</option>
                <option value="Afternoon">Afternoon</option>
              </select>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-[var(--foreground)] bg-[var(--muted)] rounded-lg hover:bg-[var(--secondary)] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={isSubmitting || !hasAnyChange || !canApplyGraduated}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:pointer-events-none"
          >
            {isSubmitting ? 'Updating…' : 'Apply to all'}
          </button>
        </div>
      </div>
    </div>
  );
}
