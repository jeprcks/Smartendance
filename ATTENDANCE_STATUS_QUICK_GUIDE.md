# Attendance Status Feature - Quick Start Guide

## What Changed

Teachers can now **edit attendance status per subject** for each student. This is separate from the global QR scan status.

## How It Works

1. **Open Schedule** → Teacher taps on a schedule card
2. **View Students** → See all students enrolled in that class
3. **Tap Status Button** → The colored status button on each student card is now clickable
4. **Select New Status** → Dialog shows 6 options:
   - Present ✓ (Green)
   - Absent ✗ (Red)
   - Late ⏱ (Orange)
   - Cutting ✖ (Deep Orange)
   - Sick Leave 🏥 (Blue)
   - Excused ☐ (Purple)
5. **Confirm** → Status updates immediately and saved to database

## Key Features

✅ **Per-Subject Control** - Different status for different classes
✅ **Override Capability** - Override QR scan status for specific subject
✅ **Color Coded** - Easy visual identification of status
✅ **Real-time Updates** - Status changes appear instantly
✅ **Error Handling** - Toast messages show success/errors
✅ **Prevented Duplicates** - Can't accidentally submit twice

## Example Scenario

```
Student "Ali" attends school on Monday:
- 7:30 AM: Scans QR code at entrance → Global status: "Present"
- 8:00 AM: Math class with Teacher A
  → Teacher marks: "Present" ✓ (Status shows green)
- 10:00 AM: Science class with Teacher B
  → Teacher marks: "Cutting" ✖ (Status shows deep orange for this class)
- Result: Ali is "Present" globally but marked as "Cutting" in Science

Each teacher only sees/updates status for their own subject.
```

## Files Modified

1. **schedule_details.dart** (Main changes)
   - Status button now clickable
   - Added status selection dialog
   - Added API call to update status

2. **schedule.dart** (Navigation)
   - Passes token and scheduleId to detail page

3. **teacherService.dart** (API)
   - New `updateStudentAttendance()` method

## API Endpoint

```
PATCH /api/schedules/{scheduleId}/student-attendance
Authorization: Bearer {token}

Body:
{
  "studentId": "student_id",
  "scheduleId": "schedule_id",
  "status": "Present|Absent|Late|Cutting|Sick Leave|Excused",
  "timestamp": "ISO8601_datetime"
}
```

## Testing the Feature

1. Run: `flutter run -d web-server` in `mobile/` folder
2. Login as teacher
3. Open schedule view
4. Click a schedule card to see students
5. Click the colored status button on any student
6. Select a different status from the dialog
7. Check the green toast notification for success
8. Status should now show the new value

## Troubleshooting

**Issue**: Status button not clickable
- Solution: Make sure using latest version of code after `dart_format`

**Issue**: Dialog doesn't appear
- Solution: Check console for errors, verify token is passed correctly

**Issue**: Status doesn't update
- Solution: Check backend endpoint exists at `/api/schedules/{scheduleId}/student-attendance`

**Issue**: "Error updating status" message
- Solution: Check:
  - Student ID is correct
  - Schedule ID exists
  - Student is enrolled in that schedule
  - Backend endpoint returns proper error message

## Backend Implementation

The backend needs to handle the PATCH request and:
1. Verify teacher owns the schedule
2. Verify student is enrolled in schedule
3. Update the attendance status for this subject
4. Store timestamp of change
5. Return updated record

Example MongoDB update:
```javascript
db.enrollments.updateOne(
  { 
    _id: studentId,
    scheduleId: scheduleId 
  },
  { 
    $set: {
      status: newStatus,
      statusUpdatedAt: new Date(),
      statusUpdatedBy: teacherId
    }
  }
)
```

## Current Limitations

- Status change only affects that specific schedule/subject
- Global "isPresent" from QR scan is not affected
- Can't batch update multiple students yet
- No status history view yet
- No notification to student/parent yet

## Next Steps

Once backend is ready:
1. Test with real data
2. Verify status persists after reload
3. Check concurrent user updates
4. Monitor API performance
5. Add batch update feature
6. Add status history view
