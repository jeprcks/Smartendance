# Login Integration Guide

## Quick Start - Integrating Authentication into Flutter Login Page

This guide shows how to connect the Flutter login page to the new authentication API.

## Step 1: Update the Login Page

The login page already exists at `mobile/lib/loginpage.dart/login.dart`. Here's how to integrate authentication:

### Import the AuthService
```dart
import 'package:mobile/services/authService.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
```

### Store JWT Token Securely
Add to pubspec.yaml:
```yaml
dependencies:
  flutter_secure_storage: ^9.0.0
```

Then initialize it:
```dart
const secureStorage = FlutterSecureStorage();
```

### Update Login Logic

#### For Student Login:
```dart
void _studentLogin() async {
  if (!_validateFields()) return;

  setState(() => isLoading = true);
  try {
    final response = await AuthService.studentLogin(
      _emailController.text,
      _passwordController.text,
    );

    // Store token securely
    await secureStorage.write(
      key: 'auth_token',
      value: response['token'],
    );
    
    // Store user data
    final studentData = jsonEncode(response['student']);
    await secureStorage.write(
      key: 'user_data',
      value: studentData,
    );

    // Navigate to home page
    Navigator.of(context).pushReplacementNamed('/student-home');
  } catch (e) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Login failed: ${e.toString()}')),
    );
  } finally {
    setState(() => isLoading = false);
  }
}
```

#### For Parent Login:
```dart
void _parentLogin() async {
  if (!_validateFields()) return;

  setState(() => isLoading = true);
  try {
    final response = await AuthService.parentLogin(
      _emailController.text,
      _passwordController.text,
    );

    await secureStorage.write(
      key: 'auth_token',
      value: response['token'],
    );
    
    final parentData = jsonEncode(response['parent']);
    await secureStorage.write(
      key: 'user_data',
      value: parentData,
    );

    Navigator.of(context).pushReplacementNamed('/parent-home');
  } catch (e) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Login failed: ${e.toString()}')),
    );
  } finally {
    setState(() => isLoading = false);
  }
}
```

#### For Teacher Login:
```dart
void _teacherLogin() async {
  if (!_validateFields()) return;

  setState(() => isLoading = true);
  try {
    final response = await AuthService.teacherLogin(
      _emailController.text,
      _passwordController.text,
    );

    await secureStorage.write(
      key: 'auth_token',
      value: response['token'],
    );
    
    final teacherData = jsonEncode(response['teacher']);
    await secureStorage.write(
      key: 'user_data',
      value: teacherData,
    );

    Navigator.of(context).pushReplacementNamed('/teacher-home');
  } catch (e) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Login failed: ${e.toString()}')),
    );
  } finally {
    setState(() => isLoading = false);
  }
}
```

## Step 2: Create Logout Functionality

```dart
Future<void> logout() async {
  await secureStorage.delete(key: 'auth_token');
  await secureStorage.delete(key: 'user_data');
  
  Navigator.of(context).pushReplacementNamed('/login');
}
```

## Step 3: Create Protected API Interceptor

```dart
class ApiClient extends http.BaseClient {
  @override
  Future<http.StreamedResponse> send(http.BaseRequest request) async {
    // Add authorization header to all requests
    final token = await secureStorage.read(key: 'auth_token');
    
    if (token != null) {
      request.headers['Authorization'] = 'Bearer $token';
    }

    return super.send(request);
  }
}
```

## Step 4: Retrieve Stored User Data

```dart
Future<Map<String, dynamic>> getUserData() async {
  final jsonString = await secureStorage.read(key: 'user_data');
  if (jsonString != null) {
    return jsonDecode(jsonString);
  }
  return {};
}
```

## Step 5: Auto-Login Check

Add to App's main.dart or splash screen:

