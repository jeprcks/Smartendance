# Test Data Setup Guide

## Creating Test Users for Authentication Testing

### MongoDB Insert Commands

#### 1. Create a Test Student

```javascript
// Insert into MongoDB
db.students.insertOne({
  studentId: "STU001",
  email: "student@test.com",
  password: "Test@123",  // Will be auto-hashed on save
  fullName: "John Doe",
  phoneNumber: "1234567890",
  age: 15,
  birthDate: new Date("2009-01-15"),
  gradeLevel: "Grade 9",
  section: "A",
  gender: "Male",
  shift: "Morning",
  address: "123 Student Street",
  parentInfo: {
    name: "Jane Doe",
    relationship: "Mother",
    contact: "0987654321"
  },
  emergencyContact: {
    name: "Bob Doe",
    contactNumber: "5555555555",
    relationship: "Uncle"
  },
  photo: null,
  qrCode: {
    data: "STU001",
    generatedAt: new Date()
  }
});
```

**Login Test:**
```bash
curl -X POST http://localhost:4000/api/auth/student-login \
  -H "Content-Type: application/json" \
  -d '{"email":"student@test.com","password":"Test@123"}'
```

---

#### 2. Create a Test Parent

```javascript
// Insert into MongoDB
db.parents.insertOne({
  email: "parent@test.com",
  password: "Parent@123",  // Will be auto-hashed on save
  fullName: "Jane Parent",
  phoneNumber: "1234567890",
  gender: "Female",
  relationship: "Mother",
  occupation: "Teacher",
  photo: null,
  address: {
    street: "456 Parent Avenue",
    city: "Springfield",
    province: "Illinois",
    zipCode: "62701"
  },
  childrenIds: [ObjectId("...")],  // Reference to student ID
  emergencyContact: {
    name: "John Parent",
    contactNumber: "1111111111",
    relationship: "Spouse"
  },
  qrCode: {
    data: "PARENT001",
    generatedAt: new Date()
  }
});
```

**Login Test:**
```bash
curl -X POST http://localhost:4000/api/auth/parent-login \
  -H "Content-Type: application/json" \
  -d '{"email":"parent@test.com","password":"Parent@123"}'
```

---

#### 3. Create a Test Teacher

```javascript
// Insert into MongoDB
db.teachers.insertOne({
  teacherId: "TCH001",
  username: "john_teacher",
  password: "Teacher@123",  // Will be auto-hashed on save
  email: "teacher@test.com",
  name: "John Teacher",
  role: "Teacher",
  subject: "Mathematics",
  status: "Active",
  dateJoined: new Date("2023-01-01"),
  qualifications: ["B.Ed", "M.Sc Mathematics"],
  address: "789 Teacher Lane",
  profilePicture: null
});
```

**Login Test:**
```bash
curl -X POST http://localhost:4000/api/auth/teacher-login \
  -H "Content-Type: application/json" \
  -d '{"email":"teacher@test.com","password":"Teacher@123"}'
```

---

## Complete Test Scenario

### Step 1: Insert Test Data
Run the above MongoDB commands to create test users.

### Step 2: Test Student Login
```bash
curl -X POST http://localhost:4000/api/auth/student-login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@test.com",
    "password": "Test@123"
  }' | jq
```

**Expected Response:**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY3NWM0MWMwMTIzNDU2Nzg5MCIsImVtYWlsIjoic3R1ZGVudEB0ZXN0LmNvbSIsInJvbGUiOiJzdHVkZW50Iiwic3R1ZGVudElkIjoiU1RVMDAxIiwiaWF0IjoxNjc1NzAwMDAwLCJleHAiOjE2NzYzMDQwMDB9.signature",
  "student": {
    "_id": "675c41c012345678900",
    "studentId": "STU001",
    "fullName": "John Doe",
    "email": "student@test.com",
    "gradeLevel": "Grade 9",
    "section": "A",
    "photo": null
  }
}
```

### Step 3: Test Parent Login
```bash
curl -X POST http://localhost:4000/api/auth/parent-login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "parent@test.com",
    "password": "Parent@123"
  }' | jq
```

### Step 4: Test Teacher Login
```bash
curl -X POST http://localhost:4000/api/auth/teacher-login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teacher@test.com",
    "password": "Teacher@123"
  }' | jq
```

### Step 5: Verify Token
```bash
# Use the token from any login response
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

