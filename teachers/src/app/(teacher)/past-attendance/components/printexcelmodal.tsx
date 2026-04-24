'use client';

import { useState } from 'react';
import * as XLSX from 'xlsx';

interface StudentAttendance {
  studentId: string;
  studentName: string;
  subject: string;
  gradeLevel: string;
  section: string;
  attendance: Record<string, string>;
}

interface PrintPDFModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: StudentAttendance[];
  dateRangeLabel: string;
  dateRangeFilter: number;
}

const PrintPDFModal: React.FC<PrintPDFModalProps> = ({
  isOpen,
  onClose,
  students,
  dateRangeLabel,
  dateRangeFilter,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);

  // Helper function to generate all dates in the selected range
  const getAllDatesInRange = (): string[] => {
    const dates: string[] = [];
    const today = new Date();
    const days = dateRangeFilter === 7 ? 7 : dateRangeFilter === 30 ? 30 : 365; // Default to 365 for 'All History'
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      dates.push(dateStr);
    }
    return dates;
  };

  const generateExcel = async () => {
    setIsGenerating(true);
    try {
      if (students.length === 0) {
        throw new Error('No students to export');
      }

      // Get all dates in the selected range
      const sortedDates = getAllDatesInRange();

      // Helper function to get day name
      const getDayName = (dateStr: string): string => {
        const date = new Date(dateStr + 'T00:00:00');
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return days[date.getDay()].substring(0, 3);
      };

      // Create data for Excel
      const excelData: any[] = [];

      // Add header row with dates
      const dateHeaders: any = {
        'ID': 'ID',
        'Student Name': 'Student Name',
        'Subject': 'Subject',
      };

      // Add date columns with day names and date
      sortedDates.forEach(date => {
        const day = getDayName(date);
        const dayOfMonth = date.split('-')[2];
        dateHeaders[`${day} ${dayOfMonth}`] = `${day} ${dayOfMonth}`;
      });

      // Add student rows with attendance status for each date
      students.forEach(student => {
        const row: any = {
          'ID': student.studentId,
          'Student Name': student.studentName,
          'Subject': student.subject,
        };

        // Add attendance status for each date
        sortedDates.forEach(date => {
          const day = getDayName(date);
          const dayOfMonth = date.split('-')[2];
          row[`${day} ${dayOfMonth}`] = student.attendance[date] || 'Absent';
        });

        excelData.push(row);
      });

      // Create worksheet
      const worksheet = XLSX.utils.json_to_sheet(excelData);

      // Set column widths
      const allHeaders = Object.keys(dateHeaders);
      const colWidths: any[] = allHeaders.map(header => ({
        wch: Math.max(header.length, 12),
      }));
      worksheet['!cols'] = colWidths;

      // Color code the cells based on attendance status
      const statusColors: Record<string, string> = {
        'Present': 'C6EFCE', // Light green
        'Absent': 'FFC7CE', // Light red
        'Late': 'FFEB9C', // Light yellow
        'Cutting': 'E2EFDA', // Light purple
      };

      // Apply cell styling to attendance status cells
      for (let rowIdx = 1; rowIdx < excelData.length; rowIdx++) {
        for (let colIdx = 3; colIdx < allHeaders.length + 3; colIdx++) {
          const cellRef = XLSX.utils.encode_cell({ r: rowIdx, c: colIdx });
          const cellValue = excelData[rowIdx][allHeaders[colIdx - 3]];
          
          if (!worksheet[cellRef]) {
            worksheet[cellRef] = { t: 's', v: cellValue };
          }
          
          // Add background color based on status
          if (statusColors[cellValue]) {
            worksheet[cellRef].s = {
              fill: { fgColor: { rgb: statusColors[cellValue] } },
              font: { bold: true, color: { rgb: '000000' } },
              alignment: { horizontal: 'center', vertical: 'center' },
            };
          }
        }
      }

      // Create workbook
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance');

      // Save the file
      const dateStr = new Date().toISOString().split('T')[0];
      const fileName = `attendance_${dateRangeLabel.replace(/\s+/g, '_')}_${dateStr}.xlsx`;
      XLSX.writeFile(workbook, fileName);

      // Show success message
      alert('Excel file downloaded successfully!');

      // Close modal
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (error) {
      console.error('Error generating Excel:', error);
      alert(
        `Failed to generate Excel: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="rounded-xl w-full max-w-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        style={{ backgroundColor: 'var(--background)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>
            Export Attendance to Excel
          </h2>
          <button
            onClick={onClose}
            className="text-2xl font-semibold"
            style={{ color: 'var(--muted-foreground)' }}
          >
            ×
          </button>
        </div>

        {/* Excel Preview */}
        <div
          id="excel-content"
          className="mb-6 p-6 rounded-lg border"
          style={{ borderColor: 'var(--border)', backgroundColor: 'var(--secondary)' }}
        >
          <div className="text-center mb-6">
            <h3 className="text-2xl font-bold mb-2" style={{ color: 'var(--foreground)' }}>Attendance Export Preview</h3>
            <p className="text-base mb-1" style={{ color: 'var(--muted-foreground)' }}>Date Range: <span className="font-semibold" style={{ color: 'var(--foreground)' }}>{dateRangeLabel}</span></p>
          </div>

          {students.length === 0 ? (
            <div className="text-center py-8">
              <p style={{ color: 'var(--muted-foreground)' }}>No students to display</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr style={{ backgroundColor: 'var(--background)' }}>
                    <th className="border px-3 py-2 text-left font-bold" style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}>
                      ID
                    </th>
                    <th className="border px-3 py-2 text-left font-bold" style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}>
                      Student Name
                    </th>
                    <th className="border px-3 py-2 text-left font-bold" style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}>
                      Subject
                    </th>
                  </tr>
                </thead>
              </table>
              <p className="text-xs mt-2" style={{ color: 'var(--muted-foreground)' }}>+ All date columns with attendance status</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={generateExcel}
            disabled={isGenerating}
            className="flex-1 px-4 py-3 rounded-lg font-semibold transition-all hover:shadow-lg"
            style={{
              backgroundColor: 'var(--primary)',
              color: '#ffffff',
              opacity: isGenerating ? 0.7 : 1,
              cursor: isGenerating ? 'not-allowed' : 'pointer',
            }}
          >
            {isGenerating ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Generating Excel...</span>
              </div>
            ) : (
              <span>📊 Download Excel</span>
            )}
          </button>
          <button
            onClick={onClose}
            disabled={isGenerating}
            className="flex-1 px-4 py-3 rounded-lg font-semibold transition-colors hover:opacity-80"
            style={{
              backgroundColor: 'var(--secondary)',
              color: 'var(--foreground)',
              cursor: isGenerating ? 'not-allowed' : 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrintPDFModal;
