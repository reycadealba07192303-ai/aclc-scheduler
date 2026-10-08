import 'package:flutter/material.dart';

import 'package:aclc_teacher_portal/core/theme/app_colors.dart';
import 'package:aclc_teacher_portal/shared/utils/app_formatters.dart';

/// Label and colors for an attendance status: `present`, `late`, or `absent`.
({String label, Color ink, Color fill}) attendanceStatusStyle(String? status) =>
    switch (status) {
      'present' => (
        label: 'Present',
        ink: const Color(0xFF15803D),
        fill: const Color(0xFFE3F6EA),
      ),
      'late' => (
        label: 'Late',
        ink: const Color(0xFFB45309),
        fill: const Color(0xFFFEF3C7),
      ),
      _ => (
        label: 'Absent',
        ink: const Color(0xFFB91C1C),
        fill: const Color(0xFFFDE8E8),
      ),
    };

class AttendanceStatusPill extends StatelessWidget {
  const AttendanceStatusPill(this.status, {super.key});
  final String? status;

  @override
  Widget build(BuildContext context) {
    final style = attendanceStatusStyle(status);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
      decoration: BoxDecoration(
        color: style.fill,
        borderRadius: BorderRadius.circular(99),
      ),
      child: Text(
        style.label,
        style: TextStyle(
          fontSize: 11.5,
          fontWeight: FontWeight.w600,
          color: style.ink,
        ),
      ),
    );
  }
}

/// The whole section for one session: counts, a status filter, and every
/// enrolled student. Tapping a student lets the teacher change their status.
class ClassRoster extends StatefulWidget {
  const ClassRoster({
    required this.roster,
    required this.live,
    required this.onTapStudent,
    this.lateAfter,
    super.key,
  });

  final List<Map<String, dynamic>> roster;
  final bool live;
  final String? lateAfter;
  final void Function(Map<String, dynamic> student) onTapStudent;

  @override
  State<ClassRoster> createState() => _ClassRosterState();
}

class _ClassRosterState extends State<ClassRoster> {
  String? _filter;

  @override
  Widget build(BuildContext context) {
    int count(String status) =>
        widget.roster.where((s) => s['status'] == status).length;
    final shown = _filter == null
        ? widget.roster
        : widget.roster.where((s) => s['status'] == _filter).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            const Expanded(
              child: Text(
                'Class list',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  letterSpacing: -.4,
                  color: AppColors.ink,
                ),
              ),
            ),
            Text(
              '${widget.roster.length} ENROLLED',
              style: const TextStyle(
                fontFamily: AppFonts.mono,
                fontSize: 11,
                letterSpacing: .5,
                color: AppColors.muted,
              ),
            ),
          ],
        ),
        if (widget.lateAfter != null) ...[
          const SizedBox(height: 3),
          Text(
            'Check-ins after ${widget.lateAfter} are marked late. Tap a student to change their status.',
            style: const TextStyle(
              fontSize: 12,
              height: 1.4,
              color: AppColors.muted,
            ),
          ),
        ],
        const SizedBox(height: 12),
        Row(
          children: [
            for (final (status, value) in [
              ('present', count('present')),
              ('late', count('late')),
              ('absent', count('absent')),
            ]) ...[
              Expanded(
                child: _CountTile(
                  status: status,
                  value: value,
                  selected: _filter == status,
                  absentWhileLive: widget.live && status == 'absent',
                  onTap: () => setState(
                    () => _filter = _filter == status ? null : status,
                  ),
                ),
              ),
              if (status != 'absent') const SizedBox(width: 8),
            ],
          ],
        ),
        const SizedBox(height: 12),
        if (widget.roster.isEmpty)
          const _Note('No students are enrolled in this section yet.')
        else if (shown.isEmpty)
          _Note(
            'No ${attendanceStatusStyle(_filter).label.toLowerCase()} students.',
          )
        else
          Card(
            clipBehavior: Clip.antiAlias,
            child: Column(
              children: [
                for (var i = 0; i < shown.length; i++) ...[
                  if (i > 0)
                    const Divider(height: 1, indent: 62, color: AppColors.line),
                  _StudentTile(
                    student: shown[i],
                    live: widget.live,
                    onTap: () => widget.onTapStudent(shown[i]),
                  ),
                ],
              ],
            ),
          ),
      ],
    );
  }
}

