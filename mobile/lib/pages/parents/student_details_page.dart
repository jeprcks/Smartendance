import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

// QR Code Data Model
class QRCodeData {
  final String studentId;
  final String fullName;
  final String? qrCodeImage;
  final Map<String, dynamic>? qrCodeDetails;

  QRCodeData({
    required this.studentId,
    required this.fullName,
    this.qrCodeImage,
    this.qrCodeDetails,
  });

  factory QRCodeData.fromJson(Map<String, dynamic> json) {
    print('=== QRCodeData.fromJson DEBUG ===');
    print('Full JSON response: $json');

    final qrCode = json['qrCode'] as Map<String, dynamic>?;
    print('QR Code object: $qrCode');
    print('QR Code image: ${qrCode?['image']}');
    print('QR Code data string: ${qrCode?['data']}');

    Map<String, dynamic> data = <String, dynamic>{};

    if (qrCode != null && qrCode['data'] != null) {
      try {
        final dataString = qrCode['data'] as String;
        print('Attempting to parse QR data: $dataString');
        data = jsonDecode(dataString) as Map<String, dynamic>;
        print('Parsed QR data: $data');
      } catch (e) {
        print('Error parsing QR data: $e');
      }
    }

    final result = QRCodeData(
      studentId: json['studentId'] ?? '',
      fullName: json['fullName'] ?? '',
      qrCodeImage: qrCode?['image'] as String?,
      qrCodeDetails: data,
    );

    print(
      'Final QRCodeData: studentId=${result.studentId}, fullName=${result.fullName}, hasImage=${result.qrCodeImage != null}, detailsCount=${result.qrCodeDetails?.length}',
    );
    print('=== END DEBUG ===');

    return result;
  }
}

class StudentDetailsPage extends StatefulWidget {
  final dynamic student;
  final String token;

  const StudentDetailsPage({
    super.key,
    required this.student,
    required this.token,
  });

  @override
  State<StudentDetailsPage> createState() => _StudentDetailsPageState();
}

class _StudentDetailsPageState extends State<StudentDetailsPage> {
  late Map<String, dynamic> studentData;
  late Future<QRCodeData?> _qrCodeFuture;

  @override
  void initState() {
    super.initState();
    _parseStudentData();
    _qrCodeFuture = _fetchQRCode();
  }

  void _parseStudentData() {
    if (widget.student is Map<String, dynamic>) {
      studentData = widget.student;
    } else {
      studentData = {};
    }
  }

  Future<QRCodeData?> _fetchQRCode() async {
    try {
      final studentId = _getStudentId();
      print('=== FETCH QR CODE START ===');
      print('Student ID: $studentId');

      if (studentId == 'N/A' || studentId.isEmpty) {
        print('Student ID is N/A or empty, skipping QR code fetch');
        return null;
      }

      const String baseUrl = 'http://192.168.1.100:4000';
      final url = '$baseUrl/api/students/$studentId/qr-code';

      print('Fetching from URL: $url');
      print('Token: ${widget.token}');

      final response = await http
          .get(
            Uri.parse(url),
            headers: {
              'Authorization': 'Bearer ${widget.token}',
              'Content-Type': 'application/json',
            },
          )
          .timeout(
            const Duration(seconds: 15),
            onTimeout: () {
              print('Request timeout after 15 seconds');
              throw Exception('Request timeout');
            },
          );

      print('Response status code: ${response.statusCode}');
      print('Response headers: ${response.headers}');
      print('Response body: ${response.body}');

      if (response.statusCode == 200) {
        final jsonResponse = jsonDecode(response.body) as Map<String, dynamic>;
        print('JSON decoded successfully');
        print('Response data: $jsonResponse');

        final qrCodeData = QRCodeData.fromJson(jsonResponse);
        print('QR Code data created successfully');
        print('=== FETCH QR CODE SUCCESS ===');

        return qrCodeData;
      } else {
        print('API returned status code: ${response.statusCode}');
        print('Error response: ${response.body}');
        throw Exception('Failed to fetch QR code: ${response.statusCode}');
      }
    } catch (e) {
      print('=== ERROR FETCHING QR CODE ===');
      print('Error type: ${e.runtimeType}');
      print('Error message: $e');
      print('=== END ERROR ===');
      return null;
    }
  }

