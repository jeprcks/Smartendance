import 'package:flutter/material.dart';
import 'package:mobile/fetch/teacherService.dart';
import 'package:mobile/theme.dart';

class StudentDetailsModal {
  /// Show the student details modal which loads attendance history for the student
  /// filtered by optional `subject`, `gradeLevel`, and `section`.
  static Future<void> show(
    BuildContext context, {
    required String token,
    required String studentId,
    String? studentName,
    String? subject,
    String? gradeLevel,
    String? section,
  }) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => _StudentDetailsSheet(
        token: token,
        studentId: studentId,
        studentName: studentName,
        subject: subject,
        gradeLevel: gradeLevel,
        section: section,
      ),
    );
  }
}

class _StudentDetailsSheet extends StatefulWidget {
  final String token;
  final String studentId;
  final String? studentName;
  final String? subject;
  final String? gradeLevel;
  final String? section;

  const _StudentDetailsSheet({
    required this.token,
    required this.studentId,
    this.studentName,
    this.subject,
    this.gradeLevel,
    this.section,
  });

  @override
  State<_StudentDetailsSheet> createState() => _StudentDetailsSheetState();
}

class _StudentDetailsSheetState extends State<_StudentDetailsSheet> {
  bool _isLoading = true;
  String? _error;
  List<dynamic> _history = [];
  String _searchQuery = '';
  String? _selectedStatus; // Present, Absent, Late, Cutting, etc.
  DateTime? _selectedDate;

  @override
  void initState() {
    super.initState();
    _loadHistory();
  }

  Future<void> _loadHistory() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      // Fetch recent attendance records for this teacher
      final response = await TeacherService.getAttendanceRecords(
        token: widget.token,
        // No additional filters here; we'll filter by student/subject locally
        page: 1,
        limit: 200,
      );

      final records = response['records'] as List<dynamic>? ?? [];

      // Base filter: this student (+ optional subject)
      final filtered =
          records.where((r) {
            final id = r['studentId'];
            if (id == null) return false;
            if (id.toString() != widget.studentId.toString()) return false;

            if (widget.subject != null && widget.subject!.isNotEmpty) {
              final recordSubject = r['subject'] ?? '';
              return recordSubject.toString() == widget.subject.toString();
            }
            return true;
          }).toList()..sort((a, b) {
            final aTime =
                DateTime.tryParse(a['scanTime'] ?? a['createdAt'] ?? '') ??
                DateTime.fromMillisecondsSinceEpoch(0);
            final bTime =
                DateTime.tryParse(b['scanTime'] ?? b['createdAt'] ?? '') ??
                DateTime.fromMillisecondsSinceEpoch(0);
            return bTime.compareTo(aTime);
          });

