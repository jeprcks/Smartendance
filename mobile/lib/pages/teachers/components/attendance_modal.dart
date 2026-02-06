import 'package:flutter/material.dart';
import 'package:mobile/fetch/teacherService.dart';

// Attendance status options
const List<String> attendanceStatus = ['Present', 'Absent', 'Late', 'Cutting'];

class StudentStatusModal {
  static Future<void> showStatusEditModal(
    BuildContext context, {
    required List<dynamic> students,
    required String token,
    required String scheduleId,
    required String scheduleTitle,
    String? subject,
    String? gradeLevel,
    String? section,
    VoidCallback? onStatusUpdated,
  }) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) => _StudentStatusEditSheet(
        students: students,
        token: token,
        scheduleId: scheduleId,
        scheduleTitle: scheduleTitle,
        subject: subject,
        gradeLevel: gradeLevel,
        section: section,
        onStatusUpdated: onStatusUpdated,
      ),
    );
  }
}

class _StudentStatusEditSheet extends StatefulWidget {
  final List<dynamic> students;
  final String token;
  final String scheduleId;
  final String scheduleTitle;
  final String? subject;
  final String? gradeLevel;
  final String? section;
  final VoidCallback? onStatusUpdated;

  const _StudentStatusEditSheet({
    required this.students,
    required this.token,
    required this.scheduleId,
    required this.scheduleTitle,
    this.subject,
    this.gradeLevel,
    this.section,
    this.onStatusUpdated,
  });

  @override
  State<_StudentStatusEditSheet> createState() =>
      _StudentStatusEditSheetState();
}

class _StudentStatusEditSheetState extends State<_StudentStatusEditSheet> {
  late List<dynamic> _students;
  String _searchQuery = '';
  bool _isUpdating = false;
  bool _isLoading = true;
  final Map<String, String> _statusUpdates = {};
  final Map<String, dynamic> _scannedAttendance =
      {}; // Store scanned attendance data
  final Map<String, String> _scannedStatus =
      {}; // Store processed scanned status
  final Map<String, String> _scanTimes = {}; // Store scan times
  final Map<String, String> _scheduleDay = {}; // Store schedule day
  final Map<String, String> _scheduleTimeSlot = {}; // Store schedule time
  final Map<String, String> _scheduleTeacher = {}; // Store schedule teacher
  final Map<String, bool> _individualUpdating = {}; // Track individual updates

  @override
  void initState() {
    super.initState();
    _students = List.from(widget.students);
    _fetchAttendanceData();
  }

