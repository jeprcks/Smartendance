import 'package:flutter/material.dart';
import 'homepage/homepage.dart';

// Configuration for attendance type
// Change this to 'Out' when running on the check-out tablet
const String ATTENDANCE_TYPE =
    'In'; // 'In' for check-in tablet, 'Out' for check-out tablet

void main() {
  runApp(const MainApp());
}

class MainApp extends StatelessWidget {
  const MainApp({super.key});

  @override
  Widget build(BuildContext context) {
    return const MaterialApp(home: HomePage());
  }
}
