import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../fetch/fetchstudents.dart';
import '../main.dart';
import 'components/studentsinformation.dart';

class ScanningPage extends StatefulWidget {
  const ScanningPage({super.key});

  @override
  State<ScanningPage> createState() => _ScanningPageState();
}

class _ScanningPageState extends State<ScanningPage> {
  String? scannedCode;
  MobileScannerController cameraController = MobileScannerController();

  List<Barcode> detectedBarcodes = [];
  Size? imageSize;

  // Student information state
  Map<String, dynamic>? studentInfo;
  bool isLoading = false;
  String? errorMessage;

  // Attendance mode toggle
  late String attendanceMode;

  // Student service instance
  final StudentService _studentService = StudentService();

  @override
  void initState() {
    super.initState();
    attendanceMode = ATTENDANCE_TYPE; // Initialize with the constant value
    _initializeService();
  }

  @override
  void dispose() {
    cameraController.dispose();
    super.dispose();
  }

  // Initialize the student service
  Future<void> _initializeService() async {
    final url = await _studentService.findWorkingUrl();
    if (url == null) {
      setState(() {
        errorMessage =
            'Cannot connect to server. Please check:\n1. Server is running\n2. Device and computer are on same network\n3. Try different network configuration';
      });
    }
  }

  // Function to fetch student information from API
  Future<void> fetchStudentInfo(String qrData) async {
    setState(() {
      isLoading = true;
      errorMessage = null;
      studentInfo = null;
    });

    // For Check-In: Validate that student hasn't already checked in without checkout
    if (attendanceMode == 'In') {
      final validationResult = await _studentService.validateCheckIn(qrData);

      if (validationResult['hasOpenCheckIn'] == true) {
        final studentName = validationResult['studentName'] ?? 'Unknown';

        setState(() {
          isLoading = false;
          errorMessage =
              '$studentName already checked in today.\n\nPlease checkout first.';
          studentInfo = null;
        });

        return; // Prevent the check-in
      }
    }

    // For Check-Out: Validate if student has checked in
    if (attendanceMode == 'Out') {
      final validationResult = await _studentService.validateCheckIn(qrData);
      final hasOpenCheckIn = validationResult['hasOpenCheckIn'] == true;

      // Check if student already checked out today
      final checkoutValidation = await _studentService.validateCheckOut(qrData);
      final alreadyCheckedOut = checkoutValidation['alreadyCheckedOut'] == true;

      if (alreadyCheckedOut) {
        // Student already checked out, block it
        final studentName = validationResult['studentName'] ?? 'Unknown';

        setState(() {
          isLoading = false;
          errorMessage =
              '$studentName already checked out today.\n\nPlease check-in first.';
          studentInfo = null;
        });

        return; // Prevent the second checkout
      }
    }

    // QR code scans are always "General" subject - teachers will update for specific subjects
    final result = await _studentService.fetchStudentInfo(
      qrData,
      subject: 'General',
      notes:
          'QR Code scanned - Teacher can update status for specific subjects',
    );

    if (result['success'] == true && result['student'] != null) {
      final student = result['student'];

      // Now create attendance record with the new In/Out system
      final attendanceResult = await _studentService.createAttendanceRecord(
        student['studentId'],
        student['fullName'],
        attendanceType:
            attendanceMode, // Use local variable instead of constant
        subject: 'General',
        qrCodeData: {'encodedText': qrData},
      );

      setState(() {
        if (attendanceResult['success'] == true) {
          studentInfo = student;
          errorMessage = null;
        } else {
          studentInfo = null;
          errorMessage =
              attendanceResult['error'] ?? 'Failed to record attendance';
        }
        isLoading = false;
      });
    } else {
      setState(() {
        studentInfo = null;
        errorMessage = result['error'];
        isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF0FFF4),
      appBar: AppBar(
        backgroundColor: const Color(0xFF98FFB3),
        elevation: 0,
        title: const Text(
          'Scan QR Code',
          style: TextStyle(
            color: Colors.black87,
            fontWeight: FontWeight.bold,
            fontSize: 18,
          ),
        ),
        actions: [
          // Check-In button
          Container(
            margin: const EdgeInsets.symmetric(horizontal: 4),
            decoration: BoxDecoration(
              color: attendanceMode == 'In'
                  ? const Color(0xFF4CAF50)
                  : Colors.transparent,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Tooltip(
              message: 'Check-In',
              child: IconButton(
                icon: const Icon(Icons.login, color: Colors.white, size: 24),
                onPressed: () {
                  setState(() {
                    attendanceMode = 'In';
                    studentInfo = null;
                    scannedCode = null;
                    errorMessage = null;
                  });
                },
              ),
            ),
          ),
          // Check-Out button
          Container(
            margin: const EdgeInsets.symmetric(horizontal: 4),
            decoration: BoxDecoration(
              color: attendanceMode == 'Out'
                  ? const Color(0xFFE53935)
                  : Colors.transparent,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Tooltip(
              message: 'Check-Out',
              child: IconButton(
                icon: const Icon(Icons.logout, color: Colors.white, size: 24),
                onPressed: () {
                  setState(() {
                    attendanceMode = 'Out';
                    studentInfo = null;
                    scannedCode = null;
                    errorMessage = null;
                  });
                },
              ),
            ),
          ),
          // Connection status indicator
          Container(
            margin: const EdgeInsets.only(right: 8),
            child: Icon(
              _studentService.workingUrl != null ? Icons.wifi : Icons.wifi_off,
              color: _studentService.workingUrl != null
                  ? Colors.green
                  : Colors.red,
              size: 20,
            ),
          ),
          // Retry connection button
          IconButton(
            icon: const Icon(Icons.refresh, color: Colors.black87),
            onPressed: () {
              _initializeService();
            },
          ),
          // Camera switch
          IconButton(
            icon: const Icon(Icons.flip_camera_android, color: Colors.black87),
            onPressed: () => cameraController.switchCamera(),
          ),
        ],
      ),
      body: Stack(
        children: [
          MobileScanner(
            controller: cameraController,
            onDetect: (BarcodeCapture capture) {
              final List<Barcode> barcodes = capture.barcodes;
              if (barcodes.isNotEmpty) {
                final String? code = barcodes.first.rawValue;
                if (code != null && code != scannedCode) {
                  setState(() {
                    scannedCode = code;
                  });

                  // Fetch student information when QR code is scanned
                  fetchStudentInfo(code);

                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('QR Code scanned successfully!'),
                      backgroundColor: const Color(0xFF2E7D32),
                      behavior: SnackBarBehavior.floating,
                    ),
                  );
                }
              }
              setState(() {
                detectedBarcodes = barcodes;
                // imageSize is not set here anymore
              });
            },
          ),
          if (detectedBarcodes.isNotEmpty && imageSize != null)
            CustomPaint(
              painter: BarcodePainter(
                barcodes: detectedBarcodes,
                imageSize: imageSize!,
                boxFit: BoxFit.cover,
              ),
            ),

          // Loading indicator
          if (isLoading) const LoadingDisplay(),

          // Student information display
          if (studentInfo != null && !isLoading)
            StudentInformationDisplay(
              studentInfo: studentInfo!,
              studentService: _studentService,
              onScanAnother: () {
                setState(() {
                  studentInfo = null;
                  scannedCode = null;
                });
              },
              onClose: () {
                setState(() {
                  studentInfo = null;
                  scannedCode = null;
                });
              },
            ),

          // Error message display
          if (errorMessage != null && !isLoading)
            ErrorDisplay(
              errorMessage: errorMessage!,
              onRetry: () {
                setState(() {
                  errorMessage = null;
                  scannedCode = null;
                });
              },
            ),
        ],
      ),
    );
  }
}

class BarcodePainter extends CustomPainter {
  final List<Barcode> barcodes;
  final Size imageSize;
  final BoxFit boxFit;

