# API Examples - Request & Response

## Complete Working Examples

### 1. Student Login

#### Request
```bash
curl -X POST http://localhost:4000/api/auth/student-login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@test.com",
    "password": "Test@123"
  }'
```

#### Success Response (200)
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY3NWM0MWMwMTIzNDU2Nzg5MCIsImVtYWlsIjoic3R1ZGVudEB0ZXN0LmNvbSIsInJvbGUiOiJzdHVkZW50Iiwic3R1ZGVudElkIjoiU1RVMDAxIiwiaWF0IjoxNjc1NzAwMDAwLCJleHAiOjE2NzYzMDQwMDB9.SampleSignatureHere",
  "student": {
    "_id": "675c41c0123456789abcdef0",
    "studentId": "STU001",
    "fullName": "John Doe",
    "email": "student@test.com",
    "gradeLevel": "Grade 9",
    "section": "A",
    "photo": null
  }
}
```

#### Error: Invalid Password (401)
```json
{
  "error": "Invalid email or password"
}
```

#### Error: User Not Found (401)
```json
{
  "error": "Invalid email or password"
}
```

#### Error: Missing Fields (400)
```json
{
  "error": "Email and password are required"
}
```

---

### 2. Parent Login

#### Request
```bash
curl -X POST http://localhost:4000/api/auth/parent-login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "parent@test.com",
    "password": "Parent@123"
  }'
```

#### Success Response (200)
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY3NWM0MWMwYWJjZGVmMDEyMzQ1Njc4OSIsImVtYWlsIjoicGFyZW50QHRlc3QuY29tIiwicm9sZSI6InBhcmVudCIsImlhdCI6MTY3NTcwMDAwMCwiZXhwIjoxNjc2MzA0MDAwfQ.SampleSignatureHere",
  "parent": {
    "_id": "675c41c0abcdef0123456789",
    "fullName": "Jane Parent",
    "email": "parent@test.com",
    "relationship": "Mother",
    "photo": null,
    "childrenIds": [
      "675c41c0123456789abcdef0"
    ]
  }
}
```

---

### 3. Teacher Login

#### Request
```bash
curl -X POST http://localhost:4000/api/auth/teacher-login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teacher@test.com",
    "password": "Teacher@123"
  }'
```

#### Success Response (200)
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY3NWM0MWMwMTIzNDU2Nzg5YWJjZGVmMCIsImVtYWlsIjoidGVhY2hlckB0ZXN0LmNvbSIsInJvbGUiOiJ0ZWFjaGVyIiwidGVhY2hlcklkIjoiVENIMDAxIiwiaWF0IjoxNjc1NzAwMDAwLCJleHAiOjE2NzYzMDQwMDB9.SampleSignatureHere",
  "teacher": {
    "_id": "675c41c0123456789abcdef1",
    "teacherId": "TCH001",
    "name": "John Teacher",
    "email": "teacher@test.com",
    "subject": "Mathematics",
    "role": "Teacher",
    "profilePicture": null
  }
}
```

---

### 4. Verify Token

#### Request
```bash
curl -X POST http://localhost:4000/api/auth/verify-token \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY3NWM0MWMwMTIzNDU2Nzg5MCIsImVtYWlsIjoic3R1ZGVudEB0ZXN0LmNvbSIsInJvbGUiOiJzdHVkZW50Iiwic3R1ZGVudElkIjoiU1RVMDAxIiwiaWF0IjoxNjc1NzAwMDAwLCJleHAiOjE2NzYzMDQwMDB9.SampleSignatureHere"
```

#### Success Response (200)
```json
{
  "message": "Token is valid",
  "decoded": {
    "id": "675c41c0123456789abcdef0",
    "email": "student@test.com",
    "role": "student",
    "studentId": "STU001",
    "iat": 1675700000,
    "exp": 1676304000
  }
}
```

#### Error: No Token (401)
```json
{
  "error": "No token provided"
}
```

#### Error: Invalid Token (401)
```json
{
  "error": "Invalid or expired token"
}
```

#### Error: Expired Token (401)
```json
{
  "error": "Invalid or expired token"
}
```

---

## Flutter Implementation Examples

### Using AuthService

#### Student Login
```dart
import 'package:mobile/services/authService.dart';

