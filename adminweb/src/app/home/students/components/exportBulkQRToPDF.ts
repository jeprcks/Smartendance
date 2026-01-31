import { Student } from '@/app/services/studentService';
import jsPDF from 'jspdf';
import toast from 'react-hot-toast';

/**
 * Exports selected students' QR codes to a single PDF (one card per page).
 * qrMap keys are student._id, values are base64 data URLs of the QR image.
 * Calls onSuccess after the PDF is saved (e.g. to close the modal).
 */
export function exportBulkQRToPDF(
  students: Student[],
  qrMap: Record<string, string>,
  filename?: string,
  onSuccess?: () => void
): void {
  const toExport = students.filter(s => s._id && qrMap[s._id]);
  if (toExport.length === 0) {
    toast.error('No QR codes available to export');
    return;
  }

  try {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    const centerX = pageWidth / 2;

    toExport.forEach((student, index) => {
      if (index > 0) pdf.addPage();

      let y = 25;

      // Title
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Smartendance System', centerX, y, { align: 'center' });
      y += 8;
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(75, 85, 99);
      pdf.text('Student QR Code', centerX, y, { align: 'center' });
      y += 20;

      // Photo (circle-ish: draw as rect with small size for simplicity, or skip if no image)
      const photoSize = 22;
      const photoX = centerX - photoSize / 2;
      if (student.photo && student.photo.startsWith('data:image/')) {
        try {
          const format = student.photo.includes('png') ? 'PNG' : 'JPEG';
          pdf.addImage(student.photo, format as 'JPEG' | 'PNG', photoX, y, photoSize, photoSize);
        } catch {
          pdf.setFillColor(240, 253, 244);
          pdf.rect(photoX, y, photoSize, photoSize, 'F');
          const initials = student.fullName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
          pdf.setTextColor(22, 163, 74);
          pdf.setFontSize(10);
          pdf.text(initials, centerX, y + photoSize / 2 + 2, { align: 'center' });
        }
      } else {
        pdf.setFillColor(240, 253, 244);
        pdf.rect(photoX, y, photoSize, photoSize, 'F');
        const initials = student.fullName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
        pdf.setTextColor(22, 163, 74);
        pdf.setFontSize(10);
        pdf.text(initials, centerX, y + photoSize / 2 + 2, { align: 'center' });
      }
      pdf.setTextColor(0, 0, 0);
      y += photoSize + 10;

      // Name
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text(student.fullName, centerX, y, { align: 'center' });
      y += 7;
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Student ID: ${student.studentId}`, centerX, y, { align: 'center' });
      y += 6;
      pdf.setTextColor(75, 85, 99);
      pdf.text(`${student.gradeLevel} - Section ${student.section}`, centerX, y, { align: 'center' });
      y += 5;
      pdf.text(`${student.shift || ''} Shift`, centerX, y, { align: 'center' });
      y += 14;
      pdf.setTextColor(0, 0, 0);

      // QR code
      const qrData = qrMap[student._id!];
      if (qrData) {
        const qrSize = 45;
        const qrX = centerX - qrSize / 2;
        const format = qrData.includes('png') ? 'PNG' : 'JPEG';
        pdf.addImage(qrData, format as 'JPEG' | 'PNG', qrX, y, qrSize, qrSize);
        y += qrSize + 10;
      }

      // Footer
      pdf.setFontSize(10);
      pdf.setTextColor(75, 85, 99);
      pdf.text('Scan this QR code with the mobile app', centerX, y, { align: 'center' });
    });

    const name = filename || `student_qr_codes_${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(name);
    toast.success(`Successfully downloaded PDF with ${toExport.length} QR code(s).`);
    onSuccess?.();
  } catch (error) {
    console.error('Error exporting bulk QR PDF:', error);
    toast.error('Failed to export PDF');
  }
}
