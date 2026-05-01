class Environment {
  // Production Vercel server URL
  static const String apiUrl = 'https://smartendance-lilac.vercel.app';

  // Local development should be enabled while testing scanner/backend changes.
  static const bool isDevelopment = true;

  static String get baseUrl {
    if (isDevelopment) {
      // Local development - use your computer's IP
      return 'http://192.168.0.151:4000';
    }
    // Production - Vercel server (works via internet/mobile data)
    return apiUrl;
  }
}