```dart
void _checkLoginStatus() async {
  final token = await secureStorage.read(key: 'auth_token');
  
  if (token != null) {
    try {
      // Verify token is still valid
      await AuthService.verifyToken(token);
      
      // Navigate to appropriate home page
      final userData = await getUserData();
      
      if (userData['role'] == 'student') {
        Navigator.of(context).pushReplacementNamed('/student-home');
      } else if (userData['role'] == 'parent') {
        Navigator.of(context).pushReplacementNamed('/parent-home');
      } else if (userData['role'] == 'teacher') {
        Navigator.of(context).pushReplacementNamed('/teacher-home');
      }
    } catch (e) {
      // Token invalid, go to login
      Navigator.of(context).pushReplacementNamed('/login');
    }
  }
}
```

## Testing the Authentication

### 1. First, create test users in MongoDB

**For Students:**
```bash
db.students.insertOne({
  studentId: "STU001",
  email: "student@example.com",
  password: "password123",  // Will be auto-hashed
  fullName: "John Student",
  phoneNumber: "1234567890",
  age: 15,
  birthDate: new Date("2009-01-01"),
  gradeLevel: "Grade 9",
  section: "A",
  gender: "Male",
  shift: "Morning"
})
```

**For Parents:**
```bash
db.parents.insertOne({
  email: "parent@example.com",
  password: "password123",  // Will be auto-hashed
  fullName: "Jane Parent",
  phoneNumber: "1234567890",
  gender: "Female",
  relationship: "Mother",
  address: {
    street: "123 Main St",
    city: "Springfield",
    province: "State",
    zipCode: "12345"
  }
})
```

### 2. Test with cURL

```bash
# Student Login
curl -X POST http://localhost:4000/api/auth/student-login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@example.com",
    "password": "password123"
  }'

# Response:
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "student": {
    "_id": "...",
    "studentId": "STU001",
    "fullName": "John Student",
    "email": "student@example.com",
    "gradeLevel": "Grade 9",
    "section": "A",
    "photo": null
  }
}
```

### 3. Test Protected Route

```bash
# Use token from login response
curl -X GET http://localhost:4000/api/students/STU001 \
  -H "Authorization: Bearer <token_here>"
```

## Common Issues & Solutions

### Issue: "Invalid or expired token"
- **Cause**: Token expired (after 7 days) or JWT_SECRET mismatch
- **Solution**: Log in again to get a new token

### Issue: "Invalid email or password"
- **Cause**: User doesn't exist or password is wrong
- **Solution**: Check email/password and ensure user exists in database

### Issue: CORS error when logging in
- **Cause**: Mobile app URL not in CORS whitelist
- **Solution**: Update CORS configuration in `server/index.js`

### Issue: Cannot find AuthService
- **Cause**: File path incorrect or not imported
- **Solution**: Ensure `mobile/lib/services/authService.dart` exists and import is correct

## API Response Formats

### Success (200)
```json
{
  "message": "Login successful",
  "token": "jwt_token_string",
  "student|parent|teacher": {
    "_id": "mongodb_id",
    "fullName": "Name",
    "email": "email@example.com",
    ...additional fields...
  }
}
```

### Error (401)
```json
{
  "error": "Invalid email or password"
}
```

### Error (400)
```json
{
  "error": "Email and password are required"
}
```

## Next Steps

1. ✅ Add AuthService to project
2. ✅ Integrate login methods into login page
3. ✅ Add token storage using flutter_secure_storage
4. ✅ Create logout functionality
5. ✅ Add auto-login check
6. Create home pages for each user type (student/parent/teacher)
7. Add protected routes using authorization header
8. Implement refresh token mechanism for long-term sessions

## Files Reference

- **Auth Service**: `mobile/lib/services/authService.dart`
- **Auth Controller**: `server/controllers/authController.js`
- **Auth Routes**: `server/routes/authRoutes.js`
- **Auth Middleware**: `server/middleware/authMiddleware.js`
- **Student Schema**: `server/models/studentsSchema.js`
- **Parent Schema**: `server/models/parentsSchema.js`
- **Teacher Schema**: `server/models/teacherSchema.js`
