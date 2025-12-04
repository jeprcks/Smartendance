import 'dart:convert';
import 'package:http/http.dart' as http;

class Student {
  final String id;
  final String studentId;
  final String fullName;
  final String email;
  final String gradeLevel;
  final String section;
  final String gender;
  final String shift;
  final String? photo;
  final int age;
  final String phoneNumber;
  final String birthDate;

  Student({
    required this.id,
    required this.studentId,
    required this.fullName,
    required this.email,
    required this.gradeLevel,
    required this.section,
    required this.gender,
    required this.shift,
    this.photo,
    required this.age,
    required this.phoneNumber,
    required this.birthDate,
  });

  factory Student.fromJson(Map<String, dynamic> json) {
    return Student(
      id: json['_id'] ?? '',
      studentId: json['studentId'] ?? '',
      fullName: json['fullName'] ?? '',
      email: json['email'] ?? '',
      gradeLevel: json['gradeLevel'] ?? '',
      section: json['section'] ?? '',
      gender: json['gender'] ?? '',
      shift: json['shift'] ?? '',
      photo: json['photo'],
      age: json['age'] ?? 0,
      phoneNumber: json['phoneNumber'] ?? '',
      birthDate: json['birthDate'] ?? '',
    );
  }
}

class Parent {
  final String email;
  final String parentEmail;
  final int childrenCount;

  Parent({
    required this.email,
    required this.parentEmail,
    required this.childrenCount,
  });

  factory Parent.fromJson(Map<String, dynamic> json) {
    return Parent(
      email: json['email'] ?? '',
      parentEmail: json['parentEmail'] ?? '',
      childrenCount: json['childrenCount'] ?? 0,
    );
  }
}

class ParentLoginResponse {
  final String token;
  final Parent parent;
  final List<Student> children;

  ParentLoginResponse({
    required this.token,
    required this.parent,
    required this.children,
  });

  factory ParentLoginResponse.fromJson(Map<String, dynamic> json) {
    var childrenJson = json['children'] as List<dynamic>? ?? [];
    var children = childrenJson
        .map((child) => Student.fromJson(child as Map<String, dynamic>))
        .toList();

    return ParentLoginResponse(
      token: json['token'] ?? '',
      parent: Parent.fromJson(json['parent'] ?? {}),
      children: children,
    );
  }
}

class ParentService {
  static const String baseUrl = 'http://localhost:4000/api';

  /// Login parent with email and password
  /// Returns ParentLoginResponse with token and children list
  static Future<ParentLoginResponse> parentLogin({
    required String email,
    required String password,
  }) async {
    try {
      final response = await http
          .post(
            Uri.parse('$baseUrl/auth/parent-login'),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({'email': email, 'password': password}),
          )
          .timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return ParentLoginResponse.fromJson(data);
      } else {
        final error = jsonDecode(response.body);
        throw Exception(error['error'] ?? 'Login failed');
      }
    } catch (e) {
      rethrow;
    }
  }

  /// Get a specific student's detailed information
  static Future<Student> getStudentDetails({
    required String studentId,
    required String token,
  }) async {
    try {
      final response = await http
          .get(
            Uri.parse('$baseUrl/students/$studentId'),
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer $token',
            },
          )
          .timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return Student.fromJson(data);
      } else {
        throw Exception('Failed to fetch student details');
      }
    } catch (e) {
      rethrow;
    }
  }

  /// Verify if parent token is still valid
  static Future<bool> verifyToken({required String token}) async {
    try {
      final response = await http
          .post(
            Uri.parse('$baseUrl/auth/verify-token'),
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer $token',
            },
          )
          .timeout(const Duration(seconds: 10));

      return response.statusCode == 200;
    } catch (e) {
      return false;
    }
  }
}
