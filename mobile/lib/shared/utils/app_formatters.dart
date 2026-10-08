String greetingText() {
  final hour = DateTime.now().hour;
  if (hour < 12) return 'GOOD MORNING';
  if (hour < 17) return 'GOOD AFTERNOON';
  return 'GOOD EVENING';
}

List<Map<String, dynamic>> mapsFrom(dynamic input) => input is List
    ? input
          .whereType<Map>()
          .map((item) => Map<String, dynamic>.from(item))
          .toList()
    : <Map<String, dynamic>>[];
String subjectTitle(dynamic subject) => subject is Map
    ? '${subject['code'] ?? 'Subject'} · ${subject['name'] ?? ''}'
    : 'Subject';
// API days follow JavaScript's Date.getDay(): 0 = Sunday, 1 = Monday … 6 = Saturday.
const _shortDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const _longDays = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

int? _dayIndex(dynamic value) {
  final index = (value as num?)?.toInt();
  return index != null && index >= 0 && index < 7 ? index : null;
}

String dayLabel(dynamic value) {
  final index = _dayIndex(value);
  return index == null ? '' : _shortDays[index];
}

String dayName(dynamic value) {
  final index = _dayIndex(value);
  return index == null ? '' : _longDays[index];
}

/// Orders days Monday first and Sunday last; unknown days sort to the end.
int daySortKey(dynamic value) {
  final index = _dayIndex(value);
  return index == null ? 99 : (index + 6) % 7;
}

String initials(String name) {
  final parts = name.trim().split(RegExp(r'\s+'));
  return parts
      .take(2)
      .map((p) => p.isNotEmpty ? p[0] : '')
      .join()
      .toUpperCase();
}

String timeLabel(String? value) {
  final date = DateTime.tryParse(value ?? '')?.toLocal();
  if (date == null) return '';
  final hour = date.hour % 12 == 0 ? 12 : date.hour % 12;
  final minute = date.minute.toString().padLeft(2, '0');
  return '$hour:$minute ${date.hour >= 12 ? 'PM' : 'AM'}';
}

const _monthNames = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/// e.g. "Tue, Oct 6, 2026".
String longDate(DateTime day) =>
    '${_shortDays[day.weekday % 7]}, ${_monthNames[day.month - 1]} ${day.day}, ${day.year}';
