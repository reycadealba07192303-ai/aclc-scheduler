import 'dart:async';

import 'package:flutter/material.dart';
import 'package:printing/printing.dart';

import 'package:aclc_teacher_portal/core/errors/api_exception.dart';
import 'package:aclc_teacher_portal/core/theme/app_colors.dart';
import 'package:aclc_teacher_portal/features/attendance/data/attendance_report_pdf.dart';
import 'package:aclc_teacher_portal/features/attendance/presentation/attendance_session_page.dart';
import 'package:aclc_teacher_portal/features/attendance/presentation/widgets/attendance_session_card.dart';
import 'package:aclc_teacher_portal/features/teacher_home/data/teacher_repository.dart';
import 'package:aclc_teacher_portal/shared/utils/app_formatters.dart';
import 'package:aclc_teacher_portal/shared/widgets/feedback_widgets.dart';

class SectionClassesPage extends StatefulWidget {
  const SectionClassesPage({
    required this.section,
    required this.classes,
    required this.subjects,
    required this.onSessionChanged,
    super.key,
  });
  final Map<String, dynamic> section;
  final List<Map<String, dynamic>> classes;
  final Map<String, dynamic> subjects;
  final VoidCallback onSessionChanged;
  @override
  State<SectionClassesPage> createState() => _SectionClassesPageState();
}

class _SectionClassesPageState extends State<SectionClassesPage> {
  List<Map<String, dynamic>> _sessions = [];
  List<Map<String, dynamic>> _history = [];

  /// Per-subject API responses (`sessions` + `report`), keyed by subject ID.
  Map<String, Map<String, dynamic>> _subjectHistory = {};
  var _exporting = false;
  var _loading = true;
  String? _error;
  String? _starting;
  Timer? _poll;

  @override
  void initState() {
    super.initState();
    _load();
    _poll = Timer.periodic(
      const Duration(seconds: 5),
      (_) => _load(silent: true),
    );
  }

  @override
  void dispose() {
    _poll?.cancel();
    super.dispose();
  }

  Future<void> _load({bool silent = false}) async {
    if (!silent && mounted) {
      setState(() {
        _loading = true;
        _error = null;
      });
    }
    try {
      final sectionId = widget.section['id'].toString();
      final subjectIds = [
        ...{for (final schedule in widget.classes) '${schedule['subjectId']}'},
      ];
      final results = await Future.wait<Object>([
        TeacherRepository.instance.loadActiveAttendance(sectionId: sectionId),
        for (final subjectId in subjectIds)
          TeacherRepository.instance.loadSubjectAttendanceHistory(
            sectionId: sectionId,
            subjectId: subjectId,
          ),
      ]);
      final subjectHistory = {
        for (var i = 0; i < subjectIds.length; i++)
          subjectIds[i]: results[i + 1] as Map<String, dynamic>,
      };
      final history =
          [
            for (final response in subjectHistory.values)
              ...mapsFrom(response['sessions']),
          ]..sort(
            (a, b) =>
                '${b['startedAt'] ?? ''}'.compareTo('${a['startedAt'] ?? ''}'),
          );
      if (mounted) {
        setState(() {
          _sessions = mapsFrom(results.first as List<dynamic>);
          _history = history;
          _subjectHistory = subjectHistory;
          _loading = false;
          _error = null;
        });
      }
    } catch (error) {
      if (mounted) {
        setState(() {
          _error = error is ApiException
              ? error.message
              : 'Could not load active attendance.';
          _loading = false;
        });
      }
    }
  }

  /// Attendance opens 15 minutes before the class and closes when it ends
  /// (the server enforces the same window). Returns a label such as
  /// "Opens Tue 7:45 AM" while outside it, or null when it can be started.
  String? _closedUntil(Map<String, dynamic> schedule) {
    int minutesOf(dynamic value) {
      final parts = '$value'.split(':');
      return (int.tryParse(parts.first) ?? 0) * 60 +
          (parts.length > 1 ? int.tryParse(parts[1]) ?? 0 : 0);
    }

    final day = (schedule['dayOfWeek'] as num?)?.toInt();
    final opens = (minutesOf(schedule['startTime']) - 15).clamp(0, 24 * 60);
    final ends = minutesOf(schedule['endTime']);
    final now = DateTime.now();
    final minutes = now.hour * 60 + now.minute;
    if (now.weekday % 7 == day && minutes >= opens && minutes < ends) {
      return null;
    }
    final hour = opens ~/ 60;
    final clock =
        '${hour % 12 == 0 ? 12 : hour % 12}:${(opens % 60).toString().padLeft(2, '0')} ${hour >= 12 ? 'PM' : 'AM'}';
    return 'Opens ${dayLabel(day)} $clock';
  }

