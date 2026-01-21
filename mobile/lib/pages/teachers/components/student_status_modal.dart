import 'package:flutter/material.dart';
import 'package:mobile/services/teacherService.dart';

// Attendance status options
const List<String> attendanceStatus = ['Present', 'Absent', 'Late', 'Cutting'];

class StudentStatusModal {
  static Future<void> showStatusEditModal(
    BuildContext context, {
    required List<dynamic> students,
    required String token,
    required String scheduleId,
    required String scheduleTitle,
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
  final VoidCallback? onStatusUpdated;

  const _StudentStatusEditSheet({
    required this.students,
    required this.token,
    required this.scheduleId,
    required this.scheduleTitle,
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
  final Map<String, String> _statusUpdates = {};

  @override
  void initState() {
    super.initState();
    _students = List.from(widget.students);
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

        try {
          await TeacherService.updateStudentAttendance(
            token: widget.token,
            studentId: studentId,
            scheduleId: widget.scheduleId,
            status: newStatus,
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

        // Call callback if provided
        widget.onStatusUpdated?.call();

        // Close modal
        if (mounted) Navigator.pop(context);
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

  @override
  Widget build(BuildContext context) {
    final filteredStudents = _getFilteredStudents();
    final hasUpdates = _statusUpdates.isNotEmpty;

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
                            'Edit Student Status',
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
                      color: Colors.blue.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: Colors.blue.withOpacity(0.3)),
                    ),
                    child: Text(
                      '${_statusUpdates.length} student(s) will be updated',
                      style: const TextStyle(
                        fontSize: 12,
                        color: Colors.blue,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: _isUpdating ? null : _updateAllStatuses,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.green,
                        disabledBackgroundColor: Colors.grey[300],
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: _isUpdating
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
                          : const Text(
                              'Save Changes',
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                                color: Colors.white,
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
    final studentId = student['studentId'] ?? student['id'] ?? 'N/A';
    final currentStatus =
        student['status'] ?? student['attendanceStatus'] ?? 'Not Scanned';
    final selectedStatus = _statusUpdates[studentId] ?? currentStatus;
    final isUpdated = _statusUpdates.containsKey(studentId);

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Container(
        decoration: BoxDecoration(
          border: Border.all(
            color: isUpdated ? Colors.blue : Colors.grey[300]!,
            width: isUpdated ? 2 : 1,
          ),
          borderRadius: BorderRadius.circular(12),
          color: isUpdated ? Colors.blue.withOpacity(0.05) : Colors.transparent,
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
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: _getStatusColor(currentStatus).withOpacity(0.1),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      currentStatus,
                      style: TextStyle(
                        fontSize: 11,
                        color: _getStatusColor(currentStatus),
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              // Status Options
              Wrap(
                spacing: 6,
                runSpacing: 6,
                children: attendanceStatus.map((status) {
                  final isSelected = selectedStatus == status;
                  final statusColor = _getStatusColor(status);

                  return GestureDetector(
                    onTap: () {
                      setState(() {
                        _statusUpdates[studentId] = status;
                      });
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        color: isSelected
                            ? statusColor.withOpacity(0.2)
                            : Colors.grey[100],
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                          color: isSelected ? statusColor : Colors.grey[300]!,
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
            ],
          ),
        ),
      ),
    );
  }
}
