import 'package:http/http.dart' as http;
import 'dart:convert';
import 'dart:io' show Platform;

class AuthService {
  // URL configuration based on platform
  static String get baseUrl {
    if (Platform.isAndroid) {
      // Android: use your computer's IP address
      return 'http://192.168.0.151:4000/api/auth';
    } else if (Platform.isIOS) {
      // iOS: use your computer's IP address
      return 'http://192.168.0.151:4000/api/auth';
    } else {
      // Fallback for other platforms
      return 'http://localhost:4000/api/auth';
    }
  }

  // Student login
  static Future<Map<String, dynamic>> studentLogin(
    String email,
    String password,
  ) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/student-login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'email': email, 'password': password}),
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        final error = jsonDecode(response.body);
        throw Exception(error['error'] ?? 'Student login failed');
      }
    } catch (e) {
      throw Exception('Error during student login: $e');
    }
  }

  // Teacher login
  static Future<Map<String, dynamic>> teacherLogin(
    String email,
    String password,
  ) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/teacher-login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'email': email, 'password': password}),
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        final error = jsonDecode(response.body);
        throw Exception(error['error'] ?? 'Teacher login failed');
      }
    } catch (e) {
      throw Exception('Error during teacher login: $e');
    }
  }

  // Verify token
  static Future<Map<String, dynamic>> verifyToken(String token) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/verify-token'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        throw Exception('Token verification failed');
      }
    } catch (e) {
      throw Exception('Error verifying token: $e');
    }
  }
}
