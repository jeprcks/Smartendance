import 'package:flutter/material.dart';

class BackgroundLogo extends StatelessWidget {
  final double? opacity;
  final double? size;

  const BackgroundLogo({super.key, this.opacity = 0.08, this.size});

  @override
  Widget build(BuildContext context) {
    final screenSize = MediaQuery.of(context).size;
    final logoSize =
        size ??
        (screenSize.width > screenSize.height
            ? screenSize.height * 0.8
            : screenSize.width * 1.0);

    return Positioned.fill(
      child: Center(
        child: Opacity(
          opacity: opacity ?? 0.08,
          child: Image.asset(
            'asset/logo/umapadlogo.png',
            width: logoSize,
            height: logoSize,
            fit: BoxFit.contain,
          ),
        ),
      ),
    );
  }
}
