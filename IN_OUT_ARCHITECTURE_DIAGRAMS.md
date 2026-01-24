# In/Out Attendance System - Architecture & Flow Diagrams

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    SMARTENDANCE IN/OUT SYSTEM                   │
└─────────────────────────────────────────────────────────────────┘

TABLETS LAYER
┌──────────────────┐                         ┌──────────────────┐
│   CHECK-IN       │                         │   CHECK-OUT      │
│   TABLET 1       │                         │   TABLET 2       │
│                  │                         │                  │
│  Scans: QR Code  │                         │  Scans: QR Code  │
│  Sends: In       │                         │  Sends: Out      │
│  Subject: Mobile │                         │  Subject: Mobile │
└─────────┬────────┘                         └────────┬─────────┘
          │                                           │
          │ attendanceType: 'In'                      │ attendanceType: 'Out'
          │                                           │
          └───────────────────┬─────────────────────┬─┘
                              │
                    API ENDPOINT LAYER
                   POST /api/history
                              │
                ┌─────────────┴─────────────┐
                │                           │
        ┌───────▼────────┐        ┌────────▼───────┐
        │ CREATE 'In'    │        │  CREATE 'Out'  │
        │ RECORD         │        │  RECORD        │
        │ Save to DB     │        │  Auto-link     │
        │                │        │  Calculate Dur │
        └────────────────┘        └────────────────┘
                │                        │
                └────────┬───────────────┘
                         │
            DATABASE LAYER (MongoDB)
                         │
        ┌────────────────▼────────────────┐
        │     HISTORY COLLECTION          │
        │                                 │
        │  'In' Record                    │
        │  ├─ studentId: STU001           │
        │  ├─ attendanceType: 'In'        │
        │  ├─ checkInTime: 10:30 AM       │
        │  └─ linkedRecordId: (ref)       │
        │                                 │
        │  'Out' Record                   │
        │  ├─ studentId: STU001           │
        │  ├─ attendanceType: 'Out'       │
        │  ├─ checkOutTime: 3:45 PM       │
        │  ├─ durationMinutes: 315        │
        │  └─ linkedRecordId: (ref)       │
        │                                 │
        └────────────────┬────────────────┘
                         │
            REPORTING & ANALYTICS LAYER
                         │
        ┌────────────────▼────────────────┐
        │   Daily Summary Endpoint         │
        │   /api/history/daily-summary     │
        │                                 │
        │   Returns:                      │
        │   - All Check-in/Check-out      │
        │   - Durations                   │
        │   - Statistics                  │
        │   - Not Checked Out List        │
        └────────────────────────────────┘
                         │
            ADMIN DASHBOARD / REPORTS
```

## Data Flow Diagram

### Complete Attendance Flow

```
START
  │
  ├─ MORNING: Student arrives at school
  │
  └──► TABLET 1 (CHECK-IN)
       │
       ├─ Student scans QR code
       │
       ├─ Mobile app captures:
       │  ├─ Student ID
       │  ├─ Student Name
       │  ├─ QR Data
       │  ├─ Device Info
       │  └─ attendanceType: 'In'
       │
       ├─ POST /api/history
       │  │
       │  └─► Server creates:
       │      ├─ _id: 507f1f77bcf86cd799439011
       │      ├─ attendanceType: 'In'
       │      ├─ checkInTime: 2026-01-22T10:30:00Z
       │      ├─ scanTime: 2026-01-22T10:30:00Z
       │      ├─ status: 'Present'
       │      └─ linkedRecordId: null (initially)
       │
       └─► Response: ✓ Check-in recorded
           │
           │ Display: "Welcome John Doe - 10:30 AM"
           │
           ├─ STUDENT ATTENDS CLASS
           │
           ├─ STUDENT LEAVES SCHOOL
           │
           └──► TABLET 2 (CHECK-OUT)
               │
               ├─ Student scans QR code (same QR)
               │
               ├─ Mobile app captures:
               │  ├─ Student ID: STU001
               │  ├─ Student Name: John Doe
               │  ├─ QR Data
               │  ├─ Device Info
               │  └─ attendanceType: 'Out'
               │
               ├─ POST /api/history
               │  │
               │  └─► Server processes:
               │      1. Create 'Out' record
               │      2. Find matching 'In' record
               │         (same student, same day, most recent)
               │      3. Link both records
               │      4. Calculate duration:
               │         3:45 PM - 10:30 AM = 5 hours 15 min = 315 min
               │
               ├─ Save 'Out' Record:
               │  ├─ _id: 507f1f77bcf86cd799439012
               │  ├─ attendanceType: 'Out'
               │  ├─ checkOutTime: 2026-01-22T15:45:00Z
               │  ├─ linkedRecordId: 507f1f77bcf86cd799439011
               │  └─ durationMinutes: 315
               │
               ├─ Update 'In' Record:
               │  └─ linkedRecordId: 507f1f77bcf86cd799439012
               │
               └─► Response: ✓ Check-out recorded
                   │
                   └─ Display: "Thank you John Doe - 3:45 PM"
                      │
                      └─► END

