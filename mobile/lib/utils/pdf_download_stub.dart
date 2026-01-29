import 'dart:typed_data';

/// Stub: no-op on non-web platforms. Web implementation in pdf_download_web.dart.
Future<void> downloadPdfOnWeb(Uint8List bytes, String filename) async {
  throw UnsupportedError(
    'PDF download on web is only supported when running on web',
  );
}
