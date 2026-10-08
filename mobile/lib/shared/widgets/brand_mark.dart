import 'package:flutter/material.dart';

/// The ACLC College Manila Campus seal on a white disc.
class BrandMark extends StatelessWidget {
  const BrandMark({super.key, this.size = 42});
  final double size;

  @override
  Widget build(BuildContext context) => Container(
    width: size,
    height: size,
    padding: EdgeInsets.all(size * .05),
    decoration: BoxDecoration(
      color: Colors.white,
      shape: BoxShape.circle,
      boxShadow: const [
        BoxShadow(
          color: Color(0x22000000),
          blurRadius: 6,
          offset: Offset(0, 2),
        ),
      ],
    ),
    child: ClipOval(
      child: Image.asset(
        'assets/images/aclc_logo.png',
        fit: BoxFit.contain,
        semanticLabel: 'ACLC College',
      ),
    ),
  );
}
