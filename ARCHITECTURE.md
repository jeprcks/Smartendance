# Teacher Mobile Login - Architecture Diagram

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                      SMARTENDANCE SYSTEM                            │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────────────┐      ┌──────────────────────────┐
│   ADMIN WEB              │      │   FLUTTER MOBILE APP     │
│   (localhost:3000)       │      │   (iOS/Android)          │
│                          │      │                          │
│ ┌──────────────────────┐ │      │ ┌────────────────────┐   │
│ │ Teachers Page        │ │      │ │ LoginPage          │   │
│ ├──────────────────────┤ │      │ ├────────────────────┤   │
│ │ • List all teachers  │ │      │ │ • Teacher Tab      │   │
│ │ • Email              │ │      │ │ • Parent Tab       │   │
│ │ • Password           │ │      │ │ • Email Input      │   │
│ │ • Subject            │ │      │ │ • Password Input   │   │
│ │ • Role               │ │      │ │ • Login Button     │   │
│ └──────────────────────┘ │      │ └────────────────────┘   │
│                          │      │          ↓               │
│                          │      │ ┌────────────────────┐   │
│                          │      │ │ TeacherDashboard   │   │
│                          │      │ ├────────────────────┤   │
│                          │      │ │ • Profile Card     │   │
│                          │      │ │ • Stat Cards (4)   │   │
│                          │      │ │ • Attendance List  │   │
│                          │      │ │ • Logout Button    │   │
│                          │      │ └────────────────────┘   │
└──────────────────────────┘      └────────────────────────┘
        ↓                                    ↓
        └────────────────────┬──────────────┘
                             ↓
        ┌────────────────────────────────────┐
        │    BACKEND SERVER                  │
        │    (localhost:4000)                │
        │                                    │
        │ ┌──────────────────────────────┐  │
        │ │ Authentication Routes        │  │
        │ ├──────────────────────────────┤  │
        │ │ POST /api/auth/teacher-login │  │
        │ │   - Verify email/password    │  │
        │ │   - Generate JWT token       │  │
        │ │   - Return teacher data      │  │
        │ └──────────────────────────────┘  │
        │                                    │
        │ ┌──────────────────────────────┐  │
        │ │ History Routes (Attendance)  │  │
        │ ├──────────────────────────────┤  │
        │ │ GET /api/history             │  │
        │ │   - Get attendance records   │  │
        │ │                              │  │
        │ │ GET /api/history/stats       │  │
        │ │   - Get statistics           │  │
        │ │   - (present/absent/late)    │  │
        │ └──────────────────────────────┘  │
        │                                    │
        │ ┌──────────────────────────────┐  │
        │ │ Database                     │  │
        │ ├──────────────────────────────┤  │
        │ │ Teachers Collection          │  │
        │ │ Attendance Collection        │  │
        │ │ Students Collection          │  │
        │ └──────────────────────────────┘  │
        └────────────────────────────────────┘
```

---

## Data Flow Diagram

### Login Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                    TEACHER LOGIN SEQUENCE                        │
└──────────────────────────────────────────────────────────────────┘

1. Teacher enters credentials
   ┌─────────────────────────┐
   │ Email: teacher2@...     │
   │ Password: ••••••••      │
   │ [Login as Teacher]      │
   └─────────────────────────┘
            ↓
2. LoginPage._handleLogin()
   - Validate input fields
   - Call AuthService.teacherLogin()
            ↓
3. API Call: POST /api/auth/teacher-login
   {
     "email": "teacher2@school.com",
     "password": "password123"
   }
            ↓
4. Backend Authentication
   - Find teacher by email
   - Verify password (bcrypt)
   - Generate JWT token
            ↓
5. API Response (Success)
   {
     "token": "eyJhbGc...",
     "teacher": {
       "teacherId": "TCH-2025572",
       "name": "Francis Rey R. Ampoon",
       "email": "teacher2@school.com",
       "subject": "Physics",
       "role": "Teacher"
     }
   }
            ↓
6. Store Credentials
   - _storage.write('teacher_token', token)
   - _storage.write('teacher_id', teacherId)
   - _storage.write('teacher_name', name)
   - _storage.write('teacher_email', email)
   - _storage.write('teacher_subject', subject)
   - _storage.write('teacher_role', role)
            ↓
7. Navigate to TeacherDashboard
   ┌──────────────────────────┐
   │  TeacherDashboard        │
   │  ├─ Profile Card         │
   │  ├─ Statistics           │
   │  ├─ Attendance Records   │
   │  └─ Logout Button        │
   └──────────────────────────┘
```

### Dashboard Data Loading

