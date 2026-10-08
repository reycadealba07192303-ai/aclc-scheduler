import 'package:flutter/material.dart';

import 'package:aclc_teacher_portal/features/teacher_home/presentation/widgets/change_password_sheet.dart';

import 'package:aclc_teacher_portal/core/theme/app_colors.dart';
import 'package:aclc_teacher_portal/shared/utils/app_formatters.dart';

class ProfileTab extends StatelessWidget {
  const ProfileTab({
    required this.teacherName,
    required this.term,
    required this.sectionCount,
    required this.classCount,
    required this.onSignOut,
    super.key,
  });

  final String teacherName;
  final Map<String, dynamic>? term;
  final int sectionCount;
  final int classCount;
  final VoidCallback onSignOut;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      Card(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            children: [
              CircleAvatar(
                radius: 37,
                backgroundColor: const Color(0xFFEAF0FF),
                child: Text(
                  initials(teacherName),
                  style: const TextStyle(
                    color: AppColors.navy,
                    fontSize: 24,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
              const SizedBox(height: 12),
              Text(
                teacherName,
                style: const TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w800,
                  color: AppColors.ink,
                ),
              ),
              const SizedBox(height: 4),
              const Text(
                'Teacher account',
                style: TextStyle(color: AppColors.muted, fontSize: 13),
              ),
            ],
          ),
        ),
      ),
      const SizedBox(height: 16),
      Card(
        child: Column(
          children: [
            ListTile(
              leading: const Icon(Icons.school_outlined, color: AppColors.navy),
              title: const Text(
                'Current term',
                style: TextStyle(fontWeight: FontWeight.w700),
              ),
              subtitle: Text(
                term == null
                    ? 'Not set'
                    : 'A.Y. ${term!['startYear']}-${(term!['startYear'] as int? ?? 0) + 1} · ${term!['semester']}',
              ),
            ),
            const Divider(height: 1, indent: 56),
            ListTile(
              leading: const Icon(
                Icons.groups_2_outlined,
                color: AppColors.navy,
              ),
              title: const Text(
                'Handled sections',
                style: TextStyle(fontWeight: FontWeight.w700),
              ),
              trailing: Text(
                '$sectionCount',
                style: const TextStyle(
                  color: AppColors.muted,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
            const Divider(height: 1, indent: 56),
            ListTile(
              leading: const Icon(
                Icons.menu_book_outlined,
                color: AppColors.navy,
              ),
              title: const Text(
                'Scheduled classes',
                style: TextStyle(fontWeight: FontWeight.w700),
              ),
              trailing: Text(
                '$classCount',
                style: const TextStyle(
                  color: AppColors.muted,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ],
        ),
      ),
      const SizedBox(height: 16),
      OutlinedButton.icon(
        onPressed: () async {
          if (await showChangePasswordSheet(context) && context.mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                behavior: SnackBarBehavior.floating,
                content: Text(
                  'Password changed. Other devices were signed out.',
                ),
              ),
            );
          }
        },
        icon: const Icon(Icons.key_rounded),
        label: const Text('Change password'),
        style: OutlinedButton.styleFrom(
          minimumSize: const Size.fromHeight(50),
          foregroundColor: AppColors.navy,
          side: const BorderSide(color: AppColors.line),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
        ),
      ),
      const SizedBox(height: 10),
      OutlinedButton.icon(
        onPressed: onSignOut,
        icon: const Icon(Icons.logout_rounded),
        label: const Text('Sign out'),
        style: OutlinedButton.styleFrom(
          minimumSize: const Size.fromHeight(50),
          foregroundColor: const Color(0xFFB42336),
          side: const BorderSide(color: Color(0xFFF2CDD2)),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
        ),
      ),
    ],
  );
}
