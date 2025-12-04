import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'dart:async';
import 'package:intl/intl.dart';

class Notification {
  final String studentId;
  final String studentName;
  final String subject;
  final DateTime scanTime;
  final String status;
  final String gradeLevel;
  final String section;

  Notification({
    required this.studentId,
    required this.studentName,
    required this.subject,
    required this.scanTime,
    required this.status,
    required this.gradeLevel,
    required this.section,
  });

  factory Notification.fromJson(Map<String, dynamic> json) {
    return Notification(
      studentId: json['studentId'] ?? 'N/A',
      studentName: json['studentName'] ?? 'Unknown',
      subject: json['subject'] ?? 'General',
      scanTime: DateTime.parse(
        json['scanTime'] ?? DateTime.now().toIso8601String(),
      ),
      status: json['status'] ?? 'Present',
      gradeLevel: json['gradeLevel'] ?? 'N/A',
      section: json['section'] ?? 'N/A',
    );
  }
}

class NotificationsPage extends StatefulWidget {
  final String token;
  final String parentEmail;
  final List<dynamic> children;

  const NotificationsPage({
    super.key,
    required this.token,
    required this.parentEmail,
    required this.children,
  });

  @override
  State<NotificationsPage> createState() => _NotificationsPageState();
}

class _NotificationsPageState extends State<NotificationsPage> {
  late Timer _pollTimer;
  List<Notification> notifications = [];
  bool isLoading = true;
  String? errorMessage;
  final String baseUrl = 'http://localhost:4000/api';
  // For Android emulator: 'http://10.0.2.2:4000/api'

  // List of student IDs to monitor
  late List<String> studentIds;

  @override
  void initState() {
    super.initState();
    // Extract student IDs from children list
    studentIds = widget.children
        .map((child) => child['studentId']?.toString() ?? '')
        .where((id) => id.isNotEmpty)
        .toList();

    print('Monitoring students: $studentIds');

    // Load initial notifications
    _loadNotifications();

    // Set up polling for new notifications every 5 seconds
    _pollTimer = Timer.periodic(const Duration(seconds: 5), (_) {
      _loadNotifications();
    });
  }

  @override
  void dispose() {
    _pollTimer.cancel();
    super.dispose();
  }

