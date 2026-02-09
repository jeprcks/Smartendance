import 'package:flutter/material.dart';
import 'package:mobile/fetch/authService.dart';
import 'package:mobile/pages/teachers/teacher.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:mobile/theme.dart';

typedef LoginSuccessCallback =
    Future<void> Function({
      required String token,
      required String teacherId,
      required String teacherName,
      required String email,
      required String subject,
      required String role,
    });

class LoginPage extends StatefulWidget {
  final LoginSuccessCallback? onLoginSuccess;

  const LoginPage({super.key, this.onLoginSuccess});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  late PageController _pageController;
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
      debugPrint('Error storing teacher data: $e');
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Error: $e')));
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
      debugPrint('=== ATTEMPTING TEACHER LOGIN ===');
      debugPrint('Email/ID: ${_emailController.text}');
      debugPrint('Password: ${'*' * _passwordController.text.length}');

      final response = await AuthService.teacherLogin(
        _emailController.text,
        _passwordController.text,
      );

      if (mounted) {
        setState(() => _isLoading = false);

        debugPrint('=== LOGIN RESPONSE ===');
        debugPrint('Response: $response');
        debugPrint('Response type: ${response.runtimeType}');

        // Check if response has required fields
        if (response['teacher'] == null) {
          throw Exception('Invalid response: Teacher data not found');
        }

        if (response['token'] == null || response['token'].toString().isEmpty) {
          throw Exception('Invalid response: Token not found');
        }

        // Get user data from response
        final userData = response['teacher'];
        final token = response['token'];

        debugPrint('User Data: $userData');
        debugPrint('Token: ${token.toString().substring(0, 20)}...');

        // Show success message
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Welcome ${userData['name'] ?? userData['fullName'] ?? userData['email'] ?? 'User'}!',
            ),
            backgroundColor: kPrimary,
          ),
        );

        final teacherId =
            userData['teacherId'] ?? userData['_id'] ?? userData['id'] ?? '';
        final teacherName =
            userData['name'] ??
            userData['fullName'] ??
            userData['email'] ??
            'Teacher';
        final email = userData['email'] ?? '';
        final subject = userData['subject'] ?? '';
        final role = userData['role'] ?? 'Teacher';

        debugPrint('Extracted teacher data:');
        debugPrint('  teacherId: $teacherId');
        debugPrint('  teacherName: $teacherName');
        debugPrint('  email: $email');
        debugPrint('  subject: $subject');
        debugPrint('  role: $role');

        if (teacherId.isEmpty) {
          throw Exception('Teacher ID is missing from response');
        }

        // If onLoginSuccess callback is provided, use it (from AuthWrapper)
        if (widget.onLoginSuccess != null) {
          await widget.onLoginSuccess!(
            token: token,
            teacherId: teacherId,
            teacherName: teacherName,
            email: email,
            subject: subject,
            role: role,
          );
        } else {
          // Fallback: direct navigation (for standalone LoginPage usage)
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
    } catch (e) {
      debugPrint('=== LOGIN ERROR ===');
      debugPrint('Error: $e');
      debugPrint('Error type: ${e.runtimeType}');

      if (mounted) {
        setState(() => _isLoading = false);

        String errorMessage = 'Login failed';
        if (e.toString().contains('SocketException') ||
            e.toString().contains('Failed host lookup') ||
            e.toString().contains('Connection refused')) {
          errorMessage =
              'Cannot connect to server. Please check:\n1. Internet connection (WiFi or mobile data)\n2. Server is online\n3. Try again in a moment';
        } else if (e.toString().contains('401') ||
            e.toString().contains('Unauthorized')) {
          errorMessage = 'Invalid email or password. Please try again.';
        } else if (e.toString().contains('404')) {
          errorMessage =
              'Server endpoint not found. Please check server configuration.';
        } else {
          errorMessage = 'Login failed: ${e.toString()}';
        }

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(errorMessage),
            backgroundColor: Colors.red,
            duration: const Duration(seconds: 5),
          ),
        );
      }
    }
  }

  Color _getUserTypeColor() {
    return const Color(0xFF10B981); // Emerald
  }

  IconData _getUserTypeIcon() {
    return Icons.person;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: _buildLoginForm('Teacher', 'Enter your teacher credentials'),
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
                color: _getUserTypeColor().withValues(alpha: 0.1),
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
                  disabledBackgroundColor: _getUserTypeColor().withValues(
                    alpha: 0.5,
                  ),
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
