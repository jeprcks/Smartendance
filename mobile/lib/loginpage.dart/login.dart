import 'package:flutter/material.dart';
import 'package:mobile/services/authService.dart';
import 'package:mobile/pages/parents/parent.dart';
import 'package:mobile/pages/teachers/teacher.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

typedef LoginSuccessCallback = Future<void> Function({
  required String token,
  required String parentId,
  required String parentName,
  required String parentEmail,
  required List<dynamic> children,
});

class LoginPage extends StatefulWidget {
  final LoginSuccessCallback? onLoginSuccess;

  const LoginPage({super.key, this.onLoginSuccess});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  late PageController _pageController;
  int _currentPage = 0;
  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();
  bool _obscurePassword = true;
  bool _isLoading = false;
  final _storage = const FlutterSecureStorage();

  @override
  void initState() {
    super.initState();
    _pageController = PageController();
  }

  @override
  void dispose() {
    _pageController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _storeTeacherData({
    required String token,
    required String teacherId,
    required String teacherName,
    required String email,
    required String subject,
    required String role,
  }) async {
    try {
      await _storage.write(key: 'teacher_token', value: token);
      await _storage.write(key: 'teacher_id', value: teacherId);
      await _storage.write(key: 'teacher_name', value: teacherName);
      await _storage.write(key: 'teacher_email', value: email);
      await _storage.write(key: 'teacher_subject', value: subject);
      await _storage.write(key: 'teacher_role', value: role);

      if (mounted) {
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(
            builder: (context) => TeacherDashboard(
              token: token,
              teacherId: teacherId,
              teacherName: teacherName,
              email: email,
              subject: subject,
              role: role,
            ),
          ),
        );
      }
    } catch (e) {
      print('Error storing teacher data: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    }
  }

  void _handleLogin() async {
    if (_emailController.text.isEmpty || _passwordController.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please fill in all fields')),
      );
      return;
    }

    setState(() => _isLoading = true);

    try {
      final userType = _getUserTypeLabel().toLowerCase();
      Map<String, dynamic> response;

      // Call appropriate login method based on user type
      if (userType == 'parent') {
        response = await AuthService.parentLogin(
          _emailController.text,
          _passwordController.text,
        );
      } else if (userType == 'teacher') {
        response = await AuthService.teacherLogin(
          _emailController.text,
          _passwordController.text,
        );
      } else {
        throw Exception('Invalid user type');
      }

      if (mounted) {
        setState(() => _isLoading = false);

        print('=== LOGIN RESPONSE ===');
        print('Response: $response');

        // Get user data from response
        final userData =
            response[userType] ??
            response['student'] ??
            response['parent'] ??
            response['teacher'];
        final token = response['token'];

        // Get children data (backend returns children array at root level)
        final childrenData =
            response['children'] ?? userData?['children'] ?? [];

        print('User Data: $userData');
        print('Children Data: $childrenData');
        print('Children count: ${childrenData.length}');

        // Show success message
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Welcome ${userData['fullName'] ?? userData['name'] ?? userData['email'] ?? 'User'}!',
            ),
            backgroundColor: Colors.green,
          ),
        );

        // Navigate based on user type
        if (userType == 'parent') {
          final parentId = userData['parentId'] ?? userData['_id'] ?? '';
          final parentName = userData['parentName'] ?? userData['name'] ?? userData['email'] ?? 'Parent';
          final email = userData['email'] ?? userData['parentEmail'] ?? '';

          print('Calling onLoginSuccess with:');
          print('  parentId: $parentId');
          print('  parentName: $parentName');
          print('  email: $email');
          print('  children: $childrenData');

          // If onLoginSuccess callback is provided, use it (from AuthWrapper)
          if (widget.onLoginSuccess != null) {
            await widget.onLoginSuccess!(
              token: token,
              parentId: parentId,
              parentName: parentName,
              parentEmail: email,
              children: childrenData,
            );
          } else {
            // Fallback: direct navigation (for standalone LoginPage usage)
            Navigator.of(context).pushReplacement(
              MaterialPageRoute(
                builder: (context) => ParentDashboard(
                  token: token,
                  parentId: parentId,
                  parentName: parentName,
                  email: email,
                  children: childrenData,
                ),
              ),
            );
          }
        } else if (userType == 'teacher') {
          final teacherId = userData['teacherId'] ?? userData['_id'] ?? '';
          final teacherName = userData['name'] ?? userData['fullName'] ?? userData['email'] ?? 'Teacher';
          final email = userData['email'] ?? '';
          final subject = userData['subject'] ?? '';
          final role = userData['role'] ?? 'Teacher';

          print('Calling teacher login with:');
          print('  teacherId: $teacherId');
          print('  teacherName: $teacherName');
          print('  email: $email');
          print('  subject: $subject');
          print('  role: $role');

          // If onLoginSuccess callback is provided, use it (from AuthWrapper)
          if (widget.onLoginSuccess != null) {
            // For teachers, we'll create a special callback
            // Store teacher data and navigate
            await _storeTeacherData(
              token: token,
              teacherId: teacherId,
              teacherName: teacherName,
              email: email,
              subject: subject,
              role: role,
            );
          }
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Login failed: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  String _getUserTypeLabel() {
    switch (_currentPage) {
      case 0:
        return 'Teacher';
      case 1:
        return 'Parent';
      default:
        return 'User';
    }
  }

  Color _getUserTypeColor() {
    switch (_currentPage) {
      case 0:
        return const Color(0xFF10B981); // Emerald
      case 1:
        return const Color(0xFFEC4899); // Pink
      default:
        return Colors.blue;
    }
  }

  IconData _getUserTypeIcon() {
    switch (_currentPage) {
      case 0:
        return Icons.person;
      case 1:
        return Icons.family_restroom;
      default:
        return Icons.login;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          PageView(
            controller: _pageController,
            onPageChanged: (index) {
              setState(() => _currentPage = index);
            },
            children: [
              _buildLoginForm('Teacher', 'Enter your teacher credentials'),
              _buildLoginForm('Parent', 'Enter your parent credentials'),
            ],
          ),
          // Dot indicators at the bottom
          Positioned(
            bottom: 30,
            left: 0,
            right: 0,
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: List.generate(
                    2,
                    (index) => GestureDetector(
                      onTap: () => _pageController.animateToPage(
                        index,
                        duration: const Duration(milliseconds: 300),
                        curve: Curves.easeInOut,
                      ),
                      child: Container(
                        margin: const EdgeInsets.symmetric(horizontal: 8),
                        width: 12,
                        height: 12,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: _currentPage == index
                              ? _getUserTypeColor()
                              : Colors.grey[300],
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  _getUserTypeLabel(),
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: Colors.grey,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLoginForm(String userType, String subtitle) {
    return SingleChildScrollView(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const SizedBox(height: 60),
            // Header with icon and title
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: _getUserTypeColor().withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(
                _getUserTypeIcon(),
                size: 48,
                color: _getUserTypeColor(),
              ),
            ),
            const SizedBox(height: 24),
            Text(
              'Welcome, $userType',
              style: const TextStyle(
                fontSize: 28,
                fontWeight: FontWeight.bold,
                color: Colors.black87,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              subtitle,
              style: const TextStyle(fontSize: 14, color: Colors.grey),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 48),
            // Email input field
            _buildTextField(
              controller: _emailController,
              label: 'Email or ID',
              icon: Icons.email_outlined,
              keyboardType: TextInputType.emailAddress,
            ),
            const SizedBox(height: 16),
            // Password input field
            _buildTextField(
              controller: _passwordController,
              label: 'Password',
              icon: Icons.lock_outlined,
              isPassword: true,
              obscureText: _obscurePassword,
              onPasswordVisibilityToggle: () {
                setState(() => _obscurePassword = !_obscurePassword);
              },
            ),
            const SizedBox(height: 12),
            // Forgot password link
            Align(
              alignment: Alignment.centerRight,
              child: TextButton(
                onPressed: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Forgot password feature coming soon'),
                    ),
                  );
                },
                child: const Text(
                  'Forgot Password?',
                  style: TextStyle(color: Colors.grey, fontSize: 12),
                ),
              ),
            ),
            const SizedBox(height: 32),
            // Login button
            SizedBox(
              width: double.infinity,
              height: 56,
              child: ElevatedButton(
                onPressed: _isLoading ? null : _handleLogin,
                style: ElevatedButton.styleFrom(
                  backgroundColor: _getUserTypeColor(),
                  disabledBackgroundColor: _getUserTypeColor().withOpacity(0.5),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: _isLoading
                    ? SizedBox(
                        width: 24,
                        height: 24,
                        child: CircularProgressIndicator(
                          valueColor: AlwaysStoppedAnimation<Color>(
                            Colors.white,
                          ),
                          strokeWidth: 2,
                        ),
                      )
                    : Text(
                        'Login as $userType',
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                          color: Colors.white,
                        ),
                      ),
              ),
            ),
            const SizedBox(height: 24),
            // Signup link
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Text(
                  'Don\'t have an account? ',
                  style: TextStyle(color: Colors.grey),
                ),
                GestureDetector(
                  onTap: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('Sign up feature coming soon'),
                      ),
                    );
                  },
                  child: Text(
                    'Sign Up',
                    style: TextStyle(
                      color: _getUserTypeColor(),
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    required IconData icon,
    TextInputType keyboardType = TextInputType.text,
    bool isPassword = false,
    bool obscureText = false,
    VoidCallback? onPasswordVisibilityToggle,
  }) {
    return TextField(
      controller: controller,
      keyboardType: keyboardType,
      obscureText: obscureText,
      decoration: InputDecoration(
        labelText: label,
        prefixIcon: Icon(icon, color: _getUserTypeColor()),
        suffixIcon: isPassword
            ? GestureDetector(
                onTap: onPasswordVisibilityToggle,
                child: Icon(
                  obscureText ? Icons.visibility_off : Icons.visibility,
                  color: Colors.grey,
                ),
              )
            : null,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: _getUserTypeColor(), width: 2),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: Colors.grey[300]!),
        ),
        contentPadding: const EdgeInsets.symmetric(vertical: 16),
      ),
    );
  }
}
