import 'package:flutter/material.dart';

class HeroMetric extends StatelessWidget {
  const HeroMetric({
    required this.icon,
    required this.value,
    required this.label,
    this.live = false,
    super.key,
  });
  final IconData icon;
  final String value;
  final String label;
  final bool live;

  @override
  Widget build(BuildContext context) => Expanded(
    child: Container(
      height: 58,
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: .11),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.white.withValues(alpha: .11)),
      ),
      child: Row(
        children: [
          Icon(
            icon,
            size: 17,
            color: live ? const Color(0xFF8EF0B7) : const Color(0xFFD6E0FF),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  value,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 16,
                    height: 1,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: Color(0xFFD0DBF8),
                    fontSize: 8,
                    letterSpacing: .7,
                    fontWeight: FontWeight.w700,
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