  Future<void> _fetchAttendanceData() async {
    try {
      setState(() => _isLoading = true);

      final dateString = DateTime.now().toString().split(' ')[0];
      debugPrint('📅 Fetching attendance for date: $dateString');
      debugPrint('📍 Schedule ID: ${widget.scheduleId}');

      // Fetch attendance records from backend for this schedule
      final attendanceRecords =
          await TeacherService.getScheduleAttendanceRecords(
            token: widget.token,
            scheduleId: widget.scheduleId,
            date: dateString,
          );

      debugPrint('📊 Received ${attendanceRecords.length} attendance records');
      if (attendanceRecords.isNotEmpty) {
        debugPrint('✅ Sample record: ${attendanceRecords.first}');
      } else {
        debugPrint('❌ NO ATTENDANCE RECORDS RETURNED FROM BACKEND');
      }

      if (mounted) {
        setState(() {
          // Clear previous data
          _scannedAttendance.clear();
          _statusUpdates.clear();
          _scannedStatus.clear();
          _scanTimes.clear();
          _scheduleDay.clear();
          _scheduleTimeSlot.clear();
          _scheduleTeacher.clear();

          // Map attendance by student ID
          for (var record in attendanceRecords) {
            final studentId = record['studentId'];
            final status = record['status'];
            final subject = record['subject'];
            debugPrint(
              '👤 Processing: $studentId, Status: $status, Subject: $subject',
            );

            if (studentId != null) {
              _scannedAttendance[studentId] = record;

              // Priority: Use statusHistory if available (teacher-updated), otherwise use current status
              String finalStatus;
              if (record['statusHistory'] != null &&
                  (record['statusHistory'] as List).isNotEmpty) {
                // Get the latest status from statusHistory
                final lastUpdate =
                    record['statusHistory'][(record['statusHistory'] as List)
                            .length -
                        1];
                finalStatus =
                    lastUpdate['status'] ?? record['status'] ?? 'Not Scanned';
                debugPrint('  ✅ Using statusHistory: $finalStatus');
              } else {
                finalStatus = record['status'] ?? 'Not Scanned';
                debugPrint('  📌 Using current status: $finalStatus');
              }

              _statusUpdates[studentId] = finalStatus;
              _scannedStatus[studentId] = finalStatus;

              // Store scan time - use scanTime from History schema
              if (record['scanTime'] != null) {
                try {
                  final scanTime = DateTime.parse(record['scanTime']);
                  _scanTimes[studentId] =
                      '${scanTime.hour}:${scanTime.minute.toString().padLeft(2, '0')}';
                } catch (e) {
                  debugPrint('⏰ Error parsing scan time: $e');
                }
              }

              // Store schedule information
              if (record['scheduleDay'] != null) {
                _scheduleDay[studentId] = record['scheduleDay'];
              }
              if (record['scheduleTimeSlot'] != null) {
                _scheduleTimeSlot[studentId] = record['scheduleTimeSlot'];
              }
              if (record['scheduleTeacher'] != null) {
                _scheduleTeacher[studentId] = record['scheduleTeacher'];
              }
            }
          }
          // Remove any pending updates for students with "Out" status
          _statusUpdates.removeWhere((studentId, status) {
            final scannedStatus = _scannedStatus[studentId] ?? 'Not Scanned';
            if (scannedStatus == 'Out') {
              debugPrint(
                '⚠️ Removing pending update for student $studentId - status is "Out"',
              );
              return true;
            }
            return false;
          });

          debugPrint(
            '✅ Loaded attendance data: ${_scannedAttendance.length} students',
          );
          debugPrint('📋 All students in class: ${_students.length}');
          debugPrint(
            '📊 Students with attendance records: ${_scannedAttendance.length}',
          );
          _isLoading = false;
        });
      }
    } catch (e) {
      debugPrint('❌ Error fetching attendance data: $e');
      if (mounted) {
        setState(() => _isLoading = false);
      }
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

  Color _getStatusColor(String status) {
    if (status == 'Present') {
      return Colors.green;
    } else if (status == 'Absent') {
      return Colors.red;
    } else if (status == 'Late') {
      return Colors.orange;
    } else if (status == 'Cutting') {
      return Colors.deepOrange;
    }
    return Colors.grey;
  }

  Future<void> _updateAllStatuses() async {
    if (_statusUpdates.isEmpty) {
      Navigator.pop(context);
      return;
    }

    setState(() => _isUpdating = true);

    int successCount = 0;
    int errorCount = 0;

    try {
      for (var entry in _statusUpdates.entries) {
        final studentId = entry.key;
        final newStatus = entry.value;

        // Skip students with "Out" status - they cannot be edited
        final scannedStatus = _scannedStatus[studentId] ?? 'Not Scanned';
        if (scannedStatus == 'Out') {
          debugPrint(
            '⚠️ Skipping update for student $studentId - status is "Out" and cannot be edited',
          );
          continue;
        }

        try {
          await TeacherService.updateStudentAttendance(
            token: widget.token,
            studentId: studentId,
            scheduleId: widget.scheduleId,
            status: newStatus,
            subject: widget.subject ?? 'General',
            gradeLevel: widget.gradeLevel,
            section: widget.section,
          );
          successCount++;
        } catch (e) {
          errorCount++;
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('Error updating student: $e'),
                backgroundColor: Colors.red,
                duration: const Duration(seconds: 2),
              ),
            );
          }
        }
      }

      if (mounted) {
        setState(() => _isUpdating = false);

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Updated: $successCount students${errorCount > 0 ? ', Errors: $errorCount' : ''}',
            ),
            backgroundColor: errorCount == 0 ? Colors.green : Colors.orange,
            duration: const Duration(seconds: 2),
          ),
        );

        // Refetch attendance data to sync with backend changes
        await _fetchAttendanceData();

        // Call callback if provided
        widget.onStatusUpdated?.call();

        // Close modal after a short delay
        if (mounted) {
          await Future.delayed(const Duration(seconds: 1));
          if (!mounted) return;
          Navigator.pop(context);
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isUpdating = false);

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  Future<void> _updateSingleStudent(
    String studentId,
    String studentName,
  ) async {
    // Skip students with "Out" status
    final scannedStatus = _scannedStatus[studentId] ?? 'Not Scanned';
    if (scannedStatus == 'Out') {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Cannot update student with "Out" status'),
            backgroundColor: Colors.orange,
            duration: const Duration(seconds: 2),
          ),
        );
      }
      return;
    }

    final newStatus = _statusUpdates[studentId];
    if (newStatus == null) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('No status change detected'),
            backgroundColor: Colors.orange,
            duration: const Duration(seconds: 2),
          ),
        );
      }
      return;
    }

    setState(() {
      _individualUpdating[studentId] = true;
    });

    try {
      await TeacherService.updateStudentAttendance(
        token: widget.token,
        studentId: studentId,
        scheduleId: widget.scheduleId,
        status: newStatus,
        subject: widget.subject ?? 'General',
        gradeLevel: widget.gradeLevel,
        section: widget.section,
      );

      if (mounted) {
        setState(() {
          _individualUpdating[studentId] = false;
          // Remove from pending updates after successful save
          _statusUpdates.remove(studentId);
          // Update scanned status to reflect the saved change
          _scannedStatus[studentId] = newStatus;
        });

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('✅ Updated $studentName to $newStatus'),
            backgroundColor: Colors.green,
            duration: const Duration(seconds: 2),
          ),
        );

        // Refetch attendance data to sync with backend
        await _fetchAttendanceData();

        // Call callback if provided
        widget.onStatusUpdated?.call();
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _individualUpdating[studentId] = false;
        });

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error updating $studentName: $e'),
            backgroundColor: Colors.red,
            duration: const Duration(seconds: 3),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final filteredStudents = _getFilteredStudents();
    final hasUpdates = _statusUpdates.isNotEmpty;

    if (_isLoading) {
      return Container(
        height: MediaQuery.of(context).size.height * 0.85,
        decoration: const BoxDecoration(
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          color: Colors.white,
        ),
        child: Center(
          child: CircularProgressIndicator(
            valueColor: AlwaysStoppedAnimation<Color>(Colors.green[600]!),
          ),
        ),
      );
    }

    return Container(
      height: MediaQuery.of(context).size.height * 0.85,
      decoration: const BoxDecoration(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        color: Colors.white,
      ),
      child: Column(
        children: [
          // Header
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Student Attendance',
                            style: TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.bold,
                              color: Colors.black87,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            widget.scheduleTitle,
                            style: TextStyle(
                              fontSize: 14,
                              color: Colors.grey[600],
                            ),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close),
                      onPressed: () => Navigator.pop(context),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                // Search Bar
                TextField(
                  onChanged: (value) {
                    setState(() {
                      _searchQuery = value;
                    });
                  },
                  decoration: InputDecoration(
                    hintText: 'Search student...',
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
                    fillColor: Colors.grey[100],
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide.none,
                    ),
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 12,
                    ),
                  ),
                ),
              ],
            ),
          ),
          // Students List
          Expanded(
            child: filteredStudents.isEmpty
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.people_outline,
                          size: 48,
                          color: Colors.grey[300],
                        ),
                        const SizedBox(height: 8),
                        Text(
                          _searchQuery.isEmpty
                              ? 'No students found'
                              : 'No matching students',
                          style: TextStyle(
                            color: Colors.grey[600],
                            fontSize: 14,
                          ),
                        ),
                      ],
                    ),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    itemCount: filteredStudents.length,
                    itemBuilder: (context, index) {
                      final student = filteredStudents[index];
                      return _buildStudentStatusTile(student);
                    },
                  ),
          ),
          // Footer with Save Button
          if (hasUpdates)
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 8,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.blue.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                        color: Colors.blue.withValues(alpha: 0.3),
                      ),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.people, size: 14, color: Colors.blue),
                        const SizedBox(width: 6),
                        Text(
                          '${_statusUpdates.length} student(s) pending',
                          style: const TextStyle(
                            fontSize: 12,
                            color: Colors.blue,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: _isUpdating ? null : _updateAllStatuses,
                      icon: _isUpdating
                          ? const SizedBox(
                              height: 20,
                              width: 20,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                valueColor: AlwaysStoppedAnimation<Color>(
                                  Colors.white,
                                ),
                              ),
                            )
                          : const Icon(Icons.save_alt, size: 20),
                      label: Text(
                        _isUpdating
                            ? 'Saving All...'
                            : 'Save All (${_statusUpdates.length})',
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.green,
                        disabledBackgroundColor: Colors.grey[300],
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildStudentStatusTile(dynamic student) {
    final studentName =
        student['studentName'] ??
        student['name'] ??
        student['fullName'] ??
        'Unknown';
    final studentId =
        student['studentId'] ?? student['id'] ?? student['_id'] ?? 'N/A';

    // Get scanned attendance data - use processed status from _scannedStatus
    final attendance = _scannedAttendance[studentId];
    final scannedStatus = _scannedStatus[studentId] ?? 'Not Scanned';
    final scanTime = _scanTimes[studentId];
    final notes = attendance?['notes'] ?? '';

    final selectedStatus = _statusUpdates[studentId] ?? scannedStatus;
    final isUpdated =
        _statusUpdates.containsKey(studentId) &&
        _statusUpdates[studentId] != scannedStatus;
    final isScanned = scannedStatus != 'Not Scanned';

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Container(
        decoration: BoxDecoration(
          border: Border.all(
            color: isUpdated ? Colors.blue : Colors.grey[300]!,
            width: isUpdated ? 2 : 1,
          ),
          borderRadius: BorderRadius.circular(12),
          color: isUpdated
              ? Colors.blue.withValues(alpha: 0.05)
              : isScanned
              ? Colors.green.withValues(alpha: 0.02)
              : Colors.transparent,
        ),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          studentName,
                          style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                            color: Colors.black87,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'ID: $studentId',
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.grey[600],
                          ),
                        ),
                        const SizedBox(height: 6),
                        if (_scheduleDay[studentId] != null ||
                            _scheduleTimeSlot[studentId] != null) ...[
                          Row(
                            children: [
                              Icon(
                                Icons.calendar_today,
                                size: 12,
                                color: Colors.grey[500],
                              ),
                              const SizedBox(width: 4),
                              Text(
                                '${_scheduleDay[studentId] ?? 'N/A'} • ${_scheduleTimeSlot[studentId] ?? 'N/A'}',
                                style: TextStyle(
                                  fontSize: 11,
                                  color: Colors.grey[600],
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 2),
                          if (_scheduleTeacher[studentId] != null)
                            Row(
                              children: [
                                Icon(
                                  Icons.person,
                                  size: 12,
                                  color: Colors.grey[500],
                                ),
                                const SizedBox(width: 4),
                                Text(
                                  'Teacher: ${_scheduleTeacher[studentId]}',
                                  style: TextStyle(
                                    fontSize: 10,
                                    color: Colors.grey[600],
                                  ),
                                ),
                              ],
                            ),
                        ],
                      ],
                    ),
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: _getStatusColor(
                            scannedStatus,
                          ).withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          scannedStatus,
                          style: TextStyle(
                            fontSize: 11,
                            color: _getStatusColor(scannedStatus),
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                      if (scanTime != null) ...[
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            Icon(
                              Icons.access_time,
                              size: 12,
                              color: Colors.grey[500],
                            ),
                            const SizedBox(width: 2),
                            Text(
                              scanTime,
                              style: TextStyle(
                                fontSize: 10,
                                color: Colors.grey[600],
                              ),
                            ),
                          ],
                        ),
                      ],
                    ],
                  ),
                ],
              ),
              if (notes.isNotEmpty) ...[
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.amber[50],
                    borderRadius: BorderRadius.circular(4),
                    border: Border.all(color: Colors.amber[200]!, width: 0.5),
                  ),
                  child: Text(
                    notes,
                    style: TextStyle(fontSize: 10, color: Colors.amber[900]),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
              const SizedBox(height: 12),
              // Status Options (only show if need to change)
              if (isScanned)
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Check if status is "Out" - disable editing
                    if (scannedStatus == 'Out') ...[
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 6,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.grey[200],
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(
                            color: Colors.grey[400]!,
                            width: 1,
                          ),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              Icons.lock_outline,
                              size: 14,
                              color: Colors.grey[600],
                            ),
                            const SizedBox(width: 6),
                            Text(
                              'Status cannot be edited (Out)',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                                color: Colors.grey[600],
                                fontStyle: FontStyle.italic,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ] else ...[
                      Text(
                        'Override Status:',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: Colors.grey[700],
                        ),
                      ),
                      const SizedBox(height: 6),
                      Wrap(
                        spacing: 6,
                        runSpacing: 6,
                        children: attendanceStatus.map((status) {
                          final isSelected = selectedStatus == status;
                          final statusColor = _getStatusColor(status);

                          return GestureDetector(
                            onTap: () {
                              setState(() {
                                if (status == scannedStatus) {
                                  _statusUpdates.remove(studentId);
                                } else {
                                  _statusUpdates[studentId] = status;
                                }
                              });
                            },
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 10,
                                vertical: 6,
                              ),
                              decoration: BoxDecoration(
                                color: isSelected
                                    ? statusColor.withValues(alpha: 0.2)
                                    : Colors.grey[100],
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(
                                  color: isSelected
                                      ? statusColor
                                      : Colors.grey[300]!,
                                  width: isSelected ? 2 : 1,
                                ),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  if (isSelected)
                                    Padding(
                                      padding: const EdgeInsets.only(right: 4),
                                      child: Icon(
                                        Icons.check,
                                        size: 14,
                                        color: statusColor,
                                      ),
                                    ),
                                  Text(
                                    status,
                                    style: TextStyle(
                                      fontSize: 11,
                                      fontWeight: isSelected
                                          ? FontWeight.bold
                                          : FontWeight.w600,
                                      color: isSelected
                                          ? statusColor
                                          : Colors.grey[700],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          );
                        }).toList(),
                      ),
                      // Individual Save Button (only show if status changed)
                      if (isUpdated) ...[
                        const SizedBox(height: 8),
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton.icon(
                            onPressed: (_individualUpdating[studentId] ?? false)
                                ? null
                                : () => _updateSingleStudent(
                                    studentId,
                                    studentName,
                                  ),
                            icon: (_individualUpdating[studentId] ?? false)
                                ? const SizedBox(
                                    height: 14,
                                    width: 14,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                      valueColor: AlwaysStoppedAnimation<Color>(
                                        Colors.white,
                                      ),
                                    ),
                                  )
                                : const Icon(Icons.save, size: 16),
                            label: Text(
                              (_individualUpdating[studentId] ?? false)
                                  ? 'Saving...'
                                  : 'Save This Student',
                              style: const TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.blue,
                              foregroundColor: Colors.white,
                              disabledBackgroundColor: Colors.grey[400],
                              padding: const EdgeInsets.symmetric(
                                vertical: 8,
                                horizontal: 12,
                              ),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(8),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ],
                  ],
                )
              else
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 6,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.grey[100],
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.grey[300]!, width: 1),
                  ),
                  child: Text(
                    'Waiting for QR scan...',
                    style: TextStyle(
                      fontSize: 11,
                      color: Colors.grey[600],
                      fontStyle: FontStyle.italic,
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
