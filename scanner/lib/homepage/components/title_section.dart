import 'package:flutter/material.dart';

class TitleSection extends StatelessWidget {
  const TitleSection({super.key});

  @override
  Widget build(BuildContext context) {
    const Color primaryBlue = Color(0xFF1A237E);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: const [
        Text(
          'Umapad Elementary School',
          textAlign: TextAlign.center,
          style: TextStyle(
            color: primaryBlue,
            fontWeight: FontWeight.bold,
            fontSize: 20,
          ),
        ),
        SizedBox(height: 8),
        Text(
          'Scan QR Code to Log Attendance',
          textAlign: TextAlign.center,
          style: TextStyle(color: Colors.grey, fontSize: 14),
        ),
      ],
    );
  }
}
