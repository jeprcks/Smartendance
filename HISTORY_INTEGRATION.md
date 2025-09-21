# Attendance History Integration

This document explains how the attendance history system works in the Smartendance application.

## Overview

The system now automatically creates attendance records when students scan their QR codes using the mobile app. These records are then displayed in the admin web panel's history page.

## Components

### 1. Database Schema (`server/models/historySchema.js`)

The `History` model stores attendance records with the following key fields:
- `studentId`: Reference to the student
- `studentName`: Student's full name
- `subject`: Subject/class name (defaults to 'General')
- `scanTime`: When the QR code was scanned
- `status`: Present, Late, Absent, or Cutting (auto-determined based on scan time and shift)
- `gradeLevel`, `section`, `shift`: Student's class information
- `qrCodeData`: Original QR code data
- `deviceInfo`: Mobile device information
- `location`: GPS coordinates (if available)
- `notes`: Additional notes
- `statusHistory`: Track status changes over time

### 2. API Endpoints (`server/routes/historyRoutes.js`)

- `POST /api/history` - Create new attendance record
- `GET /api/history` - Get all records with filtering
- `GET /api/history/history-page` - Get data optimized for frontend
- `GET /api/history/stats` - Get attendance statistics
- `GET /api/history/export` - Export data as CSV or JSON
- `GET /api/history/:id` - Get single record
- `PUT /api/history/:id` - Update record
- `DELETE /api/history/:id` - Delete record
- `GET /api/history/student/:studentId` - Get student's attendance history

### 3. Mobile App Integration

When a student scans their QR code in the mobile app (`mobile/lib/scanningpage/scanning.dart`):

1. The app calls `fetchStudentInfo()` with the QR data
2. The `StudentService` sends a POST request to `/api/students/scan-qr`
3. The server:
   - Validates the QR code data
   - Finds the student in the database
   - Creates a new attendance record in the History collection
   - Determines if the student is Present, Late, or Absent based on scan time
   - Returns student information to the mobile app

### 4. Admin Web Panel

The history page (`adminweb/src/app/home/history/page.tsx`) displays:

- **Statistics Dashboard**: Shows total records, present, absent, late, and cutting counts
- **Filterable Table**: Search by student name/ID, filter by date, status, etc.
- **Student Details Modal**: Click on any record to see detailed student attendance history
- **Export Functionality**: Download data as CSV or JSON
- **Real-time Updates**: Data is fetched from the API, not mock data

## Example Records

After a student scans their QR code and teachers add subject records, the history might look like:

```
Student: John Doe (STU-001)
├── General - Present (QR Code Scan - 8:00 AM)
├── Mathematics - Late (Teacher Record - 8:15 AM)  
├── English - Present (Teacher Record - 9:30 AM)
└── Science - Absent (Teacher Record - 10:45 AM)
```

This shows:
- **QR Scan**: Student was present overall (General)
- **Mathematics**: Student was late for this specific class
- **English**: Student was present for this class
- **Science**: Student was absent from this class

## How It Works

### Step 1: Student Registration
1. Admin creates a student record through the web panel
2. System generates a QR code containing student information
3. QR code is printed and given to the student

### Step 2: Attendance Scanning
1. Student presents QR code to teacher/attendance taker
2. Mobile app scans the QR code
3. System automatically:
   - Identifies the student
   - Records the scan time
   - Creates record with "General" subject and "Present" status
   - Stores the record in the database

### Step 3: Teacher Updates (Separate Teacher Interface)
1. Teachers will have their own interface to create subject-specific records
2. For students who need specific subject records:
   - Create "Mathematics - Late" record
   - Create "English - Absent" record 
   - Create "Science - Cutting" record
3. Each creates a NEW attendance record for the specific subject
4. Original QR scan record remains unchanged as "General - Present"

### Step 4: History Viewing
1. Admin opens the history page in the web panel
2. System fetches all attendance records from the database
3. Records are displayed with filtering and search capabilities
4. Admin can view individual student attendance history
5. Data can be exported for reporting

## Status Determination Logic

**QR Code Scans**: All QR code scans are automatically marked as:
- **Subject**: "General" 
- **Status**: "Present"

**Teacher Updates**: Teachers can create NEW attendance records for specific subjects:
- Click "Late" button → Creates new "Mathematics - Late" record
- Click "Absent" button → Creates new "English - Absent" record  
- Click "Cutting" button → Creates new "Science - Cutting" record
- Teachers specify the subject name when creating records

This workflow allows for:
1. Quick QR code scanning that always marks students as present (General - Present)
2. Teachers to create additional records for specific subject performance
3. Complete attendance history with both general and subject-specific records
4. No modification of existing records - only creation of new ones

## API Usage Examples

### Get History Page Data
```javascript
const response = await historyService.getHistoryPageData({
  search: 'John',
  status: 'Present',
  startDate: '2025-01-01',
  endDate: '2025-01-31',
  page: 1,
  limit: 50
});
```

### Get Student History
```javascript
const studentHistory = await historyService.getStudentHistory('STU-001', {
  startDate: '2025-01-01',
  endDate: '2025-01-31',
  limit: 10
});
```

### Export Data
```javascript
// Export as CSV
const csvBlob = await historyService.exportData({
  startDate: '2025-01-01',
  endDate: '2025-01-31',
  format: 'csv'
});

// Export as JSON
const jsonData = await historyService.exportData({
  startDate: '2025-01-01', 
  endDate: '2025-01-31',
  format: 'json'
});
```

## Testing the Integration

1. **Start the server**: `cd server && npm start`
2. **Start the admin web panel**: `cd adminweb && npm run dev`
3. **Start the mobile app**: `cd mobile && flutter run`
4. **Create a student** in the web panel
5. **Scan the student's QR code** in the mobile app
6. **Check the history page** to see the attendance record

## Troubleshooting

- **No records appearing**: Check if the server is running and accessible
- **Mobile app can't connect**: Verify the server URL in `fetchstudents.dart`
- **Status not updating**: Check the time thresholds in `historySchema.js`
- **Export not working**: Ensure the API endpoint is accessible

## Future Enhancements

- Real-time notifications when students scan
- GPS location tracking for attendance verification
- Bulk status updates for teachers
- Email/SMS notifications for parents
- Advanced reporting and analytics
- Integration with school management systems