  String _getFullName() {
    return studentData['fullName'] ?? studentData['name'] ?? 'Unknown Student';
  }

  String _getStudentId() {
    return studentData['studentId'] ?? 'N/A';
  }

  String _getEmail() {
    return studentData['email'] ?? 'N/A';
  }

  String _getPhoneNumber() {
    return studentData['phoneNumber'] ?? studentData['phone'] ?? 'N/A';
  }

  String _getGradeLevel() {
    return studentData['gradeLevel'] ?? 'N/A';
  }

  String _getSection() {
    return studentData['section'] ?? 'N/A';
  }

  String _getGender() {
    return studentData['gender'] ?? 'N/A';
  }

  String _getShift() {
    return studentData['shift'] ?? 'N/A';
  }

  String _getAge() {
    if (studentData['age'] != null) {
      return studentData['age'].toString();
    }
    if (studentData['birthDate'] != null) {
      try {
        DateTime birthDate = DateTime.parse(studentData['birthDate']);
        DateTime today = DateTime.now();
        int age = today.year - birthDate.year;
        if (today.month < birthDate.month ||
            (today.month == birthDate.month && today.day < birthDate.day)) {
          age--;
        }
        return age.toString();
      } catch (e) {
        return 'N/A';
      }
    }
    return 'N/A';
  }

  String _getBirthDate() {
    if (studentData['birthDate'] != null) {
      try {
        DateTime date = DateTime.parse(studentData['birthDate']);
        return DateFormat('MMM d, yyyy').format(date);
      } catch (e) {
        return 'N/A';
      }
    }
    return 'N/A';
  }

  String _getAddress() {
    if (studentData['address'] is Map) {
      Map<String, dynamic> address = studentData['address'];
      List<String> parts = [];

      if (address['street'] != null) parts.add(address['street']);
      if (address['city'] != null) parts.add(address['city']);
      if (address['province'] != null) parts.add(address['province']);
      if (address['zipCode'] != null) parts.add(address['zipCode']);

      return parts.isNotEmpty ? parts.join(', ') : 'N/A';
    }
    return studentData['fullAddress'] ?? 'N/A';
  }

  Map<String, dynamic> _getEmergencyContact() {
    return studentData['emergencyContact'] ?? {};
  }

