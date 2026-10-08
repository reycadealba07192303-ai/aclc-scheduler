import 'package:flutter/material.dart';

class GlowCircle extends StatelessWidget {
  const GlowCircle({super.key, required this.size});
  final double size;

  @override
  Widget build(BuildContext context) => Container(
    width: size,
    height: size,
    decoration: BoxDecoration(
      shape: BoxShape.circle,
      color: Colors.white.withValues(alpha: .035),
      border: Border.all(
        color: Colors.white.withValues(alpha: .09),
        width: 1.2,
      ),
    ),
  );
}
