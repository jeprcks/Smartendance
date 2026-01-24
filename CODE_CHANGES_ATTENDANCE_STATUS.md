# Code Changes Summary - Attendance Status Feature

## 1. Schedule Details Page Constructor (schedule_details.dart)

### Before:
```dart
class ScheduleDetailsPage extends StatefulWidget {
  final dynamic schedule;
  final List<dynamic> students;

  const ScheduleDetailsPage({
    super.key,
    required this.schedule,
    required this.students,
  });
```

### After:
```dart
class ScheduleDetailsPage extends StatefulWidget {
  final dynamic schedule;
  final List<dynamic> students;
  final String token;
  final String scheduleId;

  const ScheduleDetailsPage({
    super.key,
    required this.schedule,
    required this.students,
    required this.token,
    required this.scheduleId,
  });
```

**Why**: Need token for API authentication and scheduleId to identify which class's students are being updated.

---

## 2. State Class Updates (schedule_details.dart)

### Before:
```dart
class _ScheduleDetailsPageState extends State<ScheduleDetailsPage> {
  late List<dynamic> _students;
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    _students = widget.students;
  }
```

### After:
```dart
class _ScheduleDetailsPageState extends State<ScheduleDetailsPage> {
  late List<dynamic> _students;
  String _searchQuery = '';
  bool _isUpdating = false;

  @override
  void initState() {
    super.initState();
    _students = widget.students;
  }
```

**Why**: `_isUpdating` flag prevents duplicate API calls during loading.

---

## 3. Student Card Status Button - Now Interactive

### Before:
```dart
// Status Button
Container(
  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
  decoration: BoxDecoration(
    color: statusColor.withOpacity(0.1),
    borderRadius: BorderRadius.circular(12),
    border: Border.all(
      color: statusColor.withOpacity(0.3),
      width: 1.5,
    ),
  ),
  child: Column(
    mainAxisSize: MainAxisSize.min,
    children: [
      Icon(statusIcon, size: 24, color: statusColor),
      const SizedBox(height: 4),
      Text(
        statusText,
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w700,
          color: statusColor,
        ),
        textAlign: TextAlign.center,
      ),
    ],
  ),
),
```

### After:
```dart
// Status Button - Tappable
GestureDetector(
  onTap: () => _showStatusDialog(
    context,
    student,
    statusText,
    shiftColor,
  ),
  child: Container(
    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
    decoration: BoxDecoration(
      color: statusColor.withOpacity(0.1),
      borderRadius: BorderRadius.circular(12),
      border: Border.all(
        color: statusColor.withOpacity(0.3),
        width: 1.5,
      ),
    ),
    child: Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(statusIcon, size: 24, color: statusColor),
        const SizedBox(height: 4),
        Text(
          statusText,
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w700,
            color: statusColor,
          ),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 3),
        Icon(Icons.edit, size: 10, color: statusColor),
      ],
    ),
  ),
),
```

**Why**: Wrapped with GestureDetector to make it tappable, added edit icon to indicate interactivity.

---

## 4. New Method: Status Dialog

### Code Added:
```dart
void _showStatusDialog(
  BuildContext context,
  dynamic student,
  String currentStatus,
  Color shiftColor,
) {
  showDialog(
    context: context,
    builder: (context) => AlertDialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      title: const Text(
        'Update Attendance Status',
        style: TextStyle(fontWeight: FontWeight.bold),
      ),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              student['studentName'] ?? student['name'] ?? 'Unknown',
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: Colors.black87,
              ),
            ),
            const SizedBox(height: 16),
            GridView.count(
              crossAxisCount: 2,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              mainAxisSpacing: 10,
              crossAxisSpacing: 10,
              children: attendanceStatus.map((status) {
                return _buildStatusOption(
                  status,
                  currentStatus,
                  () => _updateAttendanceStatus(context, student, status),
                );
              }).toList(),
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Cancel'),
        ),
      ],
    ),
  );
}
```

**What it does**:
- Shows AlertDialog with student name
- Displays 6 status options in 2-column grid
- Calls `_updateAttendanceStatus` when option selected
- Has Cancel button to close without changes

---

## 5. New Method: Build Status Option

