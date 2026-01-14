# Teacher Mobile App - Quick Start Guide

## Login Instructions

### Step 1: Open Flutter Mobile App
The app shows a login page with two tabs at the bottom:
- Teacher (first tab - GREEN)
- Parent (second tab - PINK)

### Step 2: Select Teacher Tab
- Swipe left or tap the green dot to select "Teacher"
- You'll see "Welcome, Teacher" heading
- Subtitle: "Enter your teacher credentials"

### Step 3: Enter Credentials
Use the teacher credentials from the Admin Web:

**Example from Admin Web:**
```
Teacher ID: TCH-2025922
Username: alliamae
Email: alliamae@school.com (use this or username)
Password: (as shown in admin web)
Subject: Mathematics
Role: Teacher
```

**Enter in App:**
- **Email or ID field**: Enter email or teacher ID
  - Option 1: `alliamae@school.com`
  - Option 2: `TCH-2025922`
  - Option 3: `alliamae`
- **Password field**: Enter the password from admin web

### Step 4: Tap "Login as Teacher"
- Green button with login text
- App will authenticate with backend
- Shows loading spinner while processing

### Step 5: Welcome Message
- Success: "Welcome [Teacher Name]!"
- Auto-navigates to Teacher Dashboard

---

## Teacher Dashboard Overview

### Top Section: Profile Card
```
┌─────────────────────────────────┐
│  ┌─┐                            │
│  │A│  Francis Rey R. Ampoon     │
│  └─┘  teacher2@school.com       │
│       [Physics]                 │
└─────────────────────────────────┘
```
- Teacher initials in circle
- Full name
- Email address
- Subject chip

### Middle Section: Attendance Statistics (4 Cards in 2x2 Grid)

```
┌──────────────┐  ┌──────────────┐
│ ✓ PRESENT    │  │ ✗ ABSENT     │
│     45       │  │      5       │
└──────────────┘  └──────────────┘

┌──────────────┐  ┌──────────────┐
│ ⏰ LATE      │  │ ⚠ CUTTING    │
│      3       │  │      2       │
└──────────────┘  └──────────────┘
```

**Color Coding:**
- 🟢 Present = Green
- 🔴 Absent = Red  
- 🟠 Late = Orange
- 🟣 Cutting = Purple

### Bottom Section: Recent Attendance Records

Shows last 10 records in list format:

```
┌─────────────────────────────────┐
│ ● John Doe                      │
│   Subject: English              │
│                    [Present]    │
├─────────────────────────────────┤
│ ● Jane Smith                    │
│   Subject: Mathematics          │
│                    [Late]       │
├─────────────────────────────────┤
│ ● (more records...)             │
└─────────────────────────────────┘

[View All Records Button]
```

---

## Features Available

### ✅ Currently Available
1. **View Profile** - Name, email, subject, role
2. **Check Statistics** - Present, Absent, Late, Cutting counts
3. **View Attendance Records** - Recent 10 records with status
4. **Logout** - Secure logout with confirmation
5. **Persistent Login** - Auto-login on app restart

### 🚀 Coming Soon
- View full attendance history
- Filter by class/subject
- Edit attendance records
- Export attendance report
- View class schedule
- Student photos and details

---

## Admin Web Data → Flutter App

### Data Flow Chart

```
ADMIN WEB (Browser at localhost:3000)
├── Dashboard
├── Teachers Page
│   ├── Teacher List (TCH-2025922, admin, etc.)
│   └── Teacher Details (Email, Password, Subject)
└── Students & History

    ↓↓↓ (Teacher credentials stored in backend database)

BACKEND API (localhost:4000)
├── POST /api/auth/teacher-login (authentication)
└── GET /api/history (attendance records)

    ↓↓↓ (Teacher logs in with email + password)

FLUTTER APP (Mobile Phone)
├── Login Page (Email/ID + Password)
├── Authentication (JWT Token)
└── Teacher Dashboard
    ├── Profile Display
    ├── Statistics
    └── Attendance Records
```

### Example Teacher Login from Admin Web

**Admin Web Shows:**
```
Profile: 👤
Teacher ID: TCH-2025572
Username: teacher2
Full Name: Francis Rey R. Ampoon
Role: Teacher
Subject: Physics
Email: teacher2@school.com
Status: Active
```

