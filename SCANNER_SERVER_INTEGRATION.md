# Scanner Mobile App - Server Integration Guide

## Overview
The Scanner Mobile App is fully integrated with the Smartendance server to handle student QR code scanning and attendance recording.

## Architecture

### Connection Flow
```
Scanner Mobile App → Server API → MongoDB
     ↓
  QR Data
     ↓
findWorkingUrl()  → Finds correct server connection
     ↓
/api/students/scan-qr → Records attendance + Returns student info
     ↓
Display Student Information
```

## Server Integration Details

### API Endpoint
**POST** `/api/students/scan-qr`

### Request Format
```json
{
  "qrData": "{\"id\": \"S001\"}",  // QR code data as JSON string
  "subject": "General",             // Always "General" for QR scans
  "notes": "QR Code scanned - Teacher can update status for specific subjects",
  "deviceInfo": {
    "platform": "Flutter",
    "userAgent": "Smartendance Mobile App",
    "timestamp": "2025-12-10T10:30:00.000Z"
  }
}
```

### Response Format (Success)
```json
{
  "success": true,
  "message": "Student information retrieved successfully",
  "student": {
    "_id": "507f1f77bcf86cd799439011",
    "studentId": "S001",
    "fullName": "John Doe",
    "photo": "data:image/png;base64,...",
    "gradeLevel": "10",
    "section": "A",
    "gender": "Male",
    "shift": "Morning",
    "email": "john@example.com",
    "phoneNumber": "1234567890",
    "lastScanned": "2025-12-10T10:30:00.000Z"
  }
}
```

### Response Format (Error)
```json
{
  "error": "Student not found"
}
```

## Network Configuration

### Default Server URLs (in order of priority)
1. `http://10.0.2.2:4000` - Android Emulator
2. `http://localhost:4000` - iOS Simulator
3. `http://192.168.1.10:4000` - Physical Device (adjust IP as needed)
4. `http://192.168.0.100:4000` - Alternative Network

### Modifying Network Configuration
Edit `scanner/lib/fetch/fetchstudents.dart`:

```dart
static const List<String> possibleUrls = [
  'http://10.0.2.2:4000',       // Android Emulator
  'http://localhost:4000',       // iOS Simulator
  'http://192.168.1.10:4000',   // Physical device (replace with your IP)
  'http://192.168.0.100:4000',  // Alternative IP range
];
```

## Features

### 1. Automatic Connection Detection
- App tests all configured URLs on startup
- Displays connection status on home screen
- Shows server IP when connected

### 2. Attendance Recording
When a QR code is scanned:
- Automatically creates attendance record with "Present" status
- Records subject as "General" (can be updated by teacher later)
- Stores scan timestamp and device information
- Saves location and device metadata

### 3. Student Information Display
After successful scan:
- Shows student photo
- Displays full name, grade, section
- Shows gender, shift, contact info
- Displays scan timestamp

### 4. Error Handling
The app handles:
- Network connection failures
- Invalid QR code data
- Server errors
- Timeout errors
- Missing student records

### 5. Connection Status Indicator
- **Green checkmark**: Connected to server
- **Red X**: No server connection
- **Loading spinner**: Checking connection
- Tap to manually retry connection

## Server Requirements

### Ports
- Default: `4000`
- Must be accessible from mobile device
- Configure in `server/index.js` if different

### CORS Configuration
Server includes CORS headers for:
- Local development (localhost)
- Android emulators (10.0.2.2)
- Physical devices (192.168.x.x range)

### Database
- MongoDB must be running
- Student records must exist with valid `studentId`
- QR codes are generated from student data

## Deployment Checklist

- [ ] Server running on port 4000
- [ ] MongoDB connected
- [ ] Student records created in database
- [ ] Server CORS configured for app network
- [ ] IP addresses updated in app for target devices
- [ ] Test with QR code from student record
- [ ] Verify attendance records created in MongoDB

## Troubleshooting

### Connection Issues

**Issue**: "No Server Connection"
- Check server is running: `npm run dev` in server directory
- Verify network: Device must be on same network as server
- Update IP in `fetchstudents.dart` if needed
- Check firewall settings

**Issue**: "Student not found"
- Verify student exists in database
- Check studentId in QR code matches database
- Run student creation endpoint first

**Issue**: Timeout errors
- Check network latency
- Increase timeout in `fetchstudents.dart` (default: 15s)
- Move closer to router/access point

### Debugging

Enable verbose logging in `scanning.dart`:
```dart
print('=== QR SCAN DEBUG ===');
print('QR Data: $qrData');
print('Working URL: $workingUrl');
print('Response Status: ${response.statusCode}');
```

View server logs:
```bash
cd server
npm run dev
```

## Testing

### Manual Testing Steps

1. **Start server**:
   ```bash
   cd server
   npm install
   npm run dev
   ```

2. **Create test student**:
   ```bash
   curl -X POST http://localhost:4000/api/students \
     -H "Content-Type: application/json" \
     -d '{
       "studentId": "S001",
       "fullName": "Test Student",
       "gradeLevel": "10",
       "section": "A"
     }'
   ```

3. **Generate QR code**:
   - QR automatically generated on student creation
   - Contains JSON: `{"id": "S001"}`

4. **Run scanner app**:
   ```bash
   cd scanner
   flutter run
   ```

5. **Scan QR code**:
   - App shows student info
   - Attendance recorded in MongoDB
   - Connection status shows green

## File Structure

```
scanner/
├── lib/
│   ├── main.dart                 # App entry point
│   ├── homepage/
│   │   ├── homepage.dart         # Home screen with connection status
│   │   └── components/
│   │       ├── camera_scanner_button.dart  # Scan button
│   │       └── ...
│   ├── scanningpage/
│   │   ├── scanning.dart         # QR scanning logic
│   │   └── components/
│   │       └── studentsinformation.dart  # Student display
│   └── fetch/
│       └── fetchstudents.dart    # API service & server connection
```

## API Integration Points

### StudentService Class
Located in `scanner/lib/fetch/fetchstudents.dart`

**Key Methods**:
- `findWorkingUrl()` - Detects server connection
- `fetchStudentInfo(qrData)` - Scans QR and fetches student

**Public Properties**:
- `workingUrl` - Currently connected server URL

## Security Notes

- QR codes contain only student ID
- All data passed over HTTP (use HTTPS in production)
- Server validates student existence before returning data
- Consider adding authentication tokens for production

## Future Enhancements

- [ ] HTTPS support
- [ ] JWT authentication
- [ ] Offline mode with sync
- [ ] Batch scanning
- [ ] Teacher-specific filtering
- [ ] Real-time sync notifications
- [ ] Analytics dashboard
