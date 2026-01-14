# Quick Testing Guide - Teacher Student Count Fix

## Issue Fixed
Francis Rey Ampoon's Mathematics class was showing 7 students instead of 1 in the Flutter app.

## What Was Changed

### Backend (Node.js/Express)
- Added new endpoint: `GET /api/students/teacher/schedule`
- Parameters:
  - `teacherName` (required): Teacher's name as stored in database
  - `gradeLevel` (required): Grade level (e.g., "Grade 1")
  - `section` (required): Section name (e.g., "guamamela")
  - `subject` (optional): Subject filter
  - `shift` (optional): Shift filter (Morning/Afternoon)

### Frontend (Flutter)
- Updated `TeacherService.getClassStudents()` to accept `teacherName` parameter
- Now calls the new `/api/students/teacher/schedule` endpoint
- Passes teacher name along with grade/section to backend

## Testing Steps

### 1. Start Backend Server
```bash
cd "C:\Users\Laurin Mae Ampoon\OneDrive\Desktop\capstone_project\Smartendance\server"
npm run dev
```

### 2. Test the New API Endpoint (Optional - using Postman or curl)
```
GET http://localhost:4000/api/students/teacher/schedule?teacherName=Francis%20Rey%20R.%20Ampoon&gradeLevel=Grade%201&section=guamamela&subject=Mathematics&shift=Morning

Headers:
Authorization: Bearer {teacher_token}
```

Should return an array of students in Grade 1, guamamela section.

### 3. Test in Flutter App
1. Launch the Flutter mobile app
2. Login as Francis Rey Ampoon (Mathematics teacher)
3. Navigate to the "Schedule" tab
4. Look for "Grade 1 - Section guamamela"
5. **Expected result**: Should show 1 student (Mike Tysonmm or STU-123221)

### 4. Verify in Admin Dashboard
1. Open http://localhost:3000/home/schedules
2. Find the schedule for "Francis Rey R. Ampoon"
3. Check the "Enrolled Students" section
4. Should show 1 student (STU-123221)

## Expected Behavior

| Teacher | Subject | Grade | Section | Expected Student Count |
|---------|---------|-------|---------|----------------------|
| Francis Rey R. Ampoon | Mathematics | Grade 1 | guamamela | 1 |
| admin (if applicable) | Filipino | Grade 1 | guamamela | 1 |
| Other teachers | Various | Various | Various | Based on their schedules |

## If You Encounter Issues

### Issue: Still showing 7 students
**Solution**: 
- Check that the teacher name in the app matches exactly the teacher name in the database
- Verify the backend is running and the new endpoint is accessible
- Check browser console for API errors

### Issue: Showing 0 students
**Solution**:
- Verify that a schedule exists for Francis Rey Ampoon in Grade 1, guamamela
- Check that students exist in that grade and section in the database

### Issue: API endpoint not found (404)
**Solution**:
- Restart the backend server
- Verify `server/routes/studentsRoutes.js` has the new route
- Verify `server/controllers/studentsController.js` has the exported function

## Database Verification

To manually verify the data:

1. Check if schedule exists:
```javascript
db.schedules.findOne({
    teacher: "Francis Rey R. Ampoon",
    gradeLevel: "Grade 1",
    section: "guamamela"
})
```

2. Count students in grade/section:
```javascript
db.students.countDocuments({
    gradeLevel: "Grade 1",
    section: "guamamela"
})
// Should be 7 (all students in that class)
```

3. Verify the one enrolled student:
```javascript
db.students.findOne({
    gradeLevel: "Grade 1",
    section: "guamamela",
    studentId: "STU-123221"
})
```

## Summary of Changes

| File | Change | Type |
|------|--------|------|
| `server/controllers/studentsController.js` | Added `getStudentsByTeacherSchedule()` function | Backend |
| `server/routes/studentsRoutes.js` | Added `/teacher/schedule` route | Backend |
| `mobile/lib/services/teacherService.dart` | Updated `getClassStudents()` method | Frontend |
| `mobile/lib/pages/teachers/schedule.dart` | Updated calls to pass `teacherName` | Frontend |

All changes are backward compatible. The old generic endpoint still works.
