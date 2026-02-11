import 'package:flutter/material.dart';
import 'components/title_section.dart';
import 'components/camera_scanner_button.dart';
import '../fetch/fetchstudents.dart';

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  final StudentService _studentService = StudentService();
  bool _isConnected = false;
  bool _isChecking = true;
  String _connectionStatus = 'Checking connection...';

  @override
  void initState() {
    super.initState();
    _checkServerConnection();
  }

  Future<void> _checkServerConnection() async {
    try {
      final url = await _studentService.findWorkingUrl();
      setState(() {
        _isConnected = url != null;
        _isChecking = false;
        if (_isConnected) {
          _connectionStatus = 'Connected to Server (${url!.split('/').last})';
        } else {
          _connectionStatus = 'No Server Connection';
        }
      });
    } catch (e) {
      setState(() {
        _isConnected = false;
        _isChecking = false;
        _connectionStatus = 'Connection Error';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    const Color headerGreen = Color(0xFF98FFB3);
    const Color successGreen = Color(0xFF2E7D32);
    const Color errorRed = Color(0xFFC62828);

    return Scaffold(
      backgroundColor: const Color(0xFFF0FFF4),
      appBar: AppBar(
        backgroundColor: headerGreen,
        elevation: 0,
        centerTitle: true,
        title: const Text(
          'Student QR Scanner',
          style: TextStyle(
            color: Colors.black87,
            fontWeight: FontWeight.bold,
            fontSize: 18,
          ),
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 16),
            child: Center(
              child: GestureDetector(
                onTap: () {
                  setState(() => _isChecking = true);
                  _checkServerConnection();
                },
                child: _isChecking
                    ? const SizedBox(
                        width: 24,
                        height: 24,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          valueColor: AlwaysStoppedAnimation<Color>(
                            Colors.black87,
                          ),
                        ),
                      )
                    : Icon(
                        _isConnected ? Icons.cloud_done : Icons.cloud_off,
                        color: _isConnected ? successGreen : errorRed,
                      ),
              ),
            ),
          ),
        ],
      ),
      body: Stack(
        children: [
          Center(
            child: SingleChildScrollView(
              child: Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: 24,
                  vertical: 32,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  mainAxisAlignment: MainAxisAlignment.center,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // Logo (replacing QR code container) - No background
                    LayoutBuilder(
                      builder: (context, constraints) {
                        final screenWidth = MediaQuery.of(context).size.width;

                        // Responsive logo size: 35% of screen width, with constraints (increased size)
                        final logoSize = (screenWidth * 0.35).clamp(
                          200.0,
                          280.0,
                        );

                        return Image.asset(
                          'asset/logo/umapadlogo.png',
                          width: logoSize,
                          height: logoSize,
                          fit: BoxFit.contain,
                          // Logo with transparent background - displays cleanly
                        );
                      },
                    ),
                    const SizedBox(height: 24),
                    const TitleSection(),
                    const SizedBox(height: 16),
                    // Server Connection Status Card
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 12,
                      ),
                      decoration: BoxDecoration(
                        color: _isConnected
                            ? const Color(0xFFE8F5E9)
                            : const Color(0xFFFFEBEE),
                        border: Border.all(
                          color: _isConnected ? successGreen : errorRed,
                          width: 2,
                        ),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            _isConnected ? Icons.check_circle : Icons.error,
                            color: _isConnected ? successGreen : errorRed,
                            size: 20,
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              _connectionStatus,
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                color: _isConnected ? successGreen : errorRed,
                                fontWeight: FontWeight.w600,
                                fontSize: 14,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 32),
                    CameraScannerButton(isEnabled: _isConnected),
                    if (!_isConnected)
                      Padding(
                        padding: const EdgeInsets.only(top: 16),
                        child: Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: const Color(0xFFFFEBEE),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Column(
                            children: [
                              const Text(
                                'Connection Issues?',
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  color: errorRed,
                                  fontSize: 14,
                                ),
                              ),
                              const SizedBox(height: 8),
                              const Text(
                                '1. Check server is running\n2. Verify network connection\n3. Ensure device and server are on same network',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: Colors.black87,
                                ),
                                textAlign: TextAlign.center,
                              ),
                              const SizedBox(height: 12),
                              SizedBox(
                                width: double.infinity,
                                child: ElevatedButton(
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: errorRed,
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                  ),
                                  onPressed: () {
                                    setState(() => _isChecking = true);
                                    _checkServerConnection();
                                  },
                                  child: const Text(
                                    'Retry Connection',
                                    style: TextStyle(
                                      color: Colors.white,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
