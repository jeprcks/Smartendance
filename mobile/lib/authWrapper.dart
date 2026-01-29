import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:mobile/pages/loginpage/login.dart';
import 'package:mobile/pages/teachers/teacher.dart';

class AuthWrapper extends StatefulWidget {
  const AuthWrapper({super.key});

  @override
  State<AuthWrapper> createState() => _AuthWrapperState();
}

class _AuthWrapperState extends State<AuthWrapper> {
  final _storage = const FlutterSecureStorage();
  bool _isLoading = true;
  bool _isLoggedIn = false;

  // Teacher data
  String _token = '';
  String _teacherId = '';
  String _teacherName = '';
  String _teacherEmail = '';
  String _subject = '';
  String _role = '';

  @override
  void initState() {
    super.initState();
    _checkAuthStatus();
  }

  Future<void> _checkAuthStatus() async {
    try {
      // Check for teacher token
      final teacherToken = await _storage.read(key: 'teacher_token');

      debugPrint('=== CHECK AUTH STATUS ===');
      debugPrint(
        'Teacher token found: ${teacherToken != null && teacherToken.isNotEmpty}',
      );

      if (teacherToken != null && teacherToken.isNotEmpty) {
        // Teacher is logged in
        final teacherId = await _storage.read(key: 'teacher_id');
        final teacherName = await _storage.read(key: 'teacher_name');
        final teacherEmail = await _storage.read(key: 'teacher_email');
        final subject = await _storage.read(key: 'teacher_subject');
        final role = await _storage.read(key: 'teacher_role');

        if (!mounted) return;
        setState(() {
          _token = teacherToken;
          _teacherId = teacherId ?? '';
          _teacherName = teacherName ?? '';
          _teacherEmail = teacherEmail ?? '';
          _subject = subject ?? '';
          _role = role ?? '';
          _isLoggedIn = true;
        });
      }

      debugPrint('=== CHECK AUTH STATUS END ===');
    } catch (e) {
      debugPrint('❌ Error checking auth status: $e');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _handleLogout() async {
    // Clear all teacher data
    await _storage.delete(key: 'teacher_token');
    await _storage.delete(key: 'teacher_id');
    await _storage.delete(key: 'teacher_name');
    await _storage.delete(key: 'teacher_email');
    await _storage.delete(key: 'teacher_subject');
    await _storage.delete(key: 'teacher_role');

    if (!mounted) return;
    setState(() {
      _isLoggedIn = false;

      // Reset teacher data
      _token = '';
      _teacherId = '';
      _teacherName = '';
      _teacherEmail = '';
      _subject = '';
      _role = '';
    });
  }

  Future<void> _handleLoginSuccess({
    required String token,
    required String teacherId,
    required String teacherName,
    required String email,
    required String subject,
    required String role,
  }) async {
    debugPrint('\n========== LOGIN SUCCESS HANDLER ==========');
    debugPrint('📋 Storing login credentials...');
    debugPrint('  Token: ${token.substring(0, 20)}...');
    debugPrint('  Teacher ID: $teacherId');
    debugPrint('  Teacher Name: $teacherName');
    debugPrint('  Email: $email');
    debugPrint('  Subject: $subject');
    debugPrint('  Role: $role');

    try {
      // Store credentials
      await _storage.write(key: 'teacher_token', value: token);
      debugPrint('✅ Token stored');

      await _storage.write(key: 'teacher_id', value: teacherId);
      debugPrint('✅ Teacher ID stored');

      await _storage.write(key: 'teacher_name', value: teacherName);
      debugPrint('✅ Teacher Name stored');

      await _storage.write(key: 'teacher_email', value: email);
      debugPrint('✅ Email stored');

      await _storage.write(key: 'teacher_subject', value: subject);
      debugPrint('✅ Subject stored');

      await _storage.write(key: 'teacher_role', value: role);
      debugPrint('✅ Role stored');

      if (!mounted) return;
      // Update local state
      setState(() {
        _token = token;
        _teacherId = teacherId;
        _teacherName = teacherName;
        _teacherEmail = email;
        _subject = subject;
        _role = role;
        _isLoggedIn = true;
      });

      debugPrint('\n✅ All data stored successfully!');
      debugPrint('========================================\n');
    } catch (e) {
      debugPrint('❌ Error in _handleLoginSuccess: $e');
      debugPrint('========================================\n');
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Scaffold(
        body: Center(
          child: CircularProgressIndicator(
            valueColor: AlwaysStoppedAnimation<Color>(Colors.pink),
          ),
        ),
      );
    }

    if (_isLoggedIn) {
      return TeacherDashboard(
        token: _token,
        teacherId: _teacherId,
        teacherName: _teacherName,
        email: _teacherEmail,
        subject: _subject,
        role: _role,
        onLogout: _handleLogout,
      );
    }

    return LoginPage(onLoginSuccess: _handleLoginSuccess);
  }
}