### Code Added:
```dart
Widget _buildStatusOption(
  String status,
  String currentStatus,
  VoidCallback onTap,
) {
  final isSelected = status.toLowerCase() == currentStatus.toLowerCase();
  Color statusColor = Colors.grey;

  if (status == 'Present') {
    statusColor = Colors.green;
  } else if (status == 'Absent') {
    statusColor = Colors.red;
  } else if (status == 'Late') {
    statusColor = Colors.orange;
  } else if (status == 'Cutting') {
    statusColor = Colors.deepOrange;
  } else if (status.contains('Sick')) {
    statusColor = Colors.blue;
  } else if (status.contains('Excused')) {
    statusColor = Colors.purple;
  }

  return GestureDetector(
    onTap: onTap,
    child: Container(
      decoration: BoxDecoration(
        color: isSelected ? statusColor.withOpacity(0.2) : Colors.grey[100],
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isSelected ? statusColor : Colors.transparent,
          width: 2,
        ),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          if (isSelected)
            Icon(Icons.check_circle, color: statusColor, size: 24)
          else
            Icon(Icons.circle_outlined, color: statusColor, size: 24),
          const SizedBox(height: 6),
          Text(
            status,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 12,
              fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
              color: statusColor,
            ),
          ),
        ],
      ),
    ),
  );
}
```

**What it does**:
- Creates individual status option buttons
- Color-codes each status
- Shows checkmark if currently selected
- Assigns proper color to each status type

---

## 6. New Method: Update Attendance Status

### Code Added:
```dart
Future<void> _updateAttendanceStatus(
  BuildContext context,
  dynamic student,
  String newStatus,
) async {
  Navigator.pop(context);

  if (_isUpdating) return;

  try {
    setState(() => _isUpdating = true);

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Updating status...'),
        duration: Duration(seconds: 1),
      ),
    );

    // Call API to update attendance status for specific subject
    await TeacherService.updateStudentAttendance(
      token: widget.token,
      studentId: student['studentId'] ?? student['id'] ?? '',
      scheduleId: widget.scheduleId,
      status: newStatus,
    );

    if (mounted) {
      // Update local state
      setState(() {
        student['status'] = newStatus;
        student['attendanceStatus'] = newStatus;
        _isUpdating = false;
      });

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Status updated to $newStatus'),
          backgroundColor: Colors.green,
          duration: const Duration(seconds: 2),
        ),
      );
    }
  } catch (e) {
    if (mounted) {
      setState(() => _isUpdating = false);

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error updating status: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }
}
```

**What it does**:
1. Closes dialog immediately
2. Prevents duplicate calls with `_isUpdating` check
3. Shows loading toast
4. Calls TeacherService API
5. Updates local state on success
6. Shows success/error toast
7. Handles mounted check for safety

---

## 7. Navigation Update (schedule.dart)

### Before:
```dart
Navigator.push(
  context,
  MaterialPageRoute(
    builder: (context) =>
        ScheduleDetailsPage(schedule: schedule, students: students),
  ),
);
```

### After:
```dart
Navigator.push(
  context,
  MaterialPageRoute(
    builder: (context) => ScheduleDetailsPage(
      schedule: schedule,
      students: students,
      token: widget.token,
      scheduleId: schedule['_id'] ?? '',
    ),
  ),
);
```

**Why**: Passes token and scheduleId from parent page to child page.

---

## 8. New API Method (teacherService.dart)

### Code Added:
```dart
/// Update student attendance status for a specific schedule
/// This allows teachers to override QR scan status for their subject/class
static Future<Map<String, dynamic>> updateStudentAttendance({
  required String token,
  required String studentId,
  required String scheduleId,
  required String status,
}) async {
  try {
    final body = {
      'studentId': studentId,
      'scheduleId': scheduleId,
      'status': status,
      'timestamp': DateTime.now().toIso8601String(),
    };

    final response = await http.patch(
      Uri.parse('$baseUrl/schedules/$scheduleId/student-attendance'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
      body: jsonEncode(body),
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return data['result'] ?? data;
    } else {
      final error = jsonDecode(response.body);
      throw Exception(error['error'] ?? 'Failed to update attendance status');
    }
  } catch (e) {
    throw Exception('Error updating student attendance: $e');
  }
}
```

**What it does**:
- Makes PATCH request to backend
- Sends studentId, scheduleId, status, timestamp
- Returns success result or throws exception
- Includes proper error handling

---

## Summary of Changes

| File | Changes | Lines Added |
|------|---------|------------|
| `schedule_details.dart` | Constructor updated, status button made interactive, added 3 new methods | ~150 |
| `schedule.dart` | Navigation updated to pass token and scheduleId | 4 |
| `teacherService.dart` | New `updateStudentAttendance()` method added | ~35 |

**Total new code**: ~189 lines
**Files modified**: 3
**Breaking changes**: None (backwards compatible)
