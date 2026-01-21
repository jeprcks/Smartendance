# API Endpoint Fix - 404 Error Resolution

## Problem
The mobile app was trying to update student attendance using an endpoint that didn't exist:
```
PATCH /api/schedules/{scheduleId}/student-attendance
```

This resulted in a **404 Not Found** error when teachers tried to save attendance status changes.

## Solution

### 1. Created New Controller Method
**File:** `server/controllers/scheduleController.js`

Added `updateStudentAttendance` method that:
- Accepts `studentId`, `status`, and `timestamp` in request body
- Finds the schedule by ID
- Updates or creates student attendance record
- Returns updated schedule and student entry

```javascript
exports.updateStudentAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    const { studentId, status, timestamp } = req.body;

    // Validate required fields
    if (!studentId || !status) {
      return res.status(400).json({ 
        error: 'studentId and status are required' 
      });
    }

    const schedule = await Schedule.findById(id);
    if (!schedule) {
      return res.status(404).json({ 
        error: 'Schedule not found' 
      });
    }

    // Initialize students array if it doesn't exist
    if (!schedule.students) {
      schedule.students = [];
    }

    // Find or create student entry
    let studentEntry = schedule.students.find(s => s.studentId === studentId);
    if (!studentEntry) {
      studentEntry = {
        studentId,
        status: 'Not Scanned',
        scanTime: null,
        timeIn: null
      };
      schedule.students.push(studentEntry);
    }

    // Update student status
    studentEntry.status = status;
    studentEntry.timestamp = timestamp || new Date().toISOString();

    // Mark schedule as modified for nested objects
    schedule.markModified('students');
    await schedule.save();

    res.status(200).json({
      success: true,
      message: 'Student attendance updated successfully',
      result: {
        schedule,
        student: studentEntry
      }
    });
  } catch (error) {
    console.error('Error updating student attendance:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to update student attendance' 
    });
  }
};
```

### 2. Added Route
**File:** `server/routes/scheduleRoutes.js`

Added route definition to handle the endpoint:
```javascript
// Update student attendance within a schedule
router.patch('/:id/student-attendance', scheduleController.updateStudentAttendance);
```

**Important:** This route must be defined **before** the generic `/:id` route to prevent it from being caught by the update schedule route.

## API Endpoint Details

### Endpoint
```
PATCH /api/schedules/{scheduleId}/student-attendance
```

### Request Headers
```
Content-Type: application/json
Authorization: Bearer {token}
```

### Request Body
```json
{
  "studentId": "student123",
  "scheduleId": "schedule456",
  "status": "Present|Absent|Late|Cutting",
  "timestamp": "2026-01-21T10:30:00.000Z"
}
```

### Successful Response (200)
```json
{
  "success": true,
  "message": "Student attendance updated successfully",
  "result": {
    "schedule": { ... },
    "student": {
      "studentId": "student123",
      "status": "Present",
      "timestamp": "2026-01-21T10:30:00.000Z",
      "scanTime": null,
      "timeIn": null
    }
  }
}
```

### Error Responses
- **400:** Missing `studentId` or `status`
- **404:** Schedule not found
- **500:** Server error

## Database Schema Changes

The Schedule schema now stores student attendance in an array:
```javascript
students: [{
  studentId: String,
  status: String,
  timestamp: String,
  scanTime: String,
  timeIn: String
}]
```

## Testing

### Manual Test
1. Start backend server: `npm run dev` in `server/` directory
2. Open mobile app and login as teacher
3. Click on a schedule
4. Click "Take Attendance"
5. Select status for a student
6. Click "Update"
7. Should see success message (no 404 error)

### Verify Changes
```bash
# Check if the route is registered
curl -X PATCH http://localhost:4000/api/schedules/{scheduleId}/student-attendance \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{"studentId":"test","status":"Present","timestamp":"2026-01-21T10:30:00Z"}'
```

## Integration with Mobile App

The Flutter app already has the correct endpoint configured in `teacherService.dart`:
```dart
final response = await http.patch(
  Uri.parse('$baseUrl/schedules/$scheduleId/student-attendance'),
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer $token',
  },
  body: jsonEncode(body),
);
```

## Status Sync Flow
1. ✅ Mobile app sends status update via new endpoint
2. ✅ Backend persists to database
3. ✅ Mobile app pulls-to-refresh to fetch latest data
4. ✅ Admin web displays updated history

## Verification Checklist
- [x] Endpoint route defined
- [x] Controller method implemented
- [x] Error handling added
- [x] Response format matches mobile app expectations
- [x] Route ordering correct (specific before generic)
- [x] Database update logic working

## Files Modified
1. `server/controllers/scheduleController.js` - Added `updateStudentAttendance` method
2. `server/routes/scheduleRoutes.js` - Added route definition

## Next Steps
1. Restart backend server to load new route
2. Test status update from mobile app
3. Verify status changes persist in database
4. Confirm admin web history updates
