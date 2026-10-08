import 'package:flutter_test/flutter_test.dart';

import 'package:aclc_teacher_portal/core/config/app_config.dart';
import 'package:aclc_teacher_portal/shared/utils/app_formatters.dart';

void main() {
  group('days (API sends JavaScript weekdays: 0 = Sunday, 1 = Monday)', () {
    test('label the right day (regression: classes showed one day late)', () {
      expect(dayLabel(1), 'Mon');
      expect(dayLabel(2), 'Tue');
      expect(dayLabel(0), 'Sun');
      expect(dayName(3), 'Wednesday');
      expect(dayLabel(9), '');
    });

    test('sort Monday first and Sunday last', () {
      final days = [0, 3, 1, 6]..sort((a, b) => daySortKey(a).compareTo(daySortKey(b)));
      expect(days, [1, 3, 6, 0]);
    });
  });

  test('longDate formats a calendar day', () {
    expect(longDate(DateTime(2026, 10, 6)), 'Tue, Oct 6, 2026');
  });

  group('server address', () {
    test('adds http:// and keeps the port', () {
      expect(AppConfig.normalize('192.168.1.10:3000'), 'http://192.168.1.10:3000');
      expect(AppConfig.normalize('https://scheduler.example.com/'), 'https://scheduler.example.com');
    });

    test('rejects unusable input', () {
      expect(AppConfig.normalize(''), isNull);
      expect(AppConfig.normalize('ftp://host'), isNull);
    });
  });
}
