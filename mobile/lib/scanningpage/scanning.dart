import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

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

  @override
  void dispose() {
    cameraController.dispose();
    super.dispose();
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
          IconButton(
            icon: ValueListenableBuilder(
              valueListenable: cameraController.cameraFacingState,
              builder: (context, state, child) {
                if (state == CameraFacing.front) {
                  return const Icon(Icons.camera_front, color: Colors.black87);
                } else {
                  return const Icon(Icons.camera_rear, color: Colors.black87);
                }
              },
            ),
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
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('Barcode found: $code'),
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
