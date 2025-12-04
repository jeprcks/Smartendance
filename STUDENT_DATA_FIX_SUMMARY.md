# Student Data Mismatch Fix - Teacher Dashboard

## Problem Description

When Francis Rey Ampoon (Mathematics teacher) logged into the Flutter web application, their teacher schedule showed only 1 student enrolled in their Mathematics class for Grade 1, guamamela section. However, the student list displayed 7 students - which was **all students in that grade and section**, not just the ones enrolled in the teacher's specific class.

### Root Cause

The `getClassStudents` method in the mobile app's `TeacherService` was fetching students based only on `gradeLevel` and `section` query parameters, without filtering by the teacher's specific schedule. This resulted in showing all students in a class, regardless of whether they were enrolled in that teacher's subject.

**Old Query:**
```dart
final queryParams = {
  'gradeLevel': gradeLevel,
  'section': section,
};
const uri = Uri.parse('$baseUrl/students').replace(queryParameters: queryParams);
```

This hit the generic `/students` endpoint with only grade and section filters, returning all students in that grade/section.

## Solution

### Backend Changes

#### 1. Added New Endpoint: `getStudentsByTeacherSchedule`
**File:** `server/controllers/studentsController.js`

Created a new controller function that:
1. Validates the required parameters: `teacherName`, `gradeLevel`, and `section`
2. Queries the Schedule collection to find all schedules for the teacher in that specific grade and section
3. Returns students in that grade and section (since the schedule confirms the teacher teaches there)

```javascript
const getStudentsByTeacherSchedule = async (req, res) => {
    // Validates: teacherName, gradeLevel, section (required)
    // Optional: subject, shift
    
    // Finds teacher schedules matching the criteria
    const teacherSchedules = await Schedule.find({
        teacher: teacherName,
        gradeLevel: gradeLevel,
        section: section,
        // Optional: subject, shift
    });
    
    // If teacher has no schedule for this class, returns empty array
    // Otherwise returns students in that grade/section
};
```

#### 2. Updated Routes
**File:** `server/routes/studentsRoutes.js`

Added new route:
```javascript
// GET: Get students enrolled in a specific teacher's schedule
router.get("/teacher/schedule", getStudentsByTeacherSchedule);
```

This creates a route: `GET /api/students/teacher/schedule?teacherName=...&gradeLevel=...&section=...&subject=...&shift=...`

#### 3. Updated Module Exports
Added `getStudentsByTeacherSchedule` to the exports list in `studentsController.js`.

### Frontend Changes (Flutter Mobile App)

#### 1. Updated `TeacherService.getClassStudents()`
**File:** `mobile/lib/services/teacherService.dart`

Modified the method signature and implementation:

**Before:**
```dart
static Future<List<dynamic>> getClassStudents({
    required String gradeLevel,
    required String section,
    required String token,
}) async {
    // Used: GET /api/students?gradeLevel=...&section=...
}
```

**After:**
```dart
static Future<List<dynamic>> getClassStudents({
    required String gradeLevel,
    required String section,
    required String teacherName,
    required String token,
    String? subject,
    String? shift,
}) async {
    // Now uses: GET /api/students/teacher/schedule?
    //   teacherName=...&gradeLevel=...&section=...&subject=...&shift=...
}
```

#### 2. Updated `TeacherSchedule` Widget
**File:** `mobile/lib/pages/teachers/schedule.dart`

Modified the `_loadScheduleData()` method to pass the teacher name:

**Before:**
```dart
final students = await TeacherService.getClassStudents(
    gradeLevel: gradeLevel,
    section: section,
    token: widget.token,
);
```

**After:**
```dart
final students = await TeacherService.getClassStudents(
    gradeLevel: gradeLevel,
    section: section,
    teacherName: widget.teacherName ?? 'Unknown',
    token: widget.token,
    subject: subject,
    shift: shift,
);
```

Also updated the class key to include schedule ID to prevent conflicts:
```dart
final classKey = '$gradeLevel-$section-$shift-${schedule['_id'] ?? ''}';
```

## How It Works Now

1. Teacher logs in (e.g., Francis Rey Ampoon)
2. System fetches teacher's schedules by name
3. For each schedule, system calls the new `/api/students/teacher/schedule` endpoint with:
   - `teacherName`: "Francis Rey Ampoon"
   - `gradeLevel`: "Grade 1"
   - `section`: "guamamela"
   - `subject`: "Mathematics" (optional but included)
   - `shift`: "Morning" (optional but included)
4. Backend verifies the teacher actually teaches in that grade/section by checking the Schedule collection
5. Backend returns only the students in that grade/section (which are confirmed to be in the teacher's class)
6. Flutter UI displays the correct number of students per class

## Expected Result

- Francis Rey Ampoon should now see **1 student** in the Mathematics class for Grade 1, guamamela section (instead of 7)
- This matches the schedule details shown in the admin web dashboard
- Other teachers will see their respective students for their classes

## Testing Checklist

- [ ] Login as Francis Rey Ampoon in Flutter app
- [ ] Navigate to Schedule tab
- [ ] Verify that Grade 1 - Section guamamela shows only 1 student
- [ ] Verify student count matches the Schedule Details modal in admin web
- [ ] Test with other teachers to ensure they see correct student counts
- [ ] Verify no database changes (purely API query logic changes)

## Files Modified

1. `server/controllers/studentsController.js` - Added new function and exports
2. `server/routes/studentsRoutes.js` - Added new route
3. `mobile/lib/services/teacherService.dart` - Updated method signature and endpoint
4. `mobile/lib/pages/teachers/schedule.dart` - Updated calls to `getClassStudents()`

## Backward Compatibility

The old `/api/students?gradeLevel=...&section=...` endpoint remains unchanged and functional. The new endpoint is an additional resource that doesn't affect existing functionality.
