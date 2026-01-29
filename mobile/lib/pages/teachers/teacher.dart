import 'dart:typed_data';

import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:mobile/fetch/teacherService.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import 'package:share_plus/share_plus.dart';
import 'package:mobile/utils/pdf_download_stub.dart'
    if (dart.library.html) 'package:mobile/utils/pdf_download_web.dart'
    as pdf_download;
import 'schedule.dart';
import 'components/background_logo.dart';
import 'package:mobile/theme.dart';

class TeacherDashboard extends StatefulWidget {
  final String token;
  final String teacherId;
  final String teacherName;
  final String email;
  final String? subject;
  final String? role;
  final VoidCallback? onLogout;

  const TeacherDashboard({
    super.key,
    required this.token,
    required this.teacherId,
    required this.teacherName,
    required this.email,
    this.subject,
    this.role,
    this.onLogout,
  });

  @override
  State<TeacherDashboard> createState() => _TeacherDashboardState();
}

class _TeacherDashboardState extends State<TeacherDashboard>
    with TickerProviderStateMixin {
  final _storage = const FlutterSecureStorage();
  late TabController _tabController;
  int _currentTab = 0;
  bool _isLoading = true;
  Map<String, dynamic> _attendanceStats = {
    'present': 0,
    'absent': 0,
    'late': 0,
    'cutting': 0,
    'total': 0,
  };
  List<dynamic> _attendanceRecords = [];
  List<dynamic> _todaySchedules = [];
  List<dynamic> _allSchedules = [];
  List<dynamic> _classPerformance = [];
  List<dynamic> _todayAbsentStudents = [];
  List<dynamic> _criticalAlerts = [];
  Map<String, dynamic> _todayStats = {
    'present': 0,
    'absent': 0,
    'late': 0,
    'cutting': 0,
    'total': 0,
  };
  List<Map<String, dynamic>> _weeklyTrends = [];
  String? _error;
  bool _contentEntered = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _loadDashboardData();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) setState(() => _contentEntered = true);
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadDashboardData() async {
    try {
      setState(() => _isLoading = true);

      // Fetch teacher's schedules FIRST to filter data
      final todaySchedules = await TeacherService.getTeacherSchedule(
        token: widget.token,
        teacherId: widget.teacherId,
        teacherName: widget.teacherName,
      );

      // Filter for today's schedules
      final today = _getTodaySchedules(todaySchedules);

      // Store all schedules
      final allSchedules = List<dynamic>.from(todaySchedules);

      // Fetch attendance stats (API call retained if needed in future)
      await TeacherService.getAttendanceStats(token: widget.token);

      // Fetch attendance records
      final recordsResponse = await TeacherService.getAttendanceRecords(
        token: widget.token,
      );
      final allRecords = recordsResponse['records'] as List<dynamic>? ?? [];

      // Filter records to only include this teacher's classes
      final records = _filterRecordsByTeacherSchedules(
        allRecords,
        allSchedules,
      );

      // Calculate class performance (using filtered records)
      final performance = _calculateClassPerformance(records);

      // Calculate today's stats (using filtered records)
      final todayStats = _calculateTodayStats(records);

      // Get today's absent students (using filtered records)
      final absentStudents = _getTodayAbsentStudents(records);

      // Get critical alerts (using filtered records)
      final alerts = _calculateCriticalAlerts(records);

      // Get weekly trends (using filtered records)
      final trends = _calculateWeeklyTrends(records);

      // Calculate stats from filtered records
      final filteredStats = _calculateStatsFromRecords(records);

      if (mounted) {
        final wasRetry = _error != null;
        setState(() {
          _attendanceStats =
              filteredStats; // Use filtered stats instead of API stats
          _attendanceRecords = records;
          _todaySchedules = today;
          _allSchedules = allSchedules;
          _classPerformance = performance;
          _todayStats = todayStats;
          _todayAbsentStudents = absentStudents;
          _criticalAlerts = alerts;
          _weeklyTrends = trends;
          _error = null;
          _isLoading = false;
        });
        if (wasRetry) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: const Text('Data refreshed successfully'),
              backgroundColor: kPrimary,
              behavior: SnackBarBehavior.floating,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString();
          _isLoading = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Refresh failed: ${e.toString().length > 60 ? '${e.toString().substring(0, 60)}…' : e}',
            ),
            backgroundColor: Colors.red[700],
            behavior: SnackBarBehavior.floating,
            action: SnackBarAction(
              label: 'Retry',
              textColor: Colors.white,
              onPressed: () => _loadDashboardData(),
            ),
          ),
        );
      }
      debugPrint('Error loading dashboard data: $e');
    }
  }

  // Filter attendance records to only include records from teacher's assigned classes
  List<dynamic> _filterRecordsByTeacherSchedules(
    List<dynamic> records,
    List<dynamic> schedules,
  ) {
    if (schedules.isEmpty) return [];

    // Create a set of class keys from teacher's schedules
    // Format: "gradeLevel-section-shift-subject"
    final teacherClassKeys = <String>{};
    for (var schedule in schedules) {
      final gradeLevel = schedule['gradeLevel'] ?? '';
      final section = schedule['section'] ?? '';
      final shift = schedule['shift'] ?? '';
      final subject = schedule['subject'] ?? '';

      if (gradeLevel.isNotEmpty && section.isNotEmpty && shift.isNotEmpty) {
        // Add subject-specific key
        teacherClassKeys.add('$gradeLevel-$section-$shift-$subject');
        // Also add General key (QR scanned records)
        teacherClassKeys.add('$gradeLevel-$section-$shift-General');
      }
    }

    // Filter records that match teacher's classes
    return records.where((record) {
      final gradeLevel = record['gradeLevel'] ?? '';
      final section = record['section'] ?? '';
      final shift = record['shift'] ?? '';
      final subject = record['subject'] ?? '';

      final recordKey = '$gradeLevel-$section-$shift-$subject';
      return teacherClassKeys.contains(recordKey);
    }).toList();
  }

  // Calculate stats from filtered records
  Map<String, dynamic> _calculateStatsFromRecords(List<dynamic> records) {
    final stats = {
      'present': 0,
      'absent': 0,
      'late': 0,
      'cutting': 0,
      'total': 0,
    };

    for (var record in records) {
      final status = (record['status'] ?? '').toString().toLowerCase();
      stats['total'] = (stats['total'] as int) + 1;

      if (status == 'present') {
        stats['present'] = (stats['present'] as int) + 1;
      } else if (status == 'absent') {
        stats['absent'] = (stats['absent'] as int) + 1;
      } else if (status == 'late') {
        stats['late'] = (stats['late'] as int) + 1;
      } else if (status == 'cutting') {
        stats['cutting'] = (stats['cutting'] as int) + 1;
      }
    }

    return stats;
  }

  List<dynamic> _getTodaySchedules(List<dynamic> schedules) {
    final today = DateTime.now();
    final dayName = _getDayName(today.weekday);

    bool scheduleHasDay(dynamic schedule, String day) {
      final raw = schedule['days'];
      if (raw is List && raw.isNotEmpty) {
        return raw.contains(day);
      }
      return schedule['day'] == day;
    }

    return schedules
        .where((schedule) => scheduleHasDay(schedule, dayName))
        .toList()
      ..sort((a, b) {
        final timeA = a['timeSlot'] ?? '';
        final timeB = b['timeSlot'] ?? '';
        return _compareTimeSlots(timeA, timeB);
      });
  }

  // Helper function to compare time slots for sorting (earliest first)
  int _compareTimeSlots(String timeA, String timeB) {
    try {
      // Extract start time from time slot (e.g., "08:00-09:00" -> "08:00")
      String startTimeA = timeA;
      String startTimeB = timeB;

      if (timeA.contains('-')) {
        startTimeA = timeA.split('-')[0].trim();
      }
      if (timeB.contains('-')) {
        startTimeB = timeB.split('-')[0].trim();
      }

      // Parse time to hours and minutes
      final partsA = startTimeA.split(':');
      final partsB = startTimeB.split(':');

      if (partsA.length >= 2 && partsB.length >= 2) {
        final hourA = int.parse(partsA[0]);
        final minuteA = int.parse(partsA[1].substring(0, 2));
        final hourB = int.parse(partsB[0]);
        final minuteB = int.parse(partsB[1].substring(0, 2));

        // Compare hours first, then minutes
        if (hourA != hourB) {
          return hourA.compareTo(hourB);
        }
        return minuteA.compareTo(minuteB);
      }

      // Fallback to string comparison if parsing fails
      return timeA.compareTo(timeB);
    } catch (e) {
      // Fallback to string comparison if parsing fails
      return timeA.compareTo(timeB);
    }
  }

  String _getDayName(int weekday) {
    const days = [
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday',
    ];
    return days[weekday - 1];
  }

  List<dynamic> _calculateClassPerformance(List<dynamic> records) {
    final Map<String, Map<String, dynamic>> classData = {};

    for (var record in records) {
      final classKey = '${record['gradeLevel']}-${record['section']}';
      if (!classData.containsKey(classKey)) {
        classData[classKey] = {
          'gradeLevel': record['gradeLevel'],
          'section': record['section'],
          'subject': record['subject'],
          'totalRecords': 0,
          'present': 0,
          'absent': 0,
          'late': 0,
          'cutting': 0,
        };
      }

      classData[classKey]!['totalRecords']++;
      final status = record['status'] ?? 'Unknown';
      switch (status) {
        case 'Present':
          classData[classKey]!['present']++;
          break;
        case 'Absent':
          classData[classKey]!['absent']++;
          break;
        case 'Late':
          classData[classKey]!['late']++;
          break;
        case 'Cutting':
          classData[classKey]!['cutting']++;
          break;
      }
    }

    return classData.values.toList()..sort((a, b) {
      final gradeA = int.tryParse(a['gradeLevel'].toString()) ?? 0;
      final gradeB = int.tryParse(b['gradeLevel'].toString()) ?? 0;
      return gradeA.compareTo(gradeB);
    });
  }

  Map<String, dynamic> _calculateTodayStats(List<dynamic> records) {
    final today = DateTime.now();
    final todayFormatted =
        '${today.year}-${today.month.toString().padLeft(2, '0')}-${today.day.toString().padLeft(2, '0')}';

    final todayRecords = records.where((r) {
      final createdAt = r['createdAt'] as String?;
      return createdAt?.startsWith(todayFormatted) ?? false;
    }).toList();

    Map<String, dynamic> stats = {
      'present': 0,
      'absent': 0,
      'late': 0,
      'cutting': 0,
      'total': todayRecords.length,
    };

    for (var record in todayRecords) {
      final status = record['status'] ?? 'Unknown';
      switch (status) {
        case 'Present':
          stats['present']++;
          break;
        case 'Absent':
          stats['absent']++;
          break;
        case 'Late':
          stats['late']++;
          break;
        case 'Cutting':
          stats['cutting']++;
          break;
      }
    }

    return stats;
  }

  /// Per-subject/per-class breakdown for today (present, absent, late, cutting).
  List<Map<String, dynamic>> _getTodaySubjectBreakdown() {
    final today = DateTime.now();
    final todayFormatted =
        '${today.year}-${today.month.toString().padLeft(2, '0')}-${today.day.toString().padLeft(2, '0')}';

    final todayRecords = _attendanceRecords.where((r) {
      final createdAt = r['createdAt'] as String?;
      return createdAt?.startsWith(todayFormatted) ?? false;
    }).toList();

    final Map<String, Map<String, dynamic>> byClass = {};
    for (var record in todayRecords) {
      final gradeLevel = record['gradeLevel'] ?? 'N/A';
      final section = record['section'] ?? 'N/A';
      final subject = record['subject'] ?? 'N/A';
      final key = '$gradeLevel-$section-$subject';
      if (!byClass.containsKey(key)) {
        byClass[key] = {
          'gradeLevel': gradeLevel,
          'section': section,
          'subject': subject,
          'present': 0,
          'absent': 0,
          'late': 0,
          'cutting': 0,
          'total': 0,
        };
      }
      byClass[key]!['total']++;
      final status = record['status'] ?? 'Unknown';
      switch (status) {
        case 'Present':
          byClass[key]!['present']++;
          break;
        case 'Absent':
          byClass[key]!['absent']++;
          break;
        case 'Late':
          byClass[key]!['late']++;
          break;
        case 'Cutting':
          byClass[key]!['cutting']++;
          break;
      }
    }

    return byClass.values.toList()..sort((a, b) {
      final gradeA = int.tryParse(a['gradeLevel'].toString()) ?? 0;
      final gradeB = int.tryParse(b['gradeLevel'].toString()) ?? 0;
      if (gradeA != gradeB) return gradeA.compareTo(gradeB);
      return (a['section'] ?? '').toString().compareTo(
        (b['section'] ?? '').toString(),
      );
    });
  }

  /// Per-subject breakdown for last 7 days (present, absent, late, cutting).
  List<Map<String, dynamic>> _getWeeklySubjectBreakdown() {
    final now = DateTime.now();
    final weekAgo = now.subtract(const Duration(days: 7));

    final weekRecords = _attendanceRecords.where((r) {
      final createdAt = r['createdAt'] as String?;
      if (createdAt == null) return false;
      final date = DateTime.tryParse(createdAt.substring(0, 10));
      return date != null && !date.isBefore(weekAgo) && !date.isAfter(now);
    }).toList();

    return _subjectBreakdownFromRecords(weekRecords);
  }

  /// Per-subject breakdown for current month (present, absent, late, cutting).
  List<Map<String, dynamic>> _getMonthlySubjectBreakdown() {
    final now = DateTime.now();
    final monthPrefix = '${now.year}-${now.month.toString().padLeft(2, '0')}';

    final monthRecords = _attendanceRecords.where((r) {
      final createdAt = r['createdAt'] as String?;
      return createdAt != null && createdAt.startsWith(monthPrefix);
    }).toList();

    return _subjectBreakdownFromRecords(monthRecords);
  }

  List<Map<String, dynamic>> _subjectBreakdownFromRecords(
    List<dynamic> records,
  ) {
    final Map<String, Map<String, dynamic>> byClass = {};
    for (var record in records) {
      final gradeLevel = record['gradeLevel'] ?? 'N/A';
      final section = record['section'] ?? 'N/A';
      final subject = record['subject'] ?? 'N/A';
      final key = '$gradeLevel-$section-$subject';
      if (!byClass.containsKey(key)) {
        byClass[key] = {
          'gradeLevel': gradeLevel,
          'section': section,
          'subject': subject,
          'present': 0,
          'absent': 0,
          'late': 0,
          'cutting': 0,
          'total': 0,
        };
      }
      byClass[key]!['total']++;
      final status = record['status'] ?? 'Unknown';
      switch (status) {
        case 'Present':
          byClass[key]!['present']++;
          break;
        case 'Absent':
          byClass[key]!['absent']++;
          break;
        case 'Late':
          byClass[key]!['late']++;
          break;
        case 'Cutting':
          byClass[key]!['cutting']++;
          break;
      }
    }
    return byClass.values.toList()..sort((a, b) {
      final gradeA = int.tryParse(a['gradeLevel'].toString()) ?? 0;
      final gradeB = int.tryParse(b['gradeLevel'].toString()) ?? 0;
      if (gradeA != gradeB) return gradeA.compareTo(gradeB);
      return (a['section'] ?? '').toString().compareTo(
        (b['section'] ?? '').toString(),
      );
    });
  }

  /// Overall stats (present, absent, late, cutting, total) from a breakdown list.
  Map<String, int> _overallStatsFromBreakdown(
    List<Map<String, dynamic>> breakdown,
  ) {
    int present = 0, absent = 0, late = 0, cutting = 0, total = 0;
    for (var row in breakdown) {
      present += (row['present'] as int? ?? 0);
      absent += (row['absent'] as int? ?? 0);
      late += (row['late'] as int? ?? 0);
      cutting += (row['cutting'] as int? ?? 0);
      total += (row['total'] as int? ?? 0);
    }
    return {
      'present': present,
      'absent': absent,
      'late': late,
      'cutting': cutting,
      'total': total,
    };
  }

  List<dynamic> _getTodayAbsentStudents(List<dynamic> records) {
    final today = DateTime.now();
    final todayFormatted =
        '${today.year}-${today.month.toString().padLeft(2, '0')}-${today.day.toString().padLeft(2, '0')}';

    return records.where((r) {
      final status = r['status'] as String?;
      final createdAt = r['createdAt'] as String?;
      return status == 'Absent' &&
          createdAt?.startsWith(todayFormatted) == true;
    }).toList();
  }

  List<dynamic> _calculateCriticalAlerts(List<dynamic> records) {
    final alerts = <Map<String, dynamic>>[];
    final Map<String, List<dynamic>> studentRecords = {};

    // Group records by student
    for (var record in records) {
      final studentId = record['studentId'] ?? 'unknown';
      if (!studentRecords.containsKey(studentId)) {
        studentRecords[studentId] = [];
      }
      studentRecords[studentId]!.add(record);
    }

    // Check for critical conditions
    for (var entry in studentRecords.entries) {
      final studentName = entry.value.isNotEmpty
          ? entry.value[0]['studentName']
          : 'Unknown';
      final records = entry.value;

      // Check for 3 consecutive days of absence
      final consecutiveDays = _checkConsecutiveAbsences(records);
      if (consecutiveDays >= 3) {
        alerts.add({
          'studentName': studentName,
          'reason': '$consecutiveDays consecutive days of absence detected',
          'severity': 'high',
          'type': 'Consecutive Absences',
        });
      }

      // Count recent absences (last 10 records)
      final recentRecords = records.length > 10
          ? records.sublist(records.length - 10)
          : records;
      final absenceCount = recentRecords
          .where((r) => r['status'] == 'Absent')
          .length;
      final totalCount = recentRecords.length;
      final attendance = totalCount > 0
          ? (((totalCount - absenceCount) / totalCount) * 100).toStringAsFixed(
              1,
            )
          : '0';

      // Alert if 3+ absences in recent records
      if (absenceCount >= 3) {
        alerts.add({
          'studentName': studentName,
          'reason': '$absenceCount absences in last $totalCount records',
          'severity': 'high',
          'type': 'Repeated Absences',
        });
      }

      // Alert if attendance below 70%
      if (double.parse(attendance) < 70) {
        alerts.add({
          'studentName': studentName,
          'reason': '$attendance% attendance (below 70% threshold)',
          'severity': 'medium',
          'type': 'Low Attendance',
        });
      }
    }

    return alerts.take(5).toList(); // Show top 5 alerts
  }

  int _checkConsecutiveAbsences(List<dynamic> records) {
    // Extract unique dates with absences and sort them
    final Map<String, bool> dateAbsenceMap = {};

    for (var record in records) {
      final createdAt = record['createdAt'] as String?;
      final status = record['status'] as String?;

      if (createdAt != null && status == 'Absent') {
        // Extract date in YYYY-MM-DD format
        final date = createdAt.substring(0, 10);
        dateAbsenceMap[date] = true;
      }
    }

    if (dateAbsenceMap.isEmpty) return 0;

    // Sort dates
    final sortedDates = dateAbsenceMap.keys.toList()..sort();

    // Find the longest consecutive sequence
    int maxConsecutive = 1;
    int currentConsecutive = 1;

    for (int i = 1; i < sortedDates.length; i++) {
      final currentDate = DateTime.parse(sortedDates[i]);
      final previousDate = DateTime.parse(sortedDates[i - 1]);

      // Check if dates are consecutive (1 day apart)
      if (currentDate.difference(previousDate).inDays == 1) {
        currentConsecutive++;
        maxConsecutive = maxConsecutive > currentConsecutive
            ? maxConsecutive
            : currentConsecutive;
      } else {
        currentConsecutive = 1;
      }
    }

    return maxConsecutive;
  }

  List<Map<String, dynamic>> _calculateWeeklyTrends(List<dynamic> records) {
    final trends = <Map<String, dynamic>>[];
    final today = DateTime.now();

    for (int i = 6; i >= 0; i--) {
      final date = today.subtract(Duration(days: i));
      final dateFormatted =
          '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';

      final dayRecords = records.where((r) {
        final createdAt = r['createdAt'] as String?;
        return createdAt?.startsWith(dateFormatted) ?? false;
      }).toList();

      final present = dayRecords.where((r) => r['status'] == 'Present').length;
      final total = dayRecords.length;
      final percentage = total > 0 ? ((present / total) * 100).toInt() : 0;

      trends.add({
        'day': [
          'Mon',
          'Tue',
          'Wed',
          'Thu',
          'Fri',
          'Sat',
          'Sun',
        ][date.weekday - 1],
        'percentage': percentage,
        'count': present,
      });
    }

    return trends;
  }

  Future<void> _handleLogout() async {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Logout'),
        content: const Text('Are you sure you want to logout?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () async {
              Navigator.pop(context);

              // Clear all stored teacher data
              await _storage.delete(key: 'teacher_token');
              await _storage.delete(key: 'teacher_id');
              await _storage.delete(key: 'teacher_name');
              await _storage.delete(key: 'teacher_email');
              await _storage.delete(key: 'teacher_subject');
              await _storage.delete(key: 'teacher_role');

              if (mounted) {
                // Call the onLogout callback if provided
                if (widget.onLogout != null) {
                  widget.onLogout!();
                } else {
                  // Navigate back to login by popping all routes
                  Navigator.of(context).pop();
                }
              }
            },
            child: const Text('Logout', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: kBackground,
      appBar: AppBar(
        elevation: 0,
        flexibleSpace: Container(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [kPrimary, kPrimaryLight],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
          ),
        ),
        title: const Text(
          'Teacher Dashboard',
          style: TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.bold,
            color: Colors.white,
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout, color: Colors.white),
            onPressed: _handleLogout,
            tooltip: 'Logout',
            splashRadius: 24,
            splashColor: Colors.white24,
            highlightColor: Colors.white12,
          ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(56),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                color: kPrimaryDark,
                child: TabBar(
                  controller: _tabController,
                  indicatorColor: Colors.white,
                  indicatorWeight: 3,
                  labelColor: Colors.white,
                  unselectedLabelColor: Colors.white70,
                  splashFactory: InkRipple.splashFactory,
                  onTap: (index) {
                    setState(() => _currentTab = index);
                  },
                  tabs: const [
                    Tab(icon: Icon(Icons.dashboard), text: 'Dashboard'),
                    Tab(icon: Icon(Icons.schedule), text: 'Schedule'),
                  ],
                ),
              ),
              if (_isLoading)
                const LinearProgressIndicator(
                  backgroundColor: Color(0x20000000),
                  valueColor: AlwaysStoppedAnimation<Color>(Colors.white70),
                ),
            ],
          ),
        ),
      ),
      body: _currentTab == 0
          ? _isLoading
                ? Center(
                    child: CircularProgressIndicator(
                      valueColor: AlwaysStoppedAnimation<Color>(kPrimary),
                    ),
                  )
                : _error != null
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.error_outline,
                          size: 64,
                          color: Colors.red[400],
                        ),
                        const SizedBox(height: 16),
                        Text(
                          'Error Loading Data',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: Colors.red[700],
                          ),
                        ),
                        const SizedBox(height: 8),
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          child: Text(
                            _error!,
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontSize: 14,
                              color: Colors.grey[600],
                            ),
                          ),
                        ),
                        const SizedBox(height: 24),
                        ElevatedButton.icon(
                          onPressed: _loadDashboardData,
                          icon: const Icon(Icons.refresh),
                          label: const Text('Retry'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: kPrimary,
                            foregroundColor: Colors.white,
                          ),
                        ),
                      ],
                    ),
                  )
                : SafeArea(
                    child: Stack(
                      children: [
                        // Background Logo
                        const BackgroundLogo(),
                        // Main Content
                        SingleChildScrollView(
                          child: Padding(
                            padding: const EdgeInsets.all(16.0),
                            child: AnimatedOpacity(
                              opacity: _contentEntered ? 1.0 : 0.0,
                              duration: kAnimationEnterDuration,
                              curve: kAnimationEnterCurve,
                              child: AnimatedSlide(
                                offset: _contentEntered
                                    ? Offset.zero
                                    : const Offset(0, 0.06),
                                duration: kAnimationEnterDuration,
                                curve: kAnimationEnterCurve,
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    // Profile Section
                                    _buildProfileCard(),
                                    const SizedBox(height: 24),

                                    // Quick Actions Bar
                                    _buildQuickActionsBar(),
                                    const SizedBox(height: 24),

                                    // Today's Quick Stats Cards
                                    _buildTodayQuickStatsSection(),
                                    const SizedBox(height: 24),

                                    // Critical Alerts Panel
                                    _buildCriticalAlertsSection(),
                                    const SizedBox(height: 24),

                                    // Today's Schedule Section
                                    _buildTodayScheduleSection(),
                                    const SizedBox(height: 24),

                                    // Today's Absent Students
                                    _buildTodayAbsentStudentsSection(),
                                    const SizedBox(height: 24),

                                    // Attendance Trends
                                    _buildAttendanceTrendsSection(),
                                    const SizedBox(height: 24),

                                    // Class Performance Overview
                                    _buildClassPerformanceSection(),
                                    const SizedBox(height: 24),

                                    // Attendance Records Section
                                    _buildAttendanceRecordsSection(),
                                    const SizedBox(height: 40),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  )
          : TeacherSchedule(
              token: widget.token,
              teacherId: widget.teacherId,
              teacherName: widget.teacherName,
            ),
    );
  }

  Widget _buildTodayQuickStatsSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          "Today's Stats",
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: Colors.black87,
          ),
        ),
        const SizedBox(height: 12),
        GridView.count(
          crossAxisCount: 2,
          crossAxisSpacing: 12,
          mainAxisSpacing: 12,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          children: [
            _buildStatCard(
              label: 'Present',
              count: _todayStats['present'] ?? 0,
              color: Colors.green,
              icon: Icons.check_circle,
            ),
            _buildStatCard(
              label: 'Absent',
              count: _todayStats['absent'] ?? 0,
              color: Colors.red,
              icon: Icons.cancel,
            ),
            _buildStatCard(
              label: 'Late',
              count: _todayStats['late'] ?? 0,
              color: Colors.orange,
              icon: Icons.schedule,
            ),
            _buildStatCard(
              label: 'Cutting',
              count: _todayStats['cutting'] ?? 0,
              color: Colors.purple,
              icon: Icons.warning,
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildStatCard({
    required String label,
    required int count,
    required Color color,
    required IconData icon,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.3), width: 1.5),
        boxShadow: [
          BoxShadow(
            color: color.withValues(alpha: 0.1),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 32, color: color),
            const SizedBox(height: 8),
            Text(
              count.toString(),
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: color,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: Colors.grey[700],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCriticalAlertsSection() {
    if (_criticalAlerts.isEmpty) {
      return const SizedBox.shrink();
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Critical Alerts',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: Colors.black87,
          ),
        ),
        const SizedBox(height: 12),
        Container(
          decoration: BoxDecoration(
            color: Colors.red.shade50,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.red.shade200, width: 1.5),
          ),
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: _criticalAlerts.length,
              separatorBuilder: (context, index) =>
                  Divider(color: Colors.red.shade200, height: 12),
              itemBuilder: (context, index) {
                final alert = _criticalAlerts[index];
                return _buildAlertItem(alert);
              },
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildAlertItem(dynamic alert) {
    final severity = alert['severity'] ?? 'medium';
    final severityColor = severity == 'high' ? Colors.red : Colors.orange;

    return Row(
      children: [
        Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: severityColor.withValues(alpha: 0.2),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Center(
            child: Icon(
              severity == 'high' ? Icons.priority_high : Icons.warning,
              color: severityColor,
              size: 20,
            ),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                alert['studentName'] ?? 'Unknown',
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                  color: Colors.black87,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                alert['reason'] ?? '',
                style: TextStyle(fontSize: 12, color: Colors.grey[600]),
              ),
            ],
          ),
        ),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(
            color: severityColor.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(4),
          ),
          child: Text(
            alert['type'] ?? '',
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w600,
              color: severityColor,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildTodayAbsentStudentsSection() {
    if (_todayAbsentStudents.isEmpty) {
      return const SizedBox.shrink();
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              "Today's Absent Students",
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: Colors.black87,
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: Colors.red.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                '${_todayAbsentStudents.length}',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  color: Colors.red,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.red.shade200, width: 1.5),
          ),
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: _todayAbsentStudents.length > 5
                  ? 5
                  : _todayAbsentStudents.length,
              separatorBuilder: (context, index) =>
                  Divider(color: Colors.grey[300], height: 12),
              itemBuilder: (context, index) {
                final student = _todayAbsentStudents[index];
                return _buildAbsentStudentItem(student);
              },
            ),
          ),
        ),
        if (_todayAbsentStudents.length > 5) ...[
          const SizedBox(height: 8),
          Center(
            child: TextButton(
              onPressed: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('View all absent students coming soon'),
                  ),
                );
              },
              child: Text(
                'View All (${_todayAbsentStudents.length})',
                style: const TextStyle(color: Colors.red),
              ),
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildAbsentStudentItem(dynamic student) {
    final studentName = student['studentName'] ?? 'Unknown';
    final subject = student['subject'] ?? 'N/A';
    final gradeLevel = student['gradeLevel'] ?? 'N/A';
    final section = student['section'] ?? 'N/A';
    final studentId = student['studentId'] ?? '';

    return Row(
      children: [
        Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: Colors.red.withValues(alpha: 0.2),
            borderRadius: BorderRadius.circular(8),
          ),
          child: const Center(
            child: Icon(Icons.person, color: Colors.red, size: 20),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                studentName,
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.bold,
                  color: Colors.black87,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                '$subject - Grade $gradeLevel-$section',
                style: TextStyle(fontSize: 11, color: Colors.grey[600]),
              ),
            ],
          ),
        ),
        PopupMenuButton(
          itemBuilder: (context) => [
            PopupMenuItem(
              child: const Row(
                children: [
                  Icon(Icons.visibility, size: 16),
                  SizedBox(width: 8),
                  Text('View Details'),
                ],
              ),
              onTap: () => _showStudentDetailsDialog(
                studentId,
                studentName,
                gradeLevel,
                section,
              ),
            ),
            const PopupMenuItem(
              child: Row(
                children: [
                  Icon(Icons.message, size: 16),
                  SizedBox(width: 8),
                  Text('Send SMS'),
                ],
              ),
            ),
            const PopupMenuItem(
              child: Row(
                children: [
                  Icon(Icons.note, size: 16),
                  SizedBox(width: 8),
                  Text('Add Note'),
                ],
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildAttendanceTrendsSection() {
    if (_weeklyTrends.isEmpty) {
      return const SizedBox.shrink();
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Attendance Trends (Last 7 Days)',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: Colors.black87,
          ),
        ),
        const SizedBox(height: 12),
        Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.grey.shade200, width: 1),
          ),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: _weeklyTrends.map((trend) {
                    final day = trend['day'] as String?;
                    final percentage = trend['percentage'] as int?;
                    return Expanded(
                      child: _buildTrendColumn(day ?? '', percentage ?? 0),
                    );
                  }).toList(),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildTrendColumn(String day, int percentage) {
    final isGood = percentage >= 75;
    return Column(
      mainAxisAlignment: MainAxisAlignment.end,
      children: [
        Container(
          width: 30,
          height: 100,
          decoration: BoxDecoration(
            color: Colors.grey[200],
            borderRadius: const BorderRadius.only(
              topLeft: Radius.circular(4),
              topRight: Radius.circular(4),
            ),
          ),
          child: Stack(
            alignment: Alignment.bottomCenter,
            children: [
              Container(
                width: 30,
                height: (percentage / 100) * 100,
                decoration: BoxDecoration(
                  color: isGood ? Colors.green : Colors.orange,
                  borderRadius: const BorderRadius.only(
                    topLeft: Radius.circular(4),
                    topRight: Radius.circular(4),
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 8),
        Text(
          '$percentage%',
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.bold,
            color: isGood ? Colors.green : Colors.orange,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          day,
          style: const TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w600,
            color: Colors.grey,
          ),
        ),
      ],
    );
  }

  Widget _buildQuickActionsBar() {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: [
          SizedBox(
            width: 90,
            child: _buildQuickActionButton(
              icon: Icons.calendar_today,
              label: 'Today',
              color: Colors.blue,
              onTap: () => _showTodayStats(),
            ),
          ),
          const SizedBox(width: 12),
          SizedBox(
            width: 90,
            child: _buildQuickActionButton(
              icon: Icons.date_range,
              label: 'Weekly',
              color: kPrimary,
              onTap: () => _showWeeklyStats(),
            ),
          ),
          const SizedBox(width: 12),
          SizedBox(
            width: 90,
            child: _buildQuickActionButton(
              icon: Icons.calendar_month,
              label: 'Monthly',
              color: Colors.orange,
              onTap: () => _showMonthlyStats(),
            ),
          ),
          const SizedBox(width: 12),
          SizedBox(
            width: 90,
            child: _buildQuickActionButton(
              icon: Icons.schedule,
              label: 'Schedule',
              color: Colors.teal,
              onTap: () => _showAllSchedules(),
            ),
          ),
          const SizedBox(width: 12),
          SizedBox(
            width: 90,
            child: _buildQuickActionButton(
              icon: Icons.file_download,
              label: 'Download',
              color: Colors.purple,
              onTap: () => _showReportOptions(),
            ),
          ),
        ],
      ),
    );
  }

  void _showReportOptions() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (context) => Container(
        decoration: const BoxDecoration(
          color: kBackground,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          boxShadow: [
            BoxShadow(
              color: Colors.black26,
              blurRadius: 20,
              offset: Offset(0, -4),
            ),
          ],
        ),
        child: SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: Colors.grey[300],
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                const SizedBox(height: 20),
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: kPrimary.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Icon(Icons.assessment, color: kPrimary, size: 24),
                    ),
                    const SizedBox(width: 14),
                    const Expanded(
                      child: Text(
                        'Generate Report',
                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                          color: kForeground,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  'Choose a report type to view and share',
                  style: TextStyle(fontSize: 13, color: kMutedForeground),
                ),
                const SizedBox(height: 20),
                _buildReportOption(
                  icon: Icons.book,
                  title: 'Subject Report (Today)',
                  subtitle: 'Per subject: present, absent, late, cutting',
                  onTap: () => _generateReport('subject'),
                ),
                const SizedBox(height: 10),
                _buildReportOption(
                  icon: Icons.date_range,
                  title: 'Subject Report (Weekly)',
                  subtitle: 'Per subject: last 7 days',
                  onTap: () => _generateReport('weekly'),
                ),
                const SizedBox(height: 10),
                _buildReportOption(
                  icon: Icons.bar_chart,
                  title: 'Subject Report (Monthly)',
                  subtitle: 'Per subject: current month',
                  onTap: () => _generateReport('monthly'),
                ),
                const SizedBox(height: 10),
                _buildReportOption(
                  icon: Icons.school,
                  title: 'Class Performance',
                  subtitle: 'All classes summary',
                  onTap: () => _generateReport('class'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _showTodayStats() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text("Today's Statistics"),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildStatsRow('Total Students', _todayStats['total'].toString()),
            const SizedBox(height: 8),
            _buildStatsRow(
              'Present',
              _todayStats['present'].toString(),
              Colors.green,
            ),
            const SizedBox(height: 8),
            _buildStatsRow(
              'Absent',
              _todayStats['absent'].toString(),
              Colors.red,
            ),
            const SizedBox(height: 8),
            _buildStatsRow(
              'Late',
              _todayStats['late'].toString(),
              Colors.orange,
            ),
            const SizedBox(height: 8),
            _buildStatsRow(
              'Cutting',
              _todayStats['cutting'].toString(),
              Colors.purple,
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }

  void _showAllSchedules() {
    // Sort all schedules by day and time
    final dayOrder = [
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday',
    ];

    int earliestIndex(dynamic s) {
      final raw = s['days'];
      if (raw is List && raw.isNotEmpty) {
        final indices = raw
            .map((d) => dayOrder.indexOf(d))
            .where((i) => i >= 0)
            .toList();
        if (indices.isNotEmpty) return indices.reduce((a, b) => a < b ? a : b);
      }
      final day = s['day'] ?? '';
      final idx = dayOrder.indexOf(day);
      return idx >= 0 ? idx : 999;
    }

    final sortedSchedules = List<dynamic>.from(_allSchedules)
      ..sort((a, b) {
        final idxA = earliestIndex(a);
        final idxB = earliestIndex(b);
        if (idxA != idxB) return idxA.compareTo(idxB);
        // Then sort by time
        final timeA = a['timeSlot'] ?? '';
        final timeB = b['timeSlot'] ?? '';
        return _compareTimeSlots(timeA, timeB);
      });

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => Container(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'All Schedules',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: Colors.black87,
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
            const SizedBox(height: 16),
            if (sortedSchedules.isEmpty)
              Padding(
                padding: const EdgeInsets.all(32.0),
                child: Center(
                  child: Text(
                    'No schedules found',
                    style: TextStyle(
                      fontSize: 14,
                      color: Colors.blue[600],
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
              )
            else
              ConstrainedBox(
                constraints: BoxConstraints(
                  maxHeight: MediaQuery.of(context).size.height * 0.7,
                ),
                child: ListView.builder(
                  shrinkWrap: true,
                  itemCount: sortedSchedules.length,
                  itemBuilder: (context, index) {
                    final schedule = sortedSchedules[index];
                    final subject = schedule['subject'] ?? 'N/A';
                    final gradeLevel = schedule['gradeLevel'] ?? 'N/A';
                    final section = schedule['section'] ?? 'N/A';
                    final timeSlot = schedule['timeSlot'] ?? 'N/A';
                    final rawDays = schedule['days'];
                    final dayList = (rawDays is List && rawDays.isNotEmpty)
                        ? rawDays.cast<String>()
                        : (schedule['day'] != null
                              ? [schedule['day'] as String]
                              : <String>[]);
                    final day = dayList.join(', ');
                    final shift = schedule['shift'] ?? 'N/A';

                    // Convert time to AM/PM format
                    final formattedTime = timeSlot != 'N/A'
                        ? _convertTo12HourFormat(timeSlot)
                        : 'N/A';

                    // Get shift color
                    final Map<String, Color> shiftColors = {
                      'Morning': const Color(0xFF3B82F6),
                      'Afternoon': const Color(0xFFF59E0B),
                      'Evening': const Color(0xFF8B5CF6),
                    };
                    final shiftColor = shiftColors[shift] ?? kPrimary;

                    return Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(
                            color: shiftColor.withValues(alpha: 0.3),
                            width: 1.5,
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.05),
                              blurRadius: 4,
                              offset: const Offset(0, 2),
                            ),
                          ],
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              subject,
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                                color: shiftColor,
                              ),
                            ),
                            const SizedBox(height: 6),
                            Row(
                              children: [
                                Icon(
                                  Icons.school,
                                  size: 14,
                                  color: Colors.blue[700],
                                ),
                                const SizedBox(width: 4),
                                Text(
                                  'Grade $gradeLevel - Section $section',
                                  style: TextStyle(
                                    fontSize: 13,
                                    color: Colors.blue[700],
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 6),
                            Wrap(
                              spacing: 8,
                              runSpacing: 4,
                              children: [
                                Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(
                                      Icons.calendar_today,
                                      size: 12,
                                      color: Colors.purple[700],
                                    ),
                                    const SizedBox(width: 4),
                                    Text(
                                      day,
                                      style: TextStyle(
                                        fontSize: 12,
                                        color: Colors.purple[700],
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ],
                                ),
                                Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(
                                      Icons.access_time,
                                      size: 12,
                                      color: Colors.green[700],
                                    ),
                                    const SizedBox(width: 4),
                                    Text(
                                      formattedTime,
                                      style: TextStyle(
                                        fontSize: 12,
                                        color: Colors.green[700],
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ],
                                ),
                                Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(
                                      Icons.layers,
                                      size: 12,
                                      color: shiftColor,
                                    ),
                                    const SizedBox(width: 4),
                                    Text(
                                      shift,
                                      style: TextStyle(
                                        fontSize: 12,
                                        color: shiftColor,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
              ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  void _showWeeklyStats() {
    // Calculate weekly stats from trends
    int totalPresent = 0;
    for (var trend in _weeklyTrends) {
      totalPresent += (trend['count'] as int? ?? 0);
    }

    int totalRecordsThisWeek = _attendanceRecords.where((r) {
      final createdAt = r['createdAt'] as String?;
      final sevenDaysAgo = DateTime.now().subtract(const Duration(days: 7));
      final createdDate = DateTime.tryParse(createdAt ?? '');
      return createdDate != null && createdDate.isAfter(sevenDaysAgo);
    }).length;

    final avgAttendance = _weeklyTrends.isEmpty
        ? 0
        : _weeklyTrends
                  .map((t) => t['percentage'] as int? ?? 0)
                  .reduce((a, b) => a + b) ~/
              _weeklyTrends.length;

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Weekly Statistics (Last 7 Days)'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildStatsRow('Total Records', totalRecordsThisWeek.toString()),
            const SizedBox(height: 8),
            _buildStatsRow(
              'Present Count',
              totalPresent.toString(),
              Colors.green,
            ),
            const SizedBox(height: 8),
            _buildStatsRow(
              'Average Attendance',
              '$avgAttendance%',
              Colors.blue,
            ),
            const SizedBox(height: 16),
            const Text(
              'Daily Breakdown:',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            ..._weeklyTrends.map(
              (trend) => Padding(
                padding: const EdgeInsets.symmetric(vertical: 4),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(trend['day'] ?? ''),
                    Text(
                      '${trend['percentage']}%',
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }

  void _showMonthlyStats() {
    // Calculate monthly stats
    int totalRecordsThisMonth = _attendanceRecords.where((r) {
      final createdAt = r['createdAt'] as String?;
      final now = DateTime.now();
      final firstDayOfMonth = DateTime(now.year, now.month, 1);
      final createdDate = DateTime.tryParse(createdAt ?? '');
      return createdDate != null && createdDate.isAfter(firstDayOfMonth);
    }).length;

    int presentCount = _attendanceStats['present'] ?? 0;
    int absentCount = _attendanceStats['absent'] ?? 0;
    int lateCount = _attendanceStats['late'] ?? 0;
    int cuttingCount = _attendanceStats['cutting'] ?? 0;

    final overallAttendance = totalRecordsThisMonth > 0
        ? ((presentCount / totalRecordsThisMonth) * 100).toStringAsFixed(1)
        : '0';

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Monthly Statistics'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildStatsRow('Total Records', totalRecordsThisMonth.toString()),
            const SizedBox(height: 8),
            _buildStatsRow('Present', presentCount.toString(), Colors.green),
            const SizedBox(height: 8),
            _buildStatsRow('Absent', absentCount.toString(), Colors.red),
            const SizedBox(height: 8),
            _buildStatsRow('Late', lateCount.toString(), Colors.orange),
            const SizedBox(height: 8),
            _buildStatsRow('Cutting', cuttingCount.toString(), Colors.purple),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.blue.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Overall Attendance',
                    style: TextStyle(fontWeight: FontWeight.bold),
                  ),
                  Text(
                    '$overallAttendance%',
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                      color: Colors.blue,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }

  Widget _buildStatsRow(String label, String value, [Color? valueColor]) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: const TextStyle(fontSize: 14)),
        Text(
          value,
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.bold,
            color: valueColor ?? Colors.black,
          ),
        ),
      ],
    );
  }

  Widget _buildReportOption({
    required IconData icon,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
  }) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        splashColor: kPrimary.withValues(alpha: 0.12),
        highlightColor: kPrimary.withValues(alpha: 0.06),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: Colors.grey[200]!),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.04),
                blurRadius: 6,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: kPrimary.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, color: kPrimary, size: 22),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.bold,
                        color: kForeground,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      subtitle,
                      style: TextStyle(fontSize: 12, color: kMutedForeground),
                    ),
                  ],
                ),
              ),
              Icon(Icons.arrow_forward_ios, size: 14, color: kMutedForeground),
            ],
          ),
        ),
      ),
    );
  }

  void _generateReport(String reportType) {
    Navigator.pop(context); // Close report-type picker

    final title = _getReportTitle(reportType);
    final plainContent = _buildReportContent(reportType);

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.7,
        minChildSize: 0.4,
        maxChildSize: 0.95,
        builder: (context, scrollController) => Container(
          decoration: const BoxDecoration(
            color: kBackground,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
            boxShadow: [
              BoxShadow(
                color: Colors.black26,
                blurRadius: 20,
                offset: Offset(0, -4),
              ),
            ],
          ),
          child: SafeArea(
            top: false,
            child: Column(
              children: [
                _buildReportModalHeader(
                  reportType: reportType,
                  title: title,
                  onClose: () => Navigator.pop(context),
                ),
                Expanded(
                  child: SingleChildScrollView(
                    controller: scrollController,
                    padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
                    child: _buildReportModalBody(reportType),
                  ),
                ),
                _buildReportModalActions(
                  plainContent: plainContent,
                  title: title,
                  reportType: reportType,
                  onClose: () => Navigator.pop(context),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildReportModalHeader({
    required String reportType,
    required String title,
    required VoidCallback onClose,
  }) {
    final labels = <String, String>{
      'daily': 'Daily Report',
      'subject': 'Subject Report (Today)',
      'weekly': 'Subject Report (Weekly)',
      'monthly': 'Subject Report (Monthly)',
      'class': 'Class Performance',
    };
    final label = labels[reportType] ?? 'Report';
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 16, 12, 16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [kPrimary, kPrimaryLight],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.2),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(Icons.assessment, color: Colors.white, size: 24),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                Text(
                  DateTime.now().toString().split(' ')[0],
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.white.withValues(alpha: 0.9),
                  ),
                ),
              ],
            ),
          ),
          IconButton(
            onPressed: onClose,
            icon: const Icon(Icons.close, color: Colors.white),
            tooltip: 'Close',
          ),
        ],
      ),
    );
  }

  Widget _buildReportModalActions({
    required String plainContent,
    required String title,
    required String reportType,
    required VoidCallback onClose,
  }) {
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
      decoration: BoxDecoration(
        color: kBackground,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.06),
            blurRadius: 8,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: Row(
        children: [
          Expanded(
            child: OutlinedButton.icon(
              onPressed: onClose,
              icon: const Icon(Icons.close, size: 20),
              label: const Text('Close'),
              style: OutlinedButton.styleFrom(
                foregroundColor: kMutedForeground,
                side: BorderSide(color: Colors.grey[400]!),
                padding: const EdgeInsets.symmetric(vertical: 14),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: ElevatedButton.icon(
              onPressed: () async {
                onClose();
                try {
                  final pdfBytes = await _buildReportPdfBytes(reportType);
                  final filename =
                      'Smartendance-Report-${DateTime.now().toString().split(' ')[0]}.pdf';

                  if (kIsWeb) {
                    // Web: printing plugin has no implementation; trigger browser download
                    await pdf_download.downloadPdfOnWeb(pdfBytes, filename);
                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: const Text('PDF downloaded'),
                          backgroundColor: kPrimary,
                          behavior: SnackBarBehavior.floating,
                        ),
                      );
                    }
                    return;
                  }

                  final shared = await Printing.sharePdf(
                    bytes: pdfBytes,
                    filename: filename,
                    subject: title,
                  );
                  if (mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text(
                          shared ? 'PDF report shared' : 'Share cancelled',
                        ),
                        backgroundColor: kPrimary,
                        behavior: SnackBarBehavior.floating,
                      ),
                    );
                  }
                } catch (e) {
                  if (mounted) {
                    try {
                      await Share.share(plainContent, subject: title);
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: const Text(
                            'Shared as text (PDF not available)',
                          ),
                          backgroundColor: kPrimary,
                          behavior: SnackBarBehavior.floating,
                        ),
                      );
                    } catch (e2) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text('Could not share: $e'),
                          backgroundColor: Colors.red,
                          behavior: SnackBarBehavior.floating,
                        ),
                      );
                    }
                  }
                }
              },
              icon: const Icon(Icons.picture_as_pdf, size: 20),
              label: const Text('Share / Save PDF'),
              style: ElevatedButton.styleFrom(
                backgroundColor: kPrimary,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildReportModalBody(String reportType) {
    switch (reportType) {
      case 'daily':
        return _buildDailyReportBody();
      case 'subject':
        return _buildSubjectReportBody();
      case 'weekly':
        return _buildWeeklyReportBody();
      case 'monthly':
        return _buildMonthlyReportBody();
      case 'class':
        return _buildClassReportBody();
      default:
        return const SizedBox.shrink();
    }
  }

  Widget _reportSectionTitle(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Text(
        text,
        style: const TextStyle(
          fontSize: 15,
          fontWeight: FontWeight.bold,
          color: kForeground,
        ),
      ),
    );
  }

  Widget _reportStatCard({
    required String label,
    required String value,
    Color? color,
    IconData? icon,
  }) {
    final c = color ?? kPrimary;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: c.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: c.withValues(alpha: 0.25), width: 1),
      ),
      child: Row(
        children: [
          if (icon != null) ...[
            Icon(icon, size: 22, color: c),
            const SizedBox(width: 12),
          ],
          Expanded(
            child: Text(
              label,
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: kMutedForeground,
              ),
            ),
          ),
          Text(
            value,
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: c,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDailyReportBody() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _reportSectionTitle('Today\'s attendance'),
        _reportStatCard(
          label: 'Present',
          value: '${_todayStats['present'] ?? 0}',
          color: Colors.green,
          icon: Icons.check_circle,
        ),
        const SizedBox(height: 8),
        _reportStatCard(
          label: 'Absent',
          value: '${_todayStats['absent'] ?? 0}',
          color: Colors.red,
          icon: Icons.cancel,
        ),
        const SizedBox(height: 8),
        _reportStatCard(
          label: 'Late',
          value: '${_todayStats['late'] ?? 0}',
          color: Colors.orange,
          icon: Icons.schedule,
        ),
        const SizedBox(height: 8),
        _reportStatCard(
          label: 'Cutting',
          value: '${_todayStats['cutting'] ?? 0}',
          color: Colors.purple,
          icon: Icons.warning,
        ),
        const SizedBox(height: 16),
        _reportSectionTitle('Summary'),
        _reportStatCard(
          label: 'Total students marked',
          value: '${_todayStats['total'] ?? 0}',
          icon: Icons.people,
        ),
        const SizedBox(height: 8),
        _reportStatCard(
          label: 'Critical alerts',
          value: '${_criticalAlerts.length}',
          color: Colors.orange,
          icon: Icons.notification_important,
        ),
        const SizedBox(height: 8),
        _reportStatCard(
          label: 'Absent today',
          value: '${_todayAbsentStudents.length}',
          color: Colors.red,
          icon: Icons.person_off,
        ),
      ],
    );
  }

  Widget _buildSubjectReportBody() {
    final breakdown = _getTodaySubjectBreakdown();
    if (breakdown.isEmpty) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _reportSectionTitle('Subject report (today)'),
          _emptyReportMessage('No attendance records for today yet.'),
        ],
      );
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _reportSectionTitle('Per subject (today)'),
        ...breakdown.map((row) => _buildSubjectReportCard(row)),
        const SizedBox(height: 12),
        _reportSectionTitle('Overall today'),
        _reportStatCard(
          label: 'Present',
          value: '${_todayStats['present'] ?? 0}',
          color: Colors.green,
        ),
        const SizedBox(height: 8),
        _reportStatCard(
          label: 'Absent',
          value: '${_todayStats['absent'] ?? 0}',
          color: Colors.red,
        ),
        const SizedBox(height: 8),
        _reportStatCard(
          label: 'Late',
          value: '${_todayStats['late'] ?? 0}',
          color: Colors.orange,
        ),
        const SizedBox(height: 8),
        _reportStatCard(
          label: 'Cutting',
          value: '${_todayStats['cutting'] ?? 0}',
          color: Colors.purple,
        ),
      ],
    );
  }

  Widget _miniChip(String label, String value, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Text(
        '$label: $value',
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w600,
          color: color,
        ),
      ),
    );
  }

  Widget _buildWeeklyReportBody() {
    final breakdown = _getWeeklySubjectBreakdown();
    final overall = _overallStatsFromBreakdown(breakdown);
    if (breakdown.isEmpty) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _reportSectionTitle('Subject report (last 7 days)'),
          _emptyReportMessage('No attendance records for the last 7 days.'),
        ],
      );
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _reportSectionTitle('Per subject (last 7 days)'),
        ...breakdown.map((row) => _buildSubjectReportCard(row)),
        const SizedBox(height: 12),
        _reportSectionTitle('Overall (last 7 days)'),
        _reportStatCard(
          label: 'Present',
          value: '${overall['present']}',
          color: Colors.green,
        ),
        const SizedBox(height: 8),
        _reportStatCard(
          label: 'Absent',
          value: '${overall['absent']}',
          color: Colors.red,
        ),
        const SizedBox(height: 8),
        _reportStatCard(
          label: 'Late',
          value: '${overall['late']}',
          color: Colors.orange,
        ),
        const SizedBox(height: 8),
        _reportStatCard(
          label: 'Cutting',
          value: '${overall['cutting']}',
          color: Colors.purple,
        ),
      ],
    );
  }

  Widget _buildMonthlyReportBody() {
    final breakdown = _getMonthlySubjectBreakdown();
    final overall = _overallStatsFromBreakdown(breakdown);
    if (breakdown.isEmpty) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _reportSectionTitle('Subject report (current month)'),
          _emptyReportMessage('No attendance records for the current month.'),
        ],
      );
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _reportSectionTitle('Per subject (current month)'),
        ...breakdown.map((row) => _buildSubjectReportCard(row)),
        const SizedBox(height: 12),
        _reportSectionTitle('Overall (current month)'),
        _reportStatCard(
          label: 'Present',
          value: '${overall['present']}',
          color: Colors.green,
        ),
        const SizedBox(height: 8),
        _reportStatCard(
          label: 'Absent',
          value: '${overall['absent']}',
          color: Colors.red,
        ),
        const SizedBox(height: 8),
        _reportStatCard(
          label: 'Late',
          value: '${overall['late']}',
          color: Colors.orange,
        ),
        const SizedBox(height: 8),
        _reportStatCard(
          label: 'Cutting',
          value: '${overall['cutting']}',
          color: Colors.purple,
        ),
      ],
    );
  }

  Widget _emptyReportMessage(String text) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.grey.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey[300]!),
      ),
      child: Row(
        children: [
          Icon(Icons.info_outline, color: Colors.grey[600], size: 28),
          const SizedBox(width: 14),
          Expanded(
            child: Text(
              text,
              style: TextStyle(fontSize: 14, color: kMutedForeground),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSubjectReportCard(Map<String, dynamic> row) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: kPrimary.withValues(alpha: 0.2)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.04),
              blurRadius: 6,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.book, size: 20, color: kPrimary),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    '${row['subject']} — Grade ${row['gradeLevel']}-${row['section']}',
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                      color: kForeground,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 12,
              runSpacing: 8,
              children: [
                _miniChip('Present', '${row['present']}', Colors.green),
                _miniChip('Absent', '${row['absent']}', Colors.red),
                _miniChip('Late', '${row['late']}', Colors.orange),
                _miniChip('Cutting', '${row['cutting']}', Colors.purple),
                _miniChip('Total', '${row['total']}', kPrimary),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildClassReportBody() {
    if (_classPerformance.isEmpty) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _reportSectionTitle('Class performance'),
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: Colors.grey.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text(
              'No class data available.',
              style: TextStyle(fontSize: 14, color: kMutedForeground),
            ),
          ),
        ],
      );
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _reportSectionTitle('By class'),
        ..._classPerformance.map((c) {
          final total = c['totalRecords'] ?? 0;
          final percentage = total > 0
              ? (((c['present'] ?? 0) / total) * 100).toStringAsFixed(1)
              : '0';
          final pctNum = double.tryParse(percentage) ?? 0;
          return Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: _reportStatCard(
              label: 'Grade ${c['gradeLevel']}-${c['section']}',
              value: '$percentage%',
              color: pctNum >= 70
                  ? Colors.green
                  : (pctNum >= 50 ? Colors.orange : Colors.red),
              icon: Icons.school,
            ),
          );
        }),
      ],
    );
  }

  String _getReportTitle(String reportType) {
    final date = DateTime.now().toString().split(' ')[0];
    switch (reportType) {
      case 'daily':
        return 'Smartendance Daily Report $date';
      case 'subject':
        return 'Smartendance Subject Report $date';
      case 'weekly':
        return 'Smartendance Subject Report (Weekly)';
      case 'monthly':
        return 'Smartendance Subject Report (Monthly)';
      case 'class':
        return 'Smartendance Class Performance Report';
      default:
        return 'Smartendance Report $date';
    }
  }

  String _buildReportContent(String reportType) {
    switch (reportType) {
      case 'daily':
        return '''
Today's Attendance Summary
────────────────────
Present: ${_todayStats['present'] ?? 0}
Absent: ${_todayStats['absent'] ?? 0}
Late: ${_todayStats['late'] ?? 0}
Cutting: ${_todayStats['cutting'] ?? 0}

Total Students Marked: ${_todayStats['total'] ?? 0}

Critical Alerts: ${_criticalAlerts.length}
Absent Today: ${_todayAbsentStudents.length}
''';
      case 'subject':
        final breakdown = _getTodaySubjectBreakdown();
        final todayStr = DateTime.now().toString().split(' ')[0];
        if (breakdown.isEmpty) {
          return '''
Subject Report (Today: $todayStr)
────────────────────
No attendance records for today yet.
''';
        }
        final buffer = StringBuffer('''
Subject Report (Today: $todayStr)
────────────────────
''');
        for (var row in breakdown) {
          buffer.writeln(
            '${row['subject']} — Grade ${row['gradeLevel']}-${row['section']}',
          );
          buffer.writeln(
            '  Present: ${row['present']}  Absent: ${row['absent']}  Late: ${row['late']}  Cutting: ${row['cutting']}  Total: ${row['total']}',
          );
          buffer.writeln('');
        }
        buffer.writeln('────────────────────');
        buffer.writeln(
          'Overall today: Present ${_todayStats['present'] ?? 0}, Absent ${_todayStats['absent'] ?? 0}, Late ${_todayStats['late'] ?? 0}, Cutting ${_todayStats['cutting'] ?? 0}',
        );
        return buffer.toString();
      case 'weekly':
        final weeklyBreakdown = _getWeeklySubjectBreakdown();
        final weeklyOverall = _overallStatsFromBreakdown(weeklyBreakdown);
        if (weeklyBreakdown.isEmpty) {
          return '''
Subject Report (Last 7 Days)
────────────────────
No attendance records for the last 7 days.
''';
        }
        final weeklyBuffer = StringBuffer('''
Subject Report (Last 7 Days)
────────────────────
''');
        for (var row in weeklyBreakdown) {
          weeklyBuffer.writeln(
            '${row['subject']} — Grade ${row['gradeLevel']}-${row['section']}',
          );
          weeklyBuffer.writeln(
            '  Present: ${row['present']}  Absent: ${row['absent']}  Late: ${row['late']}  Cutting: ${row['cutting']}  Total: ${row['total']}',
          );
          weeklyBuffer.writeln('');
        }
        weeklyBuffer.writeln('────────────────────');
        weeklyBuffer.writeln(
          'Overall: Present ${weeklyOverall['present']}, Absent ${weeklyOverall['absent']}, Late ${weeklyOverall['late']}, Cutting ${weeklyOverall['cutting']}, Total ${weeklyOverall['total']}',
        );
        return weeklyBuffer.toString();
      case 'monthly':
        final monthlyBreakdown = _getMonthlySubjectBreakdown();
        final monthlyOverall = _overallStatsFromBreakdown(monthlyBreakdown);
        if (monthlyBreakdown.isEmpty) {
          return '''
Subject Report (Current Month)
────────────────────
No attendance records for the current month.
''';
        }
        final monthlyBuffer = StringBuffer('''
Subject Report (Current Month)
────────────────────
''');
        for (var row in monthlyBreakdown) {
          monthlyBuffer.writeln(
            '${row['subject']} — Grade ${row['gradeLevel']}-${row['section']}',
          );
          monthlyBuffer.writeln(
            '  Present: ${row['present']}  Absent: ${row['absent']}  Late: ${row['late']}  Cutting: ${row['cutting']}  Total: ${row['total']}',
          );
          monthlyBuffer.writeln('');
        }
        monthlyBuffer.writeln('────────────────────');
        monthlyBuffer.writeln(
          'Overall: Present ${monthlyOverall['present']}, Absent ${monthlyOverall['absent']}, Late ${monthlyOverall['late']}, Cutting ${monthlyOverall['cutting']}, Total ${monthlyOverall['total']}',
        );
        return monthlyBuffer.toString();
      case 'class':
        return '''
Class Performance Report
────────────────────
Total Classes: ${_classPerformance.length}

${_classPerformance.map((c) {
          final total = c['totalRecords'] ?? 0;
          final percentage = total > 0 ? (((c['present'] ?? 0) / total) * 100).toStringAsFixed(1) : '0';
          return 'Grade ${c['gradeLevel']}-${c['section']}: $percentage%';
        }).join('\n')}
''';
      default:
        return 'Report generated successfully';
    }
  }

  /// Builds PDF document bytes for the given report type (for share/save as PDF).
  Future<Uint8List> _buildReportPdfBytes(String reportType) async {
    final doc = pw.Document();
    final dateStr = DateTime.now().toString().split(' ')[0];
    final title = _getReportTitle(reportType);

    pw.Widget buildContent() {
      switch (reportType) {
        case 'daily':
          return pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            mainAxisSize: pw.MainAxisSize.min,
            children: [
              _pdfSectionTitle('Today\'s attendance'),
              _pdfStatRow('Present', '${_todayStats['present'] ?? 0}'),
              _pdfStatRow('Absent', '${_todayStats['absent'] ?? 0}'),
              _pdfStatRow('Late', '${_todayStats['late'] ?? 0}'),
              _pdfStatRow('Cutting', '${_todayStats['cutting'] ?? 0}'),
              pw.SizedBox(height: 12),
              _pdfSectionTitle('Summary'),
              _pdfStatRow(
                'Total students marked',
                '${_todayStats['total'] ?? 0}',
              ),
              _pdfStatRow('Critical alerts', '${_criticalAlerts.length}'),
              _pdfStatRow('Absent today', '${_todayAbsentStudents.length}'),
            ],
          );
        case 'subject':
          final breakdown = _getTodaySubjectBreakdown();
          if (breakdown.isEmpty) {
            return pw.Column(
              crossAxisAlignment: pw.CrossAxisAlignment.start,
              mainAxisSize: pw.MainAxisSize.min,
              children: [
                pw.Text(
                  'No attendance records for today yet.',
                  style: pw.TextStyle(fontSize: 12),
                ),
              ],
            );
          }
          return pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            mainAxisSize: pw.MainAxisSize.min,
            children: [
              _pdfSectionTitle('Per subject (today)'),
              ...breakdown.map(
                (row) => pw.Padding(
                  padding: const pw.EdgeInsets.only(bottom: 8),
                  child: pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.start,
                    mainAxisSize: pw.MainAxisSize.min,
                    children: [
                      pw.Text(
                        '${row['subject']} — Grade ${row['gradeLevel']}-${row['section']}',
                        style: pw.TextStyle(
                          fontSize: 11,
                          fontWeight: pw.FontWeight.bold,
                        ),
                      ),
                      pw.Text(
                        'Present: ${row['present']}  Absent: ${row['absent']}  Late: ${row['late']}  Cutting: ${row['cutting']}  Total: ${row['total']}',
                        style: pw.TextStyle(fontSize: 10),
                      ),
                    ],
                  ),
                ),
              ),
              pw.SizedBox(height: 8),
              _pdfSectionTitle('Overall today'),
              _pdfStatRow('Present', '${_todayStats['present'] ?? 0}'),
              _pdfStatRow('Absent', '${_todayStats['absent'] ?? 0}'),
              _pdfStatRow('Late', '${_todayStats['late'] ?? 0}'),
              _pdfStatRow('Cutting', '${_todayStats['cutting'] ?? 0}'),
            ],
          );
        case 'weekly':
          final weeklyBreakdown = _getWeeklySubjectBreakdown();
          final weeklyOverall = _overallStatsFromBreakdown(weeklyBreakdown);
          if (weeklyBreakdown.isEmpty) {
            return pw.Text(
              'No attendance records for the last 7 days.',
              style: pw.TextStyle(fontSize: 12),
            );
          }
          return pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            mainAxisSize: pw.MainAxisSize.min,
            children: [
              _pdfSectionTitle('Per subject (last 7 days)'),
              ...weeklyBreakdown.map(
                (row) => pw.Padding(
                  padding: const pw.EdgeInsets.only(bottom: 8),
                  child: pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.start,
                    mainAxisSize: pw.MainAxisSize.min,
                    children: [
                      pw.Text(
                        '${row['subject']} — Grade ${row['gradeLevel']}-${row['section']}',
                        style: pw.TextStyle(
                          fontSize: 11,
                          fontWeight: pw.FontWeight.bold,
                        ),
                      ),
                      pw.Text(
                        'Present: ${row['present']}  Absent: ${row['absent']}  Late: ${row['late']}  Cutting: ${row['cutting']}  Total: ${row['total']}',
                        style: pw.TextStyle(fontSize: 10),
                      ),
                    ],
                  ),
                ),
              ),
              pw.SizedBox(height: 8),
              _pdfSectionTitle('Overall (last 7 days)'),
              _pdfStatRow('Present', '${weeklyOverall['present']}'),
              _pdfStatRow('Absent', '${weeklyOverall['absent']}'),
              _pdfStatRow('Late', '${weeklyOverall['late']}'),
              _pdfStatRow('Cutting', '${weeklyOverall['cutting']}'),
            ],
          );
        case 'monthly':
          final monthlyBreakdown = _getMonthlySubjectBreakdown();
          final monthlyOverall = _overallStatsFromBreakdown(monthlyBreakdown);
          if (monthlyBreakdown.isEmpty) {
            return pw.Text(
              'No attendance records for the current month.',
              style: pw.TextStyle(fontSize: 12),
            );
          }
          return pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            mainAxisSize: pw.MainAxisSize.min,
            children: [
              _pdfSectionTitle('Per subject (current month)'),
              ...monthlyBreakdown.map(
                (row) => pw.Padding(
                  padding: const pw.EdgeInsets.only(bottom: 8),
                  child: pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.start,
                    mainAxisSize: pw.MainAxisSize.min,
                    children: [
                      pw.Text(
                        '${row['subject']} — Grade ${row['gradeLevel']}-${row['section']}',
                        style: pw.TextStyle(
                          fontSize: 11,
                          fontWeight: pw.FontWeight.bold,
                        ),
                      ),
                      pw.Text(
                        'Present: ${row['present']}  Absent: ${row['absent']}  Late: ${row['late']}  Cutting: ${row['cutting']}  Total: ${row['total']}',
                        style: pw.TextStyle(fontSize: 10),
                      ),
                    ],
                  ),
                ),
              ),
              pw.SizedBox(height: 8),
              _pdfSectionTitle('Overall (current month)'),
              _pdfStatRow('Present', '${monthlyOverall['present']}'),
              _pdfStatRow('Absent', '${monthlyOverall['absent']}'),
              _pdfStatRow('Late', '${monthlyOverall['late']}'),
              _pdfStatRow('Cutting', '${monthlyOverall['cutting']}'),
            ],
          );
        case 'class':
          if (_classPerformance.isEmpty) {
            return pw.Text(
              'No class data available.',
              style: pw.TextStyle(fontSize: 12),
            );
          }
          return pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            mainAxisSize: pw.MainAxisSize.min,
            children: [
              _pdfSectionTitle('By class'),
              ..._classPerformance.map((c) {
                final total = c['totalRecords'] ?? 0;
                final percentage = total > 0
                    ? (((c['present'] ?? 0) / total) * 100).toStringAsFixed(1)
                    : '0';
                return _pdfStatRow(
                  'Grade ${c['gradeLevel']}-${c['section']}',
                  '$percentage%',
                );
              }),
            ],
          );
        default:
          return pw.Text('Report', style: pw.TextStyle(fontSize: 12));
      }
    }

    doc.addPage(
      pw.MultiPage(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.all(24),
        header: (context) => pw.Padding(
          padding: const pw.EdgeInsets.only(bottom: 12),
          child: pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            mainAxisSize: pw.MainAxisSize.min,
            children: [
              pw.Text(
                title,
                style: pw.TextStyle(
                  fontSize: 14,
                  fontWeight: pw.FontWeight.bold,
                ),
              ),
              pw.Text(
                'Generated: $dateStr',
                style: const pw.TextStyle(fontSize: 9),
              ),
              pw.Divider(thickness: 1),
            ],
          ),
        ),
        build: (context) => [buildContent()],
      ),
    );

    return doc.save();
  }

  pw.Widget _pdfSectionTitle(String text) {
    return pw.Padding(
      padding: const pw.EdgeInsets.only(top: 8, bottom: 4),
      child: pw.Text(
        text,
        style: pw.TextStyle(fontSize: 11, fontWeight: pw.FontWeight.bold),
      ),
    );
  }

  pw.Widget _pdfStatRow(String label, String value) {
    return pw.Padding(
      padding: const pw.EdgeInsets.only(bottom: 4),
      child: pw.Row(
        mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
        children: [
          pw.Text(label, style: const pw.TextStyle(fontSize: 10)),
          pw.Text(
            value,
            style: pw.TextStyle(fontSize: 10, fontWeight: pw.FontWeight.bold),
          ),
        ],
      ),
    );
  }

  Widget _buildQuickActionButton({
    required IconData icon,
    required String label,
    required Color color,
    required VoidCallback onTap,
  }) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        splashColor: color.withValues(alpha: 0.2),
        highlightColor: color.withValues(alpha: 0.1),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 16),
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: color.withValues(alpha: 0.3), width: 1.5),
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 28, color: color),
              const SizedBox(height: 8),
              Text(
                label,
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: color,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTodayScheduleSection() {
    if (_todaySchedules.isEmpty) {
      return Card(
        elevation: 2,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Icon(Icons.calendar_today, size: 48, color: Colors.grey[400]),
              const SizedBox(height: 8),
              Text(
                'No classes scheduled for today',
                style: TextStyle(
                  fontSize: 14,
                  color: Colors.grey[600],
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          "Today's Schedule",
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: Colors.black87,
          ),
        ),
        const SizedBox(height: 12),
        ListView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: _todaySchedules.length,
          itemBuilder: (context, index) {
            final schedule = _todaySchedules[index];
            return _buildTodayScheduleCard(schedule);
          },
        ),
      ],
    );
  }

  // Helper function to convert 24-hour time to AM/PM format
  String _convertTo12HourFormat(String time24) {
    try {
      // Handle time range format like "08:00-09:00" or single time "08:00"
      if (time24.contains('-')) {
        final parts = time24.split('-');
        if (parts.length == 2) {
          final startTime = _formatSingleTime(parts[0].trim());
          final endTime = _formatSingleTime(parts[1].trim());
          return '$startTime - $endTime';
        }
      }
      // Single time format
      return _formatSingleTime(time24.trim());
    } catch (e) {
      // If parsing fails, return original time
      return time24;
    }
  }

  // Helper function to format a single time string (HH:mm) to AM/PM
  String _formatSingleTime(String time24) {
    try {
      final parts = time24.split(':');
      if (parts.length >= 2) {
        final hour = int.parse(parts[0]);
        final minute = parts[1].substring(
          0,
          2,
        ); // Get first 2 digits of minutes

        String period = 'AM';
        int hour12 = hour;

        if (hour == 0) {
          hour12 = 12; // Midnight
        } else if (hour == 12) {
          period = 'PM'; // Noon
        } else if (hour > 12) {
          hour12 = hour - 12;
          period = 'PM';
        }

        return '$hour12:$minute $period';
      }
      return time24;
    } catch (e) {
      return time24;
    }
  }

  Widget _buildTodayScheduleCard(dynamic schedule) {
    final subject = schedule['subject'] ?? 'N/A';
    final gradeLevel = schedule['gradeLevel'] ?? 'N/A';
    final section = schedule['section'] ?? 'N/A';
    final timeSlot = schedule['timeSlot'] ?? 'N/A';
    final shift = schedule['shift'] ?? 'N/A';

    const Map<String, Color> shiftColors = {
      'Morning': kPrimary,
      'Afternoon': kAccent,
      'Evening': Color(0xFF8B5CF6),
    };

    final shiftColor = shiftColors[shift] ?? kPrimary;

    // Convert timeSlot to AM/PM format
    final formattedTimeSlot = timeSlot != 'N/A'
        ? _convertTo12HourFormat(timeSlot)
        : 'N/A';

    return Card(
      elevation: 2,
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          border: Border(left: BorderSide(color: shiftColor, width: 5)),
        ),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: shiftColor.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(Icons.schedule, color: shiftColor, size: 24),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      subject,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: Colors.black87,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Grade $gradeLevel - Section $section',
                      style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                    ),
                  ],
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 6,
                    ),
                    decoration: BoxDecoration(
                      color: shiftColor.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      formattedTimeSlot,
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: shiftColor,
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildClassPerformanceSection() {
    if (_classPerformance.isEmpty) {
      return const SizedBox.shrink();
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Class Performance Overview',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: Colors.black87,
          ),
        ),
        const SizedBox(height: 12),
        ListView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: _classPerformance.length,
          itemBuilder: (context, index) {
            final classData = _classPerformance[index];
            return _buildClassPerformanceCard(classData);
          },
        ),
      ],
    );
  }

  Widget _buildClassPerformanceCard(dynamic classData) {
    final gradeLevel = classData['gradeLevel'] ?? 'N/A';
    final section = classData['section'] ?? 'N/A';
    final subject = classData['subject'] ?? 'N/A';
    final totalRecords = classData['totalRecords'] ?? 0;
    final present = classData['present'] ?? 0;
    final absent = classData['absent'] ?? 0;
    final late = classData['late'] ?? 0;
    final cutting = classData['cutting'] ?? 0;

    final attendancePercentage = totalRecords > 0
        ? ((present / totalRecords) * 100).toStringAsFixed(1)
        : '0';
    final isGoodAttendance = double.parse(attendancePercentage) >= 75;

    return Card(
      elevation: 2,
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Grade $gradeLevel - Section $section',
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: Colors.black87,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        subject,
                        style: TextStyle(fontSize: 13, color: Colors.grey[600]),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 8,
                  ),
                  decoration: BoxDecoration(
                    color: isGoodAttendance
                        ? Colors.green.withValues(alpha: 0.1)
                        : Colors.orange.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Column(
                    children: [
                      Text(
                        '$attendancePercentage%',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: isGoodAttendance
                              ? Colors.green
                              : Colors.orange,
                        ),
                      ),
                      Text(
                        'Attendance',
                        style: TextStyle(
                          fontSize: 10,
                          color: isGoodAttendance
                              ? Colors.green
                              : Colors.orange,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Status Chips
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                _buildStatusChip('Present', present.toString(), Colors.green),
                _buildStatusChip('Absent', absent.toString(), Colors.red),
                _buildStatusChip('Late', late.toString(), Colors.orange),
                _buildStatusChip('Cutting', cutting.toString(), Colors.purple),
              ],
            ),
            const SizedBox(height: 16),

            // Progress Bar
            ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: LinearProgressIndicator(
                value: double.parse(attendancePercentage) / 100,
                minHeight: 6,
                backgroundColor: Colors.grey[300],
                valueColor: AlwaysStoppedAnimation<Color>(
                  isGoodAttendance ? Colors.green : Colors.orange,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatusChip(String label, String count, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withValues(alpha: 0.3), width: 1),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: color,
            ),
          ),
          const SizedBox(width: 4),
          Text(
            count,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildProfileCard() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [kPrimary, kPrimaryDark],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: kPrimaryLight.withValues(alpha: 0.6),
          width: 1.5,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 70,
                height: 70,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: Colors.white,
                  border: Border.all(
                    color: kPrimaryLight.withValues(alpha: 0.8),
                    width: 3,
                  ),
                ),
                child: Center(
                  child: Text(
                    widget.teacherName
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase(),
                    style: const TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                      color: kPrimary,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      widget.teacherName,
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      widget.email,
                      style: const TextStyle(fontSize: 12, color: Colors.white),
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'ID: ${widget.teacherId}',
                      style: const TextStyle(
                        fontSize: 11,
                        color: Colors.white,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const SizedBox(height: 8),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  void _showStudentDetailsDialog(
    String studentId,
    String studentName,
    String gradeLevel,
    String section,
  ) {
    // Get all records for this student
    final studentRecords = _attendanceRecords
        .where((r) => r['studentId'] == studentId)
        .toList()
        .cast<dynamic>();

    // Calculate statistics
    int totalRecords = studentRecords.length;
    int presentCount = studentRecords
        .where((r) => r['status'] == 'Present')
        .length;
    int absentCount = studentRecords
        .where((r) => r['status'] == 'Absent')
        .length;
    int lateCount = studentRecords.where((r) => r['status'] == 'Late').length;
    int cuttingCount = studentRecords
        .where((r) => r['status'] == 'Cutting')
        .length;

    double attendancePercentage = totalRecords > 0
        ? ((presentCount / totalRecords) * 100)
        : 0;

    showDialog(
      context: context,
      builder: (context) => Dialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        child: Container(
          padding: const EdgeInsets.all(20),
          constraints: const BoxConstraints(maxHeight: 700, maxWidth: 500),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              // Header
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          studentName,
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: Colors.black87,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Grade $gradeLevel - Section $section',
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.grey[600],
                          ),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    onPressed: () => Navigator.pop(context),
                    icon: const Icon(Icons.close),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // Statistics Overview
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.grey[100],
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        _buildStatBox(
                          'Total',
                          totalRecords.toString(),
                          Colors.blue,
                        ),
                        _buildStatBox(
                          'Present',
                          presentCount.toString(),
                          Colors.green,
                        ),
                        _buildStatBox(
                          'Absent',
                          absentCount.toString(),
                          Colors.red,
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        _buildStatBox(
                          'Late',
                          lateCount.toString(),
                          Colors.orange,
                        ),
                        _buildStatBox(
                          'Cutting',
                          cuttingCount.toString(),
                          Colors.purple,
                        ),
                        _buildStatBox(
                          'Attendance',
                          '${attendancePercentage.toStringAsFixed(1)}%',
                          attendancePercentage >= 75
                              ? Colors.green
                              : Colors.red,
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // History Title
              const Text(
                'Attendance History',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                  color: Colors.black87,
                ),
              ),
              const SizedBox(height: 12),

              // History List
              Expanded(
                child: studentRecords.isEmpty
                    ? Center(
                        child: Text(
                          'No attendance records found',
                          style: TextStyle(
                            color: Colors.grey[600],
                            fontSize: 12,
                          ),
                        ),
                      )
                    : ListView.separated(
                        shrinkWrap: true,
                        itemCount: studentRecords.length,
                        separatorBuilder: (context, index) =>
                            Divider(color: Colors.grey[300], height: 8),
                        itemBuilder: (context, index) {
                          final record = studentRecords[index];
                          return _buildHistoryRecordItem(record);
                        },
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatBox(String label, String value, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 8),
        child: Column(
          children: [
            Text(
              value,
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: color,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              label,
              style: TextStyle(fontSize: 10, color: Colors.grey[600]),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHistoryRecordItem(dynamic record) {
    final status = record['status'] ?? 'Unknown';
    final createdAt = record['createdAt'] ?? 'N/A';
    final subject = record['subject'] ?? 'N/A';
    final scanTime = record['scanTime'] ?? 'N/A';

    Color statusColor = Colors.grey;
    IconData statusIcon = Icons.help;

    switch (status) {
      case 'Present':
        statusColor = Colors.green;
        statusIcon = Icons.check_circle;
        break;
      case 'Absent':
        statusColor = Colors.red;
        statusIcon = Icons.cancel;
        break;
      case 'Late':
        statusColor = Colors.orange;
        statusIcon = Icons.schedule;
        break;
      case 'Cutting':
        statusColor = Colors.purple;
        statusIcon = Icons.warning;
        break;
    }

    return Row(
      children: [
        Container(
          width: 36,
          height: 36,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: statusColor.withValues(alpha: 0.2),
          ),
          child: Center(child: Icon(statusIcon, color: statusColor, size: 18)),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    subject,
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: Colors.black87,
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 2,
                    ),
                    decoration: BoxDecoration(
                      color: statusColor.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      status,
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w600,
                        color: statusColor,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              Text(
                '$createdAt at $scanTime',
                style: TextStyle(fontSize: 10, color: Colors.grey[600]),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildAttendanceRecordsSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'Recent Attendance Records',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: Colors.black87,
              ),
            ),
            if (_attendanceRecords.isNotEmpty)
              Text(
                '(${_attendanceRecords.length})',
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF10B981),
                ),
              ),
          ],
        ),
        const SizedBox(height: 12),
        _attendanceRecords.isEmpty
            ? Card(
                elevation: 1,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(32),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: [
                      Icon(Icons.event_note, size: 48, color: Colors.grey[400]),
                      const SizedBox(height: 8),
                      Text(
                        'No attendance records yet',
                        style: TextStyle(
                          fontSize: 14,
                          color: Colors.grey[600],
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ),
              )
            : ListView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: _attendanceRecords.length > 10
                    ? 10
                    : _attendanceRecords.length,
                itemBuilder: (context, index) {
                  final record = _attendanceRecords[index];
                  return _buildAttendanceRecordCard(record);
                },
              ),
        if (_attendanceRecords.length > 10) ...[
          const SizedBox(height: 16),
          Center(
            child: TextButton(
              onPressed: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('View all records coming soon')),
                );
              },
              child: const Text('View All Records'),
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildAttendanceRecordCard(dynamic record) {
    final studentName = record['studentName'] ?? 'Unknown';
    final status = record['status'] ?? 'Unknown';
    final subject = record['subject'] ?? 'N/A';

    Color statusColor = Colors.grey;
    IconData statusIcon = Icons.help;

    switch (status) {
      case 'Present':
        statusColor = Colors.green;
        statusIcon = Icons.check_circle;
        break;
      case 'Absent':
        statusColor = Colors.red;
        statusIcon = Icons.cancel;
        break;
      case 'Late':
        statusColor = Colors.orange;
        statusIcon = Icons.schedule;
        break;
      case 'Cutting':
        statusColor = Colors.purple;
        statusIcon = Icons.warning;
        break;
    }

    return Card(
      elevation: 1,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            Container(
              width: 50,
              height: 50,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: statusColor.withValues(alpha: 0.2),
              ),
              child: Center(
                child: Icon(statusIcon, color: statusColor, size: 24),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    studentName,
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                      color: Colors.black87,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Text(
                        'Subject: $subject',
                        style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                      ),
                      const Spacer(),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 2,
                        ),
                        decoration: BoxDecoration(
                          color: statusColor.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          status,
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: statusColor,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
