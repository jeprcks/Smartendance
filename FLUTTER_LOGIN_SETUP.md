# Flutter Login Integration - Complete Setup Guide

## What Was Done

Your `login.dart` has been updated to connect to the authentication server! The login button now:
1. ✅ Calls the appropriate AuthService method (student, parent, or teacher)
2. ✅ Sends email and password to the backend
3. ✅ Shows success/error messages
4. ✅ Extracts and displays user data

---

## Current Status

### ✅ Integrated
- Login form calls AuthService
- Error handling implemented
- Success messages shown
- User data extracted and displayed

### ⏳ Next Steps
- Store JWT token securely
- Navigate to appropriate home page
- Implement logout
- Add auto-login check

---

## Step-by-Step Setup

### Step 1: Add Secure Storage Package

Add to your `mobile/pubspec.yaml`:

```yaml
dependencies:
  flutter:
    sdk: flutter
  http: ^1.1.0
  flutter_secure_storage: ^9.0.0  # Add this line
```

Then run:
```bash
cd d:\Smartendance\mobile
flutter pub get
```

---

### Step 2: Store Token Securely

Update your `login.dart` to store the token. Replace this section:

```dart
// TODO: Store token securely and navigate to home page
// For now, print token for verification
print('Login successful!');
print('Token: $token');
print('User Data: $userData');
```

With:

```dart
// Store token securely
const secureStorage = FlutterSecureStorage();

// Store JWT token
await secureStorage.write(
  key: 'auth_token',
  value: token,
);

// Store user data
await secureStorage.write(
  key: 'user_data',
  value: jsonEncode(userData),
);

// Store user role
await secureStorage.write(
  key: 'user_role',
  value: userType,
);

// Navigate to appropriate home page
if (mounted) {
  if (userType == 'student') {
    Navigator.of(context).pushReplacementNamed('/student-home');
  } else if (userType == 'parent') {
    Navigator.of(context).pushReplacementNamed('/parent-home');
  } else if (userType == 'teacher') {
    Navigator.of(context).pushReplacementNamed('/teacher-home');
  }
}
```

---

### Step 3: Add Imports at Top of File

Make sure these imports are present:

```dart
import 'package:flutter/material.dart';
import 'package:mobile/services/authService.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'dart:convert';
```

---

### Step 4: Test the Integration

#### Create Test Users in MongoDB

Run this in MongoDB Compass or mongosh:

```javascript
// Student
db.students.insertOne({
  studentId: "STU001",
  email: "student@test.com",
  password: "Test@123",
  fullName: "John Doe",
  phoneNumber: "1234567890",
  age: 15,
  birthDate: new Date("2009-01-01"),
  gradeLevel: "Grade 9",
  section: "A",
  gender: "Male",
  shift: "Morning",
  photo: null
})

// Parent
db.parents.insertOne({
  email: "parent@test.com",
  password: "Parent@123",
  fullName: "Jane Parent",
  phoneNumber: "1234567890",
  gender: "Female",
  relationship: "Mother",
  photo: null,
  address: {
    street: "123 Main St",
    city: "Springfield",
    province: "State",
    zipCode: "12345"
  }
})

// Teacher
db.teachers.insertOne({
  teacherId: "TCH001",
  email: "teacher@test.com",
  password: "Teacher@123",
  name: "John Teacher",
  username: "jteacher",
  role: "Teacher",
  subject: "Mathematics",
  status: "Active",
  photo: null
})
```

#### Start the Server

```bash
cd d:\Smartendance\server
npm start
```

You should see:
```
Connected to MongoDB
Server is running on port 4000
```

#### Test in Flutter

1. Run your Flutter app:
```bash
cd d:\Smartendance\mobile
flutter run
```

2. Swipe to Student login tab
3. Enter:
   - Email: `student@test.com`
   - Password: `Test@123`
4. Click "Login as Student"

You should see:
- Loading spinner
- Success message: "Welcome John Doe!"
- Check debug console for token and user data

---

## Step 5: Handle Token in Subsequent Requests

Create a custom HTTP client to automatically add the token to all requests:

Create `mobile/lib/services/apiClient.dart`:

```dart
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class ApiClient extends http.BaseClient {
  final _secureStorage = const FlutterSecureStorage();

  @override
  Future<http.StreamedResponse> send(http.BaseRequest request) async {
    // Get stored token
    final token = await _secureStorage.read(key: 'auth_token');

    // Add authorization header if token exists
    if (token != null) {
      request.headers['Authorization'] = 'Bearer $token';
    }

    // Add content type header
    request.headers['Content-Type'] = 'application/json';

    return super.send(request);
  }
}
```

Then use it in your services:

```dart
final client = ApiClient();
final response = await client.get(Uri.parse('http://localhost:4000/api/students'));
```

---

## Step 6: Implement Logout

Add this method to handle logout:

