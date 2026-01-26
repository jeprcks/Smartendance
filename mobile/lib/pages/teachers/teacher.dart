import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:mobile/services/teacherService.dart';
import 'schedule.dart';
import 'components/background_logo.dart';

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

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _loadDashboardData();
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

      // Fetch attendance stats
      final stats = await TeacherService.getAttendanceStats(
        token: widget.token,
      );

      // Fetch attendance records
      final recordsResponse = await TeacherService.getAttendanceRecords(
        token: widget.token,
      );
      final allRecords = recordsResponse['records'] as List<dynamic>? ?? [];

      // Filter records to only include this teacher's classes
      final records = _filterRecordsByTeacherSchedules(allRecords, allSchedules);

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
        setState(() {
          _attendanceStats = filteredStats; // Use filtered stats instead of API stats
          _attendanceRecords = records;
          _todaySchedules = today;
          _allSchedules = allSchedules;
          _classPerformance = performance;
          _todayStats = todayStats;
          _todayAbsentStudents = absentStudents;
          _criticalAlerts = alerts;
          _weeklyTrends = trends;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString();
          _isLoading = false;
        });
      }
      print('Error loading dashboard data: $e');
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

    return schedules.where((schedule) => schedule['day'] == dayName).toList()
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
      backgroundColor: Colors.grey[100],
      appBar: AppBar(
        backgroundColor: const Color(0xFF10B981),
        elevation: 0,
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
          ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(56),
          child: Container(
            color: Colors.green[700],
            child: TabBar(
              controller: _tabController,
              indicatorColor: Colors.white,
              indicatorWeight: 3,
              labelColor: Colors.white,
              unselectedLabelColor: Colors.white70,
              onTap: (index) {
                setState(() => _currentTab = index);
              },
              tabs: const [
                Tab(icon: Icon(Icons.dashboard), text: 'Dashboard'),
                Tab(icon: Icon(Icons.schedule), text: 'Schedule'),
              ],
            ),
          ),
        ),
      ),
      body: _currentTab == 0
          ? _isLoading
                ? Center(
                    child: CircularProgressIndicator(
                      valueColor: AlwaysStoppedAnimation<Color>(
                        Colors.green[600]!,
                      ),
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
                            backgroundColor: Colors.green[600],
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
        border: Border.all(color: color.withOpacity(0.3), width: 1.5),
        boxShadow: [
          BoxShadow(
            color: color.withOpacity(0.1),
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
            color: severityColor.withOpacity(0.2),
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
            color: severityColor.withOpacity(0.1),
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
                color: Colors.red.withOpacity(0.1),
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
            color: Colors.red.withOpacity(0.2),
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
              color: Colors.green,
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
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => Container(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Generate Report',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 20),
            _buildReportOption(
              icon: Icons.calendar_month,
              title: 'Daily Report',
              subtitle: 'Today\'s attendance summary',
              onTap: () => _generateReport('daily'),
            ),
            const SizedBox(height: 12),
            _buildReportOption(
              icon: Icons.assessment,
              title: 'Weekly Report',
              subtitle: 'Last 7 days attendance',
              onTap: () => _generateReport('weekly'),
            ),
            const SizedBox(height: 12),
            _buildReportOption(
              icon: Icons.bar_chart,
              title: 'Monthly Report',
              subtitle: 'Current month attendance',
              onTap: () => _generateReport('monthly'),
            ),
            const SizedBox(height: 12),
            _buildReportOption(
              icon: Icons.school,
              title: 'Class Performance Report',
              subtitle: 'All classes summary',
              onTap: () => _generateReport('class'),
            ),
          ],
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
    final sortedSchedules = List<dynamic>.from(_allSchedules)
      ..sort((a, b) {
        // First sort by day
        final dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        final dayA = a['day'] ?? '';
        final dayB = b['day'] ?? '';
        final dayIndexA = dayOrder.indexOf(dayA);
        final dayIndexB = dayOrder.indexOf(dayB);
        
        if (dayIndexA != dayIndexB) {
          return dayIndexA.compareTo(dayIndexB);
        }
        
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
                    final day = schedule['day'] ?? 'N/A';
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
                    final shiftColor = shiftColors[shift] ?? const Color(0xFF10B981);
                    
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: shiftColor.withOpacity(0.3), width: 1.5),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withOpacity(0.05),
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
                                Icon(Icons.school, size: 14, color: Colors.blue[700]),
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
                                    Icon(Icons.calendar_today, size: 12, color: Colors.purple[700]),
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
                                    Icon(Icons.access_time, size: 12, color: Colors.green[700]),
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
                                    Icon(Icons.layers, size: 12, color: shiftColor),
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
                color: Colors.blue.withOpacity(0.1),
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
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.purple.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, color: Colors.purple, size: 24),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                        color: Colors.black87,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      subtitle,
                      style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                    ),
                  ],
                ),
              ),
              Icon(Icons.arrow_forward_ios, size: 16, color: Colors.grey[400]),
            ],
          ),
        ),
      ),
    );
  }

  void _generateReport(String reportType) {
    Navigator.pop(context); // Close bottom sheet

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Report Generated'),
        content: Text(_buildReportContent(reportType)),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close'),
          ),
          ElevatedButton.icon(
            onPressed: () {
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('$reportType Report downloaded successfully'),
                  backgroundColor: Colors.green,
                ),
              );
            },
            icon: const Icon(Icons.download),
            label: const Text('Download'),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.purple,
              foregroundColor: Colors.white,
            ),
          ),
        ],
      ),
    );
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
      case 'weekly':
        return '''
Weekly Attendance Report
────────────────────
Last 7 Days Data:
${_weeklyTrends.map((t) => '${t['day']}: ${t['percentage']}% (${t['count']} present)').join('\n')}

Average Attendance: ${_weeklyTrends.isEmpty ? 0 : _weeklyTrends.map((t) => t['percentage'] as int).reduce((a, b) => a + b) ~/ _weeklyTrends.length}%
''';
      case 'monthly':
        return '''
Monthly Attendance Report
────────────────────
Total Records: ${_attendanceRecords.length}
Present: ${_attendanceStats['present'] ?? 0}
Absent: ${_attendanceStats['absent'] ?? 0}
Late: ${_attendanceStats['late'] ?? 0}
Cutting: ${_attendanceStats['cutting'] ?? 0}

Overall Attendance: ${_attendanceRecords.isNotEmpty ? (((_attendanceStats['present'] ?? 0) / _attendanceRecords.length) * 100).toStringAsFixed(1) : 0}%
''';
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
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 16),
          decoration: BoxDecoration(
            color: color.withOpacity(0.1),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: color.withOpacity(0.3), width: 1.5),
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
        final minute = parts[1].substring(0, 2); // Get first 2 digits of minutes
        
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
      'Morning': Color(0xFF3B82F6),
      'Afternoon': Color(0xFFF59E0B),
      'Evening': Color(0xFF8B5CF6),
    };

    final shiftColor = shiftColors[shift] ?? const Color(0xFF10B981);
    
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
                  color: shiftColor.withOpacity(0.1),
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
                      color: shiftColor.withOpacity(0.1),
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
                        ? Colors.green.withOpacity(0.1)
                        : Colors.orange.withOpacity(0.1),
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
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withOpacity(0.3), width: 1),
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
          colors: [const Color(0xFF10B981), Colors.green.shade700],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(12),
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
                  border: Border.all(color: Colors.green.shade300, width: 3),
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
                      color: Color(0xFF10B981),
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
            color: statusColor.withOpacity(0.2),
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
                      color: statusColor.withOpacity(0.1),
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
                color: statusColor.withOpacity(0.2),
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
                          color: statusColor.withOpacity(0.1),
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