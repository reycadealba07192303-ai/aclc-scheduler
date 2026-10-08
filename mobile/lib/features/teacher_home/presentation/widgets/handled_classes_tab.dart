import 'package:flutter/material.dart';

import 'package:aclc_teacher_portal/core/theme/app_colors.dart';
import 'package:aclc_teacher_portal/shared/utils/app_formatters.dart';
import 'package:aclc_teacher_portal/shared/widgets/feedback_widgets.dart';

/// Lists every handled class (one scheduled subject meeting) as its own card,
/// grouped by day, so subjects of the same section on the same day stay separate.
class HandledClassesTab extends StatelessWidget {
  const HandledClassesTab({
    required this.sections,
    required this.schedules,
    required this.subjects,
    required this.sessions,
    required this.onOpenClass,
    this.error,
    super.key,
  });

  final List<Map<String, dynamic>> sections;
  final List<Map<String, dynamic>> schedules;
  final Map<String, dynamic> subjects;
  final List<Map<String, dynamic>> sessions;
  final String? error;
  final void Function(
    Map<String, dynamic> section,
    Map<String, dynamic> schedule,
  )
  onOpenClass;

  @override
  Widget build(BuildContext context) {
    final sectionById = {
      for (final section in sections) section['id'].toString(): section,
    };
    final classes =
        schedules
            .where(
              (schedule) =>
                  sectionById.containsKey(schedule['sectionId'].toString()),
            )
            .toList()
          ..sort((a, b) {
            final byDay = daySortKey(
              a['dayOfWeek'],
            ).compareTo(daySortKey(b['dayOfWeek']));
            if (byDay != 0) return byDay;
            return '${a['startTime'] ?? ''}'.compareTo(
              '${b['startTime'] ?? ''}',
            );
          });
    final byDay = <int, List<Map<String, dynamic>>>{};
    for (final schedule in classes) {
      final day = (schedule['dayOfWeek'] as num?)?.toInt() ?? -1;
      byDay.putIfAbsent(day, () => []).add(schedule);
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (error != null) ...[ErrorBanner(error!), const SizedBox(height: 14)],
        Row(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            const Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Your classes',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w700,
                      color: AppColors.ink,
                      letterSpacing: -.5,
                    ),
                  ),
                  SizedBox(height: 3),
                  Text(
                    'Tap a subject to manage its attendance',
                    style: TextStyle(fontSize: 12, color: AppColors.muted),
                  ),
                ],
              ),
            ),
            if (classes.isNotEmpty)
              StatusChip(
                '${classes.length} ${classes.length == 1 ? 'class' : 'classes'}',
              ),
          ],
        ),
        const SizedBox(height: 13),
        if (classes.isEmpty)
          const EmptyState(
            icon: Icons.class_outlined,
            title: 'No handled classes yet',
            message:
                'Your assigned classes will appear here after the administrator publishes the schedule.',
          )
        else
          for (final entry in byDay.entries) ...[
            Padding(
              padding: const EdgeInsets.fromLTRB(2, 6, 2, 9),
              child: Row(
                children: [
                  Text(
                    dayName(entry.key).isEmpty
                        ? 'UNSCHEDULED'
                        : dayName(entry.key).toUpperCase(),
                    style: const TextStyle(
                      fontFamily: AppFonts.mono,
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      letterSpacing: .8,
                      color: AppColors.ink,
                    ),
                  ),
                  const SizedBox(width: 10),
                  const Expanded(
                    child: Divider(color: AppColors.line, height: 1),
                  ),
                  const SizedBox(width: 10),
                  Text(
                    '${entry.value.length} ${entry.value.length == 1 ? 'class' : 'classes'}',
                    style: const TextStyle(
                      fontSize: 11,
                      color: AppColors.muted,
                    ),
                  ),
                ],
              ),
            ),
            for (final schedule in entry.value)
              _ClassCard(
                schedule: schedule,
                section: sectionById[schedule['sectionId'].toString()]!,
                subject: subjects[schedule['subjectId']?.toString()],
                live: sessions.any(
                  (session) =>
                      session['scheduleId'].toString() ==
                      schedule['id'].toString(),
                ),
                onTap: () => onOpenClass(
                  sectionById[schedule['sectionId'].toString()]!,
                  schedule,
                ),
              ),
            const SizedBox(height: 6),
          ],
      ],
    );
  }
}

class _ClassCard extends StatelessWidget {
  const _ClassCard({
    required this.schedule,
    required this.section,
    required this.subject,
    required this.live,
    required this.onTap,
  });

  final Map<String, dynamic> schedule;
  final Map<String, dynamic> section;
  final dynamic subject;
  final bool live;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final online = schedule['modality'] == 'online';
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: InkWell(
        borderRadius: BorderRadius.circular(20),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: const Color(0xFFEDF2FF),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      subject is Map
                          ? '${subject['code'] ?? 'CLASS'}'
                          : 'CLASS',
                      style: const TextStyle(
                        fontFamily: AppFonts.mono,
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: AppColors.navy,
                      ),
                    ),
                  ),
                  const Spacer(),
                  if (live) const StatusChip('Attendance open', live: true),
                ],
              ),
              const SizedBox(height: 10),
              Text(
                subject is Map ? '${subject['name'] ?? 'Subject'}' : 'Subject',
                style: const TextStyle(
                  fontSize: 16,
                  height: 1.25,
                  fontWeight: FontWeight.w600,
                  letterSpacing: -.3,
                  color: AppColors.ink,
                ),
              ),
              const SizedBox(height: 6),
              Wrap(
                spacing: 12,
                runSpacing: 4,
                children: [
                  _Meta(
                    icon: Icons.groups_2_outlined,
                    text: '${section['name'] ?? 'Section'}',
                  ),
                  _Meta(
                    icon: Icons.schedule_rounded,
                    text:
                        '${dayLabel(schedule['dayOfWeek'])} ${schedule['startTime'] ?? ''}–${schedule['endTime'] ?? ''}',
                  ),
                  _Meta(
                    icon: online
                        ? Icons.videocam_outlined
                        : Icons.meeting_room_outlined,
                    text: online ? 'Online' : 'Face-to-face',
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Text(
                    live ? 'Manage attendance' : 'Start attendance',
                    style: const TextStyle(
                      color: AppColors.navy,
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(width: 4),
                  const Icon(
                    Icons.arrow_forward_rounded,
                    size: 16,
                    color: AppColors.navy,
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Meta extends StatelessWidget {
  const _Meta({required this.icon, required this.text});
  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) => Row(
    mainAxisSize: MainAxisSize.min,
    children: [
      Icon(icon, size: 14, color: AppColors.muted),
      const SizedBox(width: 5),
      Text(
        text,
        style: const TextStyle(fontSize: 12.5, color: AppColors.muted),
      ),
    ],
  );
}
