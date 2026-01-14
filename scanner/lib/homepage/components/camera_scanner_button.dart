import 'package:flutter/material.dart';
import '../../scanningpage/scanning.dart';

class CameraScannerButton extends StatelessWidget {
  final bool isEnabled;

  const CameraScannerButton({
    super.key,
    this.isEnabled = true,
  });

  @override
  Widget build(BuildContext context) {
    const Color primaryGreen = Color(0xFF2E7D32);
    const Color disabledGrey = Color(0xFFB0BEC5);

    return SizedBox(
      width: double.infinity,
      height: 48,
      child: ElevatedButton.icon(
        icon: const Icon(Icons.camera_alt, color: Colors.white),
        label: const Text(
          'Scan QR Code',
          style: TextStyle(
            fontWeight: FontWeight.bold,
            fontSize: 16,
            color: Colors.white,
          ),
        ),
        style: ElevatedButton.styleFrom(
          backgroundColor: isEnabled ? primaryGreen : disabledGrey,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          elevation: isEnabled ? 4 : 0,
        ),
        onPressed: isEnabled
            ? () {
                Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (context) => const ScanningPage(),
                  ),
                );
              }
            : null,
      ),
    );
  }
}
