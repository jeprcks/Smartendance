import 'package:flutter/material.dart';

// Centralized theme colors for the mobile app
const Color kPrimary = Color(0xFF2E7D32);
const Color kPrimaryLight = Color(0xFF66BB6A);
const Color kPrimaryDark = Color(0xFF1B5E20);
const Color kAccent = Color(0xFFFFC107);
const Color kBackground = Color(0xFFF7FBF7);
const Color kForeground = Color(0xFF0B1220);
const Color kMutedForeground = Color(0xFF4B5563);
const Color kChart1 = kPrimary;
const Color kChart2 = Color(0xFF60A5FA);
const Color kChart3 = Color(0xFF34D399);
const Color kChart4 = Color(0xFFFBBF24);
const Color kChart5 = Color(0xFFA78BFA);

// Animation
const Duration kAnimationEnterDuration = Duration(milliseconds: 400);
const Duration kAnimationStaggerStep = Duration(milliseconds: 50);
const Curve kAnimationEnterCurve = Curves.easeOutCubic;

// Helpful helpers
Color primaryWithOpacity(double o) => kPrimary.withValues(alpha: o);