class _CountTile extends StatelessWidget {
  const _CountTile({
    required this.status,
    required this.value,
    required this.selected,
    required this.absentWhileLive,
    required this.onTap,
  });
  final String status;
  final int value;
  final bool selected;
  final bool absentWhileLive;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final style = attendanceStatusStyle(status);
    return Material(
      color: selected ? style.fill : Colors.white,
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: selected
                  ? style.ink.withValues(alpha: .4)
                  : AppColors.line,
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '$value',
                style: TextStyle(
                  fontSize: 22,
                  height: 1.1,
                  fontWeight: FontWeight.w700,
                  letterSpacing: -.5,
                  color: style.ink,
                ),
              ),
              Text(
                absentWhileLive ? 'Not yet' : style.label,
                style: const TextStyle(fontSize: 12, color: AppColors.muted),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _StudentTile extends StatelessWidget {
  const _StudentTile({
    required this.student,
    required this.live,
    required this.onTap,
  });
  final Map<String, dynamic> student;
  final bool live;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final name = '${student['studentName'] ?? 'Student'}';
    final status = student['status']?.toString();
    final checkedIn = timeLabel(student['checkedInAt']?.toString());
    final manual = student['source'] == 'manual';
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(14, 10, 12, 10),
        child: Row(
          children: [
            CircleAvatar(
              radius: 17,
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
            const SizedBox(width: 12),
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
                    [
                      '${student['studentNumber'] ?? ''}',
                      if (checkedIn.isNotEmpty) checkedIn,
                      if (manual) 'set by you',
                    ].join(' · '),
                    style: const TextStyle(
                      fontFamily: AppFonts.mono,
                      fontSize: 10.5,
                      color: AppColors.muted,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            if (live && status == 'absent')
              const Text(
                'Not yet',
                style: TextStyle(fontSize: 12, color: AppColors.muted),
              )
            else
              AttendanceStatusPill(status),
          ],
        ),
      ),
    );
  }
}

class _Note extends StatelessWidget {
  const _Note(this.text);
  final String text;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 20),
    child: Text(
      text,
      textAlign: TextAlign.center,
      style: const TextStyle(color: AppColors.muted, fontSize: 13),
    ),
  );
}

/// Asks the teacher which status to give [student]; resolves to the choice.
Future<String?> pickAttendanceStatus(
  BuildContext context,
  Map<String, dynamic> student,
) => showModalBottomSheet<String>(
  context: context,
  backgroundColor: Colors.white,
  shape: const RoundedRectangleBorder(
    borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
  ),
  builder: (context) => SafeArea(
    child: Padding(
      padding: const EdgeInsets.fromLTRB(20, 18, 20, 12),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            '${student['studentName'] ?? 'Student'}',
            style: const TextStyle(
              fontSize: 17,
              fontWeight: FontWeight.w600,
              color: AppColors.ink,
            ),
          ),
          Text(
            '${student['studentNumber'] ?? ''}',
            style: const TextStyle(
              fontFamily: AppFonts.mono,
              fontSize: 12,
              color: AppColors.muted,
            ),
          ),
          const SizedBox(height: 14),
          for (final status in ['present', 'late', 'absent'])
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: _StatusOption(
                status: status,
                current: student['status'] == status,
                onTap: () => Navigator.pop(context, status),
              ),
            ),
        ],
      ),
    ),
  ),
);

class _StatusOption extends StatelessWidget {
  const _StatusOption({
    required this.status,
    required this.current,
    required this.onTap,
  });
  final String status;
  final bool current;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final style = attendanceStatusStyle(status);
    return Material(
      color: current ? style.fill : const Color(0xFFF5F7FB),
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: current ? null : onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          child: Row(
            children: [
              Icon(
                switch (status) {
                  'present' => Icons.check_circle_rounded,
                  'late' => Icons.schedule_rounded,
                  _ => Icons.cancel_rounded,
                },
                color: style.ink,
                size: 22,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  'Mark ${style.label.toLowerCase()}',
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    color: style.ink,
                  ),
                ),
              ),
              if (current)
                const Text(
                  'Current',
                  style: TextStyle(fontSize: 12, color: AppColors.muted),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
