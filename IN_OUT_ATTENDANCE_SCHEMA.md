# In/Out Attendance System Schema Documentation

## Overview

The attendance system has been updated to support a two-tablet configuration:
- **Tablet 1 (In)**: For student check-in when arriving
- **Tablet 2 (Out)**: For student check-out when leaving

## Schema Changes

### New Fields in History Schema

#### 1. **attendanceType** (String, Required)
- **Type**: String
- **Enum**: `['In', 'Out']`
- **Default**: `'In'`
- **Description**: Specifies whether the record is for check-in or check-out
  - `'In'`: Student scanned at the login/entry tablet
  - `'Out'`: Student scanned at the logout/exit tablet

#### 2. **checkInTime** (Date)
- **Required if**: `attendanceType === 'In'`
- **Description**: Timestamp when the student checked in (scanned the In tablet)
- **Auto-populated**: When creating an 'In' record

#### 3. **checkOutTime** (Date)
- **Required if**: `attendanceType === 'Out'`
- **Description**: Timestamp when the student checked out (scanned the Out tablet)
- **Auto-populated**: When creating an 'Out' record

#### 4. **durationMinutes** (Number)
- **Type**: Number
- **Default**: 0
- **Description**: Duration in minutes between check-in and check-out
- **Calculated automatically**: When an 'Out' record is created and linked to its 'In' pair

#### 5. **linkedRecordId** (String/Reference)
- **Type**: ObjectId (Reference to History)
- **Description**: Links the 'In' record to its corresponding 'Out' record and vice versa
- **Populated automatically**: When an 'Out' record finds its matching 'In' record

### Backward Compatibility

- **scanTime** field: Retained for backward compatibility
  - For 'In' records: `scanTime = checkInTime`
  - For 'Out' records: `scanTime = checkOutTime`

### Indexes Added

The following indexes have been added for optimal query performance:

```javascript
historySchema.index({ attendanceType: 1 });
historySchema.index({ checkInTime: 1 });
historySchema.index({ checkOutTime: 1 });
historySchema.index({ studentId: 1, attendanceType: 1, scanTime: -1 });
historySchema.index({ linkedRecordId: 1 });
```

## API Endpoints

### 1. Create Attendance Record (In/Out)

**Endpoint**: `POST /api/history`

**Request Body**:
```json
{
  "studentId": "STU001",
  "studentName": "John Doe",
  "subject": "General",
  "status": "Present",
  "attendanceType": "In",  // "In" or "Out"
  "qrCodeData": { ... },
  "location": { ... },
  "deviceInfo": { ... },
  "notes": "Optional notes"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Check-in record created successfully",
  "record": {
    "_id": "...",
    "studentId": "STU001",
    "studentName": "John Doe",
    "attendanceType": "In",
    "checkInTime": "2026-01-22T10:30:00Z",
    "scanTime": "2026-01-22T10:30:00Z",
    "durationMinutes": 0,
    "status": "Present",
    ...
  }
}
```

### 2. Get All Attendance Records

**Endpoint**: `GET /api/history`

**Query Parameters**:
- `page`: Page number (default: 1)
- `limit`: Records per page (default: 50)
- `studentId`: Filter by student ID
- `subject`: Filter by subject
- `status`: Filter by attendance status
- `startDate`: Start date for range filter
- `endDate`: End date for range filter
- `gradeLevel`: Filter by grade level
- `section`: Filter by section
- `shift`: Filter by shift
- `search`: Search by name, ID, or subject
- `attendanceType`: Filter by 'In' or 'Out' (default: 'In', use 'All' to see both)

### 3. Get Daily Attendance Summary (NEW)

**Endpoint**: `GET /api/history/daily-summary`

**Query Parameters**:
- `date` (required): Date in YYYY-MM-DD format
- `gradeLevel`: Optional filter by grade level
- `section`: Optional filter by section
- `shift`: Optional filter by shift

**Response**:
```json
{
  "success": true,
  "date": "2026-01-22",
  "summary": [
    {
      "studentId": "STU001",
      "studentName": "John Doe",
      "gradeLevel": "Grade 1",
      "section": "A",
      "shift": "Morning",
      "subject": "General",
      "checkInTime": "2026-01-22T10:30:00Z",
      "checkOutTime": "2026-01-22T15:45:00Z",
      "durationMinutes": 315,
      "status": "Present",
      "hasCheckedOut": true
    },
    ...
  ],
  "statistics": {
    "totalPresent": 45,
    "totalAbsent": 5,
    "totalLate": 3,
    "totalCutting": 2,
    "checkedOut": 42,
    "notCheckedOut": 8,
    "total": 50
  }
}
```

