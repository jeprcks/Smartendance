import 'package:flutter/material.dart';
import 'package:mobile/services/teacherService.dart';

class TeacherSchedule extends StatefulWidget {
  final String token;
  final String teacherId;
  final String? teacherName;

  const TeacherSchedule({
    super.key,
    required this.token,
    required this.teacherId,
    this.teacherName,
  });

  @override
  State<TeacherSchedule> createState() => _TeacherScheduleState();
}

class _TeacherScheduleState extends State<TeacherSchedule> {
  bool _isLoading = true;
  List<dynamic> _schedules = [];
  Map<String, List<dynamic>> _classStudents = {};
  String? _error;
  String? _selectedScheduleId;

  @override
  void initState() {
    super.initState();
    _loadScheduleData();
  }

  Future<void> _loadScheduleData() async {
    try {
      setState(() => _isLoading = true);

      // Fetch ONLY this teacher's schedules by name
      final schedules = await TeacherService.getTeacherSchedule(
        token: widget.token,
        teacherId: widget.teacherId,
        teacherName: widget.teacherName,
      );

      setState(() {
        _schedules = schedules;
        _isLoading = false;
      });

      // If schedules exist, load students for each class
      if (_schedules.isNotEmpty) {
        for (var schedule in _schedules) {
          final gradeLevel = schedule['gradeLevel'] ?? 'N/A';
          final section = schedule['section'] ?? 'N/A';
          final shift = schedule['shift'] ?? 'N/A';
          final subject = schedule['subject'] ?? 'N/A';
          final classKey = '$gradeLevel-$section-$shift-${schedule['_id'] ?? ''}';

          if (!_classStudents.containsKey(classKey)) {
            final students = await TeacherService.getClassStudents(
              gradeLevel: gradeLevel,
              section: section,
              teacherName: widget.teacherName ?? 'Unknown',
              token: widget.token,
              subject: subject,
              shift: shift,
            );

            if (mounted) {
              setState(() {
                _classStudents[classKey] = students;
              });
            }
          }
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString();
          _isLoading = false;
        });
      }
      print('Error loading schedule data: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey[100],
      appBar: AppBar(
        backgroundColor: const Color(0xFF10B981),
        elevation: 0,
        title: const Text(
          'My Schedule & Classes',
          style: TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.bold,
            color: Colors.white,
          ),
        ),
      ),
      body: _isLoading
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
                        'Error Loading Schedule',
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
                          style: TextStyle(fontSize: 14, color: Colors.grey[600]),
                        ),
                      ),
                      const SizedBox(height: 24),
                      ElevatedButton.icon(
                        onPressed: _loadScheduleData,
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
              : _schedules.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            Icons.schedule,
                            size: 64,
                            color: Colors.grey[400],
                          ),
                          const SizedBox(height: 16),
                          Text(
                            'No schedules found',
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                              color: Colors.grey[600],
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
                              // Schedules Section
                              const Text(
                                'Class Schedules',
                                style: TextStyle(
                                  fontSize: 20,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.black87,
                                ),
                              ),
                              const SizedBox(height: 12),
                              ListView.builder(
                                shrinkWrap: true,
                                physics: const NeverScrollableScrollPhysics(),
                                itemCount: _schedules.length,
                                itemBuilder: (context, index) {
                                  final schedule = _schedules[index];
                                  return _buildScheduleCard(schedule);
                                },
                              ),
                              const SizedBox(height: 40),
                            ],
                          ),
                        ),
                      ),
                    ),
    );
  }

  Widget _buildScheduleCard(dynamic schedule) {
    final gradeLevel = schedule['gradeLevel'] ?? 'N/A';
    final section = schedule['section'] ?? 'N/A';
    final subject = schedule['subject'] ?? 'N/A';
    final timeSlot = schedule['timeSlot'] ?? 'N/A';
    final day = schedule['day'] ?? 'N/A';
    final shift = schedule['shift'] ?? 'N/A';
    final classKey = '$gradeLevel-$section-$shift-${schedule['_id'] ?? ''}';
    final students = _classStudents[classKey] ?? [];

    return Card(
      elevation: 2,
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Schedule Header
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFF10B981).withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Icon(
                    Icons.schedule,
                    color: Color(0xFF10B981),
                    size: 24,
                  ),
                ),
                const SizedBox(width: 12),
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
                        style: TextStyle(
                          fontSize: 13,
                          color: Colors.grey[600],
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Schedule Details
            Row(
              children: [
                Expanded(
                  child: _buildDetailItem(Icons.access_time, 'Time', timeSlot),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _buildDetailItem(Icons.calendar_today, 'Day', day),
                ),
              ],
            ),
            const SizedBox(height: 12),
            _buildDetailItem(Icons.layers, 'Shift', shift),

            const SizedBox(height: 16),
            const Divider(),
            const SizedBox(height: 16),

            // Students List
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Students (${students.length})',
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                    color: Colors.black87,
                  ),
                ),
                if (students.isNotEmpty)
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: const Color(0xFF10B981).withOpacity(0.1),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      '${students.length} students',
                      style: const TextStyle(
                        fontSize: 12,
                        color: Color(0xFF10B981),
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 12),

            if (students.isEmpty)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 16),
                child: Text(
                  'No students in this class',
                  style: TextStyle(
                    fontSize: 13,
                    color: Colors.grey[600],
                    fontStyle: FontStyle.italic,
                  ),
                ),
              )
            else
              ListView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: students.length,
                itemBuilder: (context, index) {
                  final student = students[index];
                  return _buildStudentTile(student);
                },
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildDetailItem(IconData icon, String label, String value) {
    return Row(
      children: [
        Icon(icon, size: 18, color: const Color(0xFF10B981)),
        const SizedBox(width: 8),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label,
              style: TextStyle(
                fontSize: 11,
                color: Colors.grey[500],
                fontWeight: FontWeight.w500,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              value,
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: Colors.black87,
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildStudentTile(dynamic student) {
    final studentName = student['studentName'] ??
        student['name'] ??
        student['fullName'] ??
        'Unknown';
    final studentId =
        student['studentId'] ?? student['id'] ?? 'N/A';
    final section = student['section'] ?? 'N/A';

    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.grey[50],
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: Colors.grey[200]!),
        ),
        child: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: const BoxDecoration(
                shape: BoxShape.circle,
                color: Color(0xFF10B981),
              ),
              child: Center(
                child: Text(
                  studentName.isNotEmpty ? studentName[0].toUpperCase() : '?',
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
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
                      fontWeight: FontWeight.w600,
                      color: Colors.black87,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'ID: $studentId | Section: $section',
                    style: TextStyle(
                      fontSize: 11,
                      color: Colors.grey[500],
                    ),
                  ),
                ],
              ),
            ),
            Icon(
              Icons.person,
              size: 20,
              color: Colors.grey[400],
            ),
          ],
        ),
      ),
    );
  }
}
