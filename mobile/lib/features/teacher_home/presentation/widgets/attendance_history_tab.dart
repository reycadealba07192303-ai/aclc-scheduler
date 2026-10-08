import 'dart:async';

import 'package:flutter/material.dart';

import 'package:aclc_teacher_portal/core/errors/api_exception.dart';
import 'package:aclc_teacher_portal/core/theme/app_colors.dart';
import 'package:aclc_teacher_portal/features/attendance/presentation/attendance_session_page.dart';
import 'package:aclc_teacher_portal/features/attendance/presentation/widgets/attendance_session_card.dart';
import 'package:aclc_teacher_portal/features/teacher_home/data/teacher_repository.dart';
import 'package:aclc_teacher_portal/shared/utils/app_formatters.dart';
import 'package:aclc_teacher_portal/shared/widgets/feedback_widgets.dart';

/// The attendance sessions a teacher ran on a chosen day, with who checked in.
class AttendanceHistoryTab extends StatefulWidget {
  const AttendanceHistoryTab({required this.refreshTick, super.key});

  /// Incremented by the home page on pull-to-refresh to reload this tab.
  final int refreshTick;

  @override
  State<AttendanceHistoryTab> createState() => _AttendanceHistoryTabState();
}

class _AttendanceHistoryTabState extends State<AttendanceHistoryTab> {
  var _day = DateUtils.dateOnly(DateTime.now());
  List<Map<String, dynamic>> _sessions = [];
  var _loading = true;
  String? _error;
  Timer? _poll;
  var _requestId = 0;

  bool get _isToday => DateUtils.isSameDay(_day, DateTime.now());

  @override
  void initState() {
    super.initState();
    _load();
    // Keep today's live sessions and check-in counts current.
    _poll = Timer.periodic(const Duration(seconds: 10), (_) {
      if (_isToday) _load(silent: true);
    });
  }

  @override
  void didUpdateWidget(AttendanceHistoryTab oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.refreshTick != widget.refreshTick) _load(silent: true);
  }

  @override
  void dispose() {
    _poll?.cancel();
    super.dispose();
  }

  Future<void> _load({bool silent = false}) async {
    final requestId = ++_requestId;
    if (!silent) {
      setState(() {
        _loading = true;
        _error = null;
      });
    }
    try {
      final sessions = await TeacherRepository.instance.loadAttendanceHistory(
        _day,
      );
      if (!mounted || requestId != _requestId) return;
      setState(() {
        _sessions = mapsFrom(sessions);
        _loading = false;
        _error = null;
      });
    } catch (error) {
      if (!mounted || requestId != _requestId) return;
      setState(() {
        _error = error is ApiException
            ? error.message
            : 'Could not load attendance history.';
        _loading = false;
      });
    }
  }

  void _setDay(DateTime day) {
    setState(() => _day = DateUtils.dateOnly(day));
    _load();
  }

  Future<void> _pickDay() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _day,
      firstDate: DateTime(2024),
      lastDate: DateTime.now(),
      helpText: 'Show attendance for',
    );
    if (picked != null) _setDay(picked);
  }

  Future<void> _openSession(Map<String, dynamic> session) async {
    final subject = session['subject'];
    await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => AttendanceSessionPage(
          sessionId: session['id'].toString(),
          sectionName: '${session['section'] ?? 'Section'}',
          subjectName: subjectTitle(subject),
        ),
      ),
    );
    if (mounted) _load(silent: true);
  }

  @override
  Widget build(BuildContext context) {
    final checkIns = _sessions.fold<int>(
      0,
      (sum, session) => sum + mapsFrom(session['attendance']).length,
    );
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Text(
          'Attendance history',
          style: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.w700,
            color: AppColors.ink,
            letterSpacing: -.5,
          ),
        ),
        const SizedBox(height: 3),
        const Text(
          'Sessions you ran and the students who checked in',
          style: TextStyle(fontSize: 12, color: AppColors.muted),
        ),
        const SizedBox(height: 14),
        _DayBar(
          label: _isToday ? 'Today' : longDate(_day),
          sublabel: _isToday ? longDate(_day) : null,
          onPrevious: () => _setDay(_day.subtract(const Duration(days: 1))),
          onNext: _isToday
              ? null
              : () => _setDay(_day.add(const Duration(days: 1))),
          onPick: _pickDay,
        ),
        const SizedBox(height: 14),
        if (_error != null) ...[
          ErrorBanner(_error!),
          const SizedBox(height: 12),
        ],
        if (_loading)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 48),
            child: Center(
              child: CircularProgressIndicator(color: AppColors.navy),
            ),
          )
        else if (_sessions.isEmpty)
          EmptyState(
            icon: Icons.event_busy_outlined,
            title: 'No attendance taken',
            message: _isToday
                ? 'Sessions you start today will be listed here with everyone who checked in.'
                : 'You did not run any attendance sessions on this day.',
          )
        else ...[
          Padding(
            padding: const EdgeInsets.fromLTRB(2, 0, 2, 10),
            child: Text(
              '${_sessions.length} ${_sessions.length == 1 ? 'SESSION' : 'SESSIONS'} · $checkIns ${checkIns == 1 ? 'CHECK-IN' : 'CHECK-INS'}',
              style: const TextStyle(
                fontFamily: AppFonts.mono,
                fontSize: 11,
                fontWeight: FontWeight.w500,
                letterSpacing: .6,
                color: AppColors.muted,
              ),
            ),
          ),
          for (final session in _sessions)
            AttendanceSessionCard(
              key: ValueKey(session['id']),
              session: session,
              onOpen: () => _openSession(session),
            ),
        ],
      ],
    );
  }
}

class _DayBar extends StatelessWidget {
  const _DayBar({
    required this.label,
    required this.onPrevious,
    required this.onNext,
    required this.onPick,
    this.sublabel,
  });

  final String label;
  final String? sublabel;
  final VoidCallback onPrevious;
  final VoidCallback? onNext;
  final VoidCallback onPick;

  @override
  Widget build(BuildContext context) => Card(
    child: Padding(
      padding: const EdgeInsets.all(6),
      child: Row(
        children: [
          IconButton(
            tooltip: 'Previous day',
            onPressed: onPrevious,
            icon: const Icon(Icons.chevron_left_rounded),
          ),
          Expanded(
            child: InkWell(
              borderRadius: BorderRadius.circular(12),
              onTap: onPick,
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 6),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(
                          Icons.calendar_today_rounded,
                          size: 15,
                          color: AppColors.navy,
                        ),
                        const SizedBox(width: 7),
                        Flexible(
                          child: Text(
                            label,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w600,
                              color: AppColors.ink,
                              letterSpacing: -.2,
                            ),
                          ),
                        ),
                      ],
                    ),
                    if (sublabel != null)
                      Text(
                        sublabel!,
                        style: const TextStyle(
                          fontSize: 11.5,
                          color: AppColors.muted,
                        ),
                      ),
                  ],
                ),
              ),
            ),
          ),
          IconButton(
            tooltip: 'Next day',
            onPressed: onNext,
            icon: const Icon(Icons.chevron_right_rounded),
          ),
        ],
      ),
    ),
  );
}
