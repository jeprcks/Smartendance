'use client';

import { updateStudentAttendance } from '../../../../../lib/api';

export const BULK_STATUS_OPTIONS = ['Present', 'Absent', 'Late', 'Cut'];

interface BulkAttendanceActionBarProps {
  selectedCount: number;
  applying: boolean;
  onApplyBulkStatus: (status: string) => Promise<void>;
  onClearSelection: () => void;
}

interface ApplyBulkAttendanceStatusParams {
  token: string;
  scheduleId: string;
  selectedStudentIds: string[];
  status: string;
  subject: string;
  gradeLevel: string;
  section: string;
  onEachUpdated?: (studentId: string, status: string) => void;
}

export async function applyBulkAttendanceStatus({
  token,
  scheduleId,
  selectedStudentIds,
  status,
  subject,
  gradeLevel,
  section,
  onEachUpdated,
}: ApplyBulkAttendanceStatusParams) {
  await Promise.all(
    selectedStudentIds.map(async (studentId) => {
      await updateStudentAttendance({
        token,
        studentId,
        scheduleId,
        status,
        subject,
        gradeLevel,
        section,
      });
      onEachUpdated?.(studentId, status);
    })
  );
}

export default function BulkAttendanceActionBar({
  selectedCount,
  applying,
  onApplyBulkStatus,
  onClearSelection,
}: BulkAttendanceActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div
      className="flex flex-wrap items-center justify-end gap-3 p-4 rounded-xl border"
      style={{ borderColor: 'var(--border)', background: 'var(--card)' }}
    >
      <span className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
        {selectedCount} selected
      </span>
      {BULK_STATUS_OPTIONS.map((status) => (
        <button
          key={status}
          type="button"
          onClick={() => onApplyBulkStatus(status)}
          disabled={applying}
          className="px-3 py-2 rounded-lg border text-sm font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-sm"
          style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
        >
          {applying ? 'Applying...' : status}
        </button>
      ))}
      <button
        type="button"
        onClick={onClearSelection}
        disabled={applying}
        className="px-3 py-2 rounded-lg text-sm font-semibold border transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}
      >
        Clear
      </button>
    </div>
  );
}
