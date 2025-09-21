# Teacher API Documentation

This document describes the Teacher API endpoints for the Smartendance system.

## Base URL
```
http://localhost:4000/api/teachers
```

## Teacher Schema

```javascript
{
  teacherId: String (unique, auto-generated)
  username: String (unique, required)
  name: String (required)
  role: String (enum: 'Teacher', 'Head Teacher', 'Department Head', 'Principal')
  subject: String (required)
  email: String (unique, required)
  phoneNumber: String (required)
  password: String (required, hashed)
  dateJoined: Date (default: now)
  status: String (enum: 'Active', 'Inactive', 'Suspended')
  department: String (optional)
  qualifications: Array (optional)
  address: Object (optional)
  emergencyContact: Object (optional)
  schedule: Array (optional)
  profilePicture: String (optional)
  lastLogin: Date (optional)
  isVerified: Boolean (default: false)
  verificationToken: String (optional)
}
```

## API Endpoints

### 1. Create Teacher
**POST** `/api/teachers`

**Request Body:**
```json
{
  "username": "jdoe",
  "name": "John Doe",
  "role": "Teacher",
  "subject": "Mathematics",
  "email": "john.doe@school.edu",
  "phoneNumber": "123-456-7890",
  "password": "password123",
  "department": "Mathematics Department",
  "qualifications": [
    {
      "degree": "Master of Education",
      "institution": "University of Education",
      "year": 2020
    }
  ],
  "address": {
    "street": "123 Main St",
    "city": "City",
    "province": "Province",
    "zipCode": "12345"
  },
  "emergencyContact": {
    "name": "Jane Doe",
    "relationship": "Spouse",
    "contactNumber": "098-765-4321"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Teacher created successfully",
  "teacher": {
    "_id": "...",
    "teacherId": "TCH-2025001",
    "username": "jdoe",
    "name": "John Doe",
    "role": "Teacher",
    "subject": "Mathematics",
    "email": "john.doe@school.edu",
    "phoneNumber": "123-456-7890",
    "dateJoined": "2025-01-18T...",
    "status": "Active",
    "fullName": "John Doe",
    "yearsOfExperience": 0,
    "createdAt": "2025-01-18T...",
    "updatedAt": "2025-01-18T..."
  }
}
```

### 2. Get All Teachers
**GET** `/api/teachers`

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 50)
- `search` (optional): Search term
- `subject` (optional): Filter by subject
- `status` (optional): Filter by status
- `role` (optional): Filter by role

**Response:**
```json
{
  "success": true,
  "teachers": [...],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalTeachers": 250,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### 3. Get Teacher by ID
**GET** `/api/teachers/:id`

**Response:**
```json
{
  "success": true,
  "teacher": {
    "_id": "...",
    "teacherId": "TCH-2025001",
    "username": "jdoe",
    "name": "John Doe",
    // ... other fields
  }
}
```

### 4. Get Teacher by Teacher ID
**GET** `/api/teachers/teacher-id/:teacherId`

**Response:**
```json
{
  "success": true,
  "teacher": {
    "_id": "...",
    "teacherId": "TCH-2025001",
    "username": "jdoe",
    "name": "John Doe",
    // ... other fields
  }
}
```

### 5. Update Teacher
**PUT** `/api/teachers/:id`

**Request Body:**
```json
{
  "name": "John Smith",
  "subject": "Advanced Mathematics",
  "department": "Mathematics Department"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Teacher updated successfully",
  "teacher": {
    // Updated teacher object
  }
}
```

### 6. Delete Teacher
**DELETE** `/api/teachers/:id`

**Response:**
```json
{
  "success": true,
  "message": "Teacher deleted successfully"
}
```

### 7. Change Password
**PUT** `/api/teachers/:id/change-password`

**Request Body:**
```json
{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

### 8. Get Teacher Statistics
**GET** `/api/teachers/stats`

**Response:**
```json
{
  "success": true,
  "stats": {
    "active": 45,
    "inactive": 3,
    "suspended": 1,
    "total": 49
  }
}
```

### 9. Search Teachers
**GET** `/api/teachers/search?query=john`

**Response:**
```json
{
  "success": true,
  "teachers": [
    // Array of matching teachers
  ]
}
```

### 10. Get Teachers by Subject
**GET** `/api/teachers/by-subject?subject=Mathematics`

**Response:**
```json
{
  "success": true,
  "teachers": [
    // Array of teachers teaching Mathematics
  ]
}
```

## Error Responses

All endpoints return errors in the following format:

```json
{
  "error": "Error message description"
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors, missing fields)
- `404` - Not Found
- `409` - Conflict (duplicate username/email)
- `500` - Internal Server Error

## Frontend Integration

The frontend uses the `teacherService` to interact with the API:

```typescript
import { teacherService } from './services/teacherService';

// Get all teachers
const teachers = await teacherService.getAllTeachers({
  search: 'john',
  page: 1,
  limit: 10
});

// Create new teacher
const newTeacher = await teacherService.createTeacher({
  username: 'jdoe',
  name: 'John Doe',
  subject: 'Mathematics',
  email: 'john@school.edu',
  phoneNumber: '123-456-7890',
  password: 'password123'
});
```

## Security Features

- Passwords are hashed using bcrypt
- Password field is excluded from API responses
- Input validation on all fields
- Unique constraints on username and email
- Rate limiting on all endpoints
