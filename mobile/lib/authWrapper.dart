import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'dart:convert';
import 'package:mobile/loginpage.dart/login.dart';
import 'package:mobile/pages/parents/parent.dart';
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
  String _userType = ''; // 'parent' or 'teacher'
  
  // Parent data
  String _token = '';
  String _parentId = '';
  String _parentName = '';
  String _parentEmail = '';
  List<dynamic> _children = [];

  // Teacher data
  String _teacherId = '';
  String _teacherName = '';
  String _teacherEmail = '';
  String _subject = '';
  String _role = '';

  @override
  void initState() {
    super.initState();
    _cleanupOldData();
    _checkAuthStatus();
  }

  Future<void> _cleanupOldData() async {
    try {
      // Clean up any old corrupted data format
      final childrenJson = await _storage.read(key: 'parent_children');
      if (childrenJson != null && childrenJson.contains('|||')) {
        print('🧹 CLEANUP: Removing old corrupted children format...');
        await _storage.delete(key: 'parent_children');
        print('✅ Old corrupted data removed');
      }
    } catch (e) {
      print('Error during cleanup: $e');
    }
  }

  Future<void> _checkAuthStatus() async {
    try {
      // Check for parent token first
      final parentToken = await _storage.read(key: 'parent_token');
      
      // Check for teacher token
      final teacherToken = await _storage.read(key: 'teacher_token');

      print('=== CHECK AUTH STATUS ===');
      print('Parent token found: ${parentToken != null && parentToken.isNotEmpty}');
      print('Teacher token found: ${teacherToken != null && teacherToken.isNotEmpty}');

      if (parentToken != null && parentToken.isNotEmpty) {
        // Parent is logged in
        final parentId = await _storage.read(key: 'parent_id');
        final parentName = await _storage.read(key: 'parent_name');
        final parentEmail = await _storage.read(key: 'parent_email');
        final childrenJson = await _storage.read(key: 'parent_children');

        setState(() {
          _userType = 'parent';
          _token = parentToken;
          _parentId = parentId ?? '';
          _parentName = parentName ?? '';
          _parentEmail = parentEmail ?? '';
          _isLoggedIn = true;

          // Parse children if available
          if (childrenJson != null && childrenJson.isNotEmpty) {
            if (!childrenJson.contains('|||')) {
              try {
                final decoded = jsonDecode(childrenJson);
                if (decoded is List) {
                  _children = decoded;
                  print('✅ Children parsed successfully, count: ${_children.length}');
                }
              } catch (e) {
                print('❌ Error parsing children data: $e');
                _children = [];
              }
            }
          }
        });
      } else if (teacherToken != null && teacherToken.isNotEmpty) {
        // Teacher is logged in
        final teacherId = await _storage.read(key: 'teacher_id');
        final teacherName = await _storage.read(key: 'teacher_name');
        final teacherEmail = await _storage.read(key: 'teacher_email');
        final subject = await _storage.read(key: 'teacher_subject');
        final role = await _storage.read(key: 'teacher_role');

        setState(() {
          _userType = 'teacher';
          _token = teacherToken;
          _teacherId = teacherId ?? '';
          _teacherName = teacherName ?? '';
          _teacherEmail = teacherEmail ?? '';
          _subject = subject ?? '';
          _role = role ?? '';
          _isLoggedIn = true;
        });
      }

      print('=== CHECK AUTH STATUS END ===');
    } catch (e) {
      print('❌ Error checking auth status: $e');
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _handleLogout() async {
    // Clear all parent data
    await _storage.delete(key: 'parent_token');
    await _storage.delete(key: 'parent_id');
    await _storage.delete(key: 'parent_name');
    await _storage.delete(key: 'parent_email');
    await _storage.delete(key: 'parent_children');
    await _storage.delete(key: 'parent_data');

    // Clear all teacher data
    await _storage.delete(key: 'teacher_token');
    await _storage.delete(key: 'teacher_id');
    await _storage.delete(key: 'teacher_name');
    await _storage.delete(key: 'teacher_email');
    await _storage.delete(key: 'teacher_subject');
    await _storage.delete(key: 'teacher_role');

    setState(() {
      _isLoggedIn = false;
      _userType = '';
      
      // Reset parent data
      _token = '';
      _parentId = '';
      _parentName = '';
      _parentEmail = '';
      _children = [];

      // Reset teacher data
      _teacherId = '';
      _teacherName = '';
      _teacherEmail = '';
      _subject = '';
      _role = '';
    });
  }

  Future<void> _handleLoginSuccess({
    required String token,
    required String parentId,
    required String parentName,
    required String parentEmail,
    required List<dynamic> children,
  }) async {
    print('\n========== LOGIN SUCCESS HANDLER ==========');
    print('📋 Storing login credentials...');
    print('  Token: ${token.substring(0, 20)}...');
    print('  Parent ID: $parentId');
    print('  Parent Name: $parentName');
    print('  Parent Email: $parentEmail');
    print('  Children count: ${children.length}');
    
    try {
      // Store credentials
      await _storage.write(key: 'parent_token', value: token);
      print('✅ Token stored');
      
      await _storage.write(key: 'parent_id', value: parentId);
      print('✅ Parent ID stored');
      
      await _storage.write(key: 'parent_name', value: parentName);
      print('✅ Parent Name stored');
      
      await _storage.write(key: 'parent_email', value: parentEmail);
      print('✅ Parent Email stored');

      // Store children as JSON string
      if (children.isNotEmpty) {
        try {
          final childrenJson = jsonEncode(children);
          print('\n📦 Encoding children to JSON...');
          print('  JSON length: ${childrenJson.length} chars');
          print('  First 100 chars: ${childrenJson.substring(0, childrenJson.length > 100 ? 100 : childrenJson.length)}...');
          
          await _storage.write(key: 'parent_children', value: childrenJson);
          print('✅ Children stored as JSON');
          
          // Verify stored data
          final storedJson = await _storage.read(key: 'parent_children');
          if (storedJson != null && storedJson == childrenJson) {
            print('✅ VERIFIED: Stored children matches encoded data');
          } else {
            print('⚠️  WARNING: Stored data mismatch');
          }
        } catch (e) {
          print('❌ Error storing children: $e');
        }
      } else {
        print('⚠️ No children to store (empty list)');
        await _storage.write(key: 'parent_children', value: '[]');
        print('✅ Stored empty children array');
      }

      // Update local state
      setState(() {
        _token = token;
        _parentId = parentId;
        _parentName = parentName;
        _parentEmail = parentEmail;
        _children = children;
        _isLoggedIn = true;
      });
      
      print('\n✅ All data stored successfully!');
      print('========================================\n');
    } catch (e) {
      print('❌ Error in _handleLoginSuccess: $e');
      print('========================================\n');
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
      if (_userType == 'teacher') {
        return TeacherDashboard(
          token: _token,
          teacherId: _teacherId,
          teacherName: _teacherName,
          email: _teacherEmail,
          subject: _subject,
          role: _role,
          onLogout: _handleLogout,
        );
      } else {
        // Default to parent dashboard
        return ParentDashboard(
          token: _token,
          parentId: _parentId,
          parentName: _parentName,
          email: _parentEmail,
          children: _children,
          onLogout: _handleLogout,
        );
      }
    }

    return LoginPage(onLoginSuccess: _handleLoginSuccess);
  }
}