  Future<void> _start(Map<String, dynamic> schedule) async {
    final id = schedule['id'].toString();
    setState(() {
      _starting = id;
      _error = null;
    });
    try {
      final sessionId = await TeacherRepository.instance.openAttendance(id);
      widget.onSessionChanged();
      if (!mounted) return;
      await Navigator.of(context).push(
        MaterialPageRoute(
          builder: (_) => AttendanceSessionPage(
            sessionId: sessionId,
            sectionName: widget.section['name'].toString(),
            subjectName: subjectTitle(
              widget.subjects[schedule['subjectId']?.toString()],
            ),
          ),
        ),
      );
      await _load();
    } catch (error) {
      if (mounted) {
        setState(
          () => _error = error is ApiException
              ? error.message
              : 'Could not start attendance.',
        );
      }
    } finally {
      if (mounted) setState(() => _starting = null);
    }
  }

  Future<void> _openSession(Map<String, dynamic> session) async {
    await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => AttendanceSessionPage(
          sessionId: session['id'].toString(),
          sectionName: widget.section['name'].toString(),
          subjectName: subjectTitle(session['subject']),
        ),
      ),
    );
    await _load(silent: true);
  }

  Future<void> _downloadPdf() async {
    setState(() => _exporting = true);
    try {
      final reports = [
        for (final entry in _subjectHistory.entries)
          _reportFor(entry.key, entry.value),
      ];
      final bytes = await buildAttendanceReportPdf(reports);
      final first = reports.isEmpty ? null : reports.first;
      final name = [
        'Attendance',
        if (first != null) first.subjectCode,
        '${widget.section['name'] ?? ''}',
      ].join('-').replaceAll(RegExp(r'[^A-Za-z0-9-]+'), '-');
      await Printing.layoutPdf(onLayout: (_) async => bytes, name: '$name.pdf');
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Could not create the attendance PDF.')),
        );
      }
    } finally {
      if (mounted) setState(() => _exporting = false);
    }
  }

  SubjectAttendanceReport _reportFor(
    String subjectId,
    Map<String, dynamic> response,
  ) {
    final subject = widget.subjects[subjectId];
    final report = response['report'] is Map
        ? Map<String, dynamic>.from(response['report'] as Map)
        : <String, dynamic>{};
    return SubjectAttendanceReport(
      subjectCode: subject is Map ? '${subject['code'] ?? ''}' : '',
      subjectName: subject is Map
          ? '${subject['name'] ?? 'Subject'}'
          : 'Subject',
      sectionName: '${widget.section['name'] ?? 'Section'}',
      teacher: '${report['teacher'] ?? ''}',
      term: '${report['term'] ?? ''}',
      roster: mapsFrom(report['roster']),
      sessions: mapsFrom(response['sessions']),
    );
  }

  @override
  Widget build(BuildContext context) => DefaultTabController(
    length: 2,
    child: Scaffold(
      appBar: AppBar(
        title: Text(widget.section['name']?.toString() ?? 'Section'),
        bottom: TabBar(
          labelColor: AppColors.navy,
          unselectedLabelColor: AppColors.muted,
          indicatorColor: AppColors.navy,
          indicatorSize: TabBarIndicatorSize.label,
          dividerColor: AppColors.line,
          labelStyle: const TextStyle(
            fontFamily: AppFonts.sans,
            fontSize: 14,
            fontWeight: FontWeight.w600,
          ),
          tabs: [
            const Tab(text: 'Class'),
            Tab(
              text: _history.isEmpty
                  ? 'Attendance'
                  : 'Attendance (${_history.length})',
            ),
          ],
        ),
      ),
      body: _loading
          ? const Center(
              child: CircularProgressIndicator(color: AppColors.navy),
            )
          : TabBarView(children: [_buildClassTab(), _buildAttendanceTab()]),
    ),
  );

  Widget _buildClassTab() => ListView(
    padding: const EdgeInsets.all(18),
    children: [
      Text(
        '${widget.section['program'] ?? ''} · ${widget.section['yearLevel'] ?? ''}',
        style: const TextStyle(color: AppColors.muted),
      ),
      const SizedBox(height: 15),
      if (_error != null) ...[ErrorBanner(_error!), const SizedBox(height: 12)],
      ...widget.classes.map((schedule) {
        final subject = widget.subjects[schedule['subjectId']?.toString()];
        final matchingSessions = _sessions.where(
          (s) => s['scheduleId']?.toString() == schedule['id']?.toString(),
        );
        final session = matchingSessions.isEmpty
            ? null
            : matchingSessions.first;
        final isStarting = _starting == schedule['id']?.toString();
        final opensAt = session == null ? _closedUntil(schedule) : null;
        return Card(
          margin: const EdgeInsets.only(bottom: 11),
          child: Padding(
            padding: const EdgeInsets.all(15),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Text(
                        subjectTitle(subject),
                        style: const TextStyle(
                          fontWeight: FontWeight.w800,
                          color: AppColors.ink,
                        ),
                      ),
                    ),
                    if (session != null)
                      const StatusChip('Attendance open', live: true),
                  ],
                ),
                const SizedBox(height: 6),
                Text(
                  '${dayLabel(schedule['dayOfWeek'])} · ${schedule['startTime']}–${schedule['endTime']}',
                  style: const TextStyle(color: AppColors.muted, fontSize: 13),
                ),
                const SizedBox(height: 13),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton.icon(
                    onPressed: isStarting || opensAt != null
                        ? null
                        : () async {
                            if (session != null) {
                              await Navigator.of(context).push(
                                MaterialPageRoute(
                                  builder: (_) => AttendanceSessionPage(
                                    sessionId: session['id'].toString(),
                                    sectionName: widget.section['name']
                                        .toString(),
                                    subjectName: subjectTitle(subject),
                                  ),
                                ),
                              );
                              await _load();
                            } else {
                              await _start(schedule);
                            }
                          },
                    icon: isStarting
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : Icon(
                            opensAt != null
                                ? Icons.lock_clock_outlined
                                : session == null
                                ? Icons.qr_code_2
                                : Icons.groups_outlined,
                          ),
                    label: Text(
                      isStarting
                          ? 'Starting...'
                          : opensAt ??
                                (session == null
                                    ? 'Start attendance'
                                    : 'Manage attendance · ${session['attendanceCount'] ?? 0}'),
                    ),
                    style: FilledButton.styleFrom(
                      backgroundColor: AppColors.navy,
                      disabledBackgroundColor: const Color(0xFFE9EDF4),
                      disabledForegroundColor: AppColors.muted,
                      padding: const EdgeInsets.symmetric(vertical: 13),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(11),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      }),
      const SizedBox(height: 4),
      const Text(
        'Students open Attendance on the student portal to show their personal QR. Scan it from the attendance screen.',
        style: TextStyle(color: AppColors.muted, height: 1.5, fontSize: 13),
      ),
    ],
  );

  Widget _buildAttendanceTab() => RefreshIndicator(
    onRefresh: _load,
    child: ListView(
      padding: const EdgeInsets.all(18),
      children: [
        if (_error != null) ...[
          ErrorBanner(_error!),
          const SizedBox(height: 12),
        ],
        _HistoryHeader(history: _history),
        const SizedBox(height: 12),
        SizedBox(
          height: 48,
          child: FilledButton.icon(
            onPressed: _exporting || _subjectHistory.isEmpty
                ? null
                : _downloadPdf,
            style: FilledButton.styleFrom(backgroundColor: AppColors.navy),
            icon: _exporting
                ? const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Colors.white,
                    ),
                  )
                : const Icon(Icons.download_rounded, size: 20),
            label: Text(_exporting ? 'Preparing PDF…' : 'Download PDF'),
          ),
        ),
        const SizedBox(height: 16),
        if (_history.isEmpty)
          const EmptyState(
            icon: Icons.history_rounded,
            title: 'No attendance taken yet',
            message:
                'Each session you run for this subject will be listed here with who checked in.',
          )
        else
          for (final session in _history)
            AttendanceSessionCard(
              key: ValueKey(session['id']),
              session: session,
              showDate: true,
              onOpen: () => _openSession(session),
            ),
      ],
    ),
  );
}

class _HistoryHeader extends StatelessWidget {
  const _HistoryHeader({required this.history});
  final List<Map<String, dynamic>> history;

  @override
  Widget build(BuildContext context) {
    final rated = history.where(
      (session) => ((session['enrolledCount'] as num?) ?? 0) > 0,
    );
    final average = rated.isEmpty
        ? null
        : rated
                  .map(
                    (session) =>
                        mapsFrom(session['attendance']).length /
                        (session['enrolledCount'] as num),
                  )
                  .reduce((a, b) => a + b) /
              rated.length;
    return Row(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        const Expanded(
          child: Text(
            'Attendance history',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w700,
              letterSpacing: -.4,
              color: AppColors.ink,
            ),
          ),
        ),
        if (history.isNotEmpty)
          Text(
            '${history.length} ${history.length == 1 ? 'SESSION' : 'SESSIONS'}'
            '${average == null ? '' : ' · AVG ${(average * 100).round()}%'}',
            style: const TextStyle(
              fontFamily: AppFonts.mono,
              fontSize: 11,
              fontWeight: FontWeight.w500,
              letterSpacing: .5,
              color: AppColors.muted,
            ),
          ),
      ],
    );
  }
}
