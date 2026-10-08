import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;

import 'package:aclc_teacher_portal/core/config/app_config.dart';
import 'package:aclc_teacher_portal/core/errors/api_exception.dart';

class ApiClient {
  ApiClient._();
  static final instance = ApiClient._();
  static const _storage = FlutterSecureStorage();
  final _client = http.Client();
  String? _token;

  Future<bool> restoreSession() async {
    _token = await _storage.read(key: 'teacher_access_token');
    if (_token == null) return false;
    try {
      final data = await get('/api/auth/session');
      if (data['user']?['role'] == 'teacher') return true;
      await signOut();
      return false;
    } catch (_) {
      await signOut();
      return false;
    }
  }

  Future<void> signIn(String identifier, String password) async {
    final response = await _send(
      _client.post(
        Uri.parse('${AppConfig.apiBase}/api/auth/login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'identifier': identifier.trim(),
          'password': password,
          'client': 'mobile',
        }),
      ),
    );
    final data = _decode(response);
    final token = data['token'];
    if (data['role'] != 'teacher' || token is! String || token.isEmpty) {
      throw const ApiException('Sign in with an active teacher account.');
    }
    _token = token;
    await _storage.write(key: 'teacher_access_token', value: token);
  }

  /// Stores a new session token, e.g. after a password change.
  Future<void> replaceToken(String token) async {
    _token = token;
    await _storage.write(key: 'teacher_access_token', value: token);
  }

  Future<void> signOut() async {
    _token = null;
    await _storage.delete(key: 'teacher_access_token');
  }

  Future<Map<String, dynamic>> get(String path) async {
    final response = await _send(
      _client.get(Uri.parse('${AppConfig.apiBase}$path'), headers: _headers),
    );
    return _decode(response);
  }

  Future<Map<String, dynamic>> post(
    String path, [
    Map<String, dynamic>? body,
  ]) async {
    final response = await _send(
      _client.post(
        Uri.parse('${AppConfig.apiBase}$path'),
        headers: {..._headers, 'Content-Type': 'application/json'},
        body: jsonEncode(body ?? const {}),
      ),
    );
    return _decode(response);
  }

  /// Whether a Next.js server answers at [baseUrl]; used before saving it.
  Future<bool> canReach(String baseUrl) async {
    try {
      final response = await _client
          .get(Uri.parse('$baseUrl/api/auth/session'))
          .timeout(const Duration(seconds: 6));
      jsonDecode(utf8.decode(response.bodyBytes));
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<http.Response> _send(Future<http.Response> request) async {
    try {
      return await request.timeout(const Duration(seconds: 15));
    } on SocketException {
      throw ApiException(
        'Cannot reach ${AppConfig.apiBase}. Start the Next.js server and check the server address on the sign-in screen.',
      );
    } on TimeoutException {
      throw ApiException(
        'The server at ${AppConfig.apiBase} did not respond. Check that your phone is on the same Wi-Fi and the server address is correct.',
      );
    }
  }

  Map<String, String> get _headers => {
    'Accept': 'application/json',
    if (_token != null) 'Authorization': 'Bearer $_token',
  };

  Map<String, dynamic> _decode(http.Response response) {
    dynamic decoded;
    try {
      decoded = jsonDecode(utf8.decode(response.bodyBytes));
    } on FormatException {
      throw ApiException(
        'The server at ${AppConfig.apiBase} returned an invalid response. Check that the mobile app is pointed at Next.js.',
      );
    }
    final data = decoded is Map<String, dynamic>
        ? decoded
        : <String, dynamic>{};
    if (response.statusCode < 200 || response.statusCode >= 300) {
      if (response.statusCode == 401) _token = null;
      throw ApiException(
        data['error']?.toString() ??
            'The server could not complete this request.',
      );
    }
    return data;
  }
}
