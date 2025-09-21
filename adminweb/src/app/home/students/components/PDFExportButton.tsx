'use client';

import { Student } from '@/app/services/studentService';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';

interface PDFExportButtonProps {
  students: Student[];
  disabled?: boolean;
}

export default function PDFExportButton({ students, disabled = false }: PDFExportButtonProps) {
  const exportToPDF = () => {
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
      const lineHeight = 7;
      const margin = 20;
      const maxWidth = pageWidth - (margin * 2);

      // Helper function to add text with word wrapping
      const addWrappedText = (text: string, x: number, y: number, maxWidth: number, fontSize: number = 10) => {
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

      // Add title
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Student Records Export', margin, yPosition);
      yPosition += 15;

      // Add export date and summary
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Export Date: ${new Date().toLocaleDateString()}`, margin, yPosition);
      yPosition += 5;
      pdf.text(`Total Students: ${students.length}`, margin, yPosition);
      yPosition += 15;

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

        // Student details in two columns
        const leftColumn = margin;
        const rightColumn = margin + (maxWidth / 2) + 10;
        const columnWidth = (maxWidth / 2) - 10;

        // Left column
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Basic Information:', leftColumn, yPosition);
        yPosition += 5;
        
        pdf.setFont('helvetica', 'normal');
        yPosition = addWrappedText(`Student ID: ${student.studentId}`, leftColumn, yPosition, columnWidth);
        yPosition = addWrappedText(`Email: ${student.email || 'N/A'}`, leftColumn, yPosition, columnWidth);
        yPosition = addWrappedText(`Phone: ${student.phoneNumber || 'N/A'}`, leftColumn, yPosition, columnWidth);
        yPosition = addWrappedText(`Age: ${student.age || 'N/A'}`, leftColumn, yPosition, columnWidth);
        yPosition = addWrappedText(`Birth Date: ${formatDate(student.birthDate)}`, leftColumn, yPosition, columnWidth);
        yPosition = addWrappedText(`Gender: ${student.gender}`, leftColumn, yPosition, columnWidth);
        yPosition = addWrappedText(`Shift: ${student.shift || 'N/A'}`, leftColumn, yPosition, columnWidth);

        // Right column
        const rightYStart = yPosition - (7 * lineHeight); // Reset to same level as left column
        let rightY = rightYStart;
        
        pdf.setFont('helvetica', 'bold');
        pdf.text('Academic Information:', rightColumn, rightY);
        rightY += 5;
        
        pdf.setFont('helvetica', 'normal');
        rightY = addWrappedText(`Grade Level: ${student.gradeLevel}`, rightColumn, rightY, columnWidth);
        rightY = addWrappedText(`Section: ${student.section}`, rightColumn, rightY, columnWidth);
        rightY = addWrappedText(`Enrollment: ${formatDate(student.createdAt)}`, rightColumn, rightY, columnWidth);

        // Use the higher Y position for continuation
        yPosition = Math.max(yPosition, rightY) + 5;

        // Address section
        pdf.setFont('helvetica', 'bold');
        pdf.text('Address:', leftColumn, yPosition);
        yPosition += 5;
        pdf.setFont('helvetica', 'normal');
        yPosition = addWrappedText(formatAddress(student.address), leftColumn, yPosition, maxWidth);

        // Parent/Guardian Information
        pdf.setFont('helvetica', 'bold');
        pdf.text('Parent/Guardian Information:', leftColumn, yPosition);
        yPosition += 5;
        pdf.setFont('helvetica', 'normal');
        yPosition = addWrappedText(`Name: ${student.parentInfo?.name || student.parentName || 'N/A'}`, leftColumn, yPosition, maxWidth);
        yPosition = addWrappedText(`Contact: ${student.parentInfo?.contactNumber || student.parentContact || 'N/A'}`, leftColumn, yPosition, maxWidth);

        // Emergency Contact
        pdf.setFont('helvetica', 'bold');
        pdf.text('Emergency Contact:', leftColumn, yPosition);
        yPosition += 5;
        pdf.setFont('helvetica', 'normal');
        yPosition = addWrappedText(`Name: ${student.emergencyContact?.name || student.emergencyContactName || 'N/A'}`, leftColumn, yPosition, maxWidth);
        yPosition = addWrappedText(`Contact: ${student.emergencyContact?.contactNumber || 'N/A'}`, leftColumn, yPosition, maxWidth);
        yPosition = addWrappedText(`Relationship: ${student.emergencyContact?.relationship || student.relationship || 'N/A'}`, leftColumn, yPosition, maxWidth);

        // Add separator line
        yPosition += 5;
        pdf.setDrawColor(200, 200, 200);
        pdf.line(margin, yPosition, pageWidth - margin, yPosition);
        yPosition += 10;
      });

      // Save the PDF
      const fileName = `students_export_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
      
      toast.success(`Successfully exported ${students.length} students to PDF`);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Failed to export PDF');
    }
  };

  return (
    <button 
      onClick={exportToPDF}
      disabled={disabled || students.length === 0}
      className="inline-flex items-center px-5 py-2.5 bg-red-600 text-sm font-semibold text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:hover:scale-100"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
      </svg>
      Export PDF
    </button>
  );
}
