import 'package:flutter/services.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;

import 'package:aclc_teacher_portal/shared/utils/app_formatters.dart';

/// One subject's attendance, as returned by the per-subject history API.
class SubjectAttendanceReport {
  const SubjectAttendanceReport({
    required this.subjectCode,
    required this.subjectName,
    required this.sectionName,
    required this.teacher,
    required this.term,
    required this.roster,
    required this.sessions,
  });

  final String subjectCode;
  final String subjectName;
  final String sectionName;
  final String teacher;
  final String term;

  /// Enrolled students: `studentNumber`, `studentName`.
  final List<Map<String, dynamic>> roster;

  /// Sessions with `startedAt` and an `attendance` list of check-ins.
  final List<Map<String, dynamic>> sessions;
}

const _sessionsPerTable = 12;
const _ink = PdfColor.fromInt(0xFF182238);
const _muted = PdfColor.fromInt(0xFF718096);
const _line = PdfColor.fromInt(0xFFE4E8EF);
const _navy = PdfColor.fromInt(0xFF203D91);
const _headerFill = PdfColor.fromInt(0xFFF4F6FA);
const _presentInk = PdfColor.fromInt(0xFF15803D);
const _absentInk = PdfColor.fromInt(0xFFB91C1C);
const _lateInk = PdfColor.fromInt(0xFFB45309);

/// Builds a landscape A4 class attendance sheet: one row per student, one
/// column per session (P = present, L = late, A = absent), with totals.
Future<Uint8List> buildAttendanceReportPdf(
  List<SubjectAttendanceReport> reports,
) async {
  Future<pw.Font> font(String file) async =>
      pw.Font.ttf(await rootBundle.load('assets/fonts/$file'));
  final theme = pw.ThemeData.withFont(
    base: await font('Geist-Regular.ttf'),
    bold: await font('Geist-SemiBold.ttf'),
  );
  final mono = await font('GeistMono-Medium.ttf');
  final generated = DateTime.now();
  final doc = pw.Document(title: 'Attendance sheet', creator: 'ACLC Scheduler');

  for (final report in reports) {
    final sessions = [...report.sessions]
      ..sort(
        (a, b) =>
            '${a['startedAt'] ?? ''}'.compareTo('${b['startedAt'] ?? ''}'),
      );
    // Per session: student number -> "present" or "late".
    final presentBySession = [
      for (final session in sessions)
        {
          for (final record in mapsFrom(session['attendance']))
            '${record['studentNumber']}': '${record['status'] ?? 'present'}',
        },
    ];
    // Enrolled students first, then anyone who checked in but is no longer on the roster.
    final students = [
      ...report.roster,
      for (final record in sessions.expand((s) => mapsFrom(s['attendance'])))
        if (!report.roster.any(
          (r) => '${r['studentNumber']}' == '${record['studentNumber']}',
        ))
          record,
    ];
    final seen = <String>{};
    students.retainWhere((s) => seen.add('${s['studentNumber']}'));

    final presentCounts = [
      for (final student in students)
        presentBySession
            .where((set) => set.containsKey('${student['studentNumber']}'))
            .length,
    ];
    final average = sessions.isEmpty || report.roster.isEmpty
        ? null
        : presentBySession
                  .map((set) => set.length / report.roster.length)
                  .reduce((a, b) => a + b) /
              sessions.length;

    doc.addPage(
      pw.MultiPage(
        theme: theme,
        pageFormat: PdfPageFormat.a4.landscape,
        margin: const pw.EdgeInsets.fromLTRB(28, 26, 28, 24),
        header: (context) => _header(report, generated, mono, context),
        footer: (context) => _footer(context, mono),
        build: (context) => [
          _summary(
            sessions: sessions.length,
            students: report.roster.length,
            average: average,
            mono: mono,
          ),
          pw.SizedBox(height: 14),
          if (sessions.isEmpty)
            pw.Padding(
              padding: const pw.EdgeInsets.symmetric(vertical: 30),
              child: pw.Text(
                'No attendance sessions have been run for this subject yet.',
                style: const pw.TextStyle(color: _muted, fontSize: 11),
              ),
            )
          else
            for (
              var start = 0;
              start < sessions.length;
              start += _sessionsPerTable
            ) ...[
              if (sessions.length > _sessionsPerTable)
                pw.Padding(
                  padding: const pw.EdgeInsets.only(bottom: 6),
                  child: pw.Text(
                    'SESSIONS ${start + 1}–${(start + _sessionsPerTable).clamp(0, sessions.length)} OF ${sessions.length}',
                    style: pw.TextStyle(
                      font: mono,
                      fontSize: 8,
                      color: _muted,
                      letterSpacing: .6,
                    ),
                  ),
                ),
              _matrix(
                students: students,
                sessions: sessions.sublist(
                  start,
                  (start + _sessionsPerTable).clamp(0, sessions.length),
                ),
                presentBySession: presentBySession.sublist(
                  start,
                  (start + _sessionsPerTable).clamp(0, sessions.length),
                ),
                presentCounts: presentCounts,
                totalSessions: sessions.length,
                mono: mono,
              ),
              pw.SizedBox(height: 16),
            ],
        ],
      ),
    );
  }
  return doc.save();
}