```
┌──────────────────────────────────────────────────────────────────┐
│               TEACHER DASHBOARD DATA LOADING                     │
└──────────────────────────────────────────────────────────────────┘

Dashboard Initializes
        ↓
    _loadDashboardData()
        ↓
  ┌─────┴─────┐
  ↓           ↓
GET Stats   GET Records
  ↓           ↓
API Call  API Call
  ↓           ↓
/stats    /history?page=1&limit=50
  ↓           ↓
Parse    Parse
Response Response
  ↓           ↓
{          {
  present:45  records: [
  absent: 5    {
  late: 3      studentName: "John",
  cutting: 2   status: "Present",
  total: 55    subject: "Math"
}            }
  ↓           ↓
setState    setState
Updates    Updates
  ↓           ↓
Display Stat  Display Record
Cards         Cards (List)
  ↓           ↓
  └─────┬─────┘
        ↓
  User sees complete
  dashboard with all
  data loaded
```

### Persistent Login Flow

```
┌──────────────────────────────────────────────────────────────────┐
│           PERSISTENT LOGIN (App Restart)                         │
└──────────────────────────────────────────────────────────────────┘

App Launches
    ↓
AuthWrapper.initState()
    ↓
_checkAuthStatus()
    ↓
Read from FlutterSecureStorage
    ├─ Check 'teacher_token'
    ├─ Check 'parent_token'
    └─ Other keys...
    ↓
If 'teacher_token' exists:
    ├─ Load teacher_id
    ├─ Load teacher_name
    ├─ Load teacher_email
    ├─ Load teacher_subject
    ├─ Load teacher_role
    └─ Set _userType = 'teacher'
    ↓
setState(_isLoggedIn = true)
    ↓
build() called
    ├─ Check _isLoggedIn ✓
    ├─ Check _userType ✓
    └─ Return TeacherDashboard
    ↓
Teacher sees dashboard
(No login needed!)

Alternative: If 'parent_token' exists
    → Show ParentDashboard instead

Alternative: If no tokens exist
    → Show LoginPage
```

---

## Class Structure Diagram

### TeacherService (Service Layer)

```
┌─────────────────────────────────────┐
│      TeacherService (static)        │
├─────────────────────────────────────┤
│ - baseUrl: String                   │
├─────────────────────────────────────┤
│ + getTeacherProfile()               │
│ + getAttendanceRecords()            │
│ + getAttendanceStats()              │
│ + getClassStudents()                │
│ + updateAttendanceRecord()          │
│ + getTeacherSchedule()              │
└─────────────────────────────────────┘
         ↓
    HTTP Requests
         ↓
    Backend API
```

### TeacherDashboard (UI Layer)

```
┌──────────────────────────────────────┐
│   TeacherDashboard (StatefulWidget) │
├──────────────────────────────────────┤
│ Properties:                           │
│ - token: String                      │
│ - teacherId: String                  │
│ - teacherName: String                │
│ - email: String                      │
│ - subject: String?                   │
│ - role: String?                      │
│ - onLogout: VoidCallback?            │
├──────────────────────────────────────┤
│ State Variables:                      │
│ - _isLoading: bool                   │
│ - _attendanceStats: Map              │
│ - _attendanceRecords: List           │
│ - _error: String?                    │
├──────────────────────────────────────┤
│ Methods:                              │
│ + initState()                        │
│ + _loadDashboardData()               │
│ + _handleLogout()                    │
│ + _buildProfileCard()                │
│ + _buildStatisticsSection()          │
│ + _buildAttendanceRecordsSection()   │
│ + build()                            │
└──────────────────────────────────────┘
         ↓
    Renders UI Widgets
         ↓
    User sees Dashboard
```

### AuthWrapper (State Management)

```
┌──────────────────────────────────────┐
│     AuthWrapper (StatefulWidget)    │
├──────────────────────────────────────┤
│ State:                                │
│ - _isLoading: bool                   │
│ - _isLoggedIn: bool                  │
│ - _userType: String                  │
│                                      │
│ Parent State:                         │
│ - _token: String                     │
│ - _parentId: String                  │
│ - _parentName: String                │
│ - _children: List                    │
│                                      │
│ Teacher State:                        │
│ - _token: String                     │
│ - _teacherId: String                 │
│ - _teacherName: String               │
│ - _subject: String                   │
│ - _role: String                      │
├──────────────────────────────────────┤
│ Methods:                              │
│ + initState()                        │
│ + _checkAuthStatus()                 │
│ + _handleLogout()                    │
│ + _handleLoginSuccess()              │
│ + build()                            │
└──────────────────────────────────────┘
         ↓
    Routes to appropriate dashboard
    (ParentDashboard / TeacherDashboard)
```

---

## Component Hierarchy