      setState(() {
        _history = filtered;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    // Apply search, date, and status filters on top of loaded history
    final filteredHistory = _history.where((record) {
      final status = (record['status'] ?? '').toString();
      final subject = (record['subject'] ?? '').toString();
      final studentName = (record['studentName'] ?? '').toString();

      // Status filter
      if (_selectedStatus != null && _selectedStatus!.isNotEmpty) {
        if (status.toLowerCase() != _selectedStatus!.toLowerCase()) {
          return false;
        }
      }

      // Date filter (match by yyyy-MM-dd)
      if (_selectedDate != null) {
        final scanRaw = record['scanTime'] ?? record['createdAt'];
        if (scanRaw is String && scanRaw.isNotEmpty) {
          try {
            final dt = DateTime.parse(scanRaw);
            final sameDay =
                dt.year == _selectedDate!.year &&
                dt.month == _selectedDate!.month &&
                dt.day == _selectedDate!.day;
            if (!sameDay) return false;
          } catch (_) {
            // If parsing fails, exclude if date filter is set
            return false;
          }
        } else {
          return false;
        }
      }

      // Search filter: match on subject, status, or student name
      if (_searchQuery.isNotEmpty) {
        final q = _searchQuery.toLowerCase();
        if (!subject.toLowerCase().contains(q) &&
            !status.toLowerCase().contains(q) &&
            !studentName.toLowerCase().contains(q)) {
          return false;
        }
      }

      return true;
    }).toList();

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
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        widget.studentName ?? 'Student History',
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        widget.subject != null
                            ? 'Subject: ${widget.subject}'
                            : 'All subjects',
                        style: const TextStyle(
                          fontSize: 13,
                          color: Colors.grey,
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
          ),
          // Filters
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16.0),
            child: Column(
              children: [
                // Search box
                TextField(
                  decoration: InputDecoration(
                    hintText: 'Search by subject, status, or note...',
                    prefixIcon: const Icon(Icons.search, size: 18),
                    isDense: true,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 8,
                    ),
                  ),
                  onChanged: (value) {
                    setState(() {
                      _searchQuery = value;
                    });
                  },
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    // Date filter
                    Expanded(
                      child: InkWell(
                        onTap: () async {
                          final now = DateTime.now();
                          final picked = await showDatePicker(
                            context: context,
                            initialDate: _selectedDate ?? now,
                            firstDate: DateTime(now.year - 1),
                            lastDate: DateTime(now.year + 1),
                          );
                          if (picked != null) {
                            setState(() {
                              _selectedDate = picked;
                            });
                          }
                        },
                        borderRadius: BorderRadius.circular(10),
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 10,
                            vertical: 8,
                          ),
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: Colors.grey.shade300),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Row(
                                children: [
                                  const Icon(Icons.calendar_today, size: 16),
                                  const SizedBox(width: 6),
                                  Text(
                                    _selectedDate == null
                                        ? 'Any date'
                                        : '${_selectedDate!.year}-${_selectedDate!.month.toString().padLeft(2, '0')}-${_selectedDate!.day.toString().padLeft(2, '0')}',
                                    style: const TextStyle(fontSize: 12),
                                  ),
                                ],
                              ),
                              if (_selectedDate != null)
                                GestureDetector(
                                  onTap: () {
                                    setState(() {
                                      _selectedDate = null;
                                    });
                                  },
                                  child: const Icon(Icons.close, size: 14),
                                ),
                            ],
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    // Status filter
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        initialValue: _selectedStatus,
                        isDense: true,
                        decoration: InputDecoration(
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(10),
                          ),
                          contentPadding: const EdgeInsets.symmetric(
                            horizontal: 10,
                            vertical: 8,
                          ),
                        ),
                        hint: const Text(
                          'Any status',
                          style: TextStyle(fontSize: 12),
                        ),
                        items: const ['Present', 'Absent', 'Late', 'Cutting']
                            .map(
                              (s) => DropdownMenuItem(
                                value: s,
                                child: Text(
                                  s,
                                  style: const TextStyle(fontSize: 12),
                                ),
                              ),
                            )
                            .toList(),
                        onChanged: (value) {
                          setState(() {
                            _selectedStatus = value;
                          });
                        },
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 8),
          const Divider(height: 1),
          if (_isLoading)
            const Expanded(child: Center(child: CircularProgressIndicator()))
          else if (_error != null)
            Expanded(
              child: Center(
                child: Padding(
                  padding: const EdgeInsets.all(24.0),
                  child: Text('Error loading history: $_error'),
                ),
              ),
            )
          else if (filteredHistory.isEmpty)
            Expanded(
              child: Center(
                child: Padding(
                  padding: const EdgeInsets.all(24.0),
                  child: Text('No history found for the current filters.'),
                ),
              ),
            )
          else
            Expanded(
              child: ListView.separated(
                padding: const EdgeInsets.all(12),
                itemCount: filteredHistory.length,
                separatorBuilder: (_, __) => const Divider(),
                itemBuilder: (context, index) {
                  final record = filteredHistory[index];
                  final status = record['status'] ?? 'Unknown';
                  final subject = record['subject'] ?? 'General';
                  final scanTime =
                      record['scanTime'] ?? record['createdAt'] ?? '';
                  String timeLabel = scanTime;
                  try {
                    final dt = DateTime.parse(scanTime);
                    timeLabel =
                        '${dt.year}-${dt.month.toString().padLeft(2, '0')}-${dt.day.toString().padLeft(2, '0')} ${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
                  } catch (_) {}

                  return ListTile(
                    contentPadding: const EdgeInsets.symmetric(
                      vertical: 8,
                      horizontal: 12,
                    ),
                    leading: Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: Colors.grey[100],
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        status.length > 2 ? status[0] : status,
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      ),
                    ),
                    title: Text(subject),
                    subtitle: Text(timeLabel),
                    trailing: Text(
                      status,
                      style: TextStyle(
                        color: status == 'Present'
                            ? kPrimary
                            : status == 'Absent'
                            ? Colors.red
                            : Colors.orange,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  );
                },
              ),
            ),
        ],
      ),
    );
  }
}
