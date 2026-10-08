import 'dart:async';

import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

import 'package:aclc_teacher_portal/core/errors/api_exception.dart';
import 'package:aclc_teacher_portal/core/theme/app_colors.dart';
import 'package:aclc_teacher_portal/features/attendance/presentation/widgets/class_roster.dart';
import 'package:aclc_teacher_portal/features/teacher_home/data/teacher_repository.dart';
import 'package:aclc_teacher_portal/shared/utils/app_formatters.dart';
import 'package:aclc_teacher_portal/shared/widgets/feedback_widgets.dart';

class AttendanceSessionPage extends StatefulWidget {
  const AttendanceSessionPage({
    required this.sessionId,
    required this.sectionName,
    required this.subjectName,
    super.key,
  });
  final String sessionId;
  final String sectionName;
  final String subjectName;
  @override
  State<AttendanceSessionPage> createState() => _AttendanceSessionPageState();
}

class _AttendanceSessionPageState extends State<AttendanceSessionPage> {
  Map<String, dynamic>? _data;
  String? _error;
  var _loading = true;
  var _closing = false;
  var _scanBusy = false;
  String? _lastScannedToken;
  Timer? _poll;

  @override
  void initState() {
    super.initState();
    _load();
    _poll = Timer.periodic(
      const Duration(seconds: 3),
      (_) => _load(silent: true),
    );
  }

  @override
  void dispose() {
    _poll?.cancel();
    super.dispose();
  }

  Future<void> _load({bool silent = false}) async {
    try {
      final data = await TeacherRepository.instance.loadAttendanceSession(
        widget.sessionId,
      );
      if (mounted) {
        setState(() {
          _data = data;
          _loading = false;
          _error = null;
        });
      }
    } catch (error) {
      if (mounted) {
        setState(() {
          _error = error is ApiException
              ? error.message
              : 'Could not load attendance.';
          _loading = false;
        });
      }
    }
  }

