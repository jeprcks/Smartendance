# Quick Testing Guide - Teacher Mobile Login

## ✅ What Was Implemented

Teachers can now login to the Flutter mobile app using credentials from the admin web dashboard.

---

## 🚀 Quick Start (5 Minutes)

### Step 1: Ensure Backend is Running
```bash
# In server/ directory
npm run dev
# Should output: "Server running on port 4000"
```

### Step 2: Run Flutter App
```bash
# In mobile/ directory
flutter pub get
flutter run
# Or open in Android Studio / Xcode
```

### Step 3: Login as Teacher
1. Open app → Shows LoginPage
2. First tab is already selected (Teacher - GREEN)
3. Enter teacher email: From Admin Web
4. Enter password: From Admin Web  
5. Tap "Login as Teacher" button
6. ✅ Should navigate to TeacherDashboard

---

## 📋 Test Credentials

### From Admin Web Teachers Table
Check `localhost:3000/home/teachers` for credentials:

**Example Teachers:**
```
1. Teacher ID: TCH-2025922
   Username: alliamae
   Email: alliamae@school.com
   Subject: Mathematics
   Status: Active

2. Teacher ID: TCH-2025862
   Username: admin
   Email: (not shown in table)
   Subject: Filipino
   Status: Active

3. Teacher ID: TCH-2025572
   Username: teacher2
   Email: teacher2@school.com
   Subject: Physics
   Status: Active

4. Teacher ID: TCH-2025701
   Username: mikeyosnnnnn
   Email: (check in admin)
   Subject: Mathematics
   Status: Active
```

**To Get Exact Credentials:**
1. Open Admin Web: `localhost:3000`
2. Login as admin
3. Go to Teachers page
4. Click "View" button on any teacher
5. See all fields including password

---

## ✅ Test Cases

### Test 1: Successful Login
```
Steps:
  1. Select Teacher tab (green dot, should be default)
  2. Enter valid email/username
  3. Enter correct password
  4. Tap "Login as Teacher"

Expected Result:
  ✓ Loading spinner appears
  ✓ "Welcome [TeacherName]!" toast shows
  ✓ Navigate to TeacherDashboard
  ✓ Dashboard shows:
    - Teacher name in profile card
    - Email address
    - Subject (e.g., "Mathematics")
    - 4 stat cards with numbers
    - Attendance records list
```

### Test 2: Invalid Password
```
Steps:
  1. Enter correct email
  2. Enter wrong password
  3. Tap login

Expected Result:
  ✗ Error toast: "Login failed: Invalid email or password"
  ✗ Stay on login page
  ✗ Fields cleared
  ✗ Can retry with correct password
```

### Test 3: Invalid Email
```
Steps:
  1. Enter non-existent email
  2. Enter any password
  3. Tap login

Expected Result:
  ✗ Error toast: "Login failed: Invalid email or password"
  ✗ Stay on login page
```

### Test 4: Empty Fields
```
Steps:
  1. Leave email field empty
  2. Leave password field empty
  3. Tap login

Expected Result:
  ! Toast: "Please fill in all fields"
  ✗ No login attempt made
```

### Test 5: Dashboard Display
```
After successful login:

Expected Display:
  ✓ AppBar with "Teacher Dashboard" title
  ✓ Logout button (red) in top right
  ✓ Profile card (green gradient)
    - Teacher name initials in circle
    - Teacher full name
    - Email
    - Subject chip
  ✓ "Attendance Statistics" heading
  ✓ 4 stat cards in 2x2 grid:
    - Present (Green, icon: ✓)
    - Absent (Red, icon: ✗)
    - Late (Orange, icon: ⏰)
    - Cutting (Purple, icon: ⚠)
  ✓ "Recent Attendance Records" heading
  ✓ List of records with:
    - Student name
    - Subject
    - Status (colored badge)
```

### Test 6: Persistent Login
```
Steps:
  1. Login as teacher
  2. Verify dashboard loads
  3. Close app completely
  4. Reopen app

Expected Result:
  ✓ Dashboard loads immediately
  ✓ No login page shown
  ✓ Same teacher data visible
  ✓ No login needed
```

