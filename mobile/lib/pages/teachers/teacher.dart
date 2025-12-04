import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:mobile/services/teacherService.dart';
import 'schedule.dart';

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

class _TeacherDashboardState extends State<TeacherDashboard> {
  final _storage = const FlutterSecureStorage();
  late PageController _pageController;
  int _currentPage = 0;
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
  String? _error;

  @override
  void initState() {
    super.initState();
    _pageController = PageController();
    _loadDashboardData();
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  Future<void> _loadDashboardData() async {
    try {
      setState(() => _isLoading = true);

      // Fetch attendance stats
      final stats = await TeacherService.getAttendanceStats(token: widget.token);
      
      // Fetch attendance records
      final recordsResponse = await TeacherService.getAttendanceRecords(token: widget.token);
      final records = recordsResponse['records'] as List<dynamic>? ?? [];

      if (mounted) {
        setState(() {
          _attendanceStats = stats;
          _attendanceRecords = records;
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
    return DefaultTabController(
      length: 2,
      child: Scaffold(
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
                indicatorColor: Colors.white,
                indicatorWeight: 3,
                labelColor: Colors.white,
                unselectedLabelColor: Colors.white70,
                onTap: (index) {
                  setState(() => _currentTab = index);
                },
                tabs: const [
                  Tab(
                    icon: Icon(Icons.dashboard),
                    text: 'Dashboard',
                  ),
                  Tab(
                    icon: Icon(Icons.schedule),
                    text: 'Schedule',
                  ),
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
                                    fontSize: 14, color: Colors.grey[600]),
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
                        child: SingleChildScrollView(
                          child: Padding(
                            padding: const EdgeInsets.all(16.0),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                // Profile Section
                                _buildProfileCard(),
                                const SizedBox(height: 24),

                                // Statistics Cards
                                _buildStatisticsSection(),
                                const SizedBox(height: 24),

                                // Attendance Records Section
                                _buildAttendanceRecordsSection(),
                                const SizedBox(height: 40),
                              ],
                            ),
                          ),
                        ),
                      )
            : TeacherSchedule(
                token: widget.token,
                teacherId: widget.teacherId,
                teacherName: widget.teacherName,
              ),
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
                  border: Border.all(
                    color: Colors.green.shade300,
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
                      style: const TextStyle(
                        fontSize: 12,
                        color: Colors.white70,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 8),
                    if (widget.subject != null)
                      Chip(
                        label: Text(
                          widget.subject!,
                          style: const TextStyle(
                            fontSize: 11,
                            color: Colors.white,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        backgroundColor: Colors.white.withOpacity(0.3),
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 2,
                        ),
                      ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStatisticsSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Attendance Statistics',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: Colors.black87,
          ),
        ),
        const SizedBox(height: 12),
        GridView.count(
          crossAxisCount: 2,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          mainAxisSpacing: 12,
          crossAxisSpacing: 12,
          children: [
            _buildStatCard(
              icon: Icons.check_circle,
              label: 'Present',
              value: _attendanceStats['present']?.toString() ?? '0',
              color: Colors.green,
            ),
            _buildStatCard(
              icon: Icons.cancel,
              label: 'Absent',
              value: _attendanceStats['absent']?.toString() ?? '0',
              color: Colors.red,
            ),
            _buildStatCard(
              icon: Icons.schedule,
              label: 'Late',
              value: _attendanceStats['late']?.toString() ?? '0',
              color: Colors.orange,
            ),
            _buildStatCard(
              icon: Icons.warning,
              label: 'Cutting',
              value: _attendanceStats['cutting']?.toString() ?? '0',
              color: Colors.purple,
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildStatCard({
    required IconData icon,
    required String label,
    required String value,
    required Color color,
  }) {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 32, color: color),
            const SizedBox(height: 8),
            Text(
              value,
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
                color: Colors.grey[600],
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
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
                      Icon(
                        Icons.event_note,
                        size: 48,
                        color: Colors.grey[400],
                      ),
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
                  const SnackBar(
                    content: Text('View all records coming soon'),
                  ),
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
