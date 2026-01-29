import 'package:flutter/material.dart';
import 'package:mobile/fetch/teacherService.dart';
import 'components/schedule_details.dart';
import 'components/background_logo.dart';
import 'package:mobile/theme.dart';

// Color scheme for different shifts (aligned with app theme)
const Map<String, Color> shiftColors = {
  'Morning': kPrimary,
  'Afternoon': kAccent,
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
  bool _contentEntered = false;
  int _visibleScheduleCount = 0;

  // Filter states
  String? _selectedDay;
  String? _selectedTime;
  String? _selectedShift;
  String? _selectedSubject;

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

  void _runStaggerIfNeeded() {
    if (!mounted) return;
    final filtered = _getFilteredSchedules();
    final len = filtered.length;
    if (len == 0) return;
    if (_visibleScheduleCount >= len) return;
    if (!_contentEntered) setState(() => _contentEntered = true);
    Future.doWhile(() async {
      await Future.delayed(kAnimationStaggerStep);
      if (!mounted) return false;
      setState(() {
        if (_visibleScheduleCount < len) _visibleScheduleCount++;
      });
      return _visibleScheduleCount < len;
    });
  }

  Future<void> _loadScheduleData() async {
    try {
      setState(() => _isLoading = true);

      debugPrint('\n========== LOADING SCHEDULE ==========');
      debugPrint('Teacher ID: ${widget.teacherId}');
      debugPrint('Teacher Name: ${widget.teacherName}');
      debugPrint('Token: ${widget.token.substring(0, 20)}...');

      // Fetch ONLY this teacher's schedules by name
      final schedules = await TeacherService.getTeacherSchedule(
        token: widget.token,
        teacherId: widget.teacherId,
        teacherName: widget.teacherName,
      );

      debugPrint('✅ Schedules loaded: ${schedules.length} schedules');

      if (mounted) {
        final wasRetry = _error != null;
        setState(() {
          _schedules = _sortSchedulesByDay(schedules);
          _error = null;
          _isLoading = false;
        });
        if (wasRetry) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: const Text('Schedule refreshed successfully'),
              backgroundColor: kPrimary,
              behavior: SnackBarBehavior.floating,
            ),
          );
        }
      }

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
      debugPrint('❌ Error loading schedule: $e');
      if (mounted) {
        setState(() {
          _error = e.toString().replaceAll('Exception: ', '');
          _isLoading = false;
        });
        final msg = e.toString().length > 50
            ? '${e.toString().substring(0, 50)}…'
            : e.toString();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Refresh failed: $msg'),
            backgroundColor: Colors.red[700],
            behavior: SnackBarBehavior.floating,
            action: SnackBarAction(
              label: 'Retry',
              textColor: Colors.white,
              onPressed: () => _loadScheduleData(),
            ),
          ),
        );
      }
    }
  }

  // Sort schedules by day of week
  List<dynamic> _sortSchedulesByDay(List<dynamic> schedules) {
    int getEarliestIndex(dynamic s) {
      final raw = s['days'];
      if (raw is List && raw.isNotEmpty) {
        final indices = raw
            .map((d) => daysOfWeek.indexOf(d))
            .where((i) => i >= 0)
            .toList();
        if (indices.isNotEmpty) return indices.reduce((a, b) => a < b ? a : b);
      }
      final day = s['day'] ?? '';
      final idx = daysOfWeek.indexOf(day);
      return idx >= 0 ? idx : 999;
    }

    return List.from(schedules)..sort((a, b) {
      return getEarliestIndex(a).compareTo(getEarliestIndex(b));
    });
  }

  // Get filtered schedules
  List<dynamic> _getFilteredSchedules() {
    bool scheduleHasDay(dynamic schedule, String? dayName) {
      if (dayName == null) return true;
      final raw = schedule['days'];
      if (raw is List && raw.isNotEmpty) {
        return raw.contains(dayName);
      }
      final day = schedule['day'];
      return day == dayName;
    }

    return _schedules.where((schedule) {
      final time = schedule['timeSlot'] ?? '';
      final shift = schedule['shift'] ?? '';
      final subject = schedule['subject'] ?? '';

      if (!scheduleHasDay(schedule, _selectedDay)) return false;
      if (_selectedTime != null && time != _selectedTime) return false;
      if (_selectedShift != null && shift != _selectedShift) return false;
      if (_selectedSubject != null && subject != _selectedSubject) return false;

      return true;
    }).toList();
  }

  // Get unique days in order
  List<String> _getUniqueDays() {
    final found = <String>{};
    for (var schedule in _schedules) {
      final raw = schedule['days'];
      if (raw is List && raw.isNotEmpty) {
        for (var d in raw) {
          if (d is String && d.isNotEmpty) found.add(d);
        }
      } else {
        final day = schedule['day'] ?? '';
        if (day is String && day.isNotEmpty) found.add(day);
      }
    }
    return daysOfWeek.where((d) => found.contains(d)).toList();
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

  // Get unique subjects
  List<String> _getUniqueSubjects() {
    final subjects = <String>{};
    for (var schedule in _schedules) {
      final subject = schedule['subject'] ?? '';
      if (subject.isNotEmpty) subjects.add(subject);
    }
    return subjects.toList()..sort();
  }

  Widget _buildFilterSection() {
    final uniqueDays = _getUniqueDays();
    final uniqueTimes = _getUniqueTimes();
    final uniqueShifts = _getUniqueShifts();
    final uniqueSubjects = _getUniqueSubjects();

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey[300]!, width: 1),
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
          // Filter Title and Clear Button
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Icon(Icons.filter_list, size: 18, color: Colors.grey[700]),
                  const SizedBox(width: 6),
                  const Text(
                    'Filters',
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.bold,
                      color: Colors.black87,
                    ),
                  ),
                ],
              ),
              // Clear Filters Button
              if (_selectedDay != null ||
                  _selectedTime != null ||
                  _selectedShift != null ||
                  _selectedSubject != null)
                Material(
                  color: Colors.transparent,
                  child: InkWell(
                    onTap: () {
                      setState(() {
                        _selectedDay = null;
                        _selectedTime = null;
                        _selectedShift = null;
                        _selectedSubject = null;
                      });
                    },
                    borderRadius: BorderRadius.circular(6),
                    splashColor: Colors.red.withValues(alpha: 0.2),
                    highlightColor: Colors.red.withValues(alpha: 0.1),
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.red[50],
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(color: Colors.red[200]!, width: 1),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.clear, size: 14, color: Colors.red[700]),
                          const SizedBox(width: 4),
                          Text(
                            'Clear',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                              color: Colors.red[700],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 12),
          const Divider(height: 1),
          const SizedBox(height: 12),

          // Subject Filter (First - Most Important)
          _buildFilterRow(
            label: 'Subject',
            icon: Icons.book,
            iconColor: Colors.purple,
            items: uniqueSubjects,
            selectedItem: _selectedSubject,
            onSelected: (selected, item) {
              setState(() {
                _selectedSubject = selected ? item : null;
              });
            },
            getLabel: (item) => item,
            getColor: (item) => Colors.purple,
          ),
          const SizedBox(height: 12),

          // Day Filter
          _buildFilterRow(
            label: 'Day',
            icon: Icons.calendar_today,
            iconColor: kPrimary,
            items: uniqueDays,
            selectedItem: _selectedDay,
            onSelected: (selected, item) {
              setState(() {
                _selectedDay = selected ? item : null;
              });
            },
            getLabel: (item) => item.substring(0, 3),
            getColor: (item) => kPrimary,
          ),
          const SizedBox(height: 12),

          // Time Filter
          _buildFilterRow(
            label: 'Time',
            icon: Icons.access_time,
            iconColor: const Color(0xFF3B82F6),
            items: uniqueTimes,
            selectedItem: _selectedTime,
            onSelected: (selected, item) {
              setState(() {
                _selectedTime = selected ? item : null;
              });
            },
            getLabel: (item) => item,
            getColor: (item) => const Color(0xFF3B82F6),
          ),
          const SizedBox(height: 12),

          // Shift Filter
          _buildFilterRow(
            label: 'Shift',
            icon: Icons.layers,
            iconColor: Colors.orange,
            items: uniqueShifts,
            selectedItem: _selectedShift,
            onSelected: (selected, item) {
              setState(() {
                _selectedShift = selected ? item : null;
              });
            },
            getLabel: (item) => item,
            getColor: (item) => shiftColors[item] ?? kPrimary,
          ),
        ],
      ),
    );
  }

  Widget _buildFilterRow({
    required String label,
    required IconData icon,
    required Color iconColor,
    required List<String> items,
    required String? selectedItem,
    required Function(bool, String) onSelected,
    required String Function(String) getLabel,
    required Color Function(String) getColor,
  }) {
    if (items.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(icon, size: 14, color: iconColor),
            const SizedBox(width: 6),
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
        const SizedBox(height: 6),
        Wrap(
          spacing: 6,
          runSpacing: 6,
          children: items.map((item) {
            final isSelected = selectedItem == item;
            final itemColor = getColor(item);
            final itemLabel = getLabel(item);

            return FilterChip(
              label: Text(
                itemLabel,
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: isSelected ? Colors.white : itemColor,
                ),
              ),
              selected: isSelected,
              onSelected: (selected) => onSelected(selected, item),
              backgroundColor: Colors.grey[100],
              selectedColor: itemColor,
              side: BorderSide(
                color: isSelected ? itemColor : Colors.grey[300]!,
                width: 1.5,
              ),
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
            );
          }).toList(),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: kBackground,
      appBar: AppBar(
        flexibleSpace: Container(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [kPrimary, kPrimaryLight],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
          ),
        ),
        elevation: 4,
        shadowColor: kPrimary.withValues(alpha: 0.3),
        title: const Text(
          'My Schedule & Classes',
          style: TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.bold,
            color: Colors.white,
          ),
        ),
        bottom: _isLoading
            ? PreferredSize(
                preferredSize: const Size.fromHeight(4),
                child: LinearProgressIndicator(
                  backgroundColor: kPrimaryDark.withValues(alpha: 0.3),
                  valueColor: const AlwaysStoppedAnimation<Color>(
                    Colors.white70,
                  ),
                ),
              )
            : null,
      ),
      body: _isLoading
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
                      backgroundColor: kPrimary,
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
              child: Builder(
                builder: (context) {
                  WidgetsBinding.instance.addPostFrameCallback(
                    (_) => _runStaggerIfNeeded(),
                  );
                  return Stack(
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
                                  : const Offset(0, 0.05),
                              duration: kAnimationEnterDuration,
                              curve: kAnimationEnterCurve,
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
                                      padding: const EdgeInsets.only(
                                        bottom: 12,
                                      ),
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
                                        padding: const EdgeInsets.symmetric(
                                          vertical: 32,
                                        ),
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
                                                  _selectedShift = null;
                                                  _selectedSubject = null;
                                                });
                                              },
                                              icon: const Icon(Icons.clear),
                                              label: const Text(
                                                'Clear Filters',
                                              ),
                                              style: ElevatedButton.styleFrom(
                                                backgroundColor: kPrimary,
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
                                      physics:
                                          const NeverScrollableScrollPhysics(),
                                      itemCount: _getFilteredSchedules().length,
                                      itemBuilder: (context, index) {
                                        final schedule =
                                            _getFilteredSchedules()[index];
                                        final isVisible =
                                            index < _visibleScheduleCount;
                                        return AnimatedOpacity(
                                          opacity: isVisible ? 1.0 : 0.0,
                                          duration: kAnimationEnterDuration,
                                          curve: kAnimationEnterCurve,
                                          child: AnimatedSlide(
                                            offset: isVisible
                                                ? Offset.zero
                                                : const Offset(0, 0.04),
                                            duration: kAnimationEnterDuration,
                                            curve: kAnimationEnterCurve,
                                            child: _buildScheduleCard(schedule),
                                          ),
                                        );
                                      },
                                    ),
                                  const SizedBox(height: 40),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ),
                    ],
                  );
                },
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
    final shiftColor = shiftColors[shift] ?? kPrimary;

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
                        color: shiftColor.withValues(alpha: 0.1),
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
                      shiftColor.withValues(alpha: 0.1),
                      shiftColor,
                    ),
                  ],
                ),

                const SizedBox(height: 20),
                const Divider(height: 2),
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
        border: Border.all(color: textColor.withValues(alpha: 0.3), width: 1),
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

  // Student tile builder removed — student list is shown in ScheduleDetailsPage now.
}