curl -X POST http://localhost:4000/api/auth/verify-token \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq
```

**Expected Response:**
```json
{
  "message": "Token is valid",
  "decoded": {
    "id": "675c41c012345678900",
    "email": "student@test.com",
    "role": "student",
    "studentId": "STU001",
    "iat": 1675700000,
    "exp": 1676304000
  }
}
```

---

## Error Testing

### Invalid Password
```bash
curl -X POST http://localhost:4000/api/auth/student-login \
  -H "Content-Type: application/json" \
  -d '{"email":"student@test.com","password":"WrongPassword"}'
```

**Response:**
```json
{
  "error": "Invalid email or password"
}
```

### Non-existent Email
```bash
curl -X POST http://localhost:4000/api/auth/student-login \
  -H "Content-Type: application/json" \
  -d '{"email":"nonexistent@test.com","password":"Test@123"}'
```

**Response:**
```json
{
  "error": "Invalid email or password"
}
```

### Missing Fields
```bash
curl -X POST http://localhost:4000/api/auth/student-login \
  -H "Content-Type: application/json" \
  -d '{"email":"student@test.com"}'
```

**Response:**
```json
{
  "error": "Email and password are required"
}
```

### Invalid Token
```bash
curl -X POST http://localhost:4000/api/auth/verify-token \
  -H "Authorization: Bearer invalid_token_here"
```

**Response:**
```json
{
  "error": "Invalid or expired token"
}
```

---

## Test User Credentials Summary

| Role | Email | Password | Notes |
|------|-------|----------|-------|
| Student | student@test.com | Test@123 | Grade 9, Section A |
| Parent | parent@test.com | Parent@123 | Mother, Teacher profession |
| Teacher | teacher@test.com | Teacher@123 | Mathematics subject |

---

## MongoDB Commands for Cleanup

### Delete Test Users
```javascript
// Delete student
db.students.deleteOne({ email: "student@test.com" });

// Delete parent
db.parents.deleteOne({ email: "parent@test.com" });

// Delete teacher
db.teachers.deleteOne({ email: "teacher@test.com" });
```

### View All Users
```javascript
// View all students
db.students.find({}, { password: 0 }).pretty();

// View all parents
db.parents.find({}, { password: 0 }).pretty();

// View all teachers
db.teachers.find({}, { password: 0 }).pretty();
```

### Check Password Hashing
```javascript
// View actual password in database (should be hashed)
db.students.findOne({ email: "student@test.com" });
```

The password should look like: `$2a$10$...` (bcryptjs hash format)

---

## Flutter Testing

### Using AuthService from Flutter

```dart
import 'package:mobile/services/authService.dart';

// Test student login
try {
  final response = await AuthService.studentLogin(
    'student@test.com',
    'Test@123',
  );
  print('Login successful: ${response['token']}');
} catch (e) {
  print('Login failed: $e');
}
```

### Using cURL in Terminal
```powershell
# PowerShell command
$headers = @{
  'Content-Type' = 'application/json'
}

$body = @{
  email = 'student@test.com'
  password = 'Test@123'
} | ConvertTo-Json

Invoke-WebRequest -Uri 'http://localhost:4000/api/auth/student-login' `
  -Method 'POST' `
  -Headers $headers `
  -Body $body
```

---

## Postman Collection

Import this into Postman:

```json
{
  "info": {
    "name": "Smartendance Auth API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Student Login",
      "request": {
        "method": "POST",
        "url": "http://localhost:4000/api/auth/student-login",
        "header": [{"key": "Content-Type", "value": "application/json"}],
        "body": {
          "mode": "raw",
          "raw": "{\"email\":\"student@test.com\",\"password\":\"Test@123\"}"
        }
      }
    },
    {
      "name": "Parent Login",
      "request": {
        "method": "POST",
        "url": "http://localhost:4000/api/auth/parent-login",
        "header": [{"key": "Content-Type", "value": "application/json"}],
        "body": {
          "mode": "raw",
          "raw": "{\"email\":\"parent@test.com\",\"password\":\"Parent@123\"}"
        }
      }
    },
    {
      "name": "Teacher Login",
      "request": {
        "method": "POST",
        "url": "http://localhost:4000/api/auth/teacher-login",
        "header": [{"key": "Content-Type", "value": "application/json"}],
        "body": {
          "mode": "raw",
          "raw": "{\"email\":\"teacher@test.com\",\"password\":\"Teacher@123\"}"
        }
      }
    },
    {
      "name": "Verify Token",
      "request": {
        "method": "POST",
        "url": "http://localhost:4000/api/auth/verify-token",
        "header": [
          {"key": "Content-Type", "value": "application/json"},
          {"key": "Authorization", "value": "Bearer {{token}}"}
        ]
      }
    }
  ]
}
```
