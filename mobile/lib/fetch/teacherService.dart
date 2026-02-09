import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:flutter/foundation.dart' show debugPrint;
import '../config/environment.dart';

class TeacherService {
  // Use environment configuration
  static String get baseUrl {
    return '${Environment.baseUrl}/api';
  }

  /// Get teacher profile information
  static Future<Map<String, dynamic>> getTeacherProfile(
    String teacherId,
    String token,
  ) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/teachers/$teacherId'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['teacher'] ?? data;
      } else {
        final error = jsonDecode(response.body);
        throw Exception(error['error'] ?? 'Failed to fetch teacher profile');
      }
    } catch (e) {
      throw Exception('Error fetching teacher profile: $e');
    }
  }

  /// Get attendance records for teacher's classes
  static Future<Map<String, dynamic>> getAttendanceRecords({
    required String token,
    String? gradeLevel,
    String? section,
    String? subject,
    String? status,
    int page = 1,
    int limit = 50,
  }) async {
    try {
      final queryParams = <String, String>{
        'page': page.toString(),
        'limit': limit.toString(),
      };

      if (gradeLevel != null) queryParams['gradeLevel'] = gradeLevel;
      if (section != null) queryParams['section'] = section;
      if (subject != null) queryParams['subject'] = subject;
      if (status != null) queryParams['status'] = status;

      final uri = Uri.parse(
        '$baseUrl/history',
      ).replace(queryParameters: queryParams);

      final response = await http.get(
        uri,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;
        return {
          'records': data['records'] ?? <dynamic>[],
          'pagination': data['pagination'] ?? <String, dynamic>{},
        };
      } else if (response.statusCode == 401) {
        throw Exception('Unauthorized - Invalid or expired token');
      } else {
        final error = jsonDecode(response.body);
        throw Exception(error['error'] ?? 'Failed to fetch attendance records');
      }
    } catch (e) {
      debugPrint('TeacherService Error fetching attendance records: $e');
      // Return empty records on error instead of throwing
      return {'records': [], 'pagination': {}};
    }
  }

  /// Get students in a specific class (filtered by teacher's schedule)
  static Future<List<dynamic>> getClassStudents({
    required String gradeLevel,
    required String section,
    required String teacherName,
    required String token,
    String? subject,
    String? shift,
  }) async {
    try {
      final queryParams = {
        'gradeLevel': gradeLevel,
        'section': section,
        'teacherName': teacherName,
        if (subject != null) 'subject': subject,
        if (shift != null) 'shift': shift,
      };

      // Use the new teacher schedule endpoint
      final uri = Uri.parse(
        '$baseUrl/students/teacher/schedule',
      ).replace(queryParameters: queryParams);

      final response = await http.get(
        uri,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data is List ? data : [data];
      } else if (response.statusCode == 400) {
        // If parameters are invalid, return empty list
        debugPrint('Invalid parameters for class students');
        return [];
      } else {
        final error = jsonDecode(response.body);
        throw Exception(error['error'] ?? 'Failed to fetch students');
      }
    } catch (e) {
      debugPrint('Error fetching students for teacher schedule: $e');
      throw Exception('Error fetching students: $e');
    }
  }

  /// Get attendance statistics
  static Future<Map<String, dynamic>> getAttendanceStats({
    required String token,
    String? gradeLevel,
    String? section,
    String? startDate,
    String? endDate,
  }) async {
    try {
      final queryParams = <String, String>{};

      if (gradeLevel != null) queryParams['gradeLevel'] = gradeLevel;
      if (section != null) queryParams['section'] = section;
      if (startDate != null) queryParams['startDate'] = startDate;
      if (endDate != null) queryParams['endDate'] = endDate;

      final uri = Uri.parse(
        '$baseUrl/history/stats',
      ).replace(queryParameters: queryParams);

      final response = await http.get(
        uri,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;
        // Handle different response formats from backend
        if (data['stats'] != null) {
          return data['stats'] as Map<String, dynamic>;
        } else if (data.containsKey('present')) {
          return data;
        } else {
          // Default stats format if not found
          return {
            'present': 0,
            'absent': 0,
            'late': 0,
            'cutting': 0,
            'total': 0,
          };
        }
      } else {
        final error = jsonDecode(response.body);
        throw Exception(error['error'] ?? 'Failed to fetch statistics');
      }
    } catch (e) {
      debugPrint('TeacherService Error fetching statistics: $e');
      // Return default stats on error instead of throwing
      return {'present': 0, 'absent': 0, 'late': 0, 'cutting': 0, 'total': 0};
    }
  }

  /// Update attendance record
  static Future<Map<String, dynamic>> updateAttendanceRecord({
    required String recordId,
    required String status,
    required String token,
    String? notes,
    String? reason,
  }) async {
    try {
      final body = {
        'status': status,
        if (notes != null) 'notes': notes,
        if (reason != null) 'reason': reason,
      };

      final response = await http.patch(
        Uri.parse('$baseUrl/history/$recordId'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode(body),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['record'] ?? data;
      } else {
        final error = jsonDecode(response.body);
        throw Exception(error['error'] ?? 'Failed to update attendance');
      }
    } catch (e) {
      throw Exception('Error updating attendance: $e');
    }
  }

  /// Get teacher schedule (only for the logged-in teacher)
  static Future<List<dynamic>> getTeacherSchedule({
    required String token,
    String? teacherId,
    String? teacherName,
    String? day,
  }) async {
    try {
      final queryParams = <String, String>{};
      if (teacherId != null) queryParams['teacherId'] = teacherId;
      if (teacherName != null) queryParams['teacher'] = teacherName;
      if (day != null) queryParams['day'] = day;

      final uri = Uri.parse(
        '$baseUrl/schedules',
      ).replace(queryParameters: queryParams);

      debugPrint('🔄 Fetching schedules from: $uri');
      debugPrint('📋 Query params: $queryParams');

      final response = await http
          .get(
            uri,
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer $token',
            },
          )
          .timeout(
            const Duration(seconds: 10),
            onTimeout: () => throw Exception(
              'Request timeout - Schedule server not responding',
            ),
          );

      debugPrint('📊 Response status: ${response.statusCode}');
      debugPrint('📊 Response body: ${response.body}');

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final schedules = data['schedules'] ?? data;
        final result = schedules is List ? schedules : [schedules];
        debugPrint(
          '✅ Schedules fetched successfully: ${result.length} schedules',
        );
        return result;
      } else if (response.statusCode == 401) {
        throw Exception('Unauthorized - Invalid or expired token');
      } else {
        try {
          final error = jsonDecode(response.body);
          throw Exception(
            error['error'] ??
                'Failed to fetch schedule (Status: ${response.statusCode})',
          );
        } catch (e) {
          throw Exception(
            'Failed to fetch schedule (Status: ${response.statusCode}): ${response.body}',
          );
        }
      }
    } catch (e) {
      debugPrint('❌ TeacherService Error fetching schedule: $e');
      rethrow; // Rethrow to let caller handle
    }
  }

  /// Get attendance records for a specific schedule
  static Future<List<dynamic>> getScheduleAttendanceRecords({
    required String token,
    required String scheduleId,
    required String date,
  }) async {
    try {
      final queryParams = <String, String>{
        'scheduleId': scheduleId,
        'date': date,
      };

      final uri = Uri.parse(
        '$baseUrl/schedules/$scheduleId/attendance',
      ).replace(queryParameters: queryParams);

      final response = await http.get(
        uri,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final records = data['records'] ?? data['attendance'] ?? data;
        return records is List ? records : [records];
      } else if (response.statusCode == 404) {
        // No records found for this schedule on this date
        return [];
      } else {
        final error = jsonDecode(response.body);
        throw Exception(
          error['error'] ?? 'Failed to fetch schedule attendance records',
        );
      }
    } catch (e) {
      debugPrint(
        'TeacherService Error fetching schedule attendance records: $e',
      );
      // Return empty list on error
      return [];
    }
  }

  /// Update student attendance status for a specific schedule
  /// This allows teachers to override QR scan status for their subject/class
  static Future<Map<String, dynamic>> updateStudentAttendance({
    required String token,
    required String studentId,
    required String scheduleId,
    required String status,
    String? subject,
    String? gradeLevel,
    String? section,
  }) async {
    try {
      final body = {
        'studentId': studentId,
        'scheduleId': scheduleId,
        'status': status,
        'timestamp': DateTime.now().toIso8601String(),
        if (subject != null) 'subject': subject,
        if (gradeLevel != null) 'gradeLevel': gradeLevel,
        if (section != null) 'section': section,
      };

      final response = await http.patch(
        Uri.parse('$baseUrl/schedules/$scheduleId/student-attendance'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode(body),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['result'] ?? data;
      } else {
        final error = jsonDecode(response.body);
        throw Exception(error['error'] ?? 'Failed to update attendance status');
      }
    } catch (e) {
      throw Exception('Error updating student attendance: $e');
    }
  }
}
