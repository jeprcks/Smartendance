'use client';

interface WeeklyBreakdownRow {
  date: string;
  dateLabel: string;
  gradeLevel: string;
  section: string;
  subject: string;
  present: number;
  absent: number;
  late: number;
  cutting: number;
  total: number;
}

interface ClassPerformanceRow {
  gradeLevel: unknown;
  section: unknown;
  subject: unknown;
  present: number;
  absent: number;
  late: number;
  cutting: number;
  total: number;
}

export function printWeeklyBreakdown(
  rows: WeeklyBreakdownRow[],
  periodLabel: string
) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to print the report');
    return;
  }

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Weekly Class Performance Breakdown</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            padding: 40px;
            background: white;
            color: #1a1a1a;
            line-height: 1.6;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 3px solid #2e7d32;
          }
          .header h1 {
            color: #2e7d32;
            font-size: 28px;
            margin-bottom: 8px;
            font-weight: 700;
          }
          .header p {
            color: #666;
            font-size: 14px;
          }
          .meta {
            text-align: center;
            margin-bottom: 25px;
            color: #666;
            font-size: 13px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          }
          thead {
            background: linear-gradient(135deg, #2e7d32 0%, #4caf50 100%);
            color: white;
          }
          th {
            padding: 12px 16px;
            text-align: left;
            font-weight: 700;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border-bottom: 2px solid #1b5e20;
          }
          th.text-right {
            text-align: right;
          }
          tbody tr {
            border-bottom: 1px solid #e0e0e0;
            transition: background-color 0.2s;
          }
          tbody tr:hover {
            background-color: #f5f5f5;
          }
          tbody tr:last-child {
            border-bottom: none;
          }
          td {
            padding: 12px 16px;
            font-size: 14px;
          }
          td.text-right {
            text-align: right;
            font-weight: 600;
          }
          .class-name {
            font-weight: 700;
            color: #2e7d32;
          }
          .subject {
            color: #666;
            font-size: 13px;
            margin-left: 8px;
          }
          .present { color: #2e7d32; }
          .absent { color: #d84315; }
          .late { color: #f57c00; }
          .cutting { color: #e65100; }
          .total { color: #1b5e20; font-weight: 700; }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 2px solid #e0e0e0;
            text-align: center;
            color: #666;
            font-size: 12px;
          }
          @media print {
            body {
              padding: 20px;
            }
            .header {
              page-break-after: avoid;
            }
            table {
              page-break-inside: auto;
            }
            tr {
              page-break-inside: avoid;
              page-break-after: auto;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Weekly Class Performance Breakdown</h1>
          <p>Monday – Saturday</p>
        </div>
        <div class="meta">
          <strong>Period:</strong> ${periodLabel}<br>
          <strong>Generated:</strong> ${today}
        </div>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Class</th>
              <th class="text-right">Present</th>
              <th class="text-right">Absent</th>
              <th class="text-right">Late</th>
              <th class="text-right">Cutting</th>
              <th class="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${rows.length === 0 
              ? '<tr><td colspan="7" style="text-align: center; padding: 40px; color: #999;">No data for this period</td></tr>'
              : rows.map(row => `
                <tr>
                  <td>${row.dateLabel}</td>
                  <td>
                    <span class="class-name">${row.gradeLevel}-${row.section}</span>
                    <span class="subject">(${row.subject})</span>
                  </td>
                  <td class="text-right present">${row.present}</td>
                  <td class="text-right absent">${row.absent}</td>
                  <td class="text-right late">${row.late}</td>
                  <td class="text-right cutting">${row.cutting}</td>
                  <td class="text-right total">${row.total}</td>
                </tr>
              `).join('')
            }
          </tbody>
        </table>
        <div class="footer">
          Smartendance Teacher Portal · Generated on ${today}
        </div>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();

  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print();
      printWindow.onafterprint = () => {
        printWindow.close();
      };
    }, 250);
  };
}

export function printClassPerformance(
  rows: ClassPerformanceRow[],
  title: string,
  periodLabel: string
) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to print the report');
    return;
  }

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            padding: 40px;
            background: white;
            color: #1a1a1a;
            line-height: 1.6;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 3px solid #2e7d32;
          }
          .header h1 {
            color: #2e7d32;
            font-size: 28px;
            margin-bottom: 8px;
            font-weight: 700;
          }
          .header p {
            color: #666;
            font-size: 14px;
          }
          .meta {
            text-align: center;
            margin-bottom: 25px;
            color: #666;
            font-size: 13px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          }
          thead {
            background: linear-gradient(135deg, #2e7d32 0%, #4caf50 100%);
            color: white;
          }
          th {
            padding: 12px 16px;
            text-align: left;
            font-weight: 700;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border-bottom: 2px solid #1b5e20;
          }
          th.text-right {
            text-align: right;
          }
          tbody tr {
            border-bottom: 1px solid #e0e0e0;
            transition: background-color 0.2s;
          }
          tbody tr:hover {
            background-color: #f5f5f5;
          }
          tbody tr:last-child {
            border-bottom: none;
          }
          td {
            padding: 12px 16px;
            font-size: 14px;
          }
          td.text-right {
            text-align: right;
            font-weight: 600;
          }
          .class-name {
            font-weight: 700;
            color: #2e7d32;
          }
          .subject {
            color: #666;
            font-size: 13px;
            margin-left: 8px;
          }
          .present { color: #2e7d32; }
          .absent { color: #d84315; }
          .late { color: #f57c00; }
          .cutting { color: #e65100; }
          .total { color: #1b5e20; font-weight: 700; }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 2px solid #e0e0e0;
            text-align: center;
            color: #666;
            font-size: 12px;
          }
          @media print {
            body {
              padding: 20px;
            }
            .header {
              page-break-after: avoid;
            }
            table {
              page-break-inside: auto;
            }
            tr {
              page-break-inside: avoid;
              page-break-after: auto;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${title}</h1>
        </div>
        <div class="meta">
          <strong>Period:</strong> ${periodLabel}<br>
          <strong>Generated:</strong> ${today}
        </div>
        <table>
          <thead>
            <tr>
              <th>Class</th>
              <th class="text-right">Present</th>
              <th class="text-right">Absent</th>
              <th class="text-right">Late</th>
              <th class="text-right">Cutting</th>
              <th class="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${rows.length === 0 
              ? '<tr><td colspan="6" style="text-align: center; padding: 40px; color: #999;">No data for this period</td></tr>'
              : rows.map(row => `
                <tr>
                  <td>
                    <span class="class-name">${String(row.gradeLevel)}-${String(row.section)}</span>
                    <span class="subject">(${String(row.subject)})</span>
                  </td>
                  <td class="text-right present">${row.present}</td>
                  <td class="text-right absent">${row.absent}</td>
                  <td class="text-right late">${row.late}</td>
                  <td class="text-right cutting">${row.cutting}</td>
                  <td class="text-right total">${row.total}</td>
                </tr>
              `).join('')
            }
          </tbody>
        </table>
        <div class="footer">
          Smartendance Teacher Portal · Generated on ${today}
        </div>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();

  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print();
      printWindow.onafterprint = () => {
        printWindow.close();
      };
    }, 250);
  };
}