  Map<String, dynamic> _getParentInfo() {
    return studentData['parentInfo'] ?? {};
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey[100],
      appBar: AppBar(
        backgroundColor: Colors.indigo,
        elevation: 0,
        title: const Text(
          'Student Details',
          style: TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.bold,
            color: Colors.white,
          ),
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          child: Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Profile Section
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [Colors.indigo, Colors.indigo.shade700],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    children: [
                      // Avatar
                      Container(
                        width: 80,
                        height: 80,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: Colors.white,
                          border: Border.all(
                            color: Colors.indigo.shade300,
                            width: 3,
                          ),
                        ),
                        child: Center(
                          child: Text(
                            _getFullName()
                                .split(' ')
                                .map((n) => n[0])
                                .join('')
                                .toUpperCase(),
                            style: const TextStyle(
                              fontSize: 28,
                              fontWeight: FontWeight.bold,
                              color: Colors.indigo,
                            ),
                            textAlign: TextAlign.center,
                          ),
                        ),
                      ),
                      const SizedBox(width: 16),
                      // Student Info
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              _getFullName(),
                              style: const TextStyle(
                                fontSize: 22,
                                fontWeight: FontWeight.bold,
                                color: Colors.white,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              'ID: ${_getStudentId()}',
                              style: const TextStyle(
                                fontSize: 14,
                                color: Colors.white70,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 8,
                                    vertical: 4,
                                  ),
                                  decoration: BoxDecoration(
                                    color: Colors.white.withOpacity(0.2),
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: Text(
                                    _getGradeLevel(),
                                    style: const TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w600,
                                      color: Colors.white,
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 8,
                                    vertical: 4,
                                  ),
                                  decoration: BoxDecoration(
                                    color: Colors.white.withOpacity(0.2),
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: Text(
                                    'Section ${_getSection()}',
                                    style: const TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w600,
                                      color: Colors.white,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),

                // QR Code Section
                _buildQRCodeSection(),
                const SizedBox(height: 24),

                // Basic Information Section
                _buildSectionTitle('Basic Information'),
                const SizedBox(height: 12),

                _buildInfoCard(
                  icon: Icons.email,
                  label: 'Email',
                  value: _getEmail(),
                  color: Colors.blue,
                ),
                const SizedBox(height: 12),

                _buildInfoCard(
                  icon: Icons.phone,
                  label: 'Phone Number',
                  value: _getPhoneNumber(),
                  color: Colors.green,
                ),
                const SizedBox(height: 12),

                _buildInfoCard(
                  icon: Icons.wc,
                  label: 'Gender',
                  value: _getGender(),
                  color: Colors.purple,
                ),
                const SizedBox(height: 12),

                _buildInfoCard(
                  icon: Icons.calendar_today,
                  label: 'Date of Birth',
                  value: _getBirthDate(),
                  color: Colors.orange,
                ),
                const SizedBox(height: 12),

                _buildInfoCard(
                  icon: Icons.cake,
                  label: 'Age',
                  value: _getAge(),
                  color: Colors.red,
                ),
                const SizedBox(height: 24),

                // Academic Information Section
                _buildSectionTitle('Academic Information'),
                const SizedBox(height: 12),

                _buildInfoCard(
                  icon: Icons.school,
                  label: 'Grade Level',
                  value: _getGradeLevel(),
                  color: Colors.indigo,
                ),
                const SizedBox(height: 12),

                _buildInfoCard(
                  icon: Icons.class_,
                  label: 'Section',
                  value: _getSection(),
                  color: Colors.teal,
                ),
                const SizedBox(height: 12),

                _buildInfoCard(
                  icon: Icons.schedule,
                  label: 'Shift',
                  value: _getShift(),
                  color: Colors.amber,
                ),
                const SizedBox(height: 24),

                // Address Section
                if (_getAddress() != 'N/A') ...[
                  _buildSectionTitle('Address'),
                  const SizedBox(height: 12),
                  Card(
                    elevation: 1,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: Colors.pink.withOpacity(0.1),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: const Icon(
                              Icons.location_on,
                              color: Colors.pink,
                              size: 24,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              _getAddress(),
                              style: const TextStyle(
                                fontSize: 14,
                                color: Colors.black87,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                ],

                // Emergency Contact Section
                if (_getEmergencyContact().isNotEmpty) ...[
                  _buildSectionTitle('Emergency Contact'),
                  const SizedBox(height: 12),
                  _buildContactCard(
                    name: _getEmergencyContact()['name'] ?? 'N/A',
                    relationship:
                        _getEmergencyContact()['relationship'] ?? 'N/A',
                    phone: _getEmergencyContact()['contactNumber'] ?? 'N/A',
                    color: Colors.red,
                  ),
                  const SizedBox(height: 24),
                ],

                // Parent/Guardian Information Section
                if (_getParentInfo().isNotEmpty) ...[
                  _buildSectionTitle('Parent/Guardian Information'),
                  const SizedBox(height: 12),
                  Card(
                    elevation: 1,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Container(
                                width: 50,
                                height: 50,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: Colors.green.withOpacity(0.1),
                                ),
                                child: const Center(
                                  child: Icon(
                                    Icons.person,
                                    color: Colors.green,
                                    size: 24,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      _getParentInfo()['name'] ?? 'N/A',
                                      style: const TextStyle(
                                        fontSize: 16,
                                        fontWeight: FontWeight.bold,
                                        color: Colors.black87,
                                      ),
                                    ),
                                    const SizedBox(height: 4),
                                    const Text(
                                      'Parent/Guardian',
                                      style: TextStyle(
                                        fontSize: 12,
                                        color: Colors.grey,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 16),
                          Divider(color: Colors.grey[300], height: 1),
                          const SizedBox(height: 16),
                          _buildDetailRow(
                            label: 'Email',
                            value: _getParentInfo()['email'] ?? 'N/A',
                            icon: Icons.email,
                            color: Colors.blue,
                          ),
                          const SizedBox(height: 12),
                          _buildDetailRow(
                            label: 'Password',
                            value:
                                (_getParentInfo()['password'] != null &&
                                    (_getParentInfo()['password'] as String)
                                        .isNotEmpty)
                                ? '••••••••'
                                : 'N/A',
                            icon: Icons.lock,
                            color: Colors.purple,
                          ),
                          const SizedBox(height: 12),
                          _buildDetailRow(
                            label: 'Phone',
                            value: _getParentInfo()['contactNumber'] ?? 'N/A',
                            icon: Icons.phone,
                            color: Colors.red,
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                ],

                // Account Status
                _buildSectionTitle('Account Status'),
                const SizedBox(height: 12),
                Card(
                  elevation: 1,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.green.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Icon(
                            Icons.check_circle,
                            color: Colors.green,
                            size: 24,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'Account Status',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: Colors.grey,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                              const SizedBox(height: 4),
                              const Text(
                                'Active',
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.green,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 40),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildQRCodeSection() {
    return FutureBuilder<QRCodeData?>(
      future: _qrCodeFuture,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return _buildQRCodeLoadingCard();
        } else if (snapshot.hasData && snapshot.data != null) {
          return _buildQRCodeCard(snapshot.data!);
        } else {
          return _buildQRCodeErrorCard();
        }
      },
    );
  }

  Widget _buildQRCodeCard(QRCodeData qrData) {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [Colors.teal, Colors.teal.shade700],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(12),
                topRight: Radius.circular(12),
              ),
            ),
            child: Row(
              children: [
                const Icon(Icons.qr_code, color: Colors.white, size: 28),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Attendance QR Code',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Scan for attendance check-in',
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.white.withOpacity(0.8),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          // QR Code Image
          Padding(
            padding: const EdgeInsets.all(16),
            child: Center(child: _buildQRImage(qrData.qrCodeImage)),
          ),
          // Divider
          Divider(color: Colors.grey[300], height: 1),
          // Details Section
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                _buildQRDetailRow(
                  'Student ID',
                  qrData.qrCodeDetails?['id']?.toString() ?? qrData.studentId,
                  Icons.badge,
                  Colors.blue,
                ),
                const SizedBox(height: 12),
                _buildQRDetailRow(
                  'Full Name',
                  qrData.qrCodeDetails?['fullName']?.toString() ??
                      qrData.fullName,
                  Icons.person,
                  Colors.purple,
                ),
                const SizedBox(height: 12),
                _buildQRDetailRow(
                  'Grade',
                  qrData.qrCodeDetails?['grade']?.toString() ?? 'N/A',
                  Icons.school,
                  Colors.indigo,
                ),
                const SizedBox(height: 12),
                _buildQRDetailRow(
                  'Section',
                  qrData.qrCodeDetails?['section']?.toString() ?? 'N/A',
                  Icons.class_,
                  Colors.teal,
                ),
                const SizedBox(height: 12),
                _buildQRDetailRow(
                  'Shift',
                  qrData.qrCodeDetails?['shift']?.toString() ?? 'N/A',
                  Icons.schedule,
                  Colors.amber,
                ),
                const SizedBox(height: 12),
                _buildQRDetailRow(
                  'Email',
                  qrData.qrCodeDetails?['email']?.toString() ?? 'N/A',
                  Icons.email,
                  Colors.green,
                ),
                const SizedBox(height: 12),
                _buildQRDetailRow(
                  'Contact',
                  qrData.qrCodeDetails?['contact']?.toString() ?? 'N/A',
                  Icons.phone,
                  Colors.red,
                ),
                const SizedBox(height: 12),
                _buildQRDetailRow(
                  'Emergency Contact',
                  qrData.qrCodeDetails?['emergencyContact']?.toString() ??
                      'N/A',
                  Icons.contact_emergency,
                  Colors.orange,
                ),
                const SizedBox(height: 12),
                _buildQRDetailRow(
                  'Parent Email',
                  qrData.qrCodeDetails?['parentEmail']?.toString() ?? 'N/A',
                  Icons.email,
                  Colors.blue,
                ),
                const SizedBox(height: 12),
                _buildQRDetailRow(
                  'Parent Password',
                  qrData.qrCodeDetails?['parentPassword'] != null &&
                          qrData.qrCodeDetails!['parentPassword']!
                              .toString()
                              .isNotEmpty
                      ? '••••••••'
                      : 'N/A',
                  Icons.lock,
                  Colors.purple,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildQRImage(String? imageBase64) {
    if (imageBase64 == null || imageBase64.isEmpty) {
      return Container(
        width: 200,
        height: 200,
        decoration: BoxDecoration(
          color: Colors.grey[200],
          borderRadius: BorderRadius.circular(8),
        ),
        child: const Center(
          child: Icon(Icons.image_not_supported, size: 40, color: Colors.grey),
        ),
      );
    }

    try {
      // Handle both data:image/png;base64, and plain base64
      String base64String = imageBase64;
      if (imageBase64.contains(',')) {
        base64String = imageBase64.split(',').last;
      }

      final imageBytes = base64Decode(base64String);
      return Container(
        decoration: BoxDecoration(
          border: Border.all(color: Colors.teal.shade200, width: 2),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Image.memory(
          imageBytes,
          width: 200,
          height: 200,
          fit: BoxFit.cover,
        ),
      );
    } catch (e) {
      return Container(
        width: 200,
        height: 200,
        decoration: BoxDecoration(
          color: Colors.red.withOpacity(0.1),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: Colors.red.shade200, width: 2),
        ),
        child: const Center(
          child: Icon(Icons.error, size: 40, color: Colors.red),
        ),
      );
    }
  }

  Widget _buildQRDetailRow(
    String label,
    String value,
    IconData icon,
    Color color,
  ) {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: color.withOpacity(0.1),
            borderRadius: BorderRadius.circular(6),
          ),
          child: Icon(icon, color: color, size: 20),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: TextStyle(
                  fontSize: 11,
                  color: Colors.grey[600],
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(height: 3),
              Text(
                value,
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: Colors.black87,
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildQRCodeLoadingCard() {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Column(
        children: [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [Colors.teal, Colors.teal.shade700],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(12),
                topRight: Radius.circular(12),
              ),
            ),
            child: Row(
              children: [
                const Icon(Icons.qr_code, color: Colors.white, size: 28),
                const SizedBox(width: 12),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Attendance QR Code',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                      SizedBox(height: 4),
                      Text(
                        'Loading QR code...',
                        style: TextStyle(fontSize: 12, color: Colors.white70),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(32),
            child: SizedBox(
              width: 100,
              height: 100,
              child: CircularProgressIndicator(
                strokeWidth: 3,
                valueColor: AlwaysStoppedAnimation<Color>(Colors.teal.shade400),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildQRCodeErrorCard() {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Column(
        children: [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [Colors.red.shade400, Colors.red.shade700],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(12),
                topRight: Radius.circular(12),
              ),
            ),
            child: Row(
              children: [
                const Icon(Icons.error_outline, color: Colors.white, size: 28),
                const SizedBox(width: 12),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'QR Code Unavailable',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                      SizedBox(height: 4),
                      Text(
                        'Could not load QR code at this time',
                        style: TextStyle(fontSize: 12, color: Colors.white70),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              children: [
                Icon(Icons.qr_code_2, size: 60, color: Colors.grey[300]),
                const SizedBox(height: 16),
                Text(
                  'QR code could not be loaded. Please try again later.',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 13, color: Colors.grey[600]),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Text(
      title,
      style: const TextStyle(
        fontSize: 18,
        fontWeight: FontWeight.bold,
        color: Colors.black87,
      ),
    );
  }

  Widget _buildInfoCard({
    required IconData icon,
    required String label,
    required String value,
    required Color color,
  }) {
    return Card(
      elevation: 1,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: color.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(icon, color: color, size: 24),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    label,
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.grey[600],
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    value,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: Colors.black87,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildContactCard({
    required String name,
    required String relationship,
    required String phone,
    required Color color,
  }) {
    return Card(
      elevation: 1,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 50,
                  height: 50,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: color.withOpacity(0.1),
                  ),
                  child: Center(
                    child: Icon(Icons.person, color: color, size: 24),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        name,
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: Colors.black87,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        relationship,
                        style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Divider(color: Colors.grey[300], height: 1),
            const SizedBox(height: 12),
            Row(
              children: [
                Icon(Icons.phone, size: 16, color: Colors.grey[600]),
                const SizedBox(width: 8),
                Text(
                  phone,
                  style: TextStyle(fontSize: 14, color: Colors.grey[600]),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDetailRow({
    required String label,
    required String value,
    required IconData icon,
    required Color color,
  }) {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: color.withOpacity(0.1),
            borderRadius: BorderRadius.circular(6),
          ),
          child: Icon(icon, color: color, size: 20),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: TextStyle(
                  fontSize: 11,
                  color: Colors.grey[600],
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(height: 3),
              Text(
                value,
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: Colors.black87,
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
      ],
    );
  }
}
