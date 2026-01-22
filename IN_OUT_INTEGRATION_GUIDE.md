# In/Out Attendance Integration Guide

## Quick Start for Mobile & Scanner Apps

This guide explains how to integrate the new In/Out attendance system into your Flutter mobile and scanner apps.

## Overview

The attendance system now supports:
- **Tablet 1 (In)**: Login/Check-in scanning
- **Tablet 2 (Out)**: Logout/Check-out scanning

Each tablet should be configured to send the appropriate `attendanceType` when creating attendance records.

## Implementation Steps

### Step 1: Update Create Attendance API Call

#### Before (Old Implementation)
```dart
// Old code - single attendance record
final response = await http.post(
  Uri.parse('$apiBaseUrl/api/history'),
  headers: {'Content-Type': 'application/json'},
  body: jsonEncode({
    'studentId': studentId,
    'studentName': studentName,
    'subject': 'General',
    'status': 'Present',
    // No attendanceType specified
  }),
);
```

#### After (New Implementation)

**For Check-In Tablet (Tablet 1):**
```dart
final response = await http.post(
  Uri.parse('$apiBaseUrl/api/history'),
  headers: {'Content-Type': 'application/json'},
  body: jsonEncode({
    'studentId': studentId,
    'studentName': studentName,
    'subject': 'General',
    'status': 'Present',
    'attendanceType': 'In',  // Add this line - REQUIRED
    'qrCodeData': {
      'encodedText': studentId,
      'format': 'QR_CODE'
    },
    'deviceInfo': {
      'platform': 'android', // or 'ios', 'web'
      'userAgent': userAgent
    }
  }),
);
```

**For Check-Out Tablet (Tablet 2):**
```dart
final response = await http.post(
  Uri.parse('$apiBaseUrl/api/history'),
  headers: {'Content-Type': 'application/json'},
  body: jsonEncode({
    'studentId': studentId,
    'studentName': studentName,
    'subject': 'General',
    'attendanceType': 'Out',  // Change this to 'Out' - REQUIRED
    'qrCodeData': {
      'encodedText': studentId,
      'format': 'QR_CODE'
    },
    'deviceInfo': {
      'platform': 'android', // or 'ios', 'web'
      'userAgent': userAgent
    }
  }),
);
```

### Step 2: Configure Each Tablet

**In Flutter/Mobile App:**

Create a configuration or constant that specifies which tablet this is:

```dart
// config.dart
class AttendanceConfig {
  static const String TABLET_TYPE = 'In';  // For tablet 1, use 'In'
  // For tablet 2, change this to: 'Out'
  
  static const String API_BASE_URL = 'http://your-api-url:3000';
}
```

Or pass it as an environment variable/startup parameter.

### Step 3: Update Record Creation Service

**Example Service Method:**

```dart
// services/attendance_service.dart
import 'package:http/http.dart' as http;
import 'dart:convert';

class AttendanceService {
  final String apiUrl;
  final String tabletType; // 'In' or 'Out'
  
  AttendanceService({
    required this.apiUrl,
    required this.tabletType
  });

  Future<Map<String, dynamic>> createAttendanceRecord({
    required String studentId,
    required String studentName,
    required Map<String, dynamic> qrCodeData,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$apiUrl/api/history'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'studentId': studentId,
          'studentName': studentName,
          'subject': 'General',
          'status': 'Present',
          'attendanceType': tabletType, // 'In' or 'Out'
          'qrCodeData': qrCodeData,
          'deviceInfo': {
            'platform': 'android', // or your platform
            'userAgent': 'SmartendanceApp/1.0'
          }
        }),
      );

      if (response.statusCode == 201) {
        final data = jsonDecode(response.body);
        return {
          'success': true,
          'message': tabletType == 'In' 
            ? 'Check-in recorded successfully' 
            : 'Check-out recorded successfully',
          'record': data['record']
        };
      } else {
        throw Exception('Failed to create attendance record');
      }
    } catch (e) {
      return {
        'success': false,
        'message': 'Error: $e'
      };
    }
  }
}
```

### Step 4: Usage in Scanner App

**Example Implementation:**

```dart
// pages/scanner_page.dart
import 'package:flutter/material.dart';
import 'services/attendance_service.dart';

class ScannerPage extends StatefulWidget {
  @override
  _ScannerPageState createState() => _ScannerPageState();
}

class _ScannerPageState extends State<ScannerPage> {
  late AttendanceService attendanceService;

  @override
  void initState() {
    super.initState();
    // Initialize with 'In' for check-in tablet or 'Out' for check-out tablet
    attendanceService = AttendanceService(
      apiUrl: 'http://your-server:3000',
      tabletType: 'In', // Change to 'Out' for check-out tablet
    );
  }

  void onQRCodeScanned(String studentId, String studentName, Map qrData) async {
    final result = await attendanceService.createAttendanceRecord(
      studentId: studentId,
      studentName: studentName,
      qrCodeData: qrData,
    );

    if (result['success']) {
      // Show success message
      final record = result['record'];
      final attendanceType = record['attendanceType'];
      
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(result['message']),
          backgroundColor: Colors.green,
          duration: Duration(seconds: 2),
        ),
      );

      // Display check-in/check-out time
      if (attendanceType == 'In') {
        print('Check-in time: ${record['checkInTime']}');
      } else if (attendanceType == 'Out') {
        print('Check-out time: ${record['checkOutTime']}');
        print('Duration: ${record['durationMinutes']} minutes');
      }
    } else {
      // Show error
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(result['message']),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Student Attendance Scanner'),
      ),
      body: Center(
        child: Text('Implement QR Scanner here'),
      ),
    );
  }
}
```

