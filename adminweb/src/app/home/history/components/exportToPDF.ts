import type { AttendanceRecord } from '@/app/services/historyService';
import jsPDF from 'jspdf';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export function exportAttendanceToPDF(
  records: AttendanceRecord[],
  filename?: string
) {
  if (records.length === 0) {
    toast.error('No attendance records to export');
    return;
  }

  try {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    let yPosition = 20;
    const lineHeight = 8;
    const margin = 20;
    const bodyFontSize = 10;
    const headerFontSize = 12;

    // Title
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Attendance History Export', margin, yPosition);
    yPosition += 12;

    pdf.setFontSize(bodyFontSize);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Export Date: ${format(new Date(), 'MMM dd, yyyy')}`, margin, yPosition);
    yPosition += 6;
    pdf.text(`Total Records: ${records.length}`, margin, yPosition);
    yPosition += 14;

    // Table header
    const colWidths = [22, 45, 40, 28, 18, 24];
    const headers = ['Student ID', 'Name', 'Subject', 'Date', 'Time', 'Status'];
    const startX = margin;

    pdf.setFontSize(headerFontSize);
    pdf.setFont('helvetica', 'bold');
    let x = startX;
    headers.forEach((h, i) => {
      pdf.text(h, x, yPosition);
      x += colWidths[i];
    });
    yPosition += lineHeight + 2;

    pdf.setFontSize(bodyFontSize);
    pdf.setFont('helvetica', 'normal');

    records.forEach((record) => {
      if (yPosition > pageHeight - 25) {
        pdf.addPage();
        yPosition = 20;
        pdf.setFontSize(headerFontSize);
        pdf.setFont('helvetica', 'bold');
        x = startX;
        headers.forEach((h, i) => {
          pdf.text(h, x, yPosition);
          x += colWidths[i];
        });
        yPosition += lineHeight + 2;
        pdf.setFontSize(bodyFontSize);
        pdf.setFont('helvetica', 'normal');
      }

      const dateStr = format(new Date(record.scanTime), 'MM/dd/yyyy');
      const timeStr = format(new Date(record.scanTime), 'HH:mm');
      const row = [
        String(record.studentId).slice(0, 10),
        String(record.studentName).slice(0, 18),
        String(record.subject).slice(0, 16),
        dateStr,
        timeStr,
        record.status,
      ];

      x = startX;
      row.forEach((cell, i) => {
        pdf.text(cell, x, yPosition);
        x += colWidths[i];
      });
      yPosition += lineHeight;
    });

    const name =
      filename ||
      `attendance_history_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
    pdf.save(name);
    toast.success(`Exported ${records.length} record(s) to PDF`);
  } catch (err) {
    console.error('Error exporting attendance to PDF:', err);
    toast.error('Failed to export PDF');
  }
}
