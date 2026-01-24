import 'dart:convert';
import 'package:http/http.dart' as http;

class StudentService {
  // Network configuration
  // static const List<String> possibleUrls = [
  //   'http://10.0.2.2:4000',  // Android Emulator
  //   'http://localhost:4000',  // iOS Simulator
  //   'http://192.168.1.52:4000',  // Physical device (replace with your IP)
  //   'http://192.168.0.100:4000',  // Alternative IP range
  // ];
  static const List<String> possibleUrls = [
    'http://10.0.2.2:4000', // Android Emulator
    'http://localhost:4000', // iOS Simulator
    'http://192.168.0.151:4000', // Physical device (replace with your IP)
    'http://192.168.0.100:4000', // Alternative IP range
  ];

  String? workingUrl;

  // Find working URL by testing all possibilities
  Future<String?> findWorkingUrl() async {
    print('=== TESTING NETWORK CONNECTIVITY ===');

    for (String url in possibleUrls) {
      try {
        print('Testing: $url');
        final response = await http
            .get(
              Uri.parse('$url/api/students'),
              headers: {'Content-Type': 'application/json'},
            )
            .timeout(const Duration(seconds: 3));

        if (response.statusCode == 200) {
          workingUrl = url;
          print('✅ Working URL found: $url');
          return url;
        }
      } catch (e) {
        print('❌ Failed: $url - $e');
      }
    }

    print('❌ No working URL found');
    return null;
  }

  // Function to create attendance record (In/Out)
  Future<Map<String, dynamic>> createAttendanceRecord(
    String studentId,
    String studentName, {
    String attendanceType = 'In',
    String subject = 'General',
    Map<String, dynamic>? qrCodeData,
  }) async {
    if (workingUrl == null) {
      workingUrl = await findWorkingUrl();
      if (workingUrl == null) {
        return {
          'success': false,
          'error':
              'No working server connection found. Please check your network settings.',
        };
      }
    }

    try {
      print('=== ATTENDANCE RECORD DEBUG ===');
      print('Student ID: $studentId');
      print('Student Name: $studentName');
      print('Attendance Type: $attendanceType');
      print('Subject: $subject');
      print('Working URL: $workingUrl');
      print('API URL: $workingUrl/api/history');
      print('Timestamp: ${DateTime.now()}');

      // Prepare device information
      final deviceInfo = {
        'platform': 'Flutter',
        'userAgent': 'Smartendance Scanner App',
        'timestamp': DateTime.now().toIso8601String(),
      };

      print('Making attendance record request...');
      final response = await http
          .post(
            Uri.parse('$workingUrl/api/history'),
            headers: {'Content-Type': 'application/json'},
            body: json.encode({
              'studentId': studentId,
              'studentName': studentName,
              'subject': subject,
              'status': attendanceType == 'In' ? 'Present' : 'Out',
              'attendanceType': attendanceType,
              'qrCodeData': qrCodeData ?? {'encodedText': studentId},
              'deviceInfo': deviceInfo,
            }),
          )
          .timeout(const Duration(seconds: 15));

      print('Response Status: ${response.statusCode}');
      print('Response Body: ${response.body}');

      if (response.statusCode == 201) {
        final data = json.decode(response.body);
        print('Response data: $data');

        if (data['success'] == true && data['record'] != null) {
          final record = data['record'];
          return {
            'success': true,
            'message': attendanceType == 'In'
                ? 'Check-in recorded at ${_formatTime(record['checkInTime'])}'
                : 'Check-out recorded at ${_formatTime(record['checkOutTime'])}. Duration: ${record['durationMinutes']} min',
            'record': record,
          };
        } else {
          return {
            'success': false,
            'error': data['message'] ?? 'Invalid response format',
          };
        }
      } else {
        try {
          final errorData = json.decode(response.body);
          return {
            'success': false,
            'error': errorData['error'] ?? 'Failed to create attendance record',
          };
        } catch (parseError) {
          return {
            'success': false,
            'error': 'Server error (${response.statusCode})',
          };
        }
      }
    } catch (e) {
      return {'success': false, 'error': 'Network error: ${e.toString()}'};
    }
  }

