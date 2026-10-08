import 'package:aclc_teacher_portal/core/network/api_client.dart';

/// Encapsulates teacher portal and attendance API endpoints.
class TeacherRepository {
  static final instance = TeacherRepository();

  TeacherRepository({ApiClient? apiClient})
    : _apiClient = apiClient ?? ApiClient.instance;

  final ApiClient _apiClient;

  Future<Map<String, dynamic>> loadPortal() =>
      _apiClient.get('/api/teacher/portal');

  Future<List<dynamic>> loadActiveAttendance({String? sectionId}) async {
    final query = sectionId == null ? '' : '?sectionId=$sectionId';
    final result = await _apiClient.get(
      '/api/teacher/attendance-sessions$query',
    );
    return result['sessions'] as List<dynamic>? ?? const [];
  }

  Future<String> openAttendance(String scheduleId) async {
    final result = await _apiClient.post('/api/teacher/attendance-sessions', {
      'scheduleId': scheduleId,
    });
    final id = result['id']?.toString();
    if (id == null || id.isEmpty) {
      throw const FormatException(
        'The server did not return an attendance session ID.',
      );
    }
    return id;
  }

  /// Sessions the teacher ran on [day] (device-local calendar day), newest first.
  Future<List<dynamic>> loadAttendanceHistory(DateTime day) async {
    final from = DateTime(day.year, day.month, day.day);
    final to = DateTime(day.year, day.month, day.day + 1);
    final query = Uri(
      queryParameters: {
        'from': from.toUtc().toIso8601String(),
        'to': to.toUtc().toIso8601String(),
      },
    ).query;
    final result = await _apiClient.get(
      '/api/teacher/attendance-history?$query',
    );
    return result['sessions'] as List<dynamic>? ?? const [];
  }

  /// One subject's attendance in a section: `sessions` (latest 100) and a
  /// `report` with the term, teacher, and enrolled roster for PDF export.
  Future<Map<String, dynamic>> loadSubjectAttendanceHistory({
    required String sectionId,
    required String subjectId,
  }) {
    final query = Uri(
      queryParameters: {'sectionId': sectionId, 'subjectId': subjectId},
    ).query;
    return _apiClient.get('/api/teacher/attendance-history?$query');
  }

  Future<Map<String, dynamic>> loadAttendanceSession(String sessionId) =>
      _apiClient.get('/api/teacher/attendance-sessions/$sessionId');

  Future<Map<String, dynamic>> checkInStudent(String token) => _apiClient.post(
    '/api/teacher/attendance-sessions/check-in',
    {'token': token},
  );

  /// Sets a student's status by hand: `present`, `late`, or `absent`.
  Future<void> markStudent({
    required String sessionId,
    required String studentId,
    required String status,
  }) async {
    await _apiClient.post('/api/teacher/attendance-sessions/$sessionId/mark', {
      'studentId': studentId,
      'status': status,
    });
  }

  /// Latest notifications plus the unread count.
  Future<Map<String, dynamic>> loadNotifications() =>
      _apiClient.get('/api/notifications');

  /// Marks the given notifications read, or all of them when [ids] is null.
  Future<void> markNotificationsRead([List<String>? ids]) async {
    await _apiClient.post(
      '/api/notifications/read',
      ids == null ? {'all': true} : {'ids': ids},
    );
  }

  /// Changes the password; other devices are signed out and this one keeps a
  /// fresh session token.
  Future<void> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    final result = await _apiClient.post('/api/auth/change-password', {
      'currentPassword': currentPassword,
      'newPassword': newPassword,
    });
    final token = result['token'];
    if (token is String && token.isNotEmpty) {
      await _apiClient.replaceToken(token);
    }
  }

  Future<void> closeAttendance(String sessionId) async {
    await _apiClient.post('/api/teacher/attendance-sessions/$sessionId/close');
  }
}
