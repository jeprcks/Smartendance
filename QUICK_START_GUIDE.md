# QUICK START - Two-Tablet Attendance System

## 30-Second Overview

Your attendance system now supports **two tablets**:
- **Tablet 1**: Students scan when **arriving** (Check-In)
- **Tablet 2**: Students scan when **leaving** (Check-Out)

The system automatically calculates how long each student was in school.

---

## For Panelists (Admin Dashboard Users)

### How It Works

1. Student arrives → scans at **Tablet 1** (Check-In)
2. Student leaves → scans at **Tablet 2** (Check-Out)
3. System shows: **Entry time, Exit time, Duration**

### View Attendance

Visit: `Dashboard → Daily Summary`

Shows:
```
Student Name | Check-In Time | Check-Out Time | Duration
─────────────────────────────────────────────────────────
John Doe     | 10:30 AM      | 3:45 PM        | 5h 15m
Jane Smith   | 10:25 AM      | (not checked)  | ⚠️ Still here
...
```

### Key Metrics
- **Total Present**: 45 students
- **Checked Out**: 42 students  
- **Not Checked Out**: 8 students (still in building)

---

## For Developers (App Developers)

### What Changed

Before:
```json
POST /api/history
{
  "studentId": "STU001",
  "studentName": "John Doe"
}
```

After:
```json
POST /api/history
{
  "studentId": "STU001",
  "studentName": "John Doe",
  "attendanceType": "In"  // ← ADD THIS
}
```

### For Check-In Tablet
```javascript
"attendanceType": "In"  // Always use "In"
```

### For Check-Out Tablet
```javascript
"attendanceType": "Out"  // Always use "Out"
```

### Response You Get

**Check-In Response:**
```json
{
  "success": true,
  "message": "Check-in recorded successfully",
  "record": {
    "checkInTime": "2026-01-22T10:30:00Z",
    "status": "Present"
  }
}
```

**Check-Out Response:**
```json
{
  "success": true,
  "message": "Check-out recorded successfully",
  "record": {
    "checkOutTime": "2026-01-22T15:45:00Z",
    "durationMinutes": 315  // ← Duration auto-calculated!
  }
}
```

---

## API Endpoints

### Create Attendance
```
POST /api/history
```
Send `attendanceType: "In"` or `"Out"`

### Get Daily Summary (NEW)
```
GET /api/history/daily-summary?date=2026-01-22
```
Returns all students with In/Out times and durations

### Get Attendance Records
```
GET /api/history
GET /api/history?attendanceType=In
GET /api/history?attendanceType=Out
```

### Get Student History
```
GET /api/history/student/STU001
```
Shows check-in, check-out, and duration

---

## Database Fields

| Field | Meaning |
|-------|---------|
| `attendanceType` | 'In' or 'Out' |
| `checkInTime` | When they arrived |
| `checkOutTime` | When they left |
| `durationMinutes` | How long they stayed |
| `linkedRecordId` | Connects In to Out |

---

## Complete Integration Example

```dart
// FLUTTER/DART CODE EXAMPLE

// Create service
AttendanceService service = AttendanceService(
  apiUrl: 'http://your-server:3000',
  tabletType: 'In',  // Change to 'Out' for check-out tablet
);

// On QR scan
void onQRScanned(String studentId, String studentName) async {
  final result = await service.createAttendanceRecord(
    studentId: studentId,
    studentName: studentName,
    qrCodeData: {'encodedText': studentId}
  );

  if (result['success']) {
    final record = result['record'];
    if (record['attendanceType'] == 'In') {
      print('Check-in: ${record['checkInTime']}');
    } else {
      print('Check-out: ${record['checkOutTime']}');
      print('Duration: ${record['durationMinutes']} minutes');
    }
  }
}
```

---

## Deployment Checklist

### Backend (Already Done ✅)
- [x] Schema updated
- [x] API updated
- [x] Endpoints added
- [x] Database indexes created

### Tablets (Do This Now)
- [ ] Update Tablet 1 app → send `attendanceType: "In"`
- [ ] Update Tablet 2 app → send `attendanceType: "Out"`
- [ ] Test both tablets
- [ ] Deploy to production

### Verification
- [ ] Check-in works on Tablet 1
- [ ] Check-out works on Tablet 2
- [ ] Records are linked
- [ ] Duration calculated correctly
- [ ] Dashboard shows data

---

## Testing (Try These)

### Test 1: Check-In
```bash
curl -X POST http://localhost:3000/api/history \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "TEST001",
    "studentName": "Test Student",
    "attendanceType": "In"
  }'
```
Expected: Status 201, message "Check-in recorded"

### Test 2: Check-Out (Same Student)
```bash
curl -X POST http://localhost:3000/api/history \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "TEST001",
    "studentName": "Test Student",
    "attendanceType": "Out"
  }'
```
Expected: Status 201, `durationMinutes` has a value

### Test 3: Daily Summary
```bash
curl http://localhost:3000/api/history/daily-summary?date=2026-01-22
```
Expected: Array of students with check-in/check-out data

---

## Common Issues & Fixes

### Issue: "Check-out not linking to check-in"
**Fix:** Ensure both tablets scan the same QR code for the same student on the same day

### Issue: "Duration shows 0"
**Fix:** Check that check-in time and check-out time are different and check-out > check-in

### Issue: "Statistics showing duplicates"
**Fix:** Only count 'In' records - filter by `attendanceType: 'In'`

### Issue: "Some students missing from report"
**Fix:** Use `/daily-summary` endpoint instead of raw record queries

---

## Important Reminders

⚠️ **MUST DO:**
1. ✅ Update mobile app to send `attendanceType`
2. ✅ Deploy to both tablets
3. ✅ Test thoroughly before going live
4. ✅ Monitor first day closely

📝 **NOTES:**
- Old system still works (backward compatible)
- All check-ins automatically paired with check-outs
- Durations calculated in seconds → displayed as minutes
- Daily summary is the primary report view

---

## File Structure

```
server/
├── models/
│   └── historySchema.js ← Schema updated ✅
├── controllers/
│   └── historyController.js ← Controller updated ✅
├── routes/
│   └── historyRoutes.js ← Routes updated ✅
└── index.js
```

---

## Next Steps

1. **Immediate (Today)**
   - Review this quick start
   - Plan tablet configuration
   - Alert dev team

2. **This Week**
   - Update mobile apps
   - Test in staging
   - Get approval

3. **Deployment Week**
   - Deploy backend (restart server)
   - Deploy mobile apps
   - Configure tablets (In vs Out)
   - Run full system test

4. **Go Live**
   - Monitor first day
   - Gather feedback
   - Document any issues

---

## Documentation Map

**Quick Reference**: [IN_OUT_QUICK_REFERENCE.md](IN_OUT_QUICK_REFERENCE.md)

**Full Documentation**: [IN_OUT_ATTENDANCE_SCHEMA.md](IN_OUT_ATTENDANCE_SCHEMA.md)

**Integration Guide**: [IN_OUT_INTEGRATION_GUIDE.md](IN_OUT_INTEGRATION_GUIDE.md)

**Architecture**: [IN_OUT_ARCHITECTURE_DIAGRAMS.md](IN_OUT_ARCHITECTURE_DIAGRAMS.md)

**Database Migration**: [DATABASE_MIGRATION_GUIDE.md](DATABASE_MIGRATION_GUIDE.md)

---

## Support

**Questions?** Start with the appropriate guide above.

**Error?** Check server logs: `npm run dev`

**Need help?** Contact development team with error message.

---

**Status: READY FOR DEPLOYMENT** ✅

Backend code complete. Waiting for mobile app updates.
