import 'package:flutter/material.dart';

import 'package:aclc_teacher_portal/core/theme/app_colors.dart';

class FieldLabel extends StatelessWidget {
  const FieldLabel(this.text, {super.key});
  final String text;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 7),
    child: Text(
      text,
      style: const TextStyle(
        fontWeight: FontWeight.w600,
        fontSize: 13,
        letterSpacing: -.1,
        color: AppColors.ink,
      ),
    ),
  );
}