### Test 7: Logout
```
Steps:
  1. Login as teacher
  2. Verify dashboard shows
  3. Tap logout button (top right)
  4. Confirm "Yes, logout" in dialog

Expected Result:
  ✓ Confirmation dialog appears
  ✓ Credentials cleared from storage
  ✓ Return to LoginPage
  ✓ All fields empty
  ✓ Ready for next login
```

### Test 8: Tab Switching
```
Steps:
  1. In LoginPage, tap parent tab (pink dot)
  2. Verify form changes to "Welcome, Parent"
  3. Tap teacher tab (green dot)
  4. Verify form changes back to "Welcome, Teacher"

Expected Result:
  ✓ Forms switch with animation
  ✓ Fields clear between tabs
  ✓ Color scheme changes
  ✓ Icons change
  ✓ Titles update
```

### Test 9: Error Recovery
```
Steps:
  1. Try to login with internet off
  2. Get error message
  3. Turn internet back on
  4. Try login again

Expected Result:
  ✓ Error message shown
  ✓ Retry is possible
  ✓ Successful login after error
```

### Test 10: Data Loading
```
After successful login:

Expected Behavior:
  ✓ Loading spinner visible initially
  ✓ Data loads within 2-3 seconds
  ✓ Stats cards populate with numbers
  ✓ Attendance list fills with records
  ✓ Error message if data fetch fails
  ✓ Retry button available on error
```

---

## 🐛 Common Issues & Fixes

### Issue: "Connection refused" Error
```
Cause: Backend server not running
Fix:
  1. Open terminal
  2. cd server/
  3. npm run dev
  4. Verify "Server running on port 4000"
  5. Try login again
```

### Issue: "Invalid email or password" for Valid Credentials
```
Cause: Password mismatch or network delay
Fix:
  1. Check admin web for exact password
  2. Ensure no extra spaces in inputs
  3. Verify teacher exists in admin
  4. Restart backend
  5. Try again
```

### Issue: Dashboard Shows No Records
```
Cause: No attendance data in system yet
Fix:
  1. This is normal if first time
  2. Records appear when students check in
  3. Stats show zero values initially
  4. Can still verify UI is working
```

### Issue: App Crashes on Login
```
Cause: Unhandled error, check logs
Fix:
  1. Open Terminal/Console in IDE
  2. Look for error stack trace
  3. Common: Network error, invalid token
  4. Restart app
  5. Try with different teacher
```

### Issue: Stays on Loading Screen
```
Cause: Network issue, infinite loading
Fix:
  1. Check internet connection
  2. Verify backend is accessible
  3. Restart app
  4. Check backend console for errors
```

### Issue: Logout Not Working
```
Cause: Storage issue
Fix:
  1. Verify flutter_secure_storage installed
  2. Check app permissions
  3. Restart app
  4. Clear app cache: Settings → Apps → [App] → Clear Cache
```

---

## 📊 Logging & Debugging

### View Console Logs
```
In VS Code / Android Studio:
  1. Open Debug Console
  2. Filter by "teacher" or "login"
  3. Look for "===" delimited sections
  4. Logs show request/response details

Key Log Sections:
  === LOGIN RESPONSE === (before dashboard load)
  === CHECK AUTH STATUS === (on app startup)
  === Teacher Dashboard Init === (when dashboard loads)
```

### Check Network Calls
```
Android Device Monitor:
  1. Android Studio → Tools → Device Monitor
  2. Monitor network traffic
  3. Watch for:
     - POST /api/auth/teacher-login
     - GET /api/history
     - GET /api/history/stats

Safari DevTools (iOS):
  1. Mac → Safari → Develop → [Device]
  2. Inspect network tab
```

### View Stored Data
```
Android Device Monitor:
  1. File Explorer
  2. Navigate to app's data directory
  3. Look in /data/data/[package_name]/

To view FlutterSecureStorage (iOS/Android):
  Note: Encrypted, can't view directly
  Only way is to logout (which clears it)
```

---

## 🧪 Manual API Testing

### Test Teacher Login Endpoint
```bash
# Test with curl
curl -X POST http://localhost:4000/api/auth/teacher-login \
  -H "Content-Type: application/json" \
  -d '{"email":"teacher2@school.com","password":"password123"}'

# Expected Response:
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "teacher": {
    "_id": "507f1f77bcf86cd799439011",
    "teacherId": "TCH-2025572",
    "name": "Francis Rey R. Ampoon",
    "email": "teacher2@school.com",
    "subject": "Physics",
    "role": "Teacher"
  }
}
```