```
MyApp
 └─ MaterialApp
     └─ AuthWrapper (Persistent Auth Check)
         ├─ (if teacher logged in)
         │   └─ TeacherDashboard
         │       ├─ AppBar
         │       ├─ Scaffold
         │       └─ SingleChildScrollView
         │           └─ Column
         │               ├─ _buildProfileCard()
         │               │   ├─ Avatar
         │               │   ├─ Name
         │               │   ├─ Email
         │               │   └─ Subject Chip
         │               │
         │               ├─ _buildStatisticsSection()
         │               │   └─ GridView (2x2)
         │               │       ├─ StatCard (Present)
         │               │       ├─ StatCard (Absent)
         │               │       ├─ StatCard (Late)
         │               │       └─ StatCard (Cutting)
         │               │
         │               └─ _buildAttendanceRecordsSection()
         │                   └─ ListView
         │                       └─ AttendanceRecordCard (x10)
         │
         ├─ (if parent logged in)
         │   └─ ParentDashboard (existing)
         │
         └─ (if not logged in)
             └─ LoginPage
                 ├─ PageView
                 │   ├─ TeacherLoginForm
                 │   └─ ParentLoginForm
                 └─ Dot Indicators
```

---

## State Management Flow

```
┌─────────────────────────────────────────────────────────────┐
│           AUTH STATE MANAGEMENT                            │
└─────────────────────────────────────────────────────────────┘

LOGIN FLOW:
    User Input
        ↓
    LoginPage.setState()
        ↓
    AuthService.teacherLogin()
        ↓
    Store Credentials
        ↓
    Navigate to Dashboard

RESTART FLOW:
    App Launch
        ↓
    AuthWrapper.initState()
        ↓
    _checkAuthStatus()
        ↓
    AuthWrapper.setState()
        ↓
    build() → Route based on state

LOGOUT FLOW:
    Logout Button
        ↓
    _handleLogout()
        ↓
    Clear SecureStorage
        ↓
    AuthWrapper.setState()
        ↓
    build() → LoginPage

PARALLEL STATE:
    ┌─ _isLoading: bool
    ├─ _isLoggedIn: bool
    ├─ _userType: 'parent'|'teacher'
    ├─ Parent State Variables
    └─ Teacher State Variables
```

---

## Security Flow

```
┌──────────────────────────────────────┐
│     CREDENTIAL SECURITY              │
└──────────────────────────────────────┘

Admin Web:
  Store in Database
  └─ Password: bcrypt hashed
  └─ Never transmitted in plain

Login:
  1. User → Email + Plain Password
  2. Network → HTTPS (when configured)
  3. Backend → Verify hash with bcrypt
  4. Response → JWT Token only
  5. No password in response!

Storage:
  Platform-specific encryption:
  ├─ Android: Keystore
  ├─ iOS: Keychain
  └─ Never plain text

Logout:
  ├─ Clear token from storage
  ├─ Clear all credentials
  ├─ Clear session data
  └─ Force re-login on next use

Token:
  ├─ JWT format
  ├─ 7-day expiration
  ├─ User info embedded
  └─ Used for API auth
```

---

## File Dependencies

```
teacherService.dart
    ├─ dart:convert
    ├─ package:http
    └─ (no Flutter dependencies)

teacher.dart
    ├─ package:flutter
    ├─ package:flutter_secure_storage
    ├─ teacherService.dart
    └─ Material Design

login.dart
    ├─ package:flutter
    ├─ package:flutter_secure_storage
    ├─ authService.dart
    ├─ parent.dart (ParentDashboard)
    ├─ teacher.dart (TeacherDashboard) ← NEW
    └─ Material Design

authWrapper.dart
    ├─ package:flutter
    ├─ package:flutter_secure_storage
    ├─ dart:convert
    ├─ login.dart (LoginPage)
    ├─ parent.dart (ParentDashboard)
    ├─ teacher.dart (TeacherDashboard) ← NEW
    └─ Material Design
```

---

## API Endpoint Mapping

```
Frontend API Calls → Backend Endpoints

LOGIN:
  POST /api/auth/teacher-login
    ← teacherLogin() controller
    ← Teacher.findOne()
    ← bcrypt.compare()
    → JWT Token + Teacher Data

DASHBOARD DATA:
  GET /api/history/stats
    ← getAttendanceStats() controller
    ← AttendanceRecord.aggregate()
    → Stats object

  GET /api/history?page=1&limit=50
    ← getAllAttendanceRecords() controller
    ← AttendanceRecord.find()
    → Records array + pagination

OPTIONAL (Not yet implemented):
  GET /api/teachers/{id}
  GET /api/schedules
  GET /api/students?gradeLevel=...
  PATCH /api/history/{id}
```

---

## Summary Architecture

```
Three-Layer Architecture:
┌────────────────────┐
│   Presentation     │  ← LoginPage, TeacherDashboard
│   (UI Widgets)     │
├────────────────────┤
│   Business Logic   │  ← TeacherService, AuthService
│   (Services)       │
├────────────────────┤
│   Data Access      │  ← FlutterSecureStorage
│   (Storage & API)  │
├────────────────────┤
│   External Services│  ← Backend API (localhost:4000)
│   (Backend)        │    Database (MongoDB)
└────────────────────┘

Clean Architecture:
- Separation of concerns
- Easy to test
- Easy to maintain
- Easy to extend
```