**In Flutter App:**
- Enter email: `teacher2@school.com`
- Enter password: `(from admin web)`
- ✅ Login successful!
- Redirects to Teacher Dashboard
- Shows: Francis Rey R. Ampoon | Physics | Statistics | Records

---

## Troubleshooting

### Problem: "Invalid email or password"
**Solution:**
1. Check email spelling exactly (case-sensitive)
2. Verify password from admin web
3. Ensure teacher exists in system
4. Try with teacher ID instead of email

### Problem: "Connection failed"
**Solution:**
1. Ensure backend server running: `npm run dev` (in server folder)
2. Check localhost:4000 is accessible
3. Check network connection
4. For Android emulator, backend should be at `10.0.2.2:4000`

### Problem: "App shows loading forever"
**Solution:**
1. Check network connectivity
2. Close and reopen app
3. Restart backend server
4. Clear app cache

### Problem: "Dashboard shows no records"
**Solution:**
1. This is normal if no attendance records exist yet
2. Records appear as students check in via QR code
3. Check admin web to verify attendance data
4. Tap retry button to refresh

---

## Backend Setup Verification

To ensure everything works, verify these backend endpoints:

```bash
# 1. Test teacher login endpoint
curl -X POST http://localhost:4000/api/auth/teacher-login \
  -H "Content-Type: application/json" \
  -d '{"email":"teacher2@school.com","password":"password123"}'

# Response should include: token, teacher: { teacherId, name, email, subject }

# 2. Test attendance records (requires valid token)
curl -X GET "http://localhost:4000/api/history?page=1&limit=50" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# 3. Test attendance stats
curl -X GET http://localhost:4000/api/history/stats \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## File Locations Reference

### Flutter App Files
```
mobile/
├── lib/
│   ├── loginpage.dart/
│   │   └── login.dart (UPDATED - now supports teacher login)
│   ├── authWrapper.dart (UPDATED - supports both parent/teacher)
│   ├── pages/
│   │   ├── parents/
│   │   │   └── parent.dart (existing parent dashboard)
│   │   └── teachers/
│   │       └── teacher.dart (NEW - teacher dashboard)
│   └── services/
│       ├── authService.dart (existing auth methods)
│       └── teacherService.dart (NEW - teacher API service)
└── pubspec.yaml (has flutter_secure_storage)
```

### Backend Files (Already Implemented)
```
server/
├── routes/
│   └── authRoutes.js (teacher-login endpoint)
├── controllers/
│   └── authController.js (teacherLogin function)
├── models/
│   └── teacherSchema.js (teacher data model)
└── index.js (server running on :4000)
```

---

## Security Notes

### Credentials Storage
- Passwords stored in encrypted FlutterSecureStorage (platform-specific)
- Android: Android Keystore
- iOS: Keychain
- Tokens auto-cleared on logout

### Token Management
- JWT tokens expire in 7 days
- Re-login required after expiration
- Token stored securely, not in plain text

### API Communication
- HTTPS ready (configure as needed)
- Bearer token authentication
- No passwords transmitted after login

---

## Development Notes

### Adding More Features

**To add viewing all attendance records:**
1. Create new page: `mobile/lib/pages/teachers/attendance_history.dart`
2. Add pagination support in service
3. Link "View All Records" button to new page

**To add class filtering:**
1. Add class selection dropdown to dashboard
2. Pass gradeLevel/section to TeacherService methods
3. Filter records by selected class

**To add schedule view:**
1. Use `TeacherService.getTeacherSchedule()` (already implemented)
2. Create new page: `mobile/lib/pages/teachers/schedule.dart`
3. Display schedule in calendar/list format

---

## Success Checklist

After implementation, verify:

✅ Teacher can login with email/password from admin web
✅ Profile displays correctly (name, email, subject)
✅ Statistics show accurate numbers
✅ Attendance records list displays
✅ Logout works and clears data
✅ App auto-logs in on restart
✅ No crashes on network errors
✅ Color coding matches admin web
✅ UI is responsive and clean
✅ No hardcoded test data

---

## Support & Contact

For issues or questions:
1. Check console logs in Flutter DevTools
2. Verify backend is running
3. Check admin web for test credentials
4. Review backend logs for authentication errors

