import 'package:http/http.dart' as http;
import 'dart:convert';

class AuthService {
  static const String baseUrl = 'http://localhost:4000/api/auth';

  // For Android emulator, use:
  // static const String baseUrl = 'http://10.0.2.2:4000/api/auth';

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

  // Parent login
  static Future<Map<String, dynamic>> parentLogin(
    String email,
    String password,
  ) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/parent-login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'email': email, 'password': password}),
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        final error = jsonDecode(response.body);
        throw Exception(error['error'] ?? 'Parent login failed');
      }
    } catch (e) {
      throw Exception('Error during parent login: $e');
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