SYSTEM STATUS:
- Both records created and linked
- Duration: 5 hours 15 minutes
- Attendance marked: Present
```

## Database Schema Relationship

```
HISTORY COLLECTION

Entry 1 (Check-In):
┌─────────────────────────────────────────────┐
│ _id: 507f1f77bcf86cd799439011              │
│ studentId: "STU001"                        │
│ studentName: "John Doe"                    │
│ attendanceType: "In"                       │
│ checkInTime: 2026-01-22T10:30:00Z           │
│ checkOutTime: null                         │
│ scanTime: 2026-01-22T10:30:00Z              │
│ durationMinutes: 315                       │
│ linkedRecordId: ◄──┐                       │
│ status: "Present"  │                       │
│ subject: "General" │                       │
│ gradeLevel: "Grade 1"                      │
│ section: "A"       │                       │
│ shift: "Morning"   │                       │
└─────────────────────────────────────────────┘
                                  │
                    ┌─────────────┘
                    │
Entry 2 (Check-Out):
┌─────────────────────────────────────────────┐
│ _id: 507f1f77bcf86cd799439012              │
│ studentId: "STU001"                        │
│ studentName: "John Doe"                    │
│ attendanceType: "Out"                      │
│ checkInTime: null                          │
│ checkOutTime: 2026-01-22T15:45:00Z          │
│ scanTime: 2026-01-22T15:45:00Z              │
│ durationMinutes: 315                       │
│ linkedRecordId: ──────────►                │
│ status: "Present"                          │
│ subject: "General"                         │
│ gradeLevel: "Grade 1"                      │
│ section: "A"                               │
│ shift: "Morning"                           │
└─────────────────────────────────────────────┘

LINKED VIA linkedRecordId (Bidirectional)
```

## Query Flow for Statistics

```
REQUEST: GET /api/history/stats

┌────────────────────────────────────┐
│ Query MongoDB with filters:        │
│ attendanceType: 'In'               │
│ (Only count Check-ins, not outs)   │
│                                    │
│ Date range: if provided            │
│ Grade/Section/Shift: if provided   │
└────────┬───────────────────────────┘
         │
         ▼
┌────────────────────────────────────┐
│ Group by 'status' field:           │
│ - Present: count                   │
│ - Late: count                      │
│ - Absent: count                    │
│ - Cutting: count                   │
└────────┬───────────────────────────┘
         │
         ▼
┌────────────────────────────────────┐
│ RESPONSE:                          │
│ {                                  │
│   "present": 45,                   │
│   "absent": 3,                     │
│   "late": 2,                       │
│   "cutting": 0,                    │
│   "total": 50                      │
│ }                                  │
└────────────────────────────────────┘

IMPORTANT: Only 'In' records counted to avoid duplicates
```

## Daily Summary Report Flow

```
REQUEST: GET /api/history/daily-summary?date=2026-01-22

┌──────────────────────────────────────────────┐
│ 1. Filter all records for the date:          │
│    attendanceType: 'In' AND 'Out'            │
│    scanTime: 2026-01-22 00:00 to 23:59       │
└──────────┬───────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────┐
│ 2. Sort by student and time                  │
└──────────┬───────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────┐
│ 3. For each 'In' record:                     │
│    - Find matching 'Out' via linkedRecordId  │
│    - If found: calculate duration            │
│    - Mark as 'hasCheckedOut: true'           │
│    - Otherwise: duration = 0, checked out = false
└──────────┬───────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────┐
│ 4. Build attendance summary array:           │
│    {                                         │
│      studentId, studentName,                 │
│      checkInTime, checkOutTime,              │
│      durationMinutes, hasCheckedOut,         │
│      status, gradeLevel, section             │
│    }                                         │
└──────────┬───────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────┐
│ 5. Calculate statistics:                     │
│    - Total Present                           │
│    - Total Absent                            │
│    - Total Late                              │
│    - Total Cutting                           │
│    - Checked Out: count hasCheckedOut=true   │
│    - Not Checked Out: count hasCheckedOut=false
└──────────┬───────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────┐
│ RESPONSE: {                                  │
│   "date": "2026-01-22",                      │
│   "summary": [                               │
│     {                                        │
│       "studentId": "STU001",                 │
│       "studentName": "John Doe",             │
│       "checkInTime": "10:30:00",             │
│       "checkOutTime": "15:45:00",            │
│       "durationMinutes": 315,                │
│       "hasCheckedOut": true,                 │
│       "status": "Present"                    │
│     },                                       │
│     ... more students                        │
│   ],                                         │
│   "statistics": {                            │
│     "totalPresent": 45,                      │
│     "checkedOut": 42,                        │
│     "notCheckedOut": 8,                      │
│     "total": 50                              │
│   }                                          │
│ }                                            │
└──────────────────────────────────────────────┘
```

## API Request/Response Timeline

```
TIMELINE: Single School Day

