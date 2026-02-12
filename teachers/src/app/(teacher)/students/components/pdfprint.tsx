'use client';

interface Student {
  studentName?: string;
  name?: string;
  fullName?: string;
  studentId?: string;
  id?: string;
  gender?: string;
}

interface Schedule {
  subject?: string;
  gradeLevel?: string;
  section?: string;
  shift?: string;
  timeSlot?: string;
}

export function printStudentsList(
  students: Student[],
  schedule: Schedule | null,
  searchQuery: string = ''
) {
  // Create a new window for printing
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to print the student list');
    return;
  }

  const scheduleLabel = schedule
    ? `${String(schedule.subject ?? 'N/A')} · ${String(schedule.gradeLevel ?? '')}-${String(schedule.section ?? '')} · ${String(schedule.shift ?? '')}`
    : 'All Classes';

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const filteredStudents = searchQuery.trim()
    ? students.filter((st) => {
        const name = String(st.studentName ?? st.name ?? st.fullName ?? '').toLowerCase();
        const id = String(st.studentId ?? st.id ?? '').toLowerCase();
        const q = searchQuery.trim().toLowerCase();
        return name.includes(q) || id.includes(q);
      })
    : students;

  // Generate HTML content
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Student List - ${scheduleLabel}</title>
        <style>
          @media print {
            @page {
              margin: 1cm;
            }
          }
          body {
            font-family: Arial, sans-serif;
            margin: 20px;
            color: #333;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 3px solid #2e7d32;
            padding-bottom: 20px;
          }
          .header h1 {
            color: #2e7d32;
            margin: 0 0 10px 0;
            font-size: 24px;
          }
          .header p {
            margin: 5px 0;
            color: #666;
            font-size: 14px;
          }
          .info-section {
            margin-bottom: 20px;
            padding: 15px;
            background: #f5f5f5;
            border-radius: 8px;
          }
          .info-section p {
            margin: 5px 0;
            font-size: 14px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
          }
          th {
            background: linear-gradient(135deg, #2e7d32 0%, #66bb6a 100%);
            color: white;
            padding: 12px;
            text-align: left;
            font-weight: bold;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          td {
            padding: 10px 12px;
            border-bottom: 1px solid #e0e0e0;
            font-size: 14px;
          }
          tr:hover {
            background-color: #f9f9f9;
          }
          .gender-female {
            color: #ec4899;
            font-weight: bold;
          }
          .gender-male {
            color: #3b82f6;
            font-weight: bold;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 2px solid #e0e0e0;
            text-align: center;
            color: #666;
            font-size: 12px;
          }
          .no-data {
            text-align: center;
            padding: 40px;
            color: #999;
            font-style: italic;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Student List</h1>
          <p><strong>Class:</strong> ${scheduleLabel}</p>
          <p><strong>Date:</strong> ${today}</p>
          ${searchQuery.trim() ? `<p><strong>Search Filter:</strong> "${searchQuery}"</p>` : ''}
        </div>

        <div class="info-section">
          <p><strong>Total Students:</strong> ${filteredStudents.length}</p>
          <p><strong>Printed:</strong> ${new Date().toLocaleString()}</p>
        </div>

        ${filteredStudents.length === 0 ? `
          <div class="no-data">
            <p>No students found</p>
          </div>
        ` : `
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Gender</th>
                <th>Student ID</th>
              </tr>
            </thead>
            <tbody>
              ${filteredStudents.map((st, index) => {
                const name = String(st.studentName ?? st.name ?? st.fullName ?? 'Unknown');
                const id = String(st.studentId ?? st.id ?? '');
                const gender = String(st.gender ?? '-');
                const genderClass = gender.toLowerCase() === 'female' 
                  ? 'gender-female' 
                  : gender.toLowerCase() === 'male' 
                  ? 'gender-male' 
                  : '';
                
                return `
                  <tr>
                    <td>${index + 1}</td>
                    <td>${name}</td>
                    <td class="${genderClass}">${gender}</td>
                    <td>${id}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        `}

        <div class="footer">
          <p>Smartendance System - Teacher Portal</p>
          <p>This document was generated on ${new Date().toLocaleString()}</p>
        </div>

        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() {
              window.close();
            };
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
}

interface AttendanceRecord {
  scheduleDay?: string;
  day?: string;
  scheduleTimeSlot?: string;
  timeSlot?: string;
  checkInTime?: string;
  checkOutTime?: string;
  scanTime?: string;
  date?: string;
  attendanceType?: string;
  statusHistory?: Array<{ changedAt?: string; changedBy?: string }>;
  subject?: string;
  gradeLevel?: string;
  section?: string;
  scheduleTeacher?: string;
  teacher?: string;
  status?: string;
}

interface StudentDetail {
  studentName?: string;
  name?: string;
  fullName?: string;
  studentId?: string;
  id?: string;
  gender?: string;
  gradeLevel?: string;
  section?: string;
}

export function printStudentAttendanceHistory(
  student: StudentDetail,
  records: AttendanceRecord[],
  subjectFilter: string = ''
) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to print the attendance history');
    return;
  }

  const studentName = String(student.studentName ?? student.name ?? student.fullName ?? 'Unknown');
  const studentId = String(student.studentId ?? student.id ?? '');
  const gender = String(student.gender ?? '-');
  const classInfo = `${String(student.gradeLevel ?? '—')}-${String(student.section ?? '—')}`;

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const formatDate = (val: unknown) => {
    if (!val) return '—';
    const d = new Date(String(val));
    return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (val: unknown) => {
    if (!val) return '—';
    const d = new Date(String(val));
    return Number.isNaN(d.getTime()) ? '—' : d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const isInOrOutGeneral = (r: AttendanceRecord) => {
    const type = String(r.attendanceType ?? '').toLowerCase();
    const subject = String(r.subject ?? '').toLowerCase();
    return (type === 'in' || type === 'out') && subject === 'general';
  };

  const getTimeForRecord = (r: AttendanceRecord) => {
    const statusHistory = r.statusHistory as Array<{ changedAt?: string }> | undefined;
    if (statusHistory && statusHistory.length > 0) {
      const lastEntry = statusHistory[statusHistory.length - 1];
      if (lastEntry?.changedAt) return lastEntry.changedAt;
    }
    if (String(r.attendanceType ?? '').toLowerCase() === 'in' && r.checkInTime) return r.checkInTime;
    if (String(r.attendanceType ?? '').toLowerCase() === 'out' && r.checkOutTime) return r.checkOutTime;
    return r.scanTime ?? r.checkInTime;
  };

  const getTypeLabel = (r: AttendanceRecord) => {
    const statusHistory = r.statusHistory as Array<{ changedBy?: string }> | undefined;
    if (statusHistory && statusHistory.length > 0) {
      const lastEntry = statusHistory[statusHistory.length - 1];
      const changedBy = lastEntry?.changedBy;
      return `Teacher (${changedBy ?? 'Unknown'})`;
    }
    return String(r.attendanceType ?? 'N/A');
  };

  const getStatusClass = (status: string) => {
    const s = String(status).toLowerCase();
    if (s === 'present') return 'status-present';
    if (s === 'late') return 'status-late';
    if (s === 'absent') return 'status-absent';
    if (s === 'out') return 'status-out';
    if (s === 'cutting') return 'status-cutting';
    return '';
  };

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Attendance History - ${studentName}</title>
        <style>
          @media print {
            @page {
              margin: 1cm;
            }
          }
          body {
            font-family: Arial, sans-serif;
            margin: 20px;
            color: #333;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 3px solid #2e7d32;
            padding-bottom: 20px;
          }
          .header h1 {
            color: #2e7d32;
            margin: 0 0 10px 0;
            font-size: 24px;
          }
          .header p {
            margin: 5px 0;
            color: #666;
            font-size: 14px;
          }
          .student-info {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 15px;
            margin-bottom: 25px;
            padding: 15px;
            background: #f5f5f5;
            border-radius: 8px;
          }
          .info-card {
            padding: 10px;
            background: white;
            border-radius: 6px;
            border-left: 4px solid #2e7d32;
          }
          .info-card label {
            display: block;
            font-size: 11px;
            font-weight: bold;
            text-transform: uppercase;
            color: #666;
            margin-bottom: 5px;
          }
          .info-card value {
            display: block;
            font-size: 16px;
            font-weight: bold;
            color: #2e7d32;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
            font-size: 12px;
          }
          th {
            background: linear-gradient(135deg, #2e7d32 0%, #66bb6a 100%);
            color: white;
            padding: 10px 8px;
            text-align: left;
            font-weight: bold;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          td {
            padding: 8px;
            border-bottom: 1px solid #e0e0e0;
            font-size: 12px;
          }
          tr:hover {
            background-color: #f9f9f9;
          }
          .status-present {
            color: #43a047;
            font-weight: bold;
          }
          .status-absent {
            color: #d84315;
            font-weight: bold;
          }
          .status-late {
            color: #ffc107;
            font-weight: bold;
          }
          .status-out {
            color: #9c27b0;
            font-weight: bold;
          }
          .status-cutting {
            color: #e65100;
            font-weight: bold;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 2px solid #e0e0e0;
            text-align: center;
            color: #666;
            font-size: 12px;
          }
          .no-data {
            text-align: center;
            padding: 40px;
            color: #999;
            font-style: italic;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Attendance History</h1>
          <p><strong>Student:</strong> ${studentName}</p>
          <p><strong>Date:</strong> ${today}</p>
          ${subjectFilter ? `<p><strong>Subject Filter:</strong> ${subjectFilter}</p>` : ''}
        </div>

        <div class="student-info">
          <div class="info-card">
            <label>Name</label>
            <value>${studentName}</value>
          </div>
          <div class="info-card">
            <label>Student ID</label>
            <value>${studentId || '—'}</value>
          </div>
          <div class="info-card">
            <label>Gender</label>
            <value>${gender}</value>
          </div>
          <div class="info-card">
            <label>Class</label>
            <value>${classInfo}</value>
          </div>
        </div>

        ${records.length === 0 ? `
          <div class="no-data">
            <p>No attendance records found</p>
          </div>
        ` : `
          <table>
            <thead>
              <tr>
                <th>Schedule</th>
                <th>Date</th>
                <th>Type</th>
                <th>Time</th>
                <th>Subject</th>
                <th>Teacher</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${records.map((r) => {
                const schedule = isInOrOutGeneral(r) 
                  ? 'N/A' 
                  : `${String(r.scheduleDay ?? r.day ?? 'N/A')} ${String(r.scheduleTimeSlot ?? r.timeSlot ?? '')}`;
                const date = formatDate(r.checkInTime ?? r.scanTime ?? r.date);
                const time = formatTime(getTimeForRecord(r));
                const type = getTypeLabel(r);
                const subject = String(r.subject ?? '—');
                const teacher = String(r.scheduleTeacher ?? r.teacher ?? 'N/A');
                const status = String(r.status ?? '—');
                const statusClass = getStatusClass(status);
                
                return `
                  <tr>
                    <td>${schedule}</td>
                    <td>${date}</td>
                    <td>${type}</td>
                    <td>${time}</td>
                    <td>${subject}</td>
                    <td>${teacher}</td>
                    <td class="${statusClass}">${status}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        `}

        <div class="footer">
          <p>Smartendance System - Teacher Portal</p>
          <p>This document was generated on ${new Date().toLocaleString()}</p>
        </div>

        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() {
              window.close();
            };
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
}