### Test Attendance Stats Endpoint
```bash
# Replace YOUR_TOKEN with actual token from login
curl -X GET http://localhost:4000/api/history/stats \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected Response:
{
  "stats": {
    "present": 45,
    "absent": 5,
    "late": 3,
    "cutting": 2,
    "total": 55
  }
}
```

### Test Attendance Records Endpoint
```bash
curl -X GET "http://localhost:4000/api/history?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected Response:
{
  "records": [
    {
      "_id": "507f...",
      "studentName": "John Doe",
      "status": "Present",
      "subject": "Mathematics",
      "scanTime": "2025-12-04T09:00:00Z"
    },
    ...
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalRecords": 50
  }
}
```

---

## 📸 Expected Screenshots

### LoginPage (Teacher Tab)
```
┌─────────────────────────────┐
│ 🏫 Umapad Elementary School │
├─────────────────────────────┤
│                             │
│          👤                 │
│                             │
│     Welcome, Teacher        │
│  Enter your teacher creds   │
│                             │
│ [Email field] ✉️            │
│ [Password field] 🔒         │
│ [Password toggle 👁]        │
│                             │
│ Forgot Password?            │
│                             │
│ [Login as Teacher] (GREEN)  │
│                             │
│ Don't have account? Sign up │
│                             │
├─────────────────────────────┤
│ ● ○                         │  (dots: Teacher | Parent)
│ Teacher                     │
└─────────────────────────────┘
```

### TeacherDashboard (After Login)
```
┌─────────────────────────────┐
│ 📊 Teacher Dashboard | 🚪   │
├─────────────────────────────┤
│ ┌────────────────────────┐  │
│ │ JA  Francis Rey        │  │ Profile Card
│ │     teacher2@...       │  │ (Green)
│ │     [Physics]          │  │
│ └────────────────────────┘  │
│                             │
│ Attendance Statistics       │
│ ┌──────────┬──────────┐    │
│ │ ✓        │ ✗        │    │ Stat Cards
│ │  45      │  5       │    │ (Green, Red,
│ │ PRESENT  │ ABSENT   │    │  Orange, Purple)
│ └──────────┴──────────┘    │
│ ┌──────────┬──────────┐    │
│ │ ⏰       │ ⚠        │    │
│ │  3       │  2       │    │
│ │ LATE     │ CUTTING  │    │
│ └──────────┴──────────┘    │
│                             │
│ Recent Attendance Records   │
│ ┌────────────────────────┐  │
│ │ ● John Doe             │  │
│ │   Subject: English     │  │
│ │              [Present] │  │ Record Card
│ └────────────────────────┘  │
│ ┌────────────────────────┐  │
│ │ ● Jane Smith           │  │
│ │   Subject: Math        │  │
│ │              [Late]    │  │
│ └────────────────────────┘  │
│ ...more records...          │
│                             │
│ [View All Records] Button   │
└─────────────────────────────┘
```

---

## ✨ Success Criteria

All of the following should be true:

- ✅ Teacher can login with email from admin web
- ✅ Teacher can login with username from admin web
- ✅ Dashboard loads after successful login
- ✅ Profile card shows teacher info correctly
- ✅ 4 stat cards display with proper colors
- ✅ Attendance records list shows data
- ✅ Logout clears all data
- ✅ App auto-logins on restart (persistent)
- ✅ Tab switching works (Teacher/Parent)
- ✅ Error messages are user-friendly
- ✅ No app crashes
- ✅ Network timeouts handled gracefully

---

## 📝 Sign-Off Checklist

Before considering implementation complete:

- [ ] Backend running on localhost:4000
- [ ] Flutter app running on emulator/device
- [ ] Can login with real teacher credentials
- [ ] Dashboard displays all sections
- [ ] Statistics show numbers (not zero)
- [ ] Attendance records list is not empty
- [ ] Logout works and clears data
- [ ] Can re-login after logout
- [ ] App survives network errors
- [ ] Console has no error messages
- [ ] UI looks clean and professional
- [ ] Colors match design (green theme)

---

## 🎉 Done!

If all test cases pass → Implementation is complete and ready for production!