pw.Widget _header(
  SubjectAttendanceReport report,
  DateTime generated,
  pw.Font mono,
  pw.Context context,
) => pw.Container(
  margin: const pw.EdgeInsets.only(bottom: 14),
  padding: const pw.EdgeInsets.only(bottom: 10),
  decoration: const pw.BoxDecoration(
    border: pw.Border(bottom: pw.BorderSide(color: _line)),
  ),
  child: pw.Row(
    crossAxisAlignment: pw.CrossAxisAlignment.end,
    children: [
      pw.Expanded(
        child: pw.Column(
          crossAxisAlignment: pw.CrossAxisAlignment.start,
          children: [
            pw.Text(
              'ACLC SCHEDULER · ATTENDANCE SHEET',
              style: pw.TextStyle(
                font: mono,
                fontSize: 8,
                color: _navy,
                letterSpacing: 1,
              ),
            ),
            pw.SizedBox(height: 4),
            pw.Text(
              '${report.subjectCode} · ${report.subjectName}',
              style: pw.TextStyle(
                fontSize: 16,
                fontWeight: pw.FontWeight.bold,
                color: _ink,
              ),
            ),
            pw.SizedBox(height: 3),
            pw.Text(
              [
                report.sectionName,
                report.teacher,
                if (report.term.isNotEmpty) report.term,
              ].join('  ·  '),
              style: const pw.TextStyle(fontSize: 9.5, color: _muted),
            ),
          ],
        ),
      ),
      pw.Text(
        'Generated ${longDate(generated)}, ${_time(generated)}',
        style: pw.TextStyle(font: mono, fontSize: 8, color: _muted),
      ),
    ],
  ),
);

pw.Widget _footer(pw.Context context, pw.Font mono) => pw.Container(
  margin: const pw.EdgeInsets.only(top: 10),
  child: pw.Row(
    mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
    children: [
      pw.Text(
        'P = present   L = late   A = absent   Attended = present or late, of all sessions',
        style: pw.TextStyle(font: mono, fontSize: 7.5, color: _muted),
      ),
      pw.Text(
        'Page ${context.pageNumber} of ${context.pagesCount}',
        style: pw.TextStyle(font: mono, fontSize: 7.5, color: _muted),
      ),
    ],
  ),
);

pw.Widget _summary({
  required int sessions,
  required int students,
  required double? average,
  required pw.Font mono,
}) {
  pw.Widget stat(String label, String value) => pw.Container(
    width: 150,
    padding: const pw.EdgeInsets.symmetric(horizontal: 12, vertical: 8),
    decoration: pw.BoxDecoration(
      border: pw.Border.all(color: _line),
      borderRadius: pw.BorderRadius.circular(6),
    ),
    child: pw.Column(
      crossAxisAlignment: pw.CrossAxisAlignment.start,
      children: [
        pw.Text(
          label,
          style: pw.TextStyle(
            font: mono,
            fontSize: 7.5,
            color: _muted,
            letterSpacing: .6,
          ),
        ),
        pw.SizedBox(height: 3),
        pw.Text(
          value,
          style: pw.TextStyle(
            fontSize: 15,
            fontWeight: pw.FontWeight.bold,
            color: _ink,
          ),
        ),
      ],
    ),
  );
  return pw.Row(
    children: [
      stat('SESSIONS', '$sessions'),
      pw.SizedBox(width: 10),
      stat('ENROLLED STUDENTS', '$students'),
      pw.SizedBox(width: 10),
      stat(
        'AVERAGE ATTENDANCE',
        average == null ? '—' : '${(average * 100).round()}%',
      ),
    ],
  );
}

