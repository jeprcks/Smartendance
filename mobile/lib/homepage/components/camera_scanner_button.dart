import 'package:flutter/material.dart';
import '../../scanningpage/scanning.dart';

class CameraScannerButton extends StatelessWidget {
  const CameraScannerButton({super.key});

  @override
  Widget build(BuildContext context) {
    const Color primaryGreen = Color(0xFF2E7D32);

    return SizedBox(
      width: double.infinity,
      height: 48,
      child: ElevatedButton.icon(
        icon: const Icon(Icons.camera_alt, color: Colors.white),
        label: const Text(
          'Camera Scanner',
          style: TextStyle(
            fontWeight: FontWeight.bold,
            fontSize: 16,
            color: Colors.white,
          ),
        ),
        style: ElevatedButton.styleFrom(
          backgroundColor: primaryGreen,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          elevation: 4,
        ),
        onPressed: () {
          Navigator.of(
            context,
          ).push(MaterialPageRoute(builder: (context) => const ScanningPage()));
        },
      ),
    );
  }
}
