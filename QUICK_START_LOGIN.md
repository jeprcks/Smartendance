# 🚀 Quick Start: Test Login Now

## 1-Minute Setup to Test Authentication

### Prerequisites
✅ Node.js running
✅ MongoDB running
✅ Flutter SDK installed

---

## Quick Start (5 minutes)

### Step 1: Create Test User (1 minute)

Open MongoDB Compass or mongosh and run:

```javascript
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
  shift: "Morning"
})
```

### Step 2: Start Server (1 minute)

```bash
cd d:\Smartendance\server
npm start
```

Wait for: `Server is running on port 4000`

### Step 3: Update pubspec.yaml (1 minute)

In `d:\Smartendance\mobile\pubspec.yaml`, add:

```yaml
dependencies:
  flutter:
    sdk: flutter
  cupertino_icons: ^1.0.2
  mobile_scanner: ^4.0.0
  http: ^1.1.0
  flutter_secure_storage: ^9.0.0
```

### Step 4: Run Flutter (1 minute)

```bash
cd d:\Smartendance\mobile
flutter pub get
flutter run
```

### Step 5: Test Login (1 minute)

1. App opens on login page
2. Make sure you're on the **Student** tab (swipe if needed)
3. Enter:
   - Email: `student@test.com`
   - Password: `Test@123`
4. Click "Login as Student"
5. See: "Welcome John Doe!" ✅

---

## Test Parent Login

### Create Parent User

```javascript
db.parents.insertOne({
  email: "parent@test.com",
  password: "Parent@123",
  fullName: "Jane Parent",
  phoneNumber: "0987654321",
  gender: "Female",
  relationship: "Mother",
  address: {
    street: "456 Oak Ave",
    city: "Springfield",
    province: "State",
    zipCode: "54321"
  }
})
```

### Test
1. Swipe to **Parent** tab
2. Email: `parent@test.com`
3. Password: `Parent@123`
4. Click "Login as Parent"
5. See: "Welcome Jane Parent!" ✅

---

## Test Teacher Login

### Create Teacher User

```javascript
db.teachers.insertOne({
  teacherId: "TCH001",
  email: "teacher@test.com",
  password: "Teacher@123",
  name: "John Teacher",
  username: "jteacher",
  role: "Teacher",
  subject: "Mathematics",
  status: "Active"
})
```

### Test
1. Swipe to **Teacher** tab
2. Email: `teacher@test.com`
3. Password: `Teacher@123`
4. Click "Login as Teacher"
5. See: "Welcome John Teacher!" ✅

---

## Verify It's Working

### Check Debug Console

When login succeeds, you should see in Flutter debug console:

```
Login successful!
Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
User Data: {fullName: John Doe, studentId: STU001, ...}
```

### Test with cURL

While server is running, open PowerShell and run:

```bash
curl -X POST http://localhost:4000/api/auth/student-login `
  -H "Content-Type: application/json" `
  -d '{"email":"student@test.com","password":"Test@123"}'
```

Should return:
```json
{
  "message": "Login successful",
  "token": "eyJ...",
  "student": {
    "_id": "...",
    "studentId": "STU001",
    "fullName": "John Doe"
  }
}
```

---

## Troubleshooting

### "Connection refused"
**Problem**: Server not running
**Solution**: 
```bash
cd d:\Smartendance\server
npm start
```

### "Invalid email or password"
**Problem**: Test user doesn't exist or wrong credentials
**Solution**: 
1. Check MongoDB - does user exist?
2. Verify email and password exactly
3. Recreate user with exact commands above

### "Cannot find authService"
**Problem**: File path incorrect
**Solution**: 
- Check: `mobile/lib/services/authService.dart` exists
- Check imports in login.dart are correct

### Flutter won't run
**Problem**: Dependencies missing
**Solution**:
```bash
cd d:\Smartendance\mobile
flutter pub get
flutter clean
flutter run
```

### "CORS error"
**Problem**: Origin not allowed
**Solution**: Server CORS is already configured. Make sure you're using correct port (4000)

---

## Next Steps After Testing

1. **Store Token**: Add `flutter_secure_storage` integration
2. **Create Home Pages**: Student/Parent/Teacher dashboards
3. **Implement Logout**: Clear token and navigate back
4. **Auto-Login**: Check token on app start

See: `FLUTTER_LOGIN_SETUP.md` for complete setup guide

---

## Success Checklist

- [ ] MongoDB has test users
- [ ] Server running on port 4000
- [ ] Flutter app runs
- [ ] Student login works
- [ ] Parent login works  
- [ ] Teacher login works
- [ ] Debug console shows token
- [ ] Success message appears

---

## Files Reference

| File | Purpose |
|------|---------|
| `server/controllers/authController.js` | Backend login logic |
| `server/routes/authRoutes.js` | API endpoints |
| `mobile/lib/services/authService.dart` | Flutter API calls |
| `mobile/lib/loginpage.dart/login.dart` | UI + integration |
| `FLUTTER_LOGIN_SETUP.md` | Complete setup guide |

---

**Ready to test? Start with Step 1! 🎉**

Questions? Check the troubleshooting section or see detailed guides in documentation files.
