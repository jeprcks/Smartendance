# Scanner App - In/Out Configuration Guide

## Quick Setup

The scanner app has been updated to support the new **In/Out attendance system** with two separate modes:

### Mode 1: Check-In Tablet (Tablet 1)
```dart
// In: scanner/lib/main.dart
const String ATTENDANCE_TYPE = 'In';
```

### Mode 2: Check-Out Tablet (Tablet 2)
```dart
// In: scanner/lib/main.dart
const String ATTENDANCE_TYPE = 'Out';
```

---

## What Changed

### 1. Configuration Constant Added
File: `lib/main.dart`

```dart
const String ATTENDANCE_TYPE = 'In'; // Change to 'Out' for check-out tablet
```

This constant controls whether the app sends check-in or check-out records.

### 2. New Attendance Method Added
File: `lib/fetch/fetchstudents.dart`

**New Method**: `createAttendanceRecord()`
- Creates attendance records in `/api/history` endpoint
- Sends `attendanceType` parameter ('In' or 'Out')
- Automatically calculates duration for 'Out' records
- Returns formatted check-in/check-out messages

### 3. Scanner Page Updated
File: `lib/scanningpage/scanning.dart`

- Imports ATTENDANCE_TYPE constant
- AppBar shows "Check-In" or "Check-Out" mode
- Calls both `fetchStudentInfo()` and `createAttendanceRecord()`
- Displays duration for check-outs

---

## How to Deploy

### For Check-In Tablet (Tablet 1)

1. **Configure**:
   ```dart
   // scanner/lib/main.dart - Line 6
   const String ATTENDANCE_TYPE = 'In'; // Keep as 'In'
   ```

2. **Build & Deploy**:
   ```bash
   cd scanner
   flutter pub get
   flutter run -d <tablet_device_id>
   ```

3. **Verify**: AppBar should show "Scan QR Code - Check-In"

---

### For Check-Out Tablet (Tablet 2)

1. **Configure**:
   ```dart
   // scanner/lib/main.dart - Line 6
   const String ATTENDANCE_TYPE = 'Out'; // Change to 'Out'
   ```

2. **Build & Deploy**:
   ```bash
   cd scanner
   flutter pub get
   flutter run -d <tablet_device_id>
   ```

3. **Verify**: AppBar should show "Scan QR Code - Check-Out"

---

## Usage Flow

### Check-In (Tablet 1)
```
Student scans QR
  ↓
App fetches student info
  ↓
App sends: POST /api/history
  {
    attendanceType: "In",
    studentId: "STU001",
    checkInTime: now(),
    status: "Present"
  }
  ↓
Display: "Check-in recorded at 10:30 AM"
  ↓
Show student info
  ↓
"Scan Another" for next student
```

### Check-Out (Tablet 2)
```
Student scans QR (same student)
  ↓
App fetches student info
  ↓
App sends: POST /api/history
  {
    attendanceType: "Out",
    studentId: "STU001",
    checkOutTime: now(),
    durationMinutes: 315
  }
  ↓
Display: "Check-out recorded at 3:45 PM. Duration: 315 min"
  ↓
Show student info with duration
  ↓
"Scan Another" for next student
```

---

## Features Implemented

✅ **Attendance Type Configuration**
- Single constant to configure tablet mode

✅ **Check-In Support**
- Records student entry time
- Marks as 'Present'

✅ **Check-Out Support**
- Records student exit time
- Auto-links to check-in
- Calculates duration

✅ **Visual Feedback**
- AppBar shows current mode
- Success messages with times
- Duration displayed for check-outs

✅ **Error Handling**
- Network errors caught
- Server errors displayed
- Retry capability

---

## Code Files Modified

| File | Changes |
|------|---------|
| `lib/main.dart` | Added ATTENDANCE_TYPE constant |
| `lib/fetch/fetchstudents.dart` | Added createAttendanceRecord() method |
| `lib/scanningpage/scanning.dart` | Updated to use ATTENDANCE_TYPE |

