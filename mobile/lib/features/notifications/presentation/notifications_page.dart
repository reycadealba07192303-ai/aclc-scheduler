import 'package:flutter/material.dart';

import 'package:aclc_teacher_portal/core/errors/api_exception.dart';
import 'package:aclc_teacher_portal/core/theme/app_colors.dart';
import 'package:aclc_teacher_portal/features/teacher_home/data/teacher_repository.dart';
import 'package:aclc_teacher_portal/shared/utils/app_formatters.dart';
import 'package:aclc_teacher_portal/shared/widgets/feedback_widgets.dart';

/// The teacher's notifications. Everything shown is marked read on open.
class NotificationsPage extends StatefulWidget {
  const NotificationsPage({super.key});
  @override
  State<NotificationsPage> createState() => _NotificationsPageState();
}

class _NotificationsPageState extends State<NotificationsPage> {
  List<Map<String, dynamic>> _items = [];
  var _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load(markRead: true);
  }

  Future<void> _load({bool markRead = false}) async {
    try {
      final result = await TeacherRepository.instance.loadNotifications();
      if (!mounted) return;
      setState(() {
        _items = mapsFrom(result['notifications']);
        _loading = false;
        _error = null;
      });
      if (markRead && _items.any((item) => item['read'] != true)) {
        await TeacherRepository.instance.markNotificationsRead();
      }
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = error is ApiException
            ? error.message
            : 'Could not load notifications.';
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Notifications')),
    body: _loading
        ? const Center(child: CircularProgressIndicator(color: AppColors.navy))
        : RefreshIndicator(
            onRefresh: _load,
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
              children: [
                if (_error != null) ...[
                  ErrorBanner(_error!),
                  const SizedBox(height: 12),
                ],
                if (_items.isEmpty && _error == null)
                  const EmptyState(
                    icon: Icons.notifications_none_rounded,
                    title: "You're all caught up",
                    message:
                        'New classes, schedule changes, and other updates will show up here.',
                  )
                else
                  Card(
                    clipBehavior: Clip.antiAlias,
                    child: Column(
                      children: [
                        for (var i = 0; i < _items.length; i++) ...[
                          if (i > 0)
                            const Divider(
                              height: 1,
                              indent: 64,
                              color: AppColors.line,
                            ),
                          _NotificationTile(item: _items[i]),
                        ],
                      ],
                    ),
                  ),
              ],
            ),
          ),
  );
}

class _NotificationTile extends StatelessWidget {
  const _NotificationTile({required this.item});
  final Map<String, dynamic> item;

  @override
  Widget build(BuildContext context) {
    final unread = item['read'] != true;
    final icon = switch (item['type']) {
      'schedule' => Icons.calendar_month_rounded,
      'attendance' => Icons.fact_check_outlined,
      'account' => Icons.verified_user_outlined,
      _ => Icons.notifications_none_rounded,
    };
    return Container(
      color: unread ? const Color(0xFFF3F6FF) : null,
      padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              color: unread ? const Color(0xFFE3EAFF) : const Color(0xFFF1F3F7),
              borderRadius: BorderRadius.circular(11),
            ),
            child: Icon(
              icon,
              size: 19,
              color: unread ? AppColors.navy : AppColors.muted,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '${item['title'] ?? ''}',
                  style: TextStyle(
                    fontSize: 14,
                    height: 1.3,
                    fontWeight: unread ? FontWeight.w600 : FontWeight.w500,
                    color: AppColors.ink,
                  ),
                ),
                if ('${item['body'] ?? ''}'.isNotEmpty) ...[
                  const SizedBox(height: 3),
                  Text(
                    '${item['body']}',
                    style: const TextStyle(
                      fontSize: 12.5,
                      height: 1.4,
                      color: AppColors.muted,
                    ),
                  ),
                ],
                const SizedBox(height: 4),
                Text(
                  _ago('${item['createdAt'] ?? ''}'),
                  style: const TextStyle(
                    fontFamily: AppFonts.mono,
                    fontSize: 10.5,
                    color: AppColors.muted,
                  ),
                ),
              ],
            ),
          ),
          if (unread)
            Container(
              margin: const EdgeInsets.only(top: 6, left: 8),
              width: 8,
              height: 8,
              decoration: const BoxDecoration(
                color: AppColors.aclcRed,
                shape: BoxShape.circle,
              ),
            ),
        ],
      ),
    );
  }
}

String _ago(String value) {
  final date = DateTime.tryParse(value)?.toLocal();
  if (date == null) return '';
  final diff = DateTime.now().difference(date);
  if (diff.inMinutes < 1) return 'Just now';
  if (diff.inHours < 1) return '${diff.inMinutes}m ago';
  if (diff.inDays < 1) return '${diff.inHours}h ago';
  if (diff.inDays < 7) return '${diff.inDays}d ago';
  return longDate(date);
}