  // Function to fetch student information from API
  Future<Map<String, dynamic>> fetchStudentInfo(
    String qrData, {
    String subject = 'General',
    String? notes,
  }) async {
    if (workingUrl == null) {
      workingUrl = await findWorkingUrl();
      if (workingUrl == null) {
        return {
          'success': false,
          'error':
              'No working server connection found. Please check your network settings.',
          'student': null,
        };
      }
    }

    try {
      print('=== QR SCAN DEBUG ===');
      print('QR Data: $qrData');
      print('Subject: $subject');
      print('Notes: $notes');
      print('Working URL: $workingUrl');
      print('API URL: $workingUrl/api/students/scan-qr');
      print('Timestamp: ${DateTime.now()}');

      // Prepare device information
      final deviceInfo = {
        'platform': 'Flutter',
        'userAgent': 'Smartendance Mobile App',
        'timestamp': DateTime.now().toIso8601String(),
      };

      print('Making scan-qr request...');
      final response = await http
          .post(
            Uri.parse('$workingUrl/api/students/scan-qr'),
            headers: {'Content-Type': 'application/json'},
            body: json.encode({
              'qrData': qrData,
              'subject': subject,
              'notes': notes,
              'deviceInfo': deviceInfo,
            }),
          )
          .timeout(const Duration(seconds: 15));

      print('Response Status: ${response.statusCode}');
      print('Response Headers: ${response.headers}');
      print('Response Body: ${response.body}');

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        print('Response data: $data');

        if (data['success'] == true && data['student'] != null) {
          return {'success': true, 'student': data['student'], 'error': null};
        } else {
          return {
            'success': false,
            'error': data['message'] ?? 'Invalid response format',
            'student': null,
          };
        }
      } else {
        try {
          final errorData = json.decode(response.body);
          return {
            'success': false,
            'error':
                errorData['error'] ?? 'Failed to fetch student information',
            'student': null,
          };
        } catch (parseError) {
          return {
            'success': false,
            'error': 'Server error (${response.statusCode}): ${response.body}',
            'student': null,
          };
        }
      }
    } catch (e) {
      return {
        'success': false,
        'error': 'Network error: ${e.toString()}',
        'student': null,
      };
    }
  }

  // Helper function to extract Base64 data from data URL
  String extractBase64Data(String dataUrl) {
    if (dataUrl.contains(',')) {
      return dataUrl.split(',')[1];
    }
    return dataUrl;
  }

  // Helper function to format current date
  String formatCurrentDate() {
    final now = DateTime.now();
    final months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    final weekdays = [
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday',
    ];

    final weekday = weekdays[now.weekday - 1];
    final month = months[now.month - 1];
    final day = now.day;
    final year = now.year;

    return '$weekday, $month $day, $year';
  }

  // Helper function to format time
  String _formatTime(String? isoString) {
    if (isoString == null) return '--:--';
    try {
      final dateTime = DateTime.parse(isoString);
      final hour = dateTime.hour.toString().padLeft(2, '0');
      final minute = dateTime.minute.toString().padLeft(2, '0');
      return '$hour:$minute';
    } catch (e) {
      return '--:--';
    }
  }

  // Validate if student has an open check-in without checkout
  Future<Map<String, dynamic>> validateCheckIn(String qrData) async {
    if (workingUrl == null) {
      workingUrl = await findWorkingUrl();
      if (workingUrl == null) {
        return {
          'hasOpenCheckIn': false,
          'error': 'No working server connection',
        };
      }
    }

    try {
      print('🔍 Validating check-in for QR: $qrData');

      final response = await http
          .post(
            Uri.parse('$workingUrl/api/students/validate-checkin'),
            headers: {'Content-Type': 'application/json'},
            body: json.encode({'qrData': qrData}),
          )
          .timeout(const Duration(seconds: 10));

      print('Validation Response Status: ${response.statusCode}');
      print('Validation Response: ${response.body}');

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return {
          'hasOpenCheckIn': data['hasOpenCheckIn'] ?? false,
          'studentName': data['studentName'],
          'error': null,
        };
      } else {
        // If endpoint doesn't exist or errors, allow the check-in
        // (graceful fallback)
        return {'hasOpenCheckIn': false, 'error': null};
      }
    } catch (e) {
      print('❌ Validation error: $e');
      // On error, allow the check-in to proceed
      return {'hasOpenCheckIn': false, 'error': null};
    }
  }

  // Validate if student can check out (check for double checkout)
  Future<Map<String, dynamic>> validateCheckOut(String qrData) async {
    if (workingUrl == null) {
      workingUrl = await findWorkingUrl();
      if (workingUrl == null) {
        return {
          'alreadyCheckedOut': false,
          'error': 'No working server connection',
        };
      }
    }

    try {
      print('🔍 Validating checkout for QR: $qrData');

      final response = await http
          .post(
            Uri.parse('$workingUrl/api/students/validate-checkout'),
            headers: {'Content-Type': 'application/json'},
            body: json.encode({'qrData': qrData}),
          )
          .timeout(const Duration(seconds: 10));

      print('Checkout Validation Response Status: ${response.statusCode}');
      print('Checkout Validation Response: ${response.body}');

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return {
          'alreadyCheckedOut': data['alreadyCheckedOut'] ?? false,
          'studentName': data['studentName'],
          'error': null,
        };
      } else {
        // If endpoint doesn't exist or errors, allow the checkout
        // (graceful fallback)
        return {'alreadyCheckedOut': false, 'error': null};
      }
    } catch (e) {
      print('❌ Checkout validation error: $e');
      // On error, allow the checkout to proceed
      return {'alreadyCheckedOut': false, 'error': null};
    }
  }
}
