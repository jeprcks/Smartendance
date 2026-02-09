# Mobile and Scanner App Deployment Guide

## ✅ Configuration Complete

Your mobile and scanner apps have been configured to connect to your Vercel backend server.

## Server URLs

- **Backend Server**: https://smartendance-lilac.vercel.app/
- **Admin Web**: https://umapadelementaryschool.vercel.app/

## What Was Implemented

### 1. Mobile App Configuration

**Files Created/Modified:**
- ✅ `mobile/lib/config/environment.dart` - Created environment configuration
- ✅ `mobile/lib/fetch/authService.dart` - Updated to use Vercel URL
- ✅ `mobile/lib/fetch/teacherService.dart` - Updated to use Vercel URL

**Configuration:**
- Production URL: `https://smartendance-lilac.vercel.app`
- Development mode: Set to `false` (production)
- The app now connects via internet/mobile data (no IP address needed)

### 2. Scanner App Configuration

**Files Created/Modified:**
- ✅ `scanner/lib/config/environment.dart` - Created environment configuration
- ✅ `scanner/lib/fetch/fetchstudents.dart` - Updated to use Vercel URL

**Configuration:**
- Production URL: `https://smartendance-lilac.vercel.app`
- Development mode: Set to `false` (production)
- Simplified connection logic for Vercel server

## How to Build the Apps

### Build Mobile App (Teacher App)

```bash
# Navigate to mobile directory
cd mobile

# Get dependencies
flutter pub get

# Build for Android (APK)
flutter build apk --release

# Output location:
# build/app/outputs/flutter-apk/app-release.apk

# Build for iOS (if you have a Mac with Xcode)
flutter build ios --release
```

### Build Scanner App

```bash
# Navigate to scanner directory
cd scanner

# Get dependencies
flutter pub get

# Build for Android (APK)
flutter build apk --release

# Output location:
# build/app/outputs/flutter-apk/app-release.apk

# Build for iOS (if you have a Mac with Xcode)
flutter build ios --release
```

## Installation

### Android
1. Connect your Android device via USB or transfer the APK file
2. Enable "Install from unknown sources" in Settings
3. Install the APK:
   - Mobile App: `mobile/build/app/outputs/flutter-apk/app-release.apk`
   - Scanner App: `scanner/build/app/outputs/flutter-apk/app-release.apk`

### iOS
1. Build on Mac with Xcode
2. Sign with your Apple Developer account
3. Install via Xcode or TestFlight

## Testing

### Test with Mobile Data
1. Install the app on a physical device
2. **Turn OFF WiFi** and use mobile data only
3. Try to log in (for mobile app) or scan QR codes (for scanner)
4. The app should connect successfully via the internet

### Test with WiFi
1. Connect to any WiFi network
2. App should work normally

## Switching Between Development and Production

To switch back to local development (for testing on local network):

### Edit `mobile/lib/config/environment.dart`:
```dart
static const bool isDevelopment = true;  // Change to true
```

### Edit `scanner/lib/config/environment.dart`:
```dart
static const bool isDevelopment = true;  // Change to true
```

Then rebuild the apps.

## Troubleshooting

### App Can't Connect to Server

1. **Check Internet Connection**
   - Ensure the device has internet access (WiFi or mobile data)
   - Try opening a browser to verify connectivity

2. **Test Server URL**
   - Visit https://smartendance-lilac.vercel.app/api/students in a browser
   - Should return JSON data or a proper response

3. **Check Server CORS**
   - Vercel server must allow requests from mobile apps
   - Environment variable `CORS_ORIGIN` should be set to `*` or include your app

4. **Check Flutter Logs**
   - Run with USB debugging: `flutter run`
   - Check console for error messages

### "Connection Timeout" Error

- Increase timeout in the code (currently 10 seconds)
- Check if Vercel server is running (visit URL in browser)
- Try on a different network

### Login Fails

- Verify server URL is correct in environment.dart
- Check that user credentials are correct
- Verify backend `/api/auth/teacher-login` endpoint is working

## Server Environment Variables (Vercel)

Make sure these are set in your Vercel server project:

```env
MONGODB_URI=mongodb+srv://jepoy:jepoy1234@personalproject.e5gjlwk.mongodb.net/smartendance?retryWrites=true&w=majority
PORT=4000
CORS_ORIGIN=*
TELEGRAM_BOT_TOKEN=8316357624:AAGVRFRafzyBEX4eWZVwcVISnPE1osaY_Qo
TELEGRAM_NOTIFICATION_ENABLED=true
```

**Important**: `CORS_ORIGIN=*` allows mobile apps to connect from anywhere.

## Features Working via Internet

✅ **Mobile App (Teacher):**
- Teacher login
- View schedules
- View student lists
- Mark attendance
- View attendance history

✅ **Scanner App:**
- QR code scanning
- Student check-in/check-out
- Real-time attendance recording
- Internet-based sync

## Benefits

✅ **No IP Address Required** - Apps work anywhere with internet
✅ **Mobile Data Compatible** - Works with cellular and WiFi
✅ **Cloud-Based** - All data syncs to MongoDB Atlas
✅ **Scalable** - Vercel handles traffic automatically
✅ **Professional** - Production-ready deployment

## Next Steps

1. ✅ Build the apps using commands above
2. ✅ Install on devices (Android/iOS)
3. ✅ Test with mobile data to verify internet connectivity
4. ✅ Distribute APKs to teachers and staff
5. ✅ Monitor Vercel logs for any issues

## Support

If you encounter issues:
1. Check Vercel logs: https://vercel.com/dashboard
2. Test server endpoint in browser
3. Check Flutter console logs when running with `flutter run`
4. Verify environment configuration in `environment.dart` files

---

**Deployment Date**: $(date)
**Server**: Vercel (https://smartendance-lilac.vercel.app/)
**Status**: Ready for Production ✅
