# Scanner Mobile App - Complete Architecture & Flow

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                  SCANNER MOBILE APP (Flutter)                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              HomePage (Connection Manager)               │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │ - Check Server Connection on Startup              │  │  │
│  │  │ - Display Connection Status (Green/Red)           │  │  │
│  │  │ - Show Server IP                                  │  │  │
│  │  │ - Disable Scanner if No Connection               │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                           ↓ Tap "Scan"                         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │           ScanningPage (QR Scanner)                       │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │ - Open Camera                                      │  │  │
│  │  │ - Scan QR Code                                    │  │  │
│  │  │ - Extract: {"id": "S001"}                        │  │  │
│  │  │ - Call: fetchStudentInfo(qrData)                 │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                           ↓                                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  StudentService (fetchstudents.dart)                     │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │ Service Methods:                                   │  │  │
│  │  │ • findWorkingUrl()                                 │  │  │
│  │  │   Tests: [10.0.2.2, localhost, 192.168.x.x]      │  │  │
│  │  │   Returns: first successful URL                   │  │  │
│  │  │                                                    │  │  │
│  │  │ • fetchStudentInfo(qrData)                         │  │  │
│  │  │   POST to: /api/students/scan-qr                 │  │  │
│  │  │   Payload: {qrData, subject, deviceInfo}         │  │  │
│  │  │   Returns: student info + attendance record      │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓ (HTTP)
                    Network Request to Server
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│              SMARTENDANCE SERVER (Node.js/Express)              │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Route: POST /api/students/scan-qr                       │  │
│  │  (studentsRoutes.js -> studentsController.js)            │  │
│  └──────────────────────────────────────────────────────────┘  │
│                           ↓                                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  getStudentByQRCode(req, res)                           │  │
│  │                                                           │  │
│  │  1. Parse QR Data                                        │  │
│  │     Input: {"id": "S001"}                               │  │
│  │                                                           │  │
│  │  2. Find Student in MongoDB                             │  │
│  │     Query: Student.findOne({studentId: "S001"})        │  │
│  │                                                           │  │
│  │  3. Create Attendance Record                            │  │
│  │     New History({                                        │  │
│  │       studentId: "S001",                               │  │
│  │       studentName: "John Doe",                         │  │
│  │       subject: "General",                              │  │
│  │       status: "Present",                               │  │
│  │       scanTime: new Date(),                            │  │
│  │       location, deviceInfo, notes                      │  │
│  │     })                                                  │  │
│  │                                                           │  │
│  │  4. Return Student Info                                 │  │
│  │     {                                                    │  │
│  │       success: true,                                   │  │
│  │       student: {studentId, fullName, photo,           │  │
│  │                 gradeLevel, section, ...}              │  │
│  │     }                                                    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                           ↓                                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │             MongoDB Database                             │  │
│  │                                                           │  │
│  │  Collections:                                            │  │
│  │  ├─ students          ← Read student info              │  │
│  │  └─ histories/        ← Create attendance record       │  │
│  │      attendanceRecords                                 │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓ (Response)
                    JSON Response to Mobile
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│           Student Information Display (Mobile)                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  StudentInformationDisplay Widget:                              │
│  ├─ Student Photo (with animation)                             │
│  ├─ Full Name                                                  │
│  ├─ Grade Level & Section                                      │
│  ├─ Gender & Shift                                             │
│  ├─ Email & Phone                                              │
│  ├─ Scan Timestamp                                             │
│  └─ Action Buttons:                                            │
│     ├─ Scan Another                                            │
│     └─ Close                                                   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow - QR Code Scanning

```
START
  │
  ├─ [HomePage] Load
  │   ├─ Call: StudentService.findWorkingUrl()
  │   │   ├─ Test: http://10.0.2.2:4000/api/students
  │   │   ├─ Test: http://localhost:4000/api/students
  │   │   ├─ Test: http://192.168.1.10:4000/api/students
  │   │   └─ Return: First working URL or null
  │   │
  │   ├─ Update UI
  │   │   ├─ If Connected: Show GREEN ✓ + IP
  │   │   └─ If Not: Show RED ✗ + Error message
  │   │
  │   └─ Set Scanner Button State
  │       ├─ Connected: ENABLED (green)
  │       └─ Not Connected: DISABLED (grey)
  │
  ├─ User Taps "Scan QR Code"
  │   └─ Navigate to ScanningPage
  │
  ├─ [ScanningPage] Load
  │   ├─ Initialize camera
  │   ├─ Show live preview
  │   └─ Listen for QR codes
  │
  ├─ QR Code Detected
  │   ├─ Extract raw value: "qrData"
  │   ├─ Show snackbar: "QR Code scanned successfully!"
  │   └─ Call: fetchStudentInfo(qrData)
  │
  ├─ [Service] Prepare Request
  │   ├─ Parse QR: Extract {"id": "S001"}
  │   ├─ Prepare body:
  │   │   {
  │   │     "qrData": "{\"id\": \"S001\"}",
  │   │     "subject": "General",
  │   │     "notes": "QR Code scanned...",
  │   │     "deviceInfo": {
  │   │       "platform": "Flutter",
  │   │       "timestamp": "2025-12-10T..."
  │   │     }
  │   │   }
  │   └─ POST to: {workingUrl}/api/students/scan-qr
  │
  ├─ [Server] Process Request
  │   ├─ Parse request body
  │   ├─ Extract studentId: "S001"
  │   ├─ Query DB: Student.findOne({studentId: "S001"})
  │   │   │
  │   │   ├─ If Found:
  │   │   │   ├─ Create attendance record
  │   │   │   │   └─ Save to History collection
  │   │   │   │
  │   │   │   └─ Return 200 + student info
  │   │   │
  │   │   └─ If Not Found:
  │   │       └─ Return 404 + error message
  │   │
  │   └─ Send response
  │
  ├─ [Mobile] Handle Response
  │   ├─ If Success (200):
  │   │   ├─ Parse student data
  │   │   ├─ Update UI state
  │   │   └─ Show StudentInformationDisplay
  │   │
  │   └─ If Error:
  │       ├─ Display error message
  │       ├─ Show retry button
  │       └─ Keep camera active
  │
  ├─ [Display] Show Student Info
  │   ├─ Animate in student card
  │   ├─ Show all details
  │   └─ Show action buttons
  │
  └─ User Actions
      ├─ "Scan Another" → Back to camera
      └─ "Close" → Back to home
```

