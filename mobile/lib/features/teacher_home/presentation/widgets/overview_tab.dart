import 'package:flutter/material.dart';

import 'package:aclc_teacher_portal/core/theme/app_colors.dart';
import 'package:aclc_teacher_portal/shared/utils/app_formatters.dart';
import 'package:aclc_teacher_portal/shared/widgets/feedback_widgets.dart';
import 'package:aclc_teacher_portal/shared/widgets/glow_circle.dart';
import 'package:aclc_teacher_portal/shared/widgets/hero_metric.dart';

class OverviewTab extends StatelessWidget {
  const OverviewTab({
    required this.teacherName,
    required this.term,
    required this.sectionCount,
    required this.classCount,
    required this.liveSessionCount,
    required this.onViewClasses,
    this.error,
    super.key,
  });

  final String teacherName;
  final Map<String, dynamic>? term;
  final int sectionCount;
  final int classCount;
  final int liveSessionCount;
  final String? error;
  final VoidCallback onViewClasses;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFF172B5B), Color(0xFF3157B1)],
          ),
          borderRadius: BorderRadius.circular(24),
          boxShadow: const [
            BoxShadow(
              color: Color(0x22203D91),
              blurRadius: 22,
              offset: Offset(0, 10),
            ),
          ],
        ),
        child: Stack(
          children: [
            const Positioned(
              right: -26,
              top: -34,
              child: GlowCircle(size: 136),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(
                      Icons.wb_sunny_outlined,
                      color: Color(0xFFFFD981),
                      size: 16,
                    ),
                    const SizedBox(width: 7),
                    Text(
                      greetingText(),
                      style: const TextStyle(
                        color: Color(0xFFD8E2FF),
                        fontSize: 11,
                        letterSpacing: 1.25,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const Spacer(),
                    CircleAvatar(
                      radius: 19,
                      backgroundColor: Colors.white.withValues(alpha: .14),
                      child: Text(
                        initials(teacherName),
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 12,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 11),
                Text(
                  teacherName,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 25,
                    fontWeight: FontWeight.w800,
                    letterSpacing: -.5,
                  ),
                ),
                const SizedBox(height: 5),
                Text(
                  term == null
                      ? 'No academic term available'
                      : 'A.Y. ${term!['startYear']}-${(term!['startYear'] as int? ?? 0) + 1} · ${term!['semester']}',
                  style: const TextStyle(
                    color: Color(0xFFD8E2FF),
                    fontSize: 13,
                  ),
                ),
                const SizedBox(height: 18),
                Row(
                  children: [
                    HeroMetric(
                      icon: Icons.groups_2_outlined,
                      value: '$sectionCount',
                      label: 'SECTIONS',
                    ),
                    const SizedBox(width: 10),
                    HeroMetric(
                      icon: Icons.menu_book_outlined,
                      value: '$classCount',
                      label: 'CLASSES',
                    ),
                    if (liveSessionCount > 0) ...[
                      const SizedBox(width: 10),
                      HeroMetric(
                        icon: Icons.qr_code_2_rounded,
                        value: '$liveSessionCount',
                        label: 'LIVE NOW',
                        live: true,
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ],
        ),
      ),
      if (error != null) ...[const SizedBox(height: 16), ErrorBanner(error!)],
      if (liveSessionCount > 0) ...[
        const SizedBox(height: 20),
        Container(
          padding: const EdgeInsets.all(15),
          decoration: BoxDecoration(
            color: const Color(0xFFE8F7EE),
            border: Border.all(color: const Color(0xFFC7ECD4)),
            borderRadius: BorderRadius.circular(15),
          ),
          child: Row(
            children: [
              const Icon(Icons.qr_code_2, color: Color(0xFF18854B)),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  '$liveSessionCount attendance session${liveSessionCount == 1 ? '' : 's'} currently open',
                  style: const TextStyle(
                    color: AppColors.ink,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
      const SizedBox(height: 20),
      Card(
        child: InkWell(
          borderRadius: BorderRadius.circular(20),
          onTap: onViewClasses,
          child: const Padding(
            padding: EdgeInsets.all(17),
            child: Row(
              children: [
                CircleAvatar(
                  backgroundColor: Color(0xFFEAF0FF),
                  child: Icon(Icons.class_rounded, color: AppColors.navy),
                ),
                SizedBox(width: 13),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Your handled classes',
                        style: TextStyle(
                          fontWeight: FontWeight.w800,
                          color: AppColors.ink,
                        ),
                      ),
                      SizedBox(height: 3),
                      Text(
                        'Open a class to take attendance',
                        style: TextStyle(fontSize: 12, color: AppColors.muted),
                      ),
                    ],
                  ),
                ),
                Icon(Icons.arrow_forward_rounded, color: AppColors.navy),
              ],
            ),
          ),
        ),
      ),
    ],
  );
}