  Future<void> _loadNotifications() async {
    try {
      List<Notification> allNotifications = [];

      // Fetch notifications for each student child
      for (String studentId in studentIds) {
        try {
          final response = await http
              .get(
                Uri.parse('$baseUrl/history/student/$studentId'),
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': 'Bearer ${widget.token}',
                },
              )
              .timeout(const Duration(seconds: 10));

          if (response.statusCode == 200) {
            final jsonResponse = jsonDecode(response.body);

            // Handle both list and object responses
            final data = jsonResponse is List
                ? jsonResponse
                : (jsonResponse['records'] ?? jsonResponse['data'] ?? []);

            if (data is List) {
              for (var record in data) {
                allNotifications.add(Notification.fromJson(record));
              }
            }
          } else {
            print(
              'Error fetching notifications for student $studentId: ${response.statusCode}',
            );
          }
        } catch (e) {
          print('Error fetching notifications for student $studentId: $e');
        }
      }

      // Sort by most recent first
      allNotifications.sort((a, b) => b.scanTime.compareTo(a.scanTime));

      if (mounted) {
        setState(() {
          notifications = allNotifications;
          isLoading = false;
          errorMessage = null;
        });
      }
    } catch (e) {
      print('Error loading notifications: $e');
      if (mounted) {
        setState(() {
          isLoading = false;
          errorMessage = 'Failed to load notifications: $e';
        });
      }
    }
  }

  Color _getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'present':
        return Colors.green;
      case 'late':
        return Colors.orange;
      case 'absent':
        return Colors.red;
      case 'cutting':
        return Colors.redAccent;
      default:
        return Colors.grey;
    }
  }

  IconData _getStatusIcon(String status) {
    switch (status.toLowerCase()) {
      case 'present':
        return Icons.check_circle;
      case 'late':
        return Icons.schedule;
      case 'absent':
        return Icons.cancel;
      case 'cutting':
        return Icons.warning;
      default:
        return Icons.help;
    }
  }

  String _formatTime(DateTime dateTime) {
    return DateFormat('hh:mm a').format(dateTime);
  }

  String _formatDate(DateTime dateTime) {
    return DateFormat('MMM d, y').format(dateTime);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey[100],
      appBar: AppBar(
        backgroundColor: Colors.purple,
        elevation: 0,
        title: const Text(
          'Student Check-ins',
          style: TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.bold,
            color: Colors.white,
          ),
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: Colors.white),
            onPressed: _loadNotifications,
            tooltip: 'Refresh',
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _loadNotifications,
        child: SafeArea(
          child: isLoading
              ? const Center(
                  child: CircularProgressIndicator(
                    valueColor: AlwaysStoppedAnimation<Color>(Colors.purple),
                  ),
                )
              : errorMessage != null
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.error_outline,
                        size: 64,
                        color: Colors.red[300],
                      ),
                      const SizedBox(height: 16),
                      Text(
                        errorMessage!,
                        textAlign: TextAlign.center,
                        style: const TextStyle(fontSize: 16, color: Colors.red),
                      ),
                      const SizedBox(height: 24),
                      ElevatedButton(
                        onPressed: _loadNotifications,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.purple,
                        ),
                        child: const Text('Retry'),
                      ),
                    ],
                  ),
                )
              : notifications.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.notifications_none,
                        size: 64,
                        color: Colors.grey[400],
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'No check-ins yet',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: Colors.grey[600],
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Notifications will appear here when students scan their QR codes',
                        textAlign: TextAlign.center,
                        style: TextStyle(fontSize: 14, color: Colors.grey[500]),
                      ),
                    ],
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: notifications.length,
                  itemBuilder: (context, index) {
                    final notification = notifications[index];
                    return _buildNotificationCard(notification);
                  },
                ),
        ),
      ),
    );
  }

  Widget _buildNotificationCard(Notification notification) {
    final statusColor = _getStatusColor(notification.status);
    final statusIcon = _getStatusIcon(notification.status);

    return Card(
      elevation: 2,
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: statusColor.withOpacity(0.3), width: 1),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header with student name and status
            Row(
              children: [
                Container(
                  width: 50,
                  height: 50,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: statusColor.withOpacity(0.1),
                  ),
                  child: Center(
                    child: Icon(statusIcon, color: statusColor, size: 28),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        notification.studentName,
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: Colors.black87,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'ID: ${notification.studentId}',
                        style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 6,
                  ),
                  decoration: BoxDecoration(
                    color: statusColor.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: statusColor.withOpacity(0.3)),
                  ),
                  child: Text(
                    notification.status,
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: statusColor,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Divider(color: Colors.grey[300], height: 1),
            const SizedBox(height: 12),

            // Details grid
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Grade Level',
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.grey[600],
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        notification.gradeLevel,
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                          color: Colors.black87,
                        ),
                      ),
                    ],
                  ),
                ),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Section',
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.grey[600],
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        notification.section,
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                          color: Colors.black87,
                        ),
                      ),
                    ],
                  ),
                ),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Subject',
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.grey[600],
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        notification.subject,
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                          color: Colors.black87,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Time information
            Row(
              children: [
                Icon(Icons.access_time, size: 16, color: Colors.grey[500]),
                const SizedBox(width: 8),
                Text(
                  _formatTime(notification.scanTime),
                  style: TextStyle(
                    fontSize: 13,
                    color: Colors.grey[600],
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(width: 16),
                Icon(Icons.calendar_today, size: 16, color: Colors.grey[500]),
                const SizedBox(width: 8),
                Text(
                  _formatDate(notification.scanTime),
                  style: TextStyle(fontSize: 13, color: Colors.grey[600]),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
