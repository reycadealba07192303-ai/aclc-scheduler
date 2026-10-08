import 'package:aclc_teacher_portal/core/network/api_client.dart';

/// Owns the teacher authentication use cases used by the presentation layer.
class AuthRepository {
  static final instance = AuthRepository();

  AuthRepository({ApiClient? apiClient})
    : _apiClient = apiClient ?? ApiClient.instance;

  final ApiClient _apiClient;

  Future<bool> restoreSession() => _apiClient.restoreSession();

  Future<void> signIn({required String email, required String password}) =>
      _apiClient.signIn(email, password);

  Future<void> signOut() => _apiClient.signOut();
}