```dart
Future<void> logout() async {
  const secureStorage = FlutterSecureStorage();
  
  // Clear all stored data
  await secureStorage.delete(key: 'auth_token');
  await secureStorage.delete(key: 'user_data');
  await secureStorage.delete(key: 'user_role');
  
  // Navigate back to login
  if (mounted) {
    Navigator.of(context).pushReplacementNamed('/login');
  }
}
```

---

## Step 7: Auto-Login on App Start

Add this to your app's main.dart or splash screen:

```dart
@override
void initState() {
  super.initState();
  _checkLoginStatus();
}

Future<void> _checkLoginStatus() async {
  const secureStorage = FlutterSecureStorage();
  
  try {
    // Get stored token
    final token = await secureStorage.read(key: 'auth_token');
    
    if (token != null) {
      // Verify token is still valid
      await AuthService.verifyToken(token);
      
      // Get user role
      final role = await secureStorage.read(key: 'user_role');
      
      // Navigate to appropriate home
      if (mounted) {
        if (role == 'student') {
          Navigator.of(context).pushReplacementNamed('/student-home');
        } else if (role == 'parent') {
          Navigator.of(context).pushReplacementNamed('/parent-home');
        } else if (role == 'teacher') {
          Navigator.of(context).pushReplacementNamed('/teacher-home');
        }
      }
    }
  } catch (e) {
    // Token invalid or expired, stay on login
    print('Auto-login failed: $e');
  }
}
```

---

## Troubleshooting

### Issue: "Cannot find authService"
**Solution**: Make sure `mobile/lib/services/authService.dart` exists and file paths are correct

### Issue: "Connection refused"
**Solution**: Make sure the server is running on port 4000
```bash
cd d:\Smartendance\server
npm start
```

### Issue: "Invalid email or password"
**Solution**: 
1. Check that test users exist in MongoDB
2. Verify email and password are correct
3. Check MongoDB connection is working

### Issue: "CORS error"
**Solution**: Server CORS is already configured for Flutter. If you still get errors, check `server/index.js` CORS settings

### Issue: "flutter_secure_storage not found"
**Solution**: 
```bash
flutter pub get
flutter pub add flutter_secure_storage
```

---

## Complete Updated Login Logic

Here's the complete updated `_handleLogin` method with token storage:

```dart
void _handleLogin() async {
  if (_emailController.text.isEmpty || _passwordController.text.isEmpty) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Please fill in all fields')),
    );
    return;
  }

  setState(() => _isLoading = true);

  try {
    const secureStorage = FlutterSecureStorage();
    final userType = _getUserTypeLabel().toLowerCase();
    Map<String, dynamic> response;

    // Call appropriate login method based on user type
    if (userType == 'student') {
      response = await AuthService.studentLogin(
        _emailController.text,
        _passwordController.text,
      );
    } else if (userType == 'parent') {
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

      // Get user data from response
      final userData = response['$userType'] ?? response['student'] ?? 
                       response['parent'] ?? response['teacher'];
      final token = response['token'];

      // Store token securely
      await secureStorage.write(key: 'auth_token', value: token);
      await secureStorage.write(key: 'user_data', value: jsonEncode(userData));
      await secureStorage.write(key: 'user_role', value: userType);

      // Show success message
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Welcome ${userData['fullName'] ?? userData['name'] ?? 'User'}!'),
          backgroundColor: Colors.green,
        ),
      );

      // Navigate to appropriate home page
      if (userType == 'student') {
        Navigator.of(context).pushReplacementNamed('/student-home');
      } else if (userType == 'parent') {
        Navigator.of(context).pushReplacementNamed('/parent-home');
      } else if (userType == 'teacher') {
        Navigator.of(context).pushReplacementNamed('/teacher-home');
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
```

---

## Quick Checklist

- [ ] Update imports in login.dart
- [ ] Add flutter_secure_storage to pubspec.yaml
- [ ] Create test users in MongoDB
- [ ] Start the Node.js server
- [ ] Run Flutter app
- [ ] Test student login
- [ ] Test parent login
- [ ] Test teacher login
- [ ] Test error scenarios
- [ ] Implement token storage
- [ ] Create home pages for each user type
- [ ] Implement logout
- [ ] Test auto-login

---

## Next: Create Home Pages

After login succeeds, users need home pages. Create:
1. `student_home.dart` - Student dashboard
2. `parent_home.dart` - Parent portal
3. `teacher_home.dart` - Teacher dashboard

Each should:
- Display user information
- Show logout button
- Fetch data using stored token
- Use ApiClient for authenticated requests

---

## Additional Resources

- **API Examples**: See `API_EXAMPLES.md` for request/response format
- **Testing**: See `TEST_DATA.md` for more test scenarios
- **Integration**: See `LOGIN_INTEGRATION.md` for detailed guide

---

**Your login page is now connected to the server!** 🎉

Test it out and let me know if you need help with the next steps.