  BarcodePainter({
    required this.barcodes,
    required this.imageSize,
    this.boxFit = BoxFit.contain,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = const Color(0xFF2E7D32)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 4.0;

    final fittedSizes = applyBoxFit(boxFit, imageSize, size);
    final inputSize = fittedSizes.source;
    final outputSize = fittedSizes.destination;

    final dx = (size.width - outputSize.width) / 2;
    final dy = (size.height - outputSize.height) / 2;

    for (final barcode in barcodes) {
      final corners = barcode.corners;
      if (corners.length != 4) continue;

      final points = corners.map((point) {
        final scaleX = outputSize.width / inputSize.width;
        final scaleY = outputSize.height / inputSize.height;
        return Offset(dx + point.dx * scaleX, dy + point.dy * scaleY);
      }).toList();

      final path = Path()
        ..moveTo(points[0].dx, points[0].dy)
        ..lineTo(points[1].dx, points[1].dy)
        ..lineTo(points[2].dx, points[2].dy)
        ..lineTo(points[3].dx, points[3].dy)
        ..close();

      canvas.drawPath(path, paint);
    }
  }

  @override
  bool shouldRepaint(covariant BarcodePainter oldDelegate) {
    return oldDelegate.barcodes != barcodes ||
        oldDelegate.imageSize != imageSize ||
        oldDelegate.boxFit != boxFit;
  }
}