### 4. Get Student Attendance History

**Endpoint**: `GET /api/history/student/:studentId`

**Query Parameters**:
- `startDate`: Start date for range filter
- `endDate`: End date for range filter
- `limit`: Max records to return (default: 50)

**Response**: Returns 'In' records with linked 'Out' record details

```json
{
  "success": true,
  "student": {
    "id": "STU001",
    "name": "John Doe",
    "gradeLevel": "Grade 1",
    "section": "A",
    "shift": "Morning"
  },
  "stats": {
    "present": 18,
    "absent": 1,
    "late": 1,
    "cutting": 0
  },
  "records": [
    {
      "scanTime": "2026-01-22T10:30:00Z",
      "checkInTime": "2026-01-22T10:30:00Z",
      "checkOutTime": "2026-01-22T15:45:00Z",
      "durationMinutes": 315,
      "subject": "General",
      "status": "Present",
      ...
    }
  ]
}
```

### 5. Get Attendance Statistics

**Endpoint**: `GET /api/history/stats`

**Query Parameters**:
- `startDate`: Start date for range filter
- `endDate`: End date for range filter
- `gradeLevel`: Filter by grade level
- `section`: Filter by section
- `shift`: Filter by shift

**Note**: Only counts 'In' records for statistics

## How the In/Out System Works

### Workflow:

1. **Student Arrives - Check-In**
   - Student scans QR code at "In" tablet (Tablet 1)
   - An 'In' attendance record is created
   - Record has `attendanceType: 'In'`, `checkInTime`, and `status` based on timing rules

2. **Student Leaves - Check-Out**
   - Student scans QR code at "Out" tablet (Tablet 2)
   - An 'Out' attendance record is created
   - System automatically finds the matching 'In' record from the same day
   - Records are linked via `linkedRecordId`
   - Duration is calculated automatically

3. **Data Retrieval**
   - When fetching attendance history, only 'In' records are returned as primary records
   - Each 'In' record includes `checkOutTime` and `durationMinutes` if checked out
   - Statistics and reports only count 'In' records to avoid duplication

### Linking Logic:

When an 'Out' record is created:
1. System searches for an 'In' record for the same student on the same day
2. Most recent unchecked-out 'In' record is selected
3. `linkedRecordId` is set in both records
4. `durationMinutes` is calculated

## Database Queries

### Find all students who checked out:
```javascript
db.histories.find({ 
  attendanceType: 'Out',
  scanTime: { $gte: new Date('2026-01-22'), $lt: new Date('2026-01-23') }
})
```

### Find students who didn't check out:
```javascript
db.histories.find({
  attendanceType: 'In',
  scanTime: { $gte: new Date('2026-01-22'), $lt: new Date('2026-01-23') },
  linkedRecordId: null  // No corresponding check-out
})
```

### Get attendance duration statistics:
```javascript
db.histories.aggregate([
  {
    $match: {
      attendanceType: 'Out',
      scanTime: { $gte: new Date('2026-01-22'), $lt: new Date('2026-01-23') }
    }
  },
  {
    $group: {
      _id: null,
      avgDuration: { $avg: '$durationMinutes' },
      maxDuration: { $max: '$durationMinutes' },
      minDuration: { $min: '$durationMinutes' }
    }
  }
])
```

## Frontend Integration

### For Check-In (Tablet 1):
```javascript
// Send to API
POST /api/history
{
  "studentId": "STU001",
  "studentName": "John Doe",
  "attendanceType": "In",  // Always 'In' for this tablet
  "qrCodeData": { ... }
}
```

### For Check-Out (Tablet 2):
```javascript
// Send to API
POST /api/history
{
  "studentId": "STU001",
  "studentName": "John Doe",
  "attendanceType": "Out",  // Always 'Out' for this tablet
  "qrCodeData": { ... }
}
```

### To Display Attendance Summary:
```javascript
// Get daily summary with check-in/check-out pairs
GET /api/history/daily-summary?date=2026-01-22&gradeLevel=Grade%201&section=A
```

## Migration Notes

- Old 'General' subject records will still work (no schema breaking changes)
- Existing records without `attendanceType` will default to 'In' behavior
- It's recommended to add `attendanceType` field to historical data if available
- Empty `checkOutTime` and `durationMinutes` indicate students who haven't checked out yet

## Best Practices

1. **Always send `attendanceType`** in check-in/check-out requests
2. **Use Daily Summary endpoint** for reporting and dashboard views
3. **Monitor unchecked-out records** - use `linkedRecordId: null` filter on 'In' records
4. **Calculate hours from durationMinutes** - divide by 60 for hours
5. **Only count 'In' records** for attendance statistics to avoid duplication
