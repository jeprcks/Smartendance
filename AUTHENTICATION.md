# Authentication Implementation Guide

## Overview
This document outlines the complete authentication system implemented for Smartendance with email/password login for Students, Parents, and Teachers.

## Database Schema Changes

### 1. Student Schema (`server/models/studentsSchema.js`)
Added password field with hashing:
```javascript
password: {
    type: String,
    required: true,
    minlength: 6
}
```
- **Password Hashing**: Automatic bcryptjs hashing (10 salt rounds) on save via pre-save hook
- **Security**: Passwords are never stored in plain text

### 2. Parent Schema (`server/models/parentsSchema.js`)
Added password field with hashing:
```javascript
password: {
    type: String,
    required: true,
    minlength: 6
}
```
- **Password Hashing**: Same bcryptjs implementation
- **Automatic Protection**: Hash applied before database storage

### 3. Teacher Schema (`server/models/teacherSchema.js`)
Already contains password field - no changes needed

## Backend API Implementation

### New Files Created

#### 1. Authentication Controller (`server/controllers/authController.js`)
Handles all authentication logic:

**Endpoints:**
- `POST /api/auth/student-login` - Student authentication
- `POST /api/auth/parent-login` - Parent authentication
- `POST /api/auth/teacher-login` - Teacher authentication
- `POST /api/auth/verify-token` - JWT token verification

**Features:**
- Email validation (must exist in database)
- Password verification using bcrypt.compare()
- JWT token generation (7-day expiry)
- User data return (without password)
- Error handling for invalid credentials

**JWT Token Payload:**
```javascript
{
  id: user._id,
  email: user.email,
  role: 'student|parent|teacher',
  [studentId|teacherId]: specific_id
}
```

#### 2. Authentication Routes (`server/routes/authRoutes.js`)
Express routes for all auth endpoints:
- POST `/student-login`
- POST `/parent-login`
- POST `/teacher-login`
- POST `/verify-token`

#### 3. Authentication Middleware (`server/middleware/authMiddleware.js`)
Reusable middleware for route protection:

**Functions:**
- `verifyTokenMiddleware` - Validates JWT tokens
- `checkRole(...allowedRoles)` - Role-based access control

**Usage:**
```javascript
router.get('/protected', verifyTokenMiddleware, checkRole('student'), handler);
```

### Server Configuration
Updated `server/index.js` to register auth routes:
```javascript
app.use("/api/auth", authRoutes);
```

## Frontend Implementation

### Flutter Auth Service (`mobile/lib/services/authService.dart`)
Dart service for API communication:

**Methods:**
- `studentLogin(email, password)` - Login as student
- `parentLogin(email, password)` - Login as parent
- `teacherLogin(email, password)` - Login as teacher
- `verifyToken(token)` - Validate JWT token

**Returns:**
```json
{
  "message": "Login successful",
  "token": "jwt_token_here",
  "student|parent|teacher": {
    "_id": "...",
    "fullName": "...",
    "email": "...",
    ...
  }
}
```

## Login Flow

### 1. User Submits Credentials
- Email and password sent to appropriate endpoint
- Example: `/api/auth/student-login`

### 2. Server Validation
- Find user by email in database
- Compare submitted password with stored hash using bcrypt
- If invalid: Return 401 error
- If valid: Continue to token generation

### 3. JWT Token Generation
- Create token with user info and 7-day expiry
- Return token and user data to client

### 4. Client Storage & Use
- Store token in device storage (use flutter_secure_storage)
- Include token in Authorization header for protected requests:
  ```
  Authorization: Bearer <token>
  ```

### 5. Protected Routes
- Middleware validates token before allowing access
- Invalid/expired tokens return 401 error
- Wrong role returns 403 error

## Security Features

### Password Security
- ✅ Minimum 6 characters validation
- ✅ Automatic bcrypt hashing (10 salt rounds)
- ✅ Never stored in plain text
- ✅ Never returned in API responses

### Token Security
- ✅ JWT with 7-day expiration
- ✅ Signed with secret key (use environment variable in production)
- ✅ Role-based access control support
- ✅ Token verification endpoint

### API Security
- ✅ CORS configuration for allowed origins
- ✅ Rate limiting (100 requests per 15 minutes)
- ✅ Input validation on all endpoints
- ✅ Proper HTTP status codes

## Environment Variables Required

Add to `.env` file:
```env
JWT_SECRET=your-secure-secret-key-here
JWT_EXPIRE=7d
MONGODB_URI=mongodb+srv://...
PORT=4000
```

## Dependencies Installed

- `bcryptjs` - Password hashing
- `jsonwebtoken` - JWT token generation
- `express-rate-limit` - API rate limiting
- `cors` - Cross-origin requests

## Error Responses

### Invalid Credentials (401)
```json
{
  "error": "Invalid email or password"
}
```

### Missing Fields (400)
```json
{
  "error": "Email and password are required"
}
```

### Invalid Token (401)
```json
{
  "error": "Invalid or expired token"
}
```

### Insufficient Permissions (403)
```json
{
  "error": "Insufficient permissions"
}
```

## Next Steps for Mobile Integration

1. Add `http` package to `pubspec.yaml` if not already present
2. Use `flutter_secure_storage` to store JWT token securely
3. Update login page to call `AuthService` methods
4. Store returned token and user data
5. Add `verifyTokenMiddleware` to protected routes
6. Implement logout functionality (clear stored token)

## Testing Authentication

### Using cURL

**Student Login:**
```bash
curl -X POST http://localhost:4000/api/auth/student-login \
  -H "Content-Type: application/json" \
  -d '{"email":"student@example.com","password":"password123"}'
```

**Parent Login:**
```bash
curl -X POST http://localhost:4000/api/auth/parent-login \
  -H "Content-Type: application/json" \
  -d '{"email":"parent@example.com","password":"password123"}'
```

**Verify Token:**
```bash
curl -X POST http://localhost:4000/api/auth/verify-token \
  -H "Authorization: Bearer <token_here>"
```

## API Endpoint Summary

| Method | Endpoint | Body | Returns |
|--------|----------|------|---------|
| POST | `/api/auth/student-login` | {email, password} | {token, student} |
| POST | `/api/auth/parent-login` | {email, password} | {token, parent} |
| POST | `/api/auth/teacher-login` | {email, password} | {token, teacher} |
| POST | `/api/auth/verify-token` | Bearer token in header | {decoded JWT data} |

## Files Modified/Created

### Created:
- `server/controllers/authController.js` - Authentication logic
- `server/routes/authRoutes.js` - Auth API routes
- `server/middleware/authMiddleware.js` - Token verification middleware
- `mobile/lib/services/authService.dart` - Flutter authentication service

### Modified:
- `server/models/studentsSchema.js` - Added password field + hashing middleware
- `server/models/parentsSchema.js` - Added password field + hashing middleware
- `server/index.js` - Registered auth routes
