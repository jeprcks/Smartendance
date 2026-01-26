import 'package:flutter/material.dart';
import 'package:mobile/fetch/teacherService.dart';

// Color scheme for different shifts
const Map<String, Color> shiftColors = {
  'Morning': Color(0xFF3B82F6),
  'Afternoon': Color(0xFFF59E0B),
  'Evening': Color(0xFF8B5CF6),
};

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

  @override
  State<ScheduleDetailsPage> createState() => _ScheduleDetailsPageState();
}

class _ScheduleDetailsPageState extends State<ScheduleDetailsPage> {
  late List<dynamic> _students;
  String _searchQuery = '';
  final Map<String, dynamic> _scannedAttendance =
      {}; // Store scanned attendance data
  final Map<String, String> _scanTimes = {}; // Store scan times

  @override
  void initState() {
    super.initState();
    _students = widget.students;
    _fetchAttendanceData();
  }

  Future<void> _fetchAttendanceData() async {
    try {
      // Fetch attendance records from backend for this schedule
      final attendanceRecords =
          await TeacherService.getScheduleAttendanceRecords(
            token: widget.token,
            scheduleId: widget.scheduleId,
            date: DateTime.now().toString().split(' ')[0],
          );

      if (mounted) {
        setState(() {
          // Map attendance by student ID
          for (var record in attendanceRecords) {
            final studentId = record['studentId'];
            if (studentId != null) {
              _scannedAttendance[studentId] = record;

              // Store scan time - use scanTime from History schema
              if (record['scanTime'] != null) {
                try {
                  final scanTime = DateTime.parse(record['scanTime']);
                  _scanTimes[studentId] =
                      '${scanTime.hour}:${scanTime.minute.toString().padLeft(2, '0')}';
                } catch (e) {
                  print('Error parsing scan time: $e');
                }
              }
            }
          }
        });
      }
    } catch (e) {
      print('Error fetching attendance data: $e');
      if (mounted) {}
    }
  }

  List<dynamic> _getFilteredStudents() {
    if (_searchQuery.isEmpty) {
      return _students;
    }

    return _students.where((student) {
      final studentName =
          student['studentName'] ??
          student['name'] ??
          student['fullName'] ??
          'Unknown';
      final studentId = student['studentId'] ?? student['id'] ?? 'N/A';

      return studentName.toLowerCase().contains(_searchQuery.toLowerCase()) ||
          studentId.toLowerCase().contains(_searchQuery.toLowerCase());
    }).toList();
  }

