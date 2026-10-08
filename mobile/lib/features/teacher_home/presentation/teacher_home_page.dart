import 'dart:async';

import 'package:flutter/material.dart';

import 'package:aclc_teacher_portal/core/errors/api_exception.dart';
import 'package:aclc_teacher_portal/core/theme/app_colors.dart';
import 'package:aclc_teacher_portal/features/handled_classes/presentation/section_classes_page.dart';
import 'package:aclc_teacher_portal/features/notifications/presentation/notifications_page.dart';
import 'package:aclc_teacher_portal/features/teacher_home/data/teacher_repository.dart';
import 'package:aclc_teacher_portal/features/teacher_home/presentation/widgets/attendance_history_tab.dart';
import 'package:aclc_teacher_portal/features/teacher_home/presentation/widgets/handled_classes_tab.dart';
import 'package:aclc_teacher_portal/features/teacher_home/presentation/widgets/overview_tab.dart';
import 'package:aclc_teacher_portal/features/teacher_home/presentation/widgets/profile_tab.dart';
import 'package:aclc_teacher_portal/shared/utils/app_formatters.dart';
import 'package:aclc_teacher_portal/shared/widgets/brand_mark.dart';

class TeacherHomePage extends StatefulWidget {
  const TeacherHomePage({required this.onSignOut, super.key});
  final VoidCallback onSignOut;

  @override
  State<TeacherHomePage> createState() => _TeacherHomePageState();
}