---

## API Integration

### Endpoint Called

**Endpoint**: `POST /api/history`

**Check-In Request**:
```json
{
  "studentId": "STU001",
  "studentName": "John Doe",
  "subject": "General",
  "status": "Present",
  "attendanceType": "In",
  "qrCodeData": { "encodedText": "STU001" },
  "deviceInfo": {
    "platform": "Flutter",
    "userAgent": "Smartendance Scanner App"
  }
}
```

**Check-Out Request**:
```json
{
  "studentId": "STU001",
  "studentName": "John Doe",
  "subject": "General",
  "status": "Present",
  "attendanceType": "Out",
  "qrCodeData": { "encodedText": "STU001" },
  "deviceInfo": {
    "platform": "Flutter",
    "userAgent": "Smartendance Scanner App"
  }
}
```

---

## Testing

### Test Check-In
1. Set `ATTENDANCE_TYPE = 'In'` in main.dart
2. Run app on Tablet 1
3. Scan student QR code
4. Verify message: "Check-in recorded at HH:MM"
5. Check server logs for record creation

### Test Check-Out
1. Change `ATTENDANCE_TYPE = 'Out'` in main.dart
2. Run app on Tablet 2
3. Scan same student QR code
4. Verify message shows duration: "Duration: XXX min"
5. Check server logs for linked records

### Verify Recording
```bash
# Get daily summary
curl "http://localhost:3000/api/history/daily-summary?date=2026-01-22"

# Should show:
# - checkInTime from Tablet 1
# - checkOutTime from Tablet 2
# - durationMinutes calculated
```

---

## Troubleshooting

### Issue: "Attendance Type Not Sending"
**Solution**: 
- Verify ATTENDANCE_TYPE constant is set correctly in main.dart
- Check that imports include '../main.dart'
- Rebuild app: `flutter clean && flutter pub get && flutter run`

### Issue: "Duration Shows as 0"
**Solution**:
- Ensure student checked in first on Tablet 1
- Check that both tablets are checking in/out same student
- Verify timestamps are different between In and Out

### Issue: "AppBar Not Showing Mode"
**Solution**:
- Verify ATTENDANCE_TYPE constant is correctly imported
- Try hot restart: `flutter run` with "r" key
- Check for build cache issues: `flutter clean`

### Issue: "Network Connection Error"
**Solution**:
- Verify both tablets can reach server
- Check server is running: `npm run dev` in server directory
- Verify server URL in fetchstudents.dart possibleUrls
- Test connectivity: `ping <server_ip>`

---

## Important Notes

⚠️ **Before Deploying:**
- Set correct ATTENDANCE_TYPE for each tablet
- Test with server running
- Verify network connectivity
- Run on actual tablets for testing

✓ **After Deploying:**
- Monitor server logs
- Check API responses
- Verify records are linked
- Monitor duration calculations

---

## Next Steps

1. **Tablet 1**: Configure with `ATTENDANCE_TYPE = 'In'`
2. **Tablet 2**: Configure with `ATTENDANCE_TYPE = 'Out'`
3. Build and deploy both apps
4. Test complete flow (In → Out)
5. Train staff on usage
6. Monitor for any issues

---

## Reference

- **Backend Schema**: [IN_OUT_ATTENDANCE_SCHEMA.md](../IN_OUT_ATTENDANCE_SCHEMA.md)
- **Integration Guide**: [IN_OUT_INTEGRATION_GUIDE.md](../IN_OUT_INTEGRATION_GUIDE.md)
- **Quick Reference**: [IN_OUT_QUICK_REFERENCE.md](../IN_OUT_QUICK_REFERENCE.md)

---

**Scanner App Updated**: ✅ Complete  
**Ready for Deployment**: ✅ Yes  
**Configuration**: See main.dart line 6