## API Response Changes

### Response for 'In' Record:
```json
{
  "success": true,
  "message": "Check-in record created successfully",
  "record": {
    "_id": "507f1f77bcf86cd799439011",
    "studentId": "STU001",
    "studentName": "John Doe",
    "attendanceType": "In",
    "checkInTime": "2026-01-22T10:30:00.000Z",
    "scanTime": "2026-01-22T10:30:00.000Z",
    "durationMinutes": 0,
    "status": "Present",
    "subject": "General"
  }
}
```

### Response for 'Out' Record (with linking):
```json
{
  "success": true,
  "message": "Check-out record created successfully",
  "record": {
    "_id": "507f1f77bcf86cd799439012",
    "studentId": "STU001",
    "studentName": "John Doe",
    "attendanceType": "Out",
    "checkOutTime": "2026-01-22T15:45:00.000Z",
    "scanTime": "2026-01-22T15:45:00.000Z",
    "durationMinutes": 315,
    "linkedRecordId": "507f1f77bcf86cd799439011",
    "status": "Present",
    "subject": "General"
  }
}
```

## Deployment Steps

1. **Update Mobile App**:
   - Add `attendanceType: 'In'` to POST request
   - Rebuild and deploy to check-in tablets

2. **Update Scanner App**:
   - Add `attendanceType: 'In'` or `'Out'` based on tablet purpose
   - Rebuild and deploy to respective tablets

3. **Server Already Updated**:
   - Run `npm install` to update dependencies (if any)
   - Restart server to apply schema changes

4. **Test**:
   - Test check-in on Tablet 1
   - Test check-out on Tablet 2
   - Verify records are linked
   - Check daily summary endpoint

## Handling Edge Cases

### Student Scans 'In' Twice
- Creates two 'In' records
- Only the most recent 'In' will be linked to 'Out'

### Student Scans 'Out' Without 'In'
- 'Out' record is created
- `linkedRecordId` will be null (no matching 'In')
- Check logs to identify such cases

### Monitor Unchecked-Out Students
```dart
// Get daily summary to see who hasn't checked out
GET /api/history/daily-summary?date=2026-01-22

// Filter those with hasCheckedOut: false
```

## Admin Dashboard Updates

### Display Daily Attendance:
```dart
// Instead of getting raw records, use the daily summary
final summaryResponse = await http.get(
  Uri.parse('$apiUrl/api/history/daily-summary?date=2026-01-22'),
);

// This returns students grouped with their In/Out times and durations
```

### Show Attendance Duration:
```dart
// In the UI, display duration for each student
'Duration: ${record['durationMinutes']} minutes'
// Or convert to hours: ${record['durationMinutes'] / 60} hours
```

## Error Handling

```dart
try {
  final result = await attendanceService.createAttendanceRecord(...);
  
  if (!result['success']) {
    // Handle error
    final errorMessage = result['message'] ?? 'Unknown error';
    showErrorDialog(context, errorMessage);
  }
} on SocketException {
  showErrorDialog(context, 'No internet connection');
} on TimeoutException {
  showErrorDialog(context, 'Request timeout');
} catch (e) {
  showErrorDialog(context, 'Unexpected error: $e');
}
```

## Migration Checklist

- [ ] Update mobile app to send `attendanceType: 'In'`
- [ ] Create and deploy check-out app with `attendanceType: 'Out'`
- [ ] Test check-in on Tablet 1
- [ ] Test check-out on Tablet 2
- [ ] Verify record linking works
- [ ] Test daily summary endpoint
- [ ] Monitor for unchecked-out records
- [ ] Update admin dashboard to show durations
- [ ] Train staff on using the two tablets
- [ ] Document tablet configuration for future reference

## Support & Troubleshooting

### Issue: 'Out' record not linking to 'In'
**Solution**: Ensure student QR code is same on both tablets and timestamps are on same day

### Issue: Duration shows 0 minutes
**Solution**: Check that both check-in and check-out times are recorded correctly

### Issue: Statistics showing duplicates
**Solution**: Ensure you're filtering by `attendanceType: 'In'` only in statistics queries

### Issue: Old attendance data missing `attendanceType`
**Solution**: Old records default to 'In' behavior - this is backward compatible

## Next Steps

1. Update mobile app code
2. Update scanner app code
3. Test thoroughly in staging environment
4. Deploy to production
5. Monitor error logs
6. Gather feedback from panelists