pw.Widget _matrix({
  required List<Map<String, dynamic>> students,
  required List<Map<String, dynamic>> sessions,
  required List<Map<String, String>> presentBySession,
  required List<int> presentCounts,
  required int totalSessions,
  required pw.Font mono,
}) {
  const cellPadding = pw.EdgeInsets.symmetric(horizontal: 4, vertical: 4.5);
  pw.Widget head(String text, {pw.Alignment align = pw.Alignment.centerLeft}) =>
      pw.Container(
        alignment: align,
        padding: cellPadding,
        child: pw.Text(
          text,
          textAlign: align == pw.Alignment.center
              ? pw.TextAlign.center
              : pw.TextAlign.left,
          style: pw.TextStyle(
            fontSize: 7.5,
            fontWeight: pw.FontWeight.bold,
            color: _ink,
          ),
        ),
      );
  pw.Widget cell(
    String text, {
    pw.Alignment align = pw.Alignment.centerLeft,
    PdfColor color = _ink,
    pw.Font? font,
    bool bold = false,
  }) => pw.Container(
    alignment: align,
    padding: cellPadding,
    child: pw.Text(
      text,
      maxLines: 1,
      style: pw.TextStyle(
        font: font,
        fontSize: 8,
        color: color,
        fontWeight: bold ? pw.FontWeight.bold : null,
      ),
    ),
  );

  return pw.Table(
    border: const pw.TableBorder(
      horizontalInside: pw.BorderSide(color: _line, width: .6),
      bottom: pw.BorderSide(color: _line, width: .6),
      top: pw.BorderSide(color: _line, width: .6),
    ),
    columnWidths: {
      0: const pw.FixedColumnWidth(22),
      1: const pw.FixedColumnWidth(70),
      2: const pw.FlexColumnWidth(),
      for (var i = 0; i < sessions.length; i++)
        3 + i: const pw.FixedColumnWidth(36),
      3 + sessions.length: const pw.FixedColumnWidth(48),
      4 + sessions.length: const pw.FixedColumnWidth(34),
    },
    children: [
      pw.TableRow(
        repeat: true,
        decoration: const pw.BoxDecoration(color: _headerFill),
        children: [
          head('#'),
          head('Student no.'),
          head('Name'),
          for (final session in sessions)
            head(_sessionLabel(session), align: pw.Alignment.center),
          head('Attended', align: pw.Alignment.center),
          head('%', align: pw.Alignment.center),
        ],
      ),
      for (var row = 0; row < students.length; row++)
        pw.TableRow(
          children: [
            cell('${row + 1}', color: _muted),
            cell('${students[row]['studentNumber'] ?? ''}', font: mono),
            cell('${students[row]['studentName'] ?? ''}'),
            for (final present in presentBySession)
              switch (present['${students[row]['studentNumber']}']) {
                'late' => cell(
                  'L',
                  align: pw.Alignment.center,
                  color: _lateInk,
                  bold: true,
                ),
                null => cell(
                  'A',
                  align: pw.Alignment.center,
                  color: _absentInk,
                ),
                _ => cell(
                  'P',
                  align: pw.Alignment.center,
                  color: _presentInk,
                  bold: true,
                ),
              },
            cell(
              '${presentCounts[row]}/$totalSessions',
              align: pw.Alignment.center,
              font: mono,
            ),
            cell(
              totalSessions == 0
                  ? '—'
                  : '${(presentCounts[row] * 100 / totalSessions).round()}%',
              align: pw.Alignment.center,
              font: mono,
            ),
          ],
        ),
    ],
  );
}

String _sessionLabel(Map<String, dynamic> session) {
  final date = DateTime.tryParse('${session['startedAt'] ?? ''}')?.toLocal();
  if (date == null) return '—';
  return '${longDate(date).split(', ')[1]}\n${_time(date)}';
}

String _time(DateTime date) {
  final hour = date.hour % 12 == 0 ? 12 : date.hour % 12;
  return '$hour:${date.minute.toString().padLeft(2, '0')} ${date.hour >= 12 ? 'PM' : 'AM'}';
}