try {
  final response = await AuthService.studentLogin(
    'student@test.com',
    'Test@123'
  );
  
  print('Token: ${response['token']}');
  print('Student: ${response['student']['fullName']}');
  
} catch (e) {
  print('Login failed: $e');
}
```

#### Parent Login
```dart
try {
  final response = await AuthService.parentLogin(
    'parent@test.com',
    'Parent@123'
  );
  
  print('Token: ${response['token']}');
  print('Parent: ${response['parent']['fullName']}');
  
} catch (e) {
  print('Login failed: $e');
}
```

#### Teacher Login
```dart
try {
  final response = await AuthService.teacherLogin(
    'teacher@test.com',
    'Teacher@123'
  );
  
  print('Token: ${response['token']}');
  print('Teacher: ${response['teacher']['name']}');
  
} catch (e) {
  print('Login failed: $e');
}
```

#### Verify Token
```dart
try {
  final token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
  final response = await AuthService.verifyToken(token);
  
  print('Token is valid');
  print('User role: ${response['decoded']['role']}');
  
} catch (e) {
  print('Token verification failed: $e');
}
```

---

## Advanced: Using Protected Endpoints

### Example: Protected Student API Call

#### First: Login to get token
```dart
final loginResponse = await AuthService.studentLogin(
  'student@test.com',
  'Test@123'
);
final token = loginResponse['token'];
```

#### Then: Use token in subsequent requests
```dart
final response = await http.get(
  Uri.parse('http://localhost:4000/api/students/STU001'),
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer $token',
  },
);

if (response.statusCode == 200) {
  print('Student data: ${response.body}');
} else {
  print('Error: ${response.statusCode}');
}
```

---

## Postman Collection Format

```json
{
  "info": {
    "name": "Smartendance Auth API",
    "version": "1.0.0"
  },
  "item": [
    {
      "name": "Student Login",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\"email\":\"student@test.com\",\"password\":\"Test@123\"}"
        },
        "url": {
          "raw": "http://localhost:4000/api/auth/student-login",
          "protocol": "http",
          "host": ["localhost"],
          "port": "4000",
          "path": ["api", "auth", "student-login"]
        }
      }
    },
    {
      "name": "Parent Login",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\"email\":\"parent@test.com\",\"password\":\"Parent@123\"}"
        },
        "url": {
          "raw": "http://localhost:4000/api/auth/parent-login",
          "protocol": "http",
          "host": ["localhost"],
          "port": "4000",
          "path": ["api", "auth", "parent-login"]
        }
      }
    },
    {
      "name": "Teacher Login",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\"email\":\"teacher@test.com\",\"password\":\"Teacher@123\"}"
        },
        "url": {
          "raw": "http://localhost:4000/api/auth/teacher-login",
          "protocol": "http",
          "host": ["localhost"],
          "port": "4000",
          "path": ["api", "auth", "teacher-login"]
        }
      }
    },
    {
      "name": "Verify Token",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{token}}"
          }
        ],
        "url": {
          "raw": "http://localhost:4000/api/auth/verify-token",
          "protocol": "http",
          "host": ["localhost"],
          "port": "4000",
          "path": ["api", "auth", "verify-token"]
        }
      }
    }
  ],
  "variable": [
    {
      "key": "token",
      "value": "your_jwt_token_here"
    }
  ]
}
```

---

## PowerShell Examples

### Student Login
```powershell
$headers = @{
  'Content-Type' = 'application/json'
}

$body = @{
  email = 'student@test.com'
  password = 'Test@123'
} | ConvertTo-Json

$response = Invoke-WebRequest -Uri 'http://localhost:4000/api/auth/student-login' `
  -Method 'POST' `
  -Headers $headers `
  -Body $body

$response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
```

### Verify Token
```powershell
$token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'

$headers = @{
  'Authorization' = "Bearer $token"
}

$response = Invoke-WebRequest -Uri 'http://localhost:4000/api/auth/verify-token' `
  -Method 'POST' `
  -Headers $headers

$response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
```

---

## Token Structure (Decoded)

When you decode a JWT token, it contains:

```json
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "id": "675c41c0123456789abcdef0",
    "email": "student@test.com",
    "role": "student",
    "studentId": "STU001",
    "iat": 1675700000,
    "exp": 1676304000
  },
  "signature": "SampleSignatureCreatedWithJWT_SECRET"
}
```

**Note**: The token is URL-safe Base64 encoded and signed. Never decode sensitive info client-side.

---

## Common HTTP Status Codes

| Code | Meaning | When Returned |
|------|---------|---------------|
| 200 | OK | Successful login/verification |
| 400 | Bad Request | Missing email or password |
| 401 | Unauthorized | Invalid credentials or token |
| 403 | Forbidden | User role doesn't match |
| 500 | Server Error | Unexpected server issue |

---

## Testing Checklist

- [ ] Student login works with correct credentials
- [ ] Student login fails with wrong password
- [ ] Parent login works
- [ ] Teacher login works
- [ ] Token verify works with valid token
- [ ] Token verify fails with invalid token
- [ ] Error messages are appropriate
- [ ] Tokens contain correct user data
- [ ] Tokens have correct expiration

---

## Production Deployment Notes

1. Change JWT_SECRET to a strong, random value
2. Use HTTPS instead of HTTP
3. Set NODE_ENV=production
4. Enable database authentication
5. Set up proper logging
6. Monitor token validation rates
7. Implement rate limiting per user
8. Set up alerts for failed login attempts
9. Use secure token storage (never localStorage)
10. Implement token refresh mechanism

---

**Ready to integrate with your Flutter app!**
