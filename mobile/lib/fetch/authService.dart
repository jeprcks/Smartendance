import 'package:http/http.dart' as http;
import 'dart:convert';
import 'dart:io' show Platform;
import 'package:flutter/foundation.dart' show debugPrint, kIsWeb;

class AuthService {
  // URL configuration based on platform
  static String get baseUrl {
    if (kIsWeb) {
      // Web platform: use the server IP address
      return 'http://192.168.0.151:4000/api/auth';
    } else if (Platform.isAndroid) {
      // Android: use your computer's IP address
      return 'http://192.168.0.151:4000/api/auth';
    } else if (Platform.isIOS) {
      // iOS: use your computer's IP address
      return 'http://192.168.0.151:4000/api/auth';
    } else {
      // Fallback for other platforms (desktop)
      return 'http://192.168.0.151:4000/api/auth';
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
      debugPrint('=== TEACHER LOGIN REQUEST ===');
      debugPrint('URL: $baseUrl/teacher-login');
      debugPrint('Email: $email');

      final response = await http
          .post(
            Uri.parse('$baseUrl/teacher-login'),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({'email': email, 'password': password}),
          )
          .timeout(
            const Duration(seconds: 10),
            onTimeout: () {
              throw Exception('Request timeout - Server not responding');
            },
          );

      debugPrint('Response status: ${response.statusCode}');
      debugPrint('Response body: ${response.body}');

      if (response.statusCode == 200) {
        try {
          final data = jsonDecode(response.body);
          debugPrint('Login successful');
          return data;
        } catch (e) {
          throw Exception('Invalid response format from server');
        }
      } else if (response.statusCode == 401) {
        try {
          final error = jsonDecode(response.body);
          throw Exception(error['error'] ?? 'Invalid email or password');
        } catch (e) {
          throw Exception('Invalid email or password');
        }
      } else {
        try {
          final error = jsonDecode(response.body);
          throw Exception(
            error['error'] ??
                'Teacher login failed (Status: ${response.statusCode})',
          );
        } catch (e) {
          throw Exception(
            'Teacher login failed (Status: ${response.statusCode}): ${response.body}',
          );
        }
      }
    } catch (e) {
      debugPrint('Login error: $e');
      // Re-throw with more context
      if (e.toString().contains('SocketException') ||
          e.toString().contains('Failed host lookup') ||
          e.toString().contains('Connection refused')) {
        throw Exception(
          'Cannot connect to server at $baseUrl. Please check:\n1. Server is running\n2. Network connection\n3. Server URL is correct',
        );
      }
      rethrow;
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
