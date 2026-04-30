'use client';

export interface AttendanceRow {
  id: string;
  studentName: string;
  studentId: string;
  status: string;
  scanTime: string;
  recordId?: string;
  gradeLevel?: string;
  section?: string;
  subject?: string;
  gender?: string;
}

interface AttendanceTableProps {
  rows: AttendanceRow[];
  statusOptions: string[];
  onStatusChange: (id: string, status: string) => void | Promise<void>;
  updatingId?: string | null;
  mode?: 'records' | 'schedule';
  /** When true, the status action is disabled for that row (e.g. when student is Out) */
  isActionDisabled?: (row: AttendanceRow) => boolean;
  selectedRowIds?: string[];
  onToggleRowSelection?: (id: string) => void;
  onToggleAllRows?: () => void;
  isRowSelectable?: (row: AttendanceRow) => boolean;
}

export default function AttendanceTable({
  rows,
  statusOptions,
  onStatusChange,
  updatingId,
  isActionDisabled,
  selectedRowIds = [],
  onToggleRowSelection,
  onToggleAllRows,
  isRowSelectable,
}: AttendanceTableProps) {
  if (rows.length === 0) {
    return (
      <p className="py-8 text-center" style={{ color: 'var(--muted-foreground)' }}>
        No records to display
      </p>
    );
  }

  const selectableRows = rows.filter((row) => (isRowSelectable ? isRowSelectable(row) : true));
  const selectedCount = selectableRows.filter((row) => selectedRowIds.includes(row.id)).length;
  const allSelected = selectableRows.length > 0 && selectedCount === selectableRows.length;

  return (
    <div
      className="rounded-xl border overflow-hidden card-theme"
      style={{ borderColor: 'var(--border)' }}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th
                className="text-left px-5 py-4 font-bold text-xs uppercase tracking-wider"
                style={{
                  background: 'transparent',
                  borderBottom: '2px solid var(--border)',
                  color: 'var(--foreground)',
                }}
              >
                Student Name
              </th>
              <th
                className="text-left px-5 py-4 font-bold text-xs uppercase tracking-wider"
                style={{
                  background: 'transparent',
                  borderBottom: '2px solid var(--border)',
                  color: 'var(--foreground)',
                }}
              >
                Student ID
              </th>
              <th
                className="text-left px-5 py-4 font-bold text-xs uppercase tracking-wider"
                style={{
                  background: 'transparent',
                  borderBottom: '2px solid var(--border)',
                  color: 'var(--foreground)',
                }}
              >
                Gender
              </th>
              <th
                className="text-left px-5 py-4 font-bold text-xs uppercase tracking-wider"
                style={{
                  background: 'transparent',
                  borderBottom: '2px solid var(--border)',
                  color: 'var(--foreground)',
                }}
              >
                Status
              </th>
              <th
                className="text-left px-5 py-4 font-bold text-xs uppercase tracking-wider"
                style={{
                  background: 'transparent',
                  borderBottom: '2px solid var(--border)',
                  color: 'var(--foreground)',
                }}
              >
                Scan Time
              </th>
              <th
                className="text-left px-5 py-4 font-bold text-xs uppercase tracking-wider"
                style={{
                  background: 'transparent',
                  borderBottom: '2px solid var(--border)',
                  color: 'var(--foreground)',
                }}
              >
                Actions
              </th>
              <th
                className="w-8 text-center px-1 py-4 font-bold text-xs uppercase tracking-wider"
                style={{
                  background: 'transparent',
                  borderBottom: '2px solid var(--border)',
                  color: 'var(--foreground)',
                }}
              >
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={() => onToggleAllRows?.()}
                  className="w-4 h-4 cursor-pointer"
                  aria-label="Select all students"
                />
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={row.id}
                className="border-t transition-all duration-200 hover:bg-transparent animate-fade-in-up"
                style={{ 
                  borderColor: 'var(--border)',
                  animationDelay: `${i * 0.02}s`,
                }}
              >
                <td className="px-5 py-4 font-semibold" style={{ color: 'var(--foreground)' }}>
                  {row.studentName}
                </td>
                <td className="px-5 py-4 font-medium" style={{ color: 'var(--muted-foreground)' }}>
                  {row.studentId}
                </td>
                <td className="px-5 py-4">
                  {row.gender ? (
                    <span 
                      className="inline-flex px-3 py-1.5 rounded-md text-xs font-bold transition-all duration-200 hover:scale-105"
                      style={{
                        background: String(row.gender).toLowerCase() === 'female' 
                          ? 'rgba(236, 72, 153, 0.15)' 
                          : String(row.gender).toLowerCase() === 'male' 
                          ? 'rgba(59, 130, 246, 0.15)' 
                          : 'rgba(107, 114, 128, 0.1)',
                        color: String(row.gender).toLowerCase() === 'female' 
                          ? '#ec4899' 
                          : String(row.gender).toLowerCase() === 'male' 
                          ? '#3b82f6' 
                          : 'var(--muted-foreground)',
                      }}
                    >
                      {row.gender}
                    </span>
                  ) : (
                    <span className="text-sm font-medium" style={{ color: 'var(--muted-foreground)' }}>—</span>
                  )}
                </td>
                <td className="px-5 py-4">
                  <span
                    className="inline-flex px-2 py-0.5 rounded text-xs font-medium"
                    style={
                      row.status === 'NOT SCANNED' || row.status === 'not scanned'
                        ? { background: 'var(--muted)', color: 'var(--muted-foreground)' }
                        : row.status === 'Present' || row.status === 'present'
                          ? { background: 'rgba(67, 160, 71, 0.2)', color: 'var(--success)' }
                          : row.status === 'Absent' || row.status === 'absent'
                            ? { background: 'rgba(216, 67, 21, 0.2)', color: 'var(--destructive)' }
                            : row.status === 'Late' || row.status === 'late'
                              ? { background: 'rgba(255, 193, 7, 0.2)', color: 'var(--accent)' }
                              : row.status === 'Cutting' || row.status === 'cutting'
                                ? { background: 'rgba(230, 81, 0, 0.2)', color: 'var(--error)' }
                                : { background: 'var(--muted)', color: 'var(--muted-foreground)' }
                    }
                  >
                    {row.status || '-'}
                  </span>
                </td>
                <td className="px-5 py-4 font-medium" style={{ color: 'var(--muted-foreground)' }}>
                  {row.scanTime}
                </td>
                <td className="px-5 py-4">
                  {isActionDisabled?.(row) ? (
                    <span className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                      —
                    </span>
                  ) : (
                    <>
                      <select
                        value={row.status || ''}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v) onStatusChange(row.id, v);
                        }}
                        disabled={!!updatingId && updatingId === row.id}
                        className="px-2 py-1 rounded border text-sm disabled:opacity-50 input-theme"
                      >
                        <option value="">Change...</option>
                        {statusOptions.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                      {updatingId === row.id && (
                        <span className="ml-2 text-xs" style={{ color: 'var(--muted-foreground)' }}>
                          Updating...
                        </span>
                      )}
                    </>
                  )}
                </td>
                <td className="w-8 px-1 py-4 text-center">
                  <input
                    type="checkbox"
                    checked={selectedRowIds.includes(row.id)}
                    onChange={() => onToggleRowSelection?.(row.id)}
                    disabled={isRowSelectable ? !isRowSelectable(row) : false}
                    className="w-4 h-4 cursor-pointer disabled:cursor-not-allowed"
                    aria-label={`Select ${row.studentName}`}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
