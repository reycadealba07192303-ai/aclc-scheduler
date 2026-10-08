import 'package:flutter/material.dart';

import 'package:aclc_teacher_portal/core/theme/app_colors.dart';
import 'package:aclc_teacher_portal/features/attendance/presentation/widgets/class_roster.dart';
import 'package:aclc_teacher_portal/shared/utils/app_formatters.dart';
import 'package:aclc_teacher_portal/shared/widgets/feedback_widgets.dart';

/// One attendance session: subject (or date), time, live/closed status, the
/// present count against the enrolled roster, and an expandable check-in list.
class AttendanceSessionCard extends StatefulWidget {
  const AttendanceSessionCard({
    required this.session,
    required this.onOpen,
    this.showDate = false,
    super.key,
  });
  final Map<String, dynamic> session;
  final VoidCallback onOpen;

  /// Title the card with the session date instead of the subject, for lists
  /// that already belong to one subject.
  final bool showDate;

  @override
  State<AttendanceSessionCard> createState() => _AttendanceSessionCardState();
}

class _AttendanceSessionCardState extends State<AttendanceSessionCard> {
  var _expanded = false;

  @override
  Widget build(BuildContext context) {
    final session = widget.session;
    final subject = session['subject'] is Map ? session['subject'] as Map : {};
    final live = session['status'] == 'active';
    final attendance = mapsFrom(session['attendance']);
    final enrolled = (session['enrolledCount'] as num?)?.toInt() ?? 0;
    final lateCount = attendance.where((r) => r['status'] == 'late').length;
    final start = timeLabel(session['startedAt']?.toString());
    final end = live ? 'ongoing' : timeLabel(session['endedAt']?.toString());

    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                if (!widget.showDate && '${subject['code'] ?? ''}'.isNotEmpty)
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
                      '${subject['code']}',
                      style: const TextStyle(
                        fontFamily: AppFonts.mono,
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: AppColors.navy,
                      ),
                    ),
                  ),
                const Spacer(),
                StatusChip(live ? 'Live' : 'Closed', live: live),
              ],
            ),
            const SizedBox(height: 10),
            Text(
              widget.showDate
                  ? longDate(
                      DateTime.tryParse(
                            '${session['startedAt'] ?? ''}',
                          )?.toLocal() ??
                          DateTime.now(),
                    )
                  : '${subject['name'] ?? 'Subject'}',
              style: const TextStyle(
                fontSize: 16,
                height: 1.25,
                fontWeight: FontWeight.w600,
                letterSpacing: -.3,
                color: AppColors.ink,
              ),
            ),
            const SizedBox(height: 5),
            Text(
              '${session['section'] ?? 'Section'} · $start – $end',
              style: const TextStyle(fontSize: 12.5, color: AppColors.muted),
            ),
            const SizedBox(height: 14),
            Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  '${attendance.length}',
                  style: const TextStyle(
                    fontSize: 22,
                    height: 1,
                    fontWeight: FontWeight.w700,
                    letterSpacing: -.6,
                    color: AppColors.ink,
                  ),
                ),
                const SizedBox(width: 6),
                Text(
                  '${enrolled > 0 ? 'of $enrolled present' : 'present'}${lateCount > 0 ? ' · $lateCount late' : ''}',
                  style: const TextStyle(fontSize: 13, color: AppColors.muted),
                ),
              ],
            ),
            if (enrolled > 0) ...[
              const SizedBox(height: 8),
              ClipRRect(
                borderRadius: BorderRadius.circular(99),
                child: LinearProgressIndicator(
                  value: (attendance.length / enrolled).clamp(0, 1).toDouble(),
                  minHeight: 5,
                  backgroundColor: const Color(0xFFEDF0F5),
                  color: live ? const Color(0xFF16A34A) : AppColors.navyBright,
                ),
              ),
            ],
            const SizedBox(height: 6),
            Row(
              children: [
                TextButton.icon(
                  onPressed: attendance.isEmpty
                      ? null
                      : () => setState(() => _expanded = !_expanded),
                  style: TextButton.styleFrom(
                    padding: const EdgeInsets.symmetric(horizontal: 4),
                    foregroundColor: AppColors.navy,
                  ),
                  icon: Icon(
                    _expanded
                        ? Icons.expand_less_rounded
                        : Icons.expand_more_rounded,
                    size: 18,
                  ),
                  label: Text(
                    attendance.isEmpty
                        ? 'No check-ins'
                        : _expanded
                        ? 'Hide students'
                        : 'Show students',
                  ),
                ),
                const Spacer(),
                TextButton(
                  onPressed: widget.onOpen,
                  style: TextButton.styleFrom(foregroundColor: AppColors.navy),
                  child: Text(live ? 'Open session →' : 'Class list →'),
                ),
              ],
            ),
            if (_expanded) ...[
              const Divider(color: AppColors.line, height: 1),
              for (final record in attendance) _StudentRow(record: record),
              const SizedBox(height: 6),
            ],
          ],
        ),
      ),
    );
  }
}

class _StudentRow extends StatelessWidget {
  const _StudentRow({required this.record});
  final Map<String, dynamic> record;

  @override
  Widget build(BuildContext context) {
    final name = '${record['studentName'] ?? 'Student'}';
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 9),
      child: Row(
        children: [
          CircleAvatar(
            radius: 16,
            backgroundColor: const Color(0xFFEDF2FF),
            child: Text(
              initials(name),
              style: const TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color: AppColors.navy,
              ),
            ),
          ),
          const SizedBox(width: 11),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 13.5,
                    fontWeight: FontWeight.w500,
                    color: AppColors.ink,
                  ),
                ),
                Text(
                  '${record['studentNumber'] ?? ''}',
                  style: const TextStyle(
                    fontFamily: AppFonts.mono,
                    fontSize: 11,
                    color: AppColors.muted,
                  ),
                ),
              ],
            ),
          ),
          if (record['status'] == 'late') ...[
            const AttendanceStatusPill('late'),
            const SizedBox(width: 8),
          ],
          Text(
            timeLabel(record['checkedInAt']?.toString()),
            style: const TextStyle(
              fontFamily: AppFonts.mono,
              fontSize: 11.5,
              color: AppColors.muted,
            ),
          ),
        ],
      ),
    );
  }
}
