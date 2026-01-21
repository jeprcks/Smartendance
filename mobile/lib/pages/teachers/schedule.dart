import 'package:flutter/material.dart';
import 'package:mobile/services/teacherService.dart';
import 'components/schedule_details.dart';
import 'components/student_status_modal.dart';

// Color scheme for different shifts
const Map<String, Color> shiftColors = {
  'Morning': Color(0xFF3B82F6),
  'Afternoon': Color(0xFFF59E0B),
  'Evening': Color(0xFF8B5CF6),
};

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
  final Map<String, List<dynamic>> _classStudents = {};
  String? _error;

  // Filter states
  String? _selectedDay;
  String? _selectedTime;
  String? _selectedShift;

  // Days of week in order
  static const List<String> daysOfWeek = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
  ];

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
        // Sort schedules by day (Monday first)
        _schedules = _sortSchedulesByDay(schedules);
        _isLoading = false;
      });

      // If schedules exist, load students for each class
      if (_schedules.isNotEmpty) {
        for (var schedule in _schedules) {
          final gradeLevel = schedule['gradeLevel'] ?? 'N/A';
          final section = schedule['section'] ?? 'N/A';
          final shift = schedule['shift'] ?? 'N/A';
          final subject = schedule['subject'] ?? 'N/A';
          final classKey =
              '$gradeLevel-$section-$shift-${schedule['_id'] ?? ''}';

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

  // Sort schedules by day of week
  List<dynamic> _sortSchedulesByDay(List<dynamic> schedules) {
    return List.from(schedules)..sort((a, b) {
      final dayA = a['day'] ?? '';
      final dayB = b['day'] ?? '';
      final indexA = daysOfWeek.indexOf(dayA);
      final indexB = daysOfWeek.indexOf(dayB);
      return (indexA == -1 ? 999 : indexA).compareTo(
        indexB == -1 ? 999 : indexB,
      );
    });
  }

  // Get filtered schedules
  List<dynamic> _getFilteredSchedules() {
    return _schedules.where((schedule) {
      final day = schedule['day'] ?? '';
      final time = schedule['timeSlot'] ?? '';
      final shift = schedule['shift'] ?? '';

      if (_selectedDay != null && day != _selectedDay) return false;
      if (_selectedTime != null && time != _selectedTime) return false;
      if (_selectedShift != null && shift != _selectedShift) return false;

      return true;
    }).toList();
  }

  // Get unique days in order
  List<String> _getUniqueDays() {
    final days = <String>{};
    for (var schedule in _schedules) {
      final day = schedule['day'] ?? '';
      if (day.isNotEmpty) days.add(day);
    }
    return daysOfWeek.where((d) => days.contains(d)).toList();
  }

  // Get unique times
  List<String> _getUniqueTimes() {
    final times = <String>{};
    for (var schedule in _schedules) {
      final time = schedule['timeSlot'] ?? '';
      if (time.isNotEmpty) times.add(time);
    }
    return times.toList()..sort();
  }

  // Get unique shifts
  List<String> _getUniqueShifts() {
    final shifts = <String>{};
    for (var schedule in _schedules) {
      final shift = schedule['shift'] ?? '';
      if (shift.isNotEmpty) shifts.add(shift);
    }
    return shifts.toList();
  }

  Widget _buildFilterSection() {
    final uniqueDays = _getUniqueDays();
    final uniqueTimes = _getUniqueTimes();
    final uniqueShifts = _getUniqueShifts();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Filter Title
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'Filters',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: Colors.black87,
              ),
            ),
            // Clear Filters Button
            if (_selectedDay != null ||
                _selectedTime != null ||
                _selectedShift != null)
              InkWell(
                onTap: () {
                  setState(() {
                    _selectedDay = null;
                    _selectedTime = null;
                    _selectedShift = null;
                  });
                },
                child: Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 4,
                  ),
                  child: Row(
                    children: [
                      Icon(Icons.clear, size: 16, color: Colors.red[600]),
                      const SizedBox(width: 4),
                      Text(
                        'Clear',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: Colors.red[600],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
          ],
        ),
        const SizedBox(height: 12),

        // Day Filter
        Text(
          'By Day',
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: Colors.grey[700],
          ),
        ),
        const SizedBox(height: 8),
        SizedBox(
          height: 40,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            itemCount: uniqueDays.length,
            itemBuilder: (context, index) {
              final day = uniqueDays[index];
              final isSelected = _selectedDay == day;

              return Padding(
                padding: const EdgeInsets.only(right: 8),
                child: FilterChip(
                  label: Text(
                    day.substring(0, 3),
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: isSelected
                          ? Colors.white
                          : const Color(0xFF10B981),
                    ),
                  ),
                  selected: isSelected,
                  onSelected: (selected) {
                    setState(() {
                      _selectedDay = selected ? day : null;
                    });
                  },
                  backgroundColor: Colors.grey[100],
                  selectedColor: const Color(0xFF10B981),
                  side: BorderSide(
                    color: isSelected
                        ? const Color(0xFF10B981)
                        : Colors.grey[300]!,
                    width: 1.5,
                  ),
                ),
              );
            },
          ),
        ),
        const SizedBox(height: 16),

        // Time Filter
        Text(
          'By Time Slot',
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: Colors.grey[700],
          ),
        ),
        const SizedBox(height: 8),
        SizedBox(
          height: 40,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            itemCount: uniqueTimes.length,
            itemBuilder: (context, index) {
              final time = uniqueTimes[index];
              final isSelected = _selectedTime == time;

              return Padding(
                padding: const EdgeInsets.only(right: 8),
                child: FilterChip(
                  label: Text(
                    time,
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: isSelected
                          ? Colors.white
                          : const Color(0xFF3B82F6),
                    ),
                  ),
                  selected: isSelected,
                  onSelected: (selected) {
                    setState(() {
                      _selectedTime = selected ? time : null;
                    });
                  },
                  backgroundColor: Colors.grey[100],
                  selectedColor: const Color(0xFF3B82F6),
                  side: BorderSide(
                    color: isSelected
                        ? const Color(0xFF3B82F6)
                        : Colors.grey[300]!,
                    width: 1.5,
                  ),
                ),
              );
            },
          ),
        ),
        const SizedBox(height: 16),

        // Shift Filter
        Text(
          'By Shift',
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: Colors.grey[700],
          ),
        ),
        const SizedBox(height: 8),
        SizedBox(
          height: 40,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            itemCount: uniqueShifts.length,
            itemBuilder: (context, index) {
              final shift = uniqueShifts[index];
              final isSelected = _selectedShift == shift;
              final shiftColor = shiftColors[shift] ?? const Color(0xFF10B981);

              return Padding(
                padding: const EdgeInsets.only(right: 8),
                child: FilterChip(
                  label: Text(
                    shift,
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: isSelected ? Colors.white : shiftColor,
                    ),
                  ),
                  selected: isSelected,
                  onSelected: (selected) {
                    setState(() {
                      _selectedShift = selected ? shift : null;
                    });
                  },
                  backgroundColor: Colors.grey[100],
                  selectedColor: shiftColor,
                  side: BorderSide(
                    color: isSelected ? shiftColor : Colors.grey[300]!,
                    width: 1.5,
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey[50],
      appBar: AppBar(
        flexibleSpace: Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              colors: [Color(0xFF10B981), Color(0xFF059669)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
          ),
        ),
        elevation: 8,
        shadowColor: Colors.black26,
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
                valueColor: AlwaysStoppedAnimation<Color>(Colors.green[600]!),
              ),
            )
          : _error != null
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.error_outline, size: 64, color: Colors.red[400]),
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
                  Icon(Icons.schedule, size: 64, color: Colors.grey[400]),
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
                      // Filter Section
                      _buildFilterSection(),
                      const SizedBox(height: 24),

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

                      // Display filtered count
                      if (_getFilteredSchedules().isNotEmpty)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: Text(
                            'Showing ${_getFilteredSchedules().length} of ${_schedules.length} schedules',
                            style: TextStyle(
                              fontSize: 12,
                              color: Colors.grey[600],
                              fontStyle: FontStyle.italic,
                            ),
                          ),
                        ),

                      if (_getFilteredSchedules().isEmpty)
                        Center(
                          child: Padding(
                            padding: const EdgeInsets.symmetric(vertical: 32),
                            child: Column(
                              children: [
                                Icon(
                                  Icons.filter_alt_off_outlined,
                                  size: 48,
                                  color: Colors.grey[300],
                                ),
                                const SizedBox(height: 12),
                                Text(
                                  'No schedules match your filters',
                                  style: TextStyle(
                                    fontSize: 14,
                                    color: Colors.grey[600],
                                  ),
                                ),
                                const SizedBox(height: 16),
                                ElevatedButton.icon(
                                  onPressed: () {
                                    setState(() {
                                      _selectedDay = null;
                                      _selectedTime = null;
                                    });
                                  },
                                  icon: const Icon(Icons.clear),
                                  label: const Text('Clear Filters'),
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: const Color(0xFF10B981),
                                    foregroundColor: Colors.white,
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
                          itemCount: _getFilteredSchedules().length,
                          itemBuilder: (context, index) {
                            final schedule = _getFilteredSchedules()[index];
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

    // Get color based on shift
    final shiftColor = shiftColors[shift] ?? const Color(0xFF10B981);

    return GestureDetector(
      onTap: () {
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
      },
      child: Card(
        elevation: 3,
        margin: const EdgeInsets.only(bottom: 16),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        shadowColor: Colors.black12,
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border(left: BorderSide(color: shiftColor, width: 6)),
          ),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Schedule Header with Subject
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: shiftColor.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Icon(Icons.schedule, color: shiftColor, size: 28),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            subject,
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
                              fontSize: 13,
                              color: Colors.grey[600],
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),

                // Schedule Details as Chips/Badges
                Wrap(
                  spacing: 10,
                  runSpacing: 10,
                  children: [
                    _buildChip(
                      Icons.access_time,
                      timeSlot,
                      Colors.blue[50]!,
                      Colors.blue[700]!,
                    ),
                    _buildChip(
                      Icons.calendar_today,
                      day,
                      Colors.purple[50]!,
                      Colors.purple[700]!,
                    ),
                    _buildChip(
                      Icons.layers,
                      shift,
                      shiftColor.withOpacity(0.1),
                      shiftColor,
                    ),
                  ],
                ),

                const SizedBox(height: 20),
                const Divider(height: 2),
                const SizedBox(height: 16),

                // Students List Header
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Students Enrolled',
                      style: const TextStyle(
                        fontSize: 16,
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
                        '${students.length} students',
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

                // Quick Action Buttons
                if (students.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 16),
                    child: Row(
                      children: [
                        Expanded(
                          child: _buildActionButton(
                            'Take Attendance',
                            Icons.check_circle_outline,
                            Colors.green,
                            () => StudentStatusModal.showStatusEditModal(
                              context,
                              students: students,
                              token: widget.token,
                              scheduleId: schedule['_id'] ?? '',
                              scheduleTitle:
                                  '${schedule['subject']} - ${schedule['day']} ${schedule['timeSlot']}',
                              onStatusUpdated: () {
                                // Refresh data after status update
                                _loadScheduleData();
                              },
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: _buildActionButton(
                            'View Details',
                            Icons.info_outline,
                            Colors.blue,
                            () {},
                          ),
                        ),
                      ],
                    ),
                  ),

                // Students List
                if (students.isEmpty)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 24),
                    child: Center(
                      child: Column(
                        children: [
                          Icon(
                            Icons.people_outline,
                            size: 48,
                            color: Colors.grey[300],
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'No students in this class',
                            style: TextStyle(
                              fontSize: 14,
                              color: Colors.grey[500],
                              fontStyle: FontStyle.italic,
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
                    itemCount: students.length,
                    itemBuilder: (context, index) {
                      final student = students[index];
                      return _buildStudentTile(student, shiftColor, index);
                    },
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildChip(
    IconData icon,
    String label,
    Color backgroundColor,
    Color textColor,
  ) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: textColor.withOpacity(0.3), width: 1),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 16, color: textColor),
          const SizedBox(width: 6),
          Text(
            label,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: textColor,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActionButton(
    String label,
    IconData icon,
    Color color,
    VoidCallback onPressed,
  ) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onPressed,
        borderRadius: BorderRadius.circular(10),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: color.withOpacity(0.1),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: color.withOpacity(0.3), width: 1.5),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 18, color: color),
              const SizedBox(width: 6),
              Text(
                label,
                style: TextStyle(
                  fontSize: 12,
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

  Widget _buildStudentTile(dynamic student, Color shiftColor, int index) {
    final studentName =
        student['studentName'] ??
        student['name'] ??
        student['fullName'] ??
        'Unknown';
    final studentId = student['studentId'] ?? student['id'] ?? 'N/A';
    final section = student['section'] ?? 'N/A';

    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(12),
          onTap: () {},
          child: Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.grey[200]!, width: 1.5),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.05),
                  blurRadius: 4,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Row(
              children: [
                // Avatar with gradient
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: LinearGradient(
                      colors: [shiftColor, shiftColor.withOpacity(0.7)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: shiftColor.withOpacity(0.3),
                        blurRadius: 8,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: Center(
                    child: Text(
                      studentName.isNotEmpty
                          ? studentName[0].toUpperCase()
                          : '?',
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                // Student Info
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
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          Icon(
                            Icons.badge_outlined,
                            size: 12,
                            color: Colors.grey[400],
                          ),
                          const SizedBox(width: 4),
                          Expanded(
                            child: Text(
                              'ID: $studentId',
                              style: TextStyle(
                                fontSize: 11,
                                color: Colors.grey[500],
                                fontWeight: FontWeight.w500,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          const SizedBox(width: 4),
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
                              section,
                              style: TextStyle(
                                fontSize: 10,
                                color: Colors.grey[700],
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                // Arrow/Action Icon
                Icon(
                  Icons.arrow_forward_ios,
                  size: 16,
                  color: Colors.grey[400],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
