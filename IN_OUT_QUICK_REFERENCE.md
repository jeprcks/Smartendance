# In/Out Attendance System - Quick Reference Card

## At a Glance

### What Changed?
The system now supports **two-tablet attendance tracking**:
- **Tablet 1 (Check-In)**: Student entry/login
- **Tablet 2 (Check-Out)**: Student exit/logout

### Key Addition
Every attendance record now includes an `attendanceType` field that is either `"In"` or `"Out"`.

---

## API Quick Reference

### Create Attendance (POST /api/history)

**Check-In (Tablet 1):**
```bash
curl -X POST http://api:3000/api/history \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "STU001",
    "studentName": "John Doe",
    "attendanceType": "In"
  }'
```

**Check-Out (Tablet 2):**
```bash
curl -X POST http://api:3000/api/history \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "STU001",
    "studentName": "John Doe",
    "attendanceType": "Out"
  }'
```

### Get Records

**All Check-In Records:**
```bash
GET /api/history
GET /api/history?attendanceType=In
```

**All Check-Out Records:**
```bash
GET /api/history?attendanceType=Out
```

**Both In and Out:**
```bash
GET /api/history?attendanceType=All
```

**Daily Summary (Most Important!):**
```bash
GET /api/history/daily-summary?date=2026-01-22
```

**Student History:**
```bash
GET /api/history/student/STU001
```

**Statistics (Count 'In' Only):**
```bash
GET /api/history/stats?startDate=2026-01-22&endDate=2026-01-22
```

---

## Database Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `attendanceType` | String | 'In' or 'Out' | 'In' |
| `checkInTime` | Date | When student checked in | 2026-01-22T10:30:00Z |
| `checkOutTime` | Date | When student checked out | 2026-01-22T15:45:00Z |
| `durationMinutes` | Number | Minutes between In and Out | 315 |
| `linkedRecordId` | ObjectId | Reference to paired record | 507f... |
| `scanTime` | Date | Same as checkIn/checkOutTime | 2026-01-22T10:30:00Z |

---

## Response Examples

### Check-In Response
```json
{
  "success": true,
  "message": "Check-in record created successfully",
  "record": {
    "attendanceType": "In",
    "checkInTime": "2026-01-22T10:30:00Z",
    "durationMinutes": 0,
    "status": "Present"
  }
}
```

### Check-Out Response
```json
{
  "success": true,
  "message": "Check-out record created successfully",
  "record": {
    "attendanceType": "Out",
    "checkOutTime": "2026-01-22T15:45:00Z",
    "durationMinutes": 315,
    "linkedRecordId": "507f1f77bcf86cd799439011"
  }
}
```

### Daily Summary Response (Snippet)
```json
{
  "summary": [
    {
      "studentId": "STU001",
      "studentName": "John Doe",
      "checkInTime": "2026-01-22T10:30:00Z",
      "checkOutTime": "2026-01-22T15:45:00Z",
      "durationMinutes": 315,
      "hasCheckedOut": true
    }
  ],
  "statistics": {
    "checkedOut": 42,
    "notCheckedOut": 8,
    "total": 50
  }
}
```

---

## Implementation Checklist

### For Developers

- [ ] Update check-in tablet app to send `attendanceType: "In"`
- [ ] Update check-out tablet app to send `attendanceType: "Out"`
- [ ] Test check-in functionality
- [ ] Test check-out functionality
- [ ] Test record linking
- [ ] Test daily summary endpoint
- [ ] Update admin dashboard
- [ ] Deploy to staging
- [ ] Deploy to production

### For System Administrators

- [ ] Configure check-in tablet with app `attendanceType: "In"`
- [ ] Configure check-out tablet with app `attendanceType: "Out"`
- [ ] Test both tablets at school
- [ ] Create backup before deploying
- [ ] Monitor logs for errors
- [ ] Train staff on using two tablets
- [ ] Monitor unchecked-out records daily
- [ ] Set up alerting for orphaned records

---

## Common Tasks

### Find all students who haven't checked out
```javascript
db.histories.find({
  attendanceType: 'In',
  linkedRecordId: null,
  scanTime: { $gte: new Date('2026-01-22'), $lt: new Date('2026-01-23') }
})
```

### Calculate average attendance duration
```javascript
db.histories.aggregate([
  { $match: { attendanceType: 'Out' } },
  { $group: { _id: null, avgDuration: { $avg: '$durationMinutes' } } }
])
```

### Get students who checked out after 5 PM
```javascript
db.histories.find({
  attendanceType: 'Out',
  checkOutTime: { $gt: new Date('2026-01-22T17:00:00Z') }
})
```

### Get attendance report by class
```javascript
db.histories.aggregate([
  { $match: { attendanceType: 'In' } },
  { $group: { _id: '$gradeLevel', count: { $sum: 1 } } }
])
```

---

## Troubleshooting

| Problem | Cause | Solution |
|---------|-------|----------|
| Out record not linking | Different student ID or wrong day | Check QR code, ensure same day |
| Duration shows 0 | No matching In record | Check if student checked in first |
| High check-out count | Duplicate scans | Implement scan debouncing (1-2 sec) |
| Missing records | Network error | Check API logs, retry |
| Statistics seem off | Counting both In/Out | Use `attendanceType=In` filter |

---

## Important Notes

⚠️ **Critical Points:**
1. **Always send `attendanceType`** - either 'In' or 'Out'
2. **Statistics only count 'In' records** - prevents duplication
3. **System auto-links** - In and Out records for same student on same day
4. **Daily summary is primary report** - use for attendance dashboards
5. **Monitor unchecked-out records** - students still in building

✓ **What's Backward Compatible:**
- Old `scanTime` field still works
- Existing queries still function
- No breaking changes to API

---

## Files Updated

1. **[server/models/historySchema.js](server/models/historySchema.js)**
   - Added attendance type fields
   - Added calculation methods
   - Added new indexes

2. **[server/controllers/historyController.js](server/controllers/historyController.js)**
   - Updated create function
   - Added daily summary endpoint
   - Fixed statistics counting

3. **[server/routes/historyRoutes.js](server/routes/historyRoutes.js)**
   - Added daily summary route
   - Updated documentation comments

---

## Documentation Files

📄 **[IN_OUT_ATTENDANCE_SCHEMA.md](IN_OUT_ATTENDANCE_SCHEMA.md)**
Complete technical schema documentation

📄 **[IN_OUT_INTEGRATION_GUIDE.md](IN_OUT_INTEGRATION_GUIDE.md)**
Step-by-step app integration guide

📄 **[IN_OUT_ARCHITECTURE_DIAGRAMS.md](IN_OUT_ARCHITECTURE_DIAGRAMS.md)**
Visual flow and architecture diagrams

📄 **[IN_OUT_IMPLEMENTATION_SUMMARY.md](IN_OUT_IMPLEMENTATION_SUMMARY.md)**
Summary of all changes made

---

## Support

**Questions?** Check these docs in order:
1. This Quick Reference (start here)
2. [IN_OUT_INTEGRATION_GUIDE.md](IN_OUT_INTEGRATION_GUIDE.md) - for app integration
3. [IN_OUT_ATTENDANCE_SCHEMA.md](IN_OUT_ATTENDANCE_SCHEMA.md) - for technical details
4. [IN_OUT_ARCHITECTURE_DIAGRAMS.md](IN_OUT_ARCHITECTURE_DIAGRAMS.md) - for flow understanding

---

**System Ready for Two-Tablet Deployment** ✓

Last Updated: January 22, 2026
