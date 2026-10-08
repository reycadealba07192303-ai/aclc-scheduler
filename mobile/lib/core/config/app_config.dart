import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Where the app finds the Next.js API.
///
/// A server address saved from the sign-in screen wins over the build-time
/// `--dart-define=API_BASE_URL=...`, which falls back to the Android emulator's
/// host alias. Saving it on the device means a new laptop IP needs no rebuild.
abstract final class AppConfig {
  static const buildDefault = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://192.168.254.107:3000',
  );
  static const _storage = FlutterSecureStorage();
  static const _storageKey = 'api_base_url';

  static String apiBase = buildDefault;

  static Future<void> load() async {
    final saved = normalize(await _storage.read(key: _storageKey) ?? '');
    if (saved != null) apiBase = saved;
  }

  static Future<void> save(String url) async {
    apiBase = url;
    if (url == buildDefault) {
      await _storage.delete(key: _storageKey);
    } else {
      await _storage.write(key: _storageKey, value: url);
    }
  }

  /// Accepts "192.168.1.5:3000" or a full URL; returns "http://host:port" or
  /// null when the input is not a usable address.
  static String? normalize(String input) {
    var value = input.trim();
    if (value.isEmpty) return null;
    if (!value.contains('://')) value = 'http://$value';
    final uri = Uri.tryParse(value);
    if (uri == null ||
        uri.host.isEmpty ||
        (uri.scheme != 'http' && uri.scheme != 'https')) {
      return null;
    }
    return uri.hasPort
        ? '${uri.scheme}://${uri.host}:${uri.port}'
        : '${uri.scheme}://${uri.host}';
  }
}
