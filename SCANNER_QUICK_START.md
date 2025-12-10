# Scanner Mobile App - Quick Start Guide

## Prerequisites
- Flutter SDK installed
- Mobile device or emulator
- Smartendance server running
- Network connection (device and server on same network)

## Setup Steps

### 1. Configure Network
Edit `scanner/lib/fetch/fetchstudents.dart` - Update IP addresses for your network:

**For Android Emulator**:
```dart
'http://10.0.2.2:4000'  // Keep as is
```

**For iOS Simulator**:
```dart
'http://localhost:4000'  // Keep as is
```

**For Physical Device**:
```dart
'http://YOUR_SERVER_IP:4000'  // Replace YOUR_SERVER_IP with actual server IP
```

### 2. Start Server
```bash
cd server
npm install
npm start
# or for development with hot reload:
npm run dev
```

### 3. Create Test Student
```bash
curl -X POST http://localhost:4000/api/students \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "TEST001",
    "fullName": "Test Student",
    "gradeLevel": "10",
    "section": "A",
    "gender": "Male",
    "shift": "Morning"
  }'
```

### 4. Run Scanner App
```bash
cd scanner
flutter pub get
flutter run
```

## Using the App

### Home Screen
- **Green checkmark** = Server connected ✅
- **Red X** = No server connection ❌
- **Tap icon** = Refresh connection

### Scanning
1. Tap "Scan QR Code" button
2. Point camera at student QR code
3. App automatically:
   - Fetches student info
   - Records attendance
   - Displays student details

### Troubleshooting

| Issue | Solution |
|-------|----------|
| "No Server Connection" | Check server running, verify IP in fetchstudents.dart |
| "Student not found" | Create student in database first |
| Timeout errors | Check network latency, increase timeout |
| Camera permission denied | Grant camera permission in app settings |

## Verification Checklist

- [ ] Server running (check `npm run dev` output)
- [ ] Connection status shows green on home screen
- [ ] Can scan QR code without errors
- [ ] Student information displays correctly
- [ ] Attendance record appears in MongoDB

## File Locations
- **Network Config**: `scanner/lib/fetch/fetchstudents.dart` (line 14-21)
- **Home Screen**: `scanner/lib/homepage/homepage.dart`
- **Scanning Page**: `scanner/lib/scanningpage/scanning.dart`
- **Server Route**: `server/routes/studentsRoutes.js` (POST /scan-qr)

## API Endpoint
**POST** `/api/students/scan-qr`

Request:
```json
{
  "qrData": "{\"id\": \"S001\"}",
  "subject": "General",
  "deviceInfo": {"platform": "Flutter", ...}
}
```

Response:
```json
{
  "success": true,
  "student": {
    "studentId": "S001",
    "fullName": "John Doe",
    "gradeLevel": "10",
    ...
  }
}
```

## Database Records Created
When scanning, the app creates:
- **History**: Attendance record with status "Present"
- Subject: "General" (can be updated by teacher later)
- Timestamp: Scan time
- Metadata: Device info, location, notes

## Support
See `SCANNER_SERVER_INTEGRATION.md` for detailed documentation.
