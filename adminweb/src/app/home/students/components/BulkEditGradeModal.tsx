'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';

const gradeLevels = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'] as const;

export type BulkEditUpdates = {
  gradeLevel?: string;
  section?: string;
  shift?: string;
  status?: string;
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleApply = async () => {
    const updates: BulkEditUpdates = {};
    if (status) updates.status = status;
    if (gradeLevel) updates.gradeLevel = gradeLevel;
    if (section.trim()) updates.section = section.trim();
    if (shift) updates.shift = shift;

    if (Object.keys(updates).length === 0) {
      toast.error('Select at least one field to update (status, grade, section, or shift).');
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
      onClose();
    }
  };

  const hasAnyChange = status || gradeLevel || section.trim() || shift;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} aria-hidden />
      <div className="relative z-10 bg-white rounded-xl shadow-xl border border-gray-200 p-6 w-full max-w-md mx-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Bulk edit grade / section / shift</h3>
        <p className="text-sm text-gray-500 mb-4">{count} student(s) selected. Set the fields you want to apply to all.</p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option value="">— No change —</option>
              <option value="Active">Active</option>
              <option value="Idle">Idle</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Grade Level</label>
            <select
              value={gradeLevel}
              onChange={(e) => setGradeLevel(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option value="">— No change —</option>
              {gradeLevels.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
            <input
              type="text"
              value={section}
              onChange={(e) => setSection(e.target.value)}
              placeholder="e.g. A, B, C — leave blank to skip"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Shift</label>
            <select
              value={shift}
              onChange={(e) => setShift(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option value="">— No change —</option>
              <option value="Morning">Morning</option>
              <option value="Afternoon">Afternoon</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={isSubmitting || !hasAnyChange}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:pointer-events-none"
          >
            {isSubmitting ? 'Updating…' : 'Apply to all'}
          </button>
        </div>
      </div>
    </div>
  );
}