  Future<void> _refreshStudentStatus() async {
    try {
      final gradeLevel = widget.schedule['gradeLevel'] ?? 'N/A';
      final section = widget.schedule['section'] ?? 'N/A';
      final subject = widget.schedule['subject'] ?? 'N/A';
      final shift = widget.schedule['shift'] ?? 'N/A';

      // Fetch latest student data from backend
      final updatedStudents = await TeacherService.getClassStudents(
        gradeLevel: gradeLevel,
        section: section,
        teacherName: '', // Not needed for refresh
        token: widget.token,
        subject: subject,
        shift: shift,
      );

      if (mounted) {
        setState(() {
          _students = updatedStudents;
        });

        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Status updated successfully'),
            backgroundColor: Colors.green,
            duration: Duration(seconds: 1),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error refreshing status: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final gradeLevel = widget.schedule['gradeLevel'] ?? 'N/A';
    final section = widget.schedule['section'] ?? 'N/A';
    final subject = widget.schedule['subject'] ?? 'N/A';
    final timeSlot = widget.schedule['timeSlot'] ?? 'N/A';
    final day = widget.schedule['day'] ?? 'N/A';
    final shift = widget.schedule['shift'] ?? 'N/A';

    final shiftColor = shiftColors[shift] ?? const Color(0xFF10B981);
    final filteredStudents = _getFilteredStudents();

    return Scaffold(
      backgroundColor: Colors.grey[50],
      appBar: AppBar(
        flexibleSpace: Container(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [shiftColor, shiftColor.withOpacity(0.7)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
          ),
        ),
        elevation: 8,
        shadowColor: Colors.black26,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          subject,
          style: const TextStyle(
            fontSize: 22,
            fontWeight: FontWeight.bold,
            color: Colors.white,
          ),
        ),
      ),
      body: RefreshIndicator(
        onRefresh: _refreshStudentStatus,
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(16.0, 16.0, 16.0, 24.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Class Information Card
              Card(
                elevation: 3,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
                shadowColor: Colors.black12,
                child: Container(
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(16),
                    border: Border(
                      left: BorderSide(color: shiftColor, width: 6),
                    ),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: shiftColor.withOpacity(0.1),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Icon(
                                Icons.info_outline,
                                color: shiftColor,
                                size: 28,
                              ),
                            ),
                            const SizedBox(width: 16),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'Class Information',
                                    style: TextStyle(
                                      fontSize: 14,
                                      fontWeight: FontWeight.w600,
                                      color: Colors.grey[600],
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    '$gradeLevel - Section $section',
                                    style: const TextStyle(
                                      fontSize: 16,
                                      fontWeight: FontWeight.bold,
                                      color: Colors.black87,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),
                        const Divider(height: 2),
                        const SizedBox(height: 16),

                        // Schedule Details Grid
                        GridView.count(
                          crossAxisCount: 3,
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          childAspectRatio: 0.85,
                          mainAxisSpacing: 8,
                          crossAxisSpacing: 8,
                          children: [
                            _buildInfoTile(
                              Icons.access_time,
                              'Time',
                              timeSlot,
                              Colors.blue,
                            ),
                            _buildInfoTile(
                              Icons.calendar_today,
                              'Day',
                              day,
                              Colors.purple,
                            ),
                            _buildInfoTile(
                              Icons.layers,
                              'Shift',
                              shift,
                              shiftColor,
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 24),

              // Students Section
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Students Enrolled',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: Colors.black87,
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 6,
                    ),
                    decoration: BoxDecoration(
                      color: shiftColor.withOpacity(0.15),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      '${filteredStudents.length} / ${_students.length}',
                      style: TextStyle(
                        fontSize: 13,
                        color: shiftColor,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),

              // Search Bar
              TextField(
                onChanged: (value) {
                  setState(() {
                    _searchQuery = value;
                  });
                },
                decoration: InputDecoration(
                  hintText: 'Search student by name or ID...',
                  hintStyle: TextStyle(color: Colors.grey[400]),
                  prefixIcon: Icon(Icons.search, color: Colors.grey[400]),
                  suffixIcon: _searchQuery.isNotEmpty
                      ? IconButton(
                          icon: Icon(Icons.clear, color: Colors.grey[400]),
                          onPressed: () {
                            setState(() {
                              _searchQuery = '';
                            });
                          },
                        )
                      : null,
                  filled: true,
                  fillColor: Colors.white,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide(color: Colors.grey[300]!, width: 1),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide(color: Colors.grey[300]!, width: 1),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide(color: shiftColor, width: 2),
                  ),
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 12,
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // Students List
              if (filteredStudents.isEmpty)
                Center(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 32),
                    child: Column(
                      children: [
                        Icon(
                          Icons.people_outline,
                          size: 64,
                          color: Colors.grey[300],
                        ),
                        const SizedBox(height: 16),
                        Text(
                          _searchQuery.isEmpty
                              ? 'No students enrolled'
                              : 'No students found',
                          style: TextStyle(
                            fontSize: 16,
                            color: Colors.grey[600],
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                  ),
                )
              else
                ListView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: filteredStudents.length,
                  itemBuilder: (context, index) {
                    final student = filteredStudents[index];
                    return _buildStudentCard(student, shiftColor, index + 1);
                  },
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildInfoTile(
    IconData icon,
    String label,
    String value,
    Color color,
  ) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 10),
      decoration: BoxDecoration(
        color: color.withOpacity(0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withOpacity(0.2), width: 1),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 20, color: color),
          const SizedBox(height: 4),
          Text(
            label,
            style: TextStyle(
              fontSize: 10,
              color: Colors.grey[600],
              fontWeight: FontWeight.w500,
            ),
            textAlign: TextAlign.center,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 2),
          Flexible(
            child: Text(
              value,
              style: const TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w700,
                color: Colors.black87,
              ),
              textAlign: TextAlign.center,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStudentCard(dynamic student, Color shiftColor, int index) {
    final studentName =
        student['studentName'] ??
        student['name'] ??
        student['fullName'] ??
        'Unknown';
    final studentId = student['studentId'] ?? student['id'] ?? 'N/A';
    final section = student['section'] ?? 'N/A';
    final gender = student['gender'] ?? student['sex'] ?? 'N/A';

    // Get scanned attendance data from fetched records
    final attendance = _scannedAttendance[studentId];
    final scannedStatus = attendance?['status'] ?? 'Not Scanned';
    final scanTime = _scanTimes[studentId];

    // Determine status - use scanned status if available
    String statusText = scannedStatus;
    Color statusColor = Colors.grey;
    IconData statusIcon = Icons.qr_code_2;

    if (statusText.toLowerCase() == 'present') {
      statusColor = Colors.green;
      statusIcon = Icons.check_circle;
    } else if (statusText.toLowerCase() == 'absent') {
      statusColor = Colors.red;
      statusIcon = Icons.cancel;
    } else if (statusText.toLowerCase() == 'late') {
      statusColor = Colors.orange;
      statusIcon = Icons.schedule;
    } else if (statusText.toLowerCase() == 'cutting') {
      statusColor = Colors.deepOrange;
      statusIcon = Icons.close;
    } else if (statusText.toLowerCase().contains('sick')) {
      statusColor = Colors.blue;
      statusIcon = Icons.local_hospital;
    } else if (statusText.toLowerCase().contains('excused')) {
      statusColor = Colors.purple;
      statusIcon = Icons.check_box;
    }

    // Determine gender color
    Color genderColor = Colors.grey[100]!; // Default
    if (gender.toLowerCase() == 'male') {
      genderColor = const Color(0xFF3B82F6).withOpacity(0.08); // Light blue
    } else if (gender.toLowerCase() == 'female') {
      genderColor = const Color(0xFFEC4899).withOpacity(0.08); // Light pink
    }

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Card(
        elevation: 2,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        shadowColor: Colors.black.withOpacity(0.08),
        child: Container(
          decoration: BoxDecoration(
            color: genderColor,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                // Student Information
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        studentName,
                        style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          color: Colors.black87,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 6),
                      Row(
                        children: [
                          Icon(
                            Icons.badge_outlined,
                            size: 13,
                            color: Colors.grey[500],
                          ),
                          const SizedBox(width: 4),
                          Expanded(
                            child: Text(
                              'ID: $studentId',
                              style: TextStyle(
                                fontSize: 12,
                                color: Colors.grey[600],
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          Icon(
                            gender.toLowerCase() == 'male'
                                ? Icons.male
                                : gender.toLowerCase() == 'female'
                                ? Icons.female
                                : Icons.help_outline,
                            size: 13,
                            color: Colors.grey[500],
                          ),
                          const SizedBox(width: 4),
                          Expanded(
                            child: Text(
                              ': $gender',
                              style: TextStyle(
                                fontSize: 12,
                                color: Colors.grey[600],
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 2,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.grey[100],
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          'Section: $section',
                          style: TextStyle(
                            fontSize: 11,
                            color: Colors.grey[700],
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                      if (scanTime != null)
                        Padding(
                          padding: const EdgeInsets.only(top: 6),
                          child: Row(
                            children: [
                              Icon(
                                Icons.access_time,
                                size: 11,
                                color: Colors.grey[500],
                              ),
                              const SizedBox(width: 2),
                              Text(
                                'Scanned: $scanTime',
                                style: TextStyle(
                                  fontSize: 10,
                                  color: Colors.grey[500],
                                  fontStyle: FontStyle.italic,
                                ),
                              ),
                            ],
                          ),
                        ),
                    ],
                  ),
                ),
                const SizedBox(width: 12),

                // Status Display
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 8,
                  ),
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
              ],
            ),
          ),
        ),
      ),
    );
  }
}