  Future<void> _scanStudent(String token) async {
    if (_scanBusy || token.isEmpty || token == _lastScannedToken) return;
    _lastScannedToken = token;
    setState(() {
      _scanBusy = true;
      _error = null;
    });
    try {
      final result = await TeacherRepository.instance.checkInStudent(token);
      final student = result['student'] as Map<String, dynamic>? ?? const {};
      final late = result['status'] == 'late';
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            behavior: SnackBarBehavior.floating,
            backgroundColor: late
                ? const Color(0xFFB45309)
                : const Color(0xFF18854B),
            content: Text(
              '${late ? 'Late' : 'Present'}: ${student['name'] ?? student['studentNumber'] ?? 'Student'}',
            ),
          ),
        );
      }
      await _load(silent: true);
    } catch (error) {
      if (error is! ApiException ||
          !error.message.toLowerCase().contains('already checked in')) {
        _lastScannedToken = null;
      }
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            behavior: SnackBarBehavior.floating,
            content: Text(
              error is ApiException
                  ? error.message
                  : 'Could not record attendance.',
            ),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _scanBusy = false);
    }
  }

  Future<void> _markStudent(Map<String, dynamic> student) async {
    final status = await pickAttendanceStatus(context, student);
    if (status == null || status == student['status'] || !mounted) return;
    try {
      await TeacherRepository.instance.markStudent(
        sessionId: widget.sessionId,
        studentId: '${student['studentId']}',
        status: status,
      );
      await _load(silent: true);
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            behavior: SnackBarBehavior.floating,
            content: Text(
              error is ApiException
                  ? error.message
                  : 'Could not update attendance.',
            ),
          ),
        );
      }
    }
  }

  Future<void> _close() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Close attendance?'),
        content: const Text(
          'Students will no longer be able to check in to this session.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Close attendance'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    setState(() {
      _closing = true;
      _error = null;
    });
    try {
      await TeacherRepository.instance.closeAttendance(widget.sessionId);
      await _load();
    } catch (error) {
      if (mounted) {
        setState(
          () => _error = error is ApiException
              ? error.message
              : 'Could not close attendance.',
        );
      }
    } finally {
      if (mounted) setState(() => _closing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final session = _data?['session'] as Map<String, dynamic>?;
    final roster = mapsFrom(_data?['roster']);
    final active = session?['status'] == 'active';
    return Scaffold(
      appBar: AppBar(
        title: const Text('Take attendance'),
        actions: [
          if (active)
            TextButton.icon(
              onPressed: _closing ? null : _close,
              icon: const Icon(Icons.stop_circle_outlined),
              label: Text(_closing ? 'Closing' : 'Close'),
            ),
        ],
      ),
      body: _loading && _data == null
          ? const Center(
              child: CircularProgressIndicator(color: AppColors.navy),
            )
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                padding: const EdgeInsets.fromLTRB(17, 8, 17, 24),
                children: [
                  Container(
                    padding: const EdgeInsets.all(17),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                        colors: [Color(0xFF172B5B), Color(0xFF3157B1)],
                      ),
                      borderRadius: BorderRadius.circular(22),
                      boxShadow: const [
                        BoxShadow(
                          color: Color(0x22203D91),
                          blurRadius: 18,
                          offset: Offset(0, 8),
                        ),
                      ],
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 46,
                          height: 46,
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: .13),
                            borderRadius: BorderRadius.circular(15),
                          ),
                          child: const Icon(
                            Icons.qr_code_scanner_rounded,
                            color: Colors.white,
                            size: 24,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                widget.subjectName,
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.w800,
                                  fontSize: 16,
                                  height: 1.2,
                                ),
                              ),
                              const SizedBox(height: 5),
                              Row(
                                children: [
                                  Text(
                                    widget.sectionName,
                                    style: const TextStyle(
                                      color: Color(0xFFD7E1FB),
                                      fontSize: 12,
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Container(
                                    width: 6,
                                    height: 6,
                                    decoration: BoxDecoration(
                                      color: active
                                          ? const Color(0xFF79E6A6)
                                          : const Color(0xFFFFCB78),
                                      shape: BoxShape.circle,
                                    ),
                                  ),
                                  const SizedBox(width: 5),
                                  Text(
                                    active ? 'READY TO SCAN' : 'CLOSED',
                                    style: TextStyle(
                                      color: active
                                          ? const Color(0xFF9AF0BA)
                                          : const Color(0xFFFFD38A),
                                      fontSize: 9,
                                      letterSpacing: .8,
                                      fontWeight: FontWeight.w800,
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  if (_error != null) ...[
                    const SizedBox(height: 12),
                    ErrorBanner(_error!),
                  ],
                  const SizedBox(height: 14),
                  if (active)
                    Card(
                      clipBehavior: Clip.antiAlias,
                      child: Padding(
                        padding: const EdgeInsets.all(14),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Row(
                              children: [
                                const Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        'Scan student QR',
                                        style: TextStyle(
                                          fontSize: 17,
                                          fontWeight: FontWeight.w800,
                                          color: AppColors.ink,
                                        ),
                                      ),
                                      SizedBox(height: 3),
                                      Text(
                                        'The student displays their personal code.',
                                        style: TextStyle(
                                          fontSize: 12,
                                          color: AppColors.muted,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                Container(
                                  width: 39,
                                  height: 39,
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFEAF0FF),
                                    borderRadius: BorderRadius.circular(13),
                                  ),
                                  child: const Icon(
                                    Icons.center_focus_strong_rounded,
                                    color: AppColors.navy,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 13),
                            ClipRRect(
                              borderRadius: BorderRadius.circular(18),
                              child: AspectRatio(
                                aspectRatio: 1.12,
                                child: Stack(
                                  fit: StackFit.expand,
                                  children: [
                                    MobileScanner(
                                      fit: BoxFit.cover,
                                      onDetect: (capture) {
                                        if (_scanBusy ||
                                            capture.barcodes.isEmpty) {
                                          return;
                                        }
                                        final value =
                                            capture.barcodes.first.rawValue;
                                        if (value != null) _scanStudent(value);
                                      },
                                    ),
                                    IgnorePointer(
                                      child: Center(
                                        child: Container(
                                          width: 220,
                                          height: 220,
                                          decoration: BoxDecoration(
                                            border: Border.all(
                                              color: Colors.white,
                                              width: 3,
                                            ),
                                            borderRadius: BorderRadius.circular(
                                              24,
                                            ),
                                            boxShadow: const [
                                              BoxShadow(
                                                color: Color(0x55000000),
                                                blurRadius: 0,
                                                spreadRadius: 999,
                                              ),
                                            ],
                                          ),
                                        ),
                                      ),
                                    ),
                                    if (_scanBusy)
                                      Container(
                                        color: Colors.black45,
                                        child: const Center(
                                          child: CircularProgressIndicator(
                                            color: Colors.white,
                                          ),
                                        ),
                                      ),
                                  ],
                                ),
                              ),
                            ),
                            const SizedBox(height: 12),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 13,
                                vertical: 11,
                              ),
                              decoration: BoxDecoration(
                                color: const Color(0xFFEFF3FF),
                                borderRadius: BorderRadius.circular(13),
                              ),
                              child: const Row(
                                children: [
                                  Icon(
                                    Icons.autorenew_rounded,
                                    color: AppColors.navy,
                                    size: 18,
                                  ),
                                  SizedBox(width: 9),
                                  Expanded(
                                    child: Text(
                                      'Student QR refreshes every 10 seconds. Scan the code currently on their screen.',
                                      style: TextStyle(
                                        fontSize: 12,
                                        color: AppColors.ink,
                                        height: 1.35,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    )
                  else
                    const EmptyState(
                      icon: Icons.qr_code_rounded,
                      title: 'Attendance is closed',
                      message: 'This class is no longer accepting check-ins.',
                    ),
                  const SizedBox(height: 22),
                  ClassRoster(
                    roster: roster,
                    live: active,
                    lateAfter: session?['lateAfter']?.toString(),
                    onTapStudent: _markStudent,
                  ),
                ],
              ),
            ),
    );
  }
}
