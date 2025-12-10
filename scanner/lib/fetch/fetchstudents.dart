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
    'http://10.0.2.2:4000',  // Android Emulator
    'http://localhost:4000',  // iOS Simulator
    'http://192.168.64.95',  // Physical device (replace with your IP)
    'http://192.168.0.100:4000',  // Alternative IP range
  ];
  
  String? workingUrl;

  // Find working URL by testing all possibilities
  Future<String?> findWorkingUrl() async {
    print('=== TESTING NETWORK CONNECTIVITY ===');
    
    for (String url in possibleUrls) {
      try {
        print('Testing: $url');
        final response = await http.get(
          Uri.parse('$url/api/students'),
          headers: {'Content-Type': 'application/json'},
        ).timeout(const Duration(seconds: 3));
        
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

  // Function to fetch student information from API
  Future<Map<String, dynamic>> fetchStudentInfo(String qrData, {String subject = 'General', String? notes}) async {
    if (workingUrl == null) {
      workingUrl = await findWorkingUrl();
      if (workingUrl == null) {
        return {
          'success': false,
          'error': 'No working server connection found. Please check your network settings.',
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
      final response = await http.post(
        Uri.parse('$workingUrl/api/students/scan-qr'),
        headers: {
          'Content-Type': 'application/json',
        },
        body: json.encode({
          'qrData': qrData,
          'subject': subject,
          'notes': notes,
          'deviceInfo': deviceInfo,
        }),
      ).timeout(const Duration(seconds: 15));
      
      print('Response Status: ${response.statusCode}');
      print('Response Headers: ${response.headers}');
      print('Response Body: ${response.body}');

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        print('Response data: $data');
        
        if (data['success'] == true && data['student'] != null) {
          return {
            'success': true,
            'student': data['student'],
            'error': null,
          };
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
            'error': errorData['error'] ?? 'Failed to fetch student information',
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
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    final weekdays = [
      'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
    ];
    
    final weekday = weekdays[now.weekday - 1];
    final month = months[now.month - 1];
    final day = now.day;
    final year = now.year;
    
    return '$weekday, $month $day, $year';
  }
}