10:30 AM
│
├─ Request: POST /api/history
│  Body: { attendanceType: 'In', studentId: 'STU001' }
│
└─ Response: ✓ (In record created)
   └─ _id: Record_1, checkInTime: 10:30, linkedRecordId: null

     [STUDENT IN SCHOOL]

3:45 PM
│
├─ Request: POST /api/history
│  Body: { attendanceType: 'Out', studentId: 'STU001' }
│
├─ Server Logic:
│  1. Create Out record
│  2. Query: Find In record from today for STU001
│  3. Found Record_1 (10:30 AM)
│  4. Link: Record_2.linkedRecordId = Record_1._id
│  5. Link: Record_1.linkedRecordId = Record_2._id
│  6. Calculate: (3:45 PM - 10:30 AM) = 315 minutes
│
└─ Response: ✓ (Out record created, linked, duration calculated)
   └─ _id: Record_2, checkOutTime: 3:45, linkedRecordId: Record_1
      durationMinutes: 315

4:00 PM - Admin Dashboard
│
├─ Request: GET /api/history/daily-summary?date=2026-01-22
│
└─ Response:
   ├─ Total Students: 50
   ├─ Checked Out: 42
   ├─ Not Checked Out: 8
   └─ Students List:
      ├─ STU001: John Doe
      │  ├─ Check-in: 10:30 AM
      │  ├─ Check-out: 3:45 PM
      │  ├─ Duration: 5h 15m (315 min)
      │  └─ Status: ✓ Checked Out
      ├─ STU002: Jane Smith
      │  ├─ Check-in: 10:35 AM
      │  ├─ Check-out: null
      │  ├─ Duration: Still at school
      │  └─ Status: ✗ Not Checked Out
      └─ ... more students
```

## Edge Cases Handling

```
CASE 1: Student scans 'In' twice
├─ First scan: In record created
├─ Second scan: New In record created
├─ When 'Out' is scanned: Links to most recent In
└─ Result: Old In record remains unlinked

CASE 2: Student scans 'Out' without 'In'
├─ Out record created
├─ No matching In found for today
├─ linkedRecordId: null
└─ Result: Out record exists but unlinked (orphaned)

CASE 3: Student checked in but never checked out
├─ In record created
├─ End of day: linkedRecordId still null
├─ Daily summary shows: hasCheckedOut: false
└─ Result: Flagged for follow-up

CASE 4: Duplicate 'Out' scans
├─ First Out: Links to In, calculates duration
├─ Second Out: Can't find unlinked In from today
├─ linkedRecordId: null for second Out
└─ Result: Duplicate Out created (manual cleanup may be needed)
```

## Performance Optimization

```
INDEXES CREATED:

┌────────────────────────────────────────┐
│ Index 1: { attendanceType: 1 }        │
│ Used for: Finding all 'In' or 'Out'  │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│ Index 2: { checkInTime: 1 }            │
│ Used for: Date range on check-ins     │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│ Index 3: { checkOutTime: 1 }           │
│ Used for: Date range on check-outs    │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│ Index 4: { studentId, attendanceType,  │
│           scanTime: -1 }               │
│ Used for: Most common queries          │
│ - Get student's attendance             │
│ - Filter by type and date              │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│ Index 5: { linkedRecordId: 1 }         │
│ Used for: Finding paired records       │
└────────────────────────────────────────┘

RESULT: 10-100x faster queries depending on data size
```

---

This architecture ensures:
✓ Accurate check-in/check-out tracking
✓ Automatic duration calculation
✓ Linked record pairs
✓ Efficient daily reporting
✓ Easy identification of unchecked-out students
✓ Backward compatibility with existing system