## Network Connection Detection

```
findWorkingUrl() Algorithm:
│
├─ Initialize: workingUrl = null
├─ Create: possibleUrls = [...]
│
├─ LOOP through each URL:
│   │
│   ├─ Try: GET {url}/api/students
│   │       (timeout: 3 seconds)
│   │
│   ├─ If Response 200:
│   │   ├─ Set: workingUrl = {url}
│   │   ├─ Log: "✅ Working URL found: {url}"
│   │   └─ Return: {url}
│   │
│   └─ If Error/Timeout:
│       └─ Log: "❌ Failed: {url} - {error}"
│
└─ If All Failed:
    ├─ Log: "❌ No working URL found"
    └─ Return: null
```

## Database Schema - Attendance Record

```json
History Document Created on QR Scan:
{
  "_id": ObjectId("..."),
  "studentId": "S001",
  "studentName": "John Doe",
  "subject": "General",
  "scanTime": ISODate("2025-12-10T10:30:00.000Z"),
  "gradeLevel": "10",
  "section": "A",
  "shift": "Morning",
  "status": "Present",
  "qrCodeData": {
    "id": "S001"
  },
  "location": null,
  "deviceInfo": {
    "platform": "Flutter",
    "userAgent": "Smartendance Mobile App",
    "timestamp": "2025-12-10T10:30:00.000Z"
  },
  "notes": "QR Code scanned - Teacher can update status for specific subjects",
  "createdAt": ISODate("2025-12-10T10:30:00.000Z"),
  "updatedAt": ISODate("2025-12-10T10:30:00.000Z")
}
```

## Error Handling Scenarios

```
┌─────────────────────────────────────────────────────┐
│        Possible Error States & Recovery             │
├─────────────────────────────────────────────────────┤

1. NO SERVER CONNECTION
   Status: Red X in home screen
   Action: Show troubleshooting tips
   Recovery: "Retry Connection" button

2. INVALID QR CODE
   Error: "Invalid QR code data format"
   Action: Show error toast
   Recovery: Scan another QR code

3. STUDENT NOT FOUND
   Error: "Student not found"
   Status: 404
   Recovery: Verify student exists in DB

4. NETWORK TIMEOUT
   Error: "Network error: timeout"
   Action: Show error message
   Recovery: Retry or check network

5. SERVER ERROR
   Error: 500 + error details
   Action: Display error to user
   Recovery: Check server logs

6. INVALID REQUEST
   Error: "QR code data is required"
   Status: 400
   Recovery: Ensure valid QR code
```

## Component Hierarchy

```
MyApp
  └─ HomePage
      ├─ AppBar
      │  ├─ Connection Status Icon
      │  └─ Retry Button
      │
      ├─ Body
      │  ├─ QRCodeIconContainer
      │  ├─ TitleSection
      │  ├─ ConnectionStatusCard
      │  │  ├─ Status Icon
      │  │  └─ Status Text
      │  ├─ CameraScannerButton
      │  │  └─ isEnabled: boolean
      │  │
      │  └─ (Conditional) ErrorSection
      │     ├─ Error Message
      │     └─ Troubleshooting Tips
      │        └─ Retry Button
      │
      └─ ScanningPage (on navigate)
          ├─ AppBar
          │  ├─ Connection Status
          │  ├─ Refresh Button
          │  └─ Camera Switch Button
          │
          ├─ MobileScanner
          │  └─ QR Detection
          │
          └─ StudentInformationDisplay (on QR scan)
              ├─ Student Photo
              ├─ Student Details
              ├─ Animated Cards
              └─ Action Buttons
```

## Integration Checklist

- ✅ **Server Setup**
  - ✅ Express server running on port 4000
  - ✅ MongoDB connected
  - ✅ Student collection populated
  - ✅ CORS configured for mobile IPs
  - ✅ Route: POST /api/students/scan-qr

- ✅ **Mobile App Setup**
  - ✅ StudentService class configured
  - ✅ Network URLs updated for target device
  - ✅ HomePage shows connection status
  - ✅ Scanner button disabled when disconnected
  - ✅ Error handling implemented

- ✅ **QR Code Generation**
  - ✅ QR codes auto-generated on student creation
  - ✅ QR contains: {"id": "studentId"}
  - ✅ QR readable by mobile_scanner package

- ✅ **Attendance Recording**
  - ✅ History record created on scan
  - ✅ Status always "Present" for QR scans
  - ✅ Subject always "General" for QR scans
  - ✅ Timestamp and device info recorded

- ✅ **User Experience**
  - ✅ Visual connection feedback
  - ✅ Error messages clear and actionable
  - ✅ Animations for student info display
  - ✅ Quick navigation between pages