class _TeacherHomePageState extends State<TeacherHomePage> {
  Map<String, dynamic>? _portal;
  List<Map<String, dynamic>> _sessions = [];
  String? _error;
  var _loading = true;
  var _tabIndex = 0;
  var _historyRefreshTick = 0;
  var _unreadNotifications = 0;
  DateTime? _lastUnreadCheck;
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
      final results = await Future.wait<Object>([
        TeacherRepository.instance.loadPortal(),
        TeacherRepository.instance.loadActiveAttendance(),
      ]);
      if (!mounted) return;
      _loadUnread();
      setState(() {
        _portal = results[0] as Map<String, dynamic>;
        _sessions = mapsFrom(results[1] as List<dynamic>);
        _error = null;
        _loading = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = error is ApiException
            ? error.message
            : 'Could not load your classes.';
        _loading = false;
      });
      if (_error?.contains('Sign in') == true) widget.onSignOut();
    }
  }

  /// Updates the bell badge; a failure here never affects the rest of the page.
  Future<void> _loadUnread({bool force = false}) async {
    final now = DateTime.now();
    if (!force &&
        _lastUnreadCheck != null &&
        now.difference(_lastUnreadCheck!) < const Duration(seconds: 30)) {
      return;
    }
    _lastUnreadCheck = now;
    try {
      final result = await TeacherRepository.instance.loadNotifications();
      final unread = (result['unread'] as num?)?.toInt() ?? 0;
      if (mounted && unread != _unreadNotifications) {
        setState(() => _unreadNotifications = unread);
      }
    } catch (_) {}
  }

  Future<void> _openNotifications() async {
    setState(() => _unreadNotifications = 0);
    await Navigator.of(
      context,
    ).push(MaterialPageRoute(builder: (_) => const NotificationsPage()));
    await _loadUnread(force: true);
  }

  Future<void> _openSection(
    Map<String, dynamic> section,
    List<Map<String, dynamic>> classes,
    Map<String, dynamic> subjects,
  ) async {
    if (classes.isEmpty) return;
    await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => SectionClassesPage(
          section: section,
          classes: classes,
          subjects: subjects,
          onSessionChanged: () => _load(silent: true),
        ),
      ),
    );
    await _load(silent: true);
  }

  @override
  Widget build(BuildContext context) {
    final teachers = mapsFrom(_portal?['teachers']);
    final teacher = teachers.isEmpty ? null : teachers.first;
    final teacherName = teacher == null
        ? 'Teacher'
        : '${teacher['firstName'] ?? ''} ${teacher['lastName'] ?? ''}'.trim();
    final terms = mapsFrom(_portal?['terms']);
    final term = terms.isEmpty ? null : terms.first;
    final termId = term?['id']?.toString();
    final sections =
        mapsFrom(
          _portal?['sections'],
        ).where((item) => item['termId']?.toString() == termId).toList()..sort(
          (a, b) => '${a['name'] ?? ''}'.compareTo('${b['name'] ?? ''}'),
        );
    final schedules = mapsFrom(
      _portal?['schedules'],
    ).where((item) => item['termId']?.toString() == termId).toList();
    final subjects = {
      for (final subject in mapsFrom(_portal?['subjects']))
        subject['id'].toString(): subject,
    };

    return Scaffold(
      appBar: AppBar(
        titleSpacing: 18,
        title: const Row(
          children: [
            BrandMark(size: 38),
            SizedBox(width: 10),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'ACLC Scheduler',
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w800,
                    color: AppColors.ink,
                  ),
                ),
                Text(
                  'TEACHER PORTAL',
                  style: TextStyle(
                    fontSize: 9,
                    letterSpacing: 1.1,
                    fontWeight: FontWeight.w700,
                    color: AppColors.muted,
                  ),
                ),
              ],
            ),
          ],
        ),
        actions: [
          IconButton(
            tooltip: 'Notifications',
            onPressed: _openNotifications,
            icon: Badge(
              isLabelVisible: _unreadNotifications > 0,
              backgroundColor: AppColors.aclcRed,
              label: Text(
                _unreadNotifications > 9 ? '9+' : '$_unreadNotifications',
              ),
              child: const Icon(Icons.notifications_none_rounded),
            ),
          ),
          if (_tabIndex != 3) ...[
            Padding(
              padding: const EdgeInsets.only(right: 12),
              child: IconButton.filledTonal(
                tooltip: 'Sign out',
                onPressed: widget.onSignOut,
                icon: const Icon(Icons.logout_rounded, size: 19),
                style: IconButton.styleFrom(
                  backgroundColor: const Color(0xFFEDF1F8),
                  foregroundColor: AppColors.ink,
                ),
              ),
            ),
          ],
        ],
      ),
      body: _loading
          ? const Center(
              child: CircularProgressIndicator(color: AppColors.navy),
            )
          : RefreshIndicator(
              onRefresh: () {
                setState(() => _historyRefreshTick++);
                return _load();
              },
              child: ListView(
                padding: const EdgeInsets.fromLTRB(18, 12, 18, 30),
                children: [
                  if (_tabIndex == 0)
                    OverviewTab(
                      teacherName: teacherName,
                      term: term,
                      sectionCount: sections.length,
                      classCount: schedules.length,
                      liveSessionCount: _sessions.length,
                      error: _error,
                      onViewClasses: () => setState(() => _tabIndex = 1),
                    ),
                  if (_tabIndex == 1)
                    HandledClassesTab(
                      sections: sections,
                      schedules: schedules,
                      subjects: subjects,
                      sessions: _sessions,
                      error: _error,
                      onOpenClass: (section, schedule) =>
                          _openSection(section, [schedule], subjects),
                    ),
                  if (_tabIndex == 2)
                    AttendanceHistoryTab(refreshTick: _historyRefreshTick),
                  if (_tabIndex == 3)
                    ProfileTab(
                      teacherName: teacherName,
                      term: term,
                      sectionCount: sections.length,
                      classCount: schedules.length,
                      onSignOut: widget.onSignOut,
                    ),
                ],
              ),
            ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _tabIndex,
        onDestinationSelected: (index) => setState(() => _tabIndex = index),
        backgroundColor: Colors.white,
        indicatorColor: const Color(0xFFEAF0FF),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.space_dashboard_outlined),
            selectedIcon: Icon(Icons.space_dashboard_rounded),
            label: 'Overview',
          ),
          NavigationDestination(
            icon: Icon(Icons.class_outlined),
            selectedIcon: Icon(Icons.class_rounded),
            label: 'Classes',
          ),
          NavigationDestination(
            icon: Icon(Icons.history_rounded),
            selectedIcon: Icon(Icons.history_rounded),
            label: 'History',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline_rounded),
            selectedIcon: Icon(Icons.person_rounded),
            label: 'Profile',
          ),
        ],
      ),
    );
  }
}
