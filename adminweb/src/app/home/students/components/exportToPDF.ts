import { Student } from '@/app/services/studentService';
import jsPDF from 'jspdf';
import toast from 'react-hot-toast';

export function exportStudentsToPDF(students: Student[], filename?: string) {
  if (students.length === 0) {
    toast.error('No students to export');
    return;
  }

  try {
    // Create new PDF document
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    let yPosition = 20;
    const lineHeight = 8.5;
    const margin = 20;
    const maxWidth = pageWidth - (margin * 2);
    const bodyFontSize = 11;
    const sectionTitleFontSize = 12;

    // Helper function to add text with word wrapping
    const addWrappedText = (text: string, x: number, y: number, maxWidth: number, fontSize: number = bodyFontSize) => {
      pdf.setFontSize(fontSize);
      const lines = pdf.splitTextToSize(text, maxWidth);
      pdf.text(lines, x, y);
      return y + (lines.length * lineHeight);
    };

    // Helper function to format address
    const formatAddress = (address: any) => {
      if (!address) return 'N/A';
      if (typeof address === 'string') return address;
      if (typeof address === 'object') {
        const parts = [address.street, address.city, address.province, address.zipCode].filter(Boolean);
        return parts.length > 0 ? parts.join(', ') : 'N/A';
      }
      return 'N/A';
    };

    // Helper function to format date
    const formatDate = (dateString: string | undefined) => {
      if (!dateString) return 'N/A';
      try {
        return new Date(dateString).toLocaleDateString();
      } catch {
        return dateString;
      }
    };

    const tryAddStudentPhoto = (student: Student, y: number, size: number) => {
      try {
        if (!student.photo || !student.photo.startsWith('data:image/')) return;
        const format = student.photo.includes('png') ? 'PNG' : 'JPEG';
        const x = margin;
        pdf.setDrawColor(200, 200, 200);
        pdf.rect(x, y, size, size);
        pdf.addImage(student.photo, format as 'JPEG' | 'PNG', x, y, size, size);
      } catch (e) {
        console.warn('Unable to embed student photo in PDF', e);
      }
    };

    // Add title
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Student Records Export', margin, yPosition);
    yPosition += 15;

    // Add export date and summary
    pdf.setFontSize(bodyFontSize);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Export Date: ${new Date().toLocaleDateString()}`, margin, yPosition);
    yPosition += 5;
    pdf.text(`Total Students: ${students.length}`, margin, yPosition);
    yPosition += 15;

    // No image in header — photo appears only once per student, centered under name
    // Add students data
    students.forEach((student, index) => {
      // Check if we need a new page
      if (yPosition > pageHeight - 60) {
        pdf.addPage();
        yPosition = 20;
      }

      // Student header
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`Student ${index + 1}: ${student.fullName}`, margin, yPosition);
      yPosition += 10;

      // Photo under student name (left-aligned)
      const studentImgSize = 22;
      tryAddStudentPhoto(student, yPosition, studentImgSize);
      yPosition += studentImgSize + 8;

      // Student details in two columns
      const leftColumn = margin;
      const rightColumn = margin + (maxWidth / 2) + 10;
      const columnWidth = (maxWidth / 2) - 10;

      // Left column
      pdf.setFontSize(sectionTitleFontSize);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Basic Information:', leftColumn, yPosition);
      yPosition += 6;
      
      pdf.setFontSize(bodyFontSize);
      pdf.setFont('helvetica', 'normal');
      yPosition = addWrappedText(`Student ID: ${student.studentId}`, leftColumn, yPosition, columnWidth);
      yPosition = addWrappedText(`Phone: ${student.phoneNumber || 'N/A'}`, leftColumn, yPosition, columnWidth);
      yPosition = addWrappedText(`Age: ${student.age || 'N/A'}`, leftColumn, yPosition, columnWidth);
      yPosition = addWrappedText(`Birth Date: ${formatDate(student.birthDate)}`, leftColumn, yPosition, columnWidth);
      yPosition = addWrappedText(`Gender: ${student.gender}`, leftColumn, yPosition, columnWidth);
      yPosition = addWrappedText(`Shift: ${student.shift || 'N/A'}`, leftColumn, yPosition, columnWidth);

      // Right column
      const rightYStart = yPosition - (6 * lineHeight);
      let rightY = rightYStart;
      
      pdf.setFontSize(sectionTitleFontSize);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Academic Information:', rightColumn, rightY);
      rightY += 6;
      
      pdf.setFontSize(bodyFontSize);
      pdf.setFont('helvetica', 'normal');
      rightY = addWrappedText(`Grade Level: ${student.gradeLevel}`, rightColumn, rightY, columnWidth);
      rightY = addWrappedText(`Section: ${student.section}`, rightColumn, rightY, columnWidth);
      rightY = addWrappedText(`Enrollment: ${formatDate(student.createdAt)}`, rightColumn, rightY, columnWidth);

      // Use the higher Y position for continuation
      yPosition = Math.max(yPosition, rightY) + 6;

      // Address section
      pdf.setFontSize(sectionTitleFontSize);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Address:', leftColumn, yPosition);
      yPosition += 6;
      pdf.setFontSize(bodyFontSize);
      pdf.setFont('helvetica', 'normal');
      yPosition = addWrappedText(formatAddress(student.address), leftColumn, yPosition, maxWidth);

      // Parent/Guardian Information
      pdf.setFontSize(sectionTitleFontSize);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Parent/Guardian Information:', leftColumn, yPosition);
      yPosition += 6;
      pdf.setFontSize(bodyFontSize);
      pdf.setFont('helvetica', 'normal');
      yPosition = addWrappedText(`Name: ${student.parentInfo?.name || student.parentName || 'N/A'}`, leftColumn, yPosition, maxWidth);
      yPosition = addWrappedText(`Contact: ${student.parentInfo?.contactNumber || student.parentContact || 'N/A'}`, leftColumn, yPosition, maxWidth);

      // Emergency Contact
      pdf.setFontSize(sectionTitleFontSize);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Emergency Contact:', leftColumn, yPosition);
      yPosition += 6;
      pdf.setFontSize(bodyFontSize);
      pdf.setFont('helvetica', 'normal');
      yPosition = addWrappedText(`Name: ${student.emergencyContact?.name || student.emergencyContactName || 'N/A'}`, leftColumn, yPosition, maxWidth);
      yPosition = addWrappedText(`Contact: ${student.emergencyContact?.contactNumber || 'N/A'}`, leftColumn, yPosition, maxWidth);
      yPosition = addWrappedText(`Relationship: ${student.emergencyContact?.relationship || student.relationship || 'N/A'}`, leftColumn, yPosition, maxWidth);

      // Add separator line
      yPosition += 6;
      pdf.setDrawColor(200, 200, 200);
      pdf.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 10;
    });

    // Save the PDF
    const fileName = filename || `students_export_${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(fileName);
    
    toast.success(`Successfully exported ${students.length} student(s) to PDF`);
  } catch (error) {
    console.error('Error exporting PDF:', error);
    toast.error('Failed to export PDF');
  }
}
