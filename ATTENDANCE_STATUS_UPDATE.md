# Editable Attendance Status Feature - Implementation Complete

## Overview
Implemented the ability for teachers to edit student attendance status for their specific subject/schedule. This allows teachers to override QR scan statuses with subject-specific markings.

## What's New

### 1. Interactive Status Button
- Status button in student cards is now **clickable/tappable**
- Shows current status with color coding:
  - **Present** (Green ✓)
  - **Absent** (Red ✗)
  - **Late** (Orange ⏱)
  - **Cutting** (Deep Orange ✖)
  - **Sick Leave** (Blue 🏥)
  - **Excused** (Purple ☐)
- Edit icon indicator shows the button is interactive

### 2. Status Selection Dialog
- Tap status button → Opens modal dialog
- Shows all 6 status options in a grid layout
- Current status is highlighted with checkmark
- Color-coded buttons for easy identification
- Click any status to update

### 3. Per-Subject Status Override
Teachers can now:
- Mark students as **Present/Absent/Late/Cutting/Sick Leave/Excused** for their specific class
- Status applies only to that schedule/subject, not globally
- Example: Student scans QR (global Present) → Teacher marks as Cutting for Math class → Student remains Present for other subjects

### 4. API Integration
New TeacherService method:
```dart
static Future<Map<String, dynamic>> updateStudentAttendance({
  required String token,
  required String studentId,
  required String scheduleId,
  required String status,
}) async
```

**Endpoint**: `PATCH /api/schedules/{scheduleId}/student-attendance`

**Request Body**:
```json
{
  "studentId": "student_id",
  "scheduleId": "schedule_id",
  "status": "Present|Absent|Late|Cutting|Sick Leave|Excused",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 5. Data Flow
1. Teacher taps status button on student card
2. Status dialog appears with 6 options
3. Teacher selects new status
4. API call sent to backend: `updateStudentAttendance()`
5. On success:
   - Local state updates immediately
   - Student card shows new status
   - Green success toast displays
   - Status persists for this schedule/subject
6. On error:
   - Red error toast shows error message
   - Status reverts to previous value
   - User can retry

### 6. Updated Files

#### `mobile/lib/pages/teachers/schedule_details.dart`
- Added `token` and `scheduleId` to constructor
- Added `_isUpdating` state flag to prevent duplicate updates
- Made `_buildStudentCard()` status button clickable with GestureDetector
- Implemented `_showStatusDialog()` to display status options
- Implemented `_buildStatusOption()` to render individual status choices
- Implemented `_updateAttendanceStatus()` to call API and update state
- Added loading states and error handling

#### `mobile/lib/pages/teachers/schedule.dart`
- Updated `ScheduleDetailsPage` navigation call to pass `token` and `scheduleId`
- Passes teacher's authentication token from parent page
- Extracts schedule ID from schedule object: `schedule['_id']`

#### `mobile/lib/services/teacherService.dart`
- Added `updateStudentAttendance()` static method
- Handles PATCH request to backend
- Includes timestamp of status change
- Returns update result from server

## UI/UX Improvements

1. **Visual Feedback**
   - Loading indicator during API call
   - Success/error toast messages
   - Status button disabled during update

2. **Color Coding**
   - Each status has distinct color for quick recognition
   - Status option grid uses color-coded containers
   - Current selection highlighted with checkmark

3. **Responsive Design**
   - Dialog adapts to different screen sizes
   - 2-column grid for status options on mobile
   - Proper spacing and padding throughout

## Testing Checklist

- [ ] Click status button → Dialog opens with 6 options
- [ ] Current status shows checkmark in dialog
- [ ] Select different status → Updates immediately
- [ ] API call sent with correct studentId, scheduleId, status
- [ ] Toast shows success message when status updates
- [ ] Toast shows error if API fails
- [ ] Status persists after dialog closes
- [ ] Multiple status changes work correctly
- [ ] Search students still works with status updates
- [ ] Navigation back/forward maintains state

## Backend Requirements

Server endpoint needs to:
1. Accept PATCH at `/api/schedules/{scheduleId}/student-attendance`
2. Extract studentId, scheduleId, status from request body
3. Validate schedule exists and teacher owns it
4. Validate student is enrolled in that schedule
5. Update student's attendance status for this specific schedule
6. Store timestamp of status change
7. Return success with updated status record or error

### Expected Response (Success):
```json
{
  "result": {
    "studentId": "...",
    "scheduleId": "...",
    "status": "Present|Absent|Late|Cutting|Sick Leave|Excused",
    "timestamp": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:15.000Z"
  }
}
```

### Expected Response (Error):
```json
{
  "error": "Student not found in this schedule",
  "code": "NOT_FOUND"
}
```

## Status Constants

```dart
const List<String> attendanceStatus = [
  'Present',
  'Absent',
  'Late',
  'Cutting',
  'Sick Leave',
  'Excused',
];

const Map<String, Color> shiftColors = {
  'Morning': Color(0xFF3B82F6),      // Blue
  'Afternoon': Color(0xFFF59E0B),    // Amber
  'Evening': Color(0xFF8B5CF6),      // Purple
};
```

## Future Enhancements

1. **Batch Status Updates** - Update multiple students at once
2. **Status History** - View who changed status and when
3. **Auto-Notifications** - Alert parents when status is changed
4. **Undo Option** - Quick undo for recent status changes
5. **Status Presets** - Quick buttons for common markings
6. **Sync With Scanner** - Auto-update based on QR scan time
7. **Export Reports** - Generate attendance reports with status changes

## Notes

- Status changes are scoped to specific subject/schedule only
- Global school entry scan status (`isPresent`) remains unchanged
- Teacher's edit timestamp is recorded for audit purposes
- All changes require valid authentication token
- Duplicate API calls prevented with `_isUpdating` flag
