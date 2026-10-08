type Rgb = [number, number, number];

export type AttendanceSheetSession = {
  startedAt: string;
  attendance: { studentNumber: string; studentName: string; status: "present" | "late" }[];
};

const MARGIN = 28;
const SESSIONS_PER_TABLE = 12;
const NAVY: Rgb = [32, 61, 145];
const INK: Rgb = [24, 34, 56];
const MUTED: Rgb = [113, 128, 150];
const LINE: Rgb = [226, 231, 238];
const HEAD_FILL: Rgb = [244, 246, 250];
const PRESENT: Rgb = [21, 128, 61];
const LATE: Rgb = [180, 83, 9];
const ABSENT: Rgb = [185, 28, 28];

/**
 * Downloads a landscape A4 class attendance sheet: one row per student, one
 * column per session (P = present, L = late, A = absent), with each student's
 * attended count and rate. Sessions run oldest to newest, 12 per table.
 * Matches the sheet the teacher mobile app exports.
 */
export async function downloadAttendanceSheetPdf(input: {
  subjectCode: string;
  subjectName: string;
  sectionName: string;
  teacher: string;
  term: string;
  roster: { studentNumber: string; studentName: string }[];
  sessions: AttendanceSheetSession[];
  fileName: string;
}) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const sessions = [...input.sessions].sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  const statusBySession = sessions.map((session) => new Map(session.attendance.map((item) => [item.studentNumber, item.status])));

  // Enrolled students first, then anyone who checked in but has left the roster.
  const students = [...input.roster];
  for (const session of sessions) {
    for (const item of session.attendance) {
      if (!students.some((student) => student.studentNumber === item.studentNumber)) students.push(item);
    }
  }
  const attended = students.map((student) => statusBySession.filter((map) => map.has(student.studentNumber)).length);
  const average = sessions.length && input.roster.length
    ? statusBySession.reduce((sum, map) => sum + map.size / input.roster.length, 0) / sessions.length
    : null;
  const generated = new Date().toLocaleString([], { dateStyle: "medium", timeStyle: "short" });

  let y = 0;
  const drawHeader = () => {
    y = MARGIN;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7.5);
    pdf.setTextColor(...NAVY);
    pdf.text("ACLC SCHEDULER  |  ATTENDANCE SHEET", MARGIN, y + 6);
    pdf.setFontSize(15);
    pdf.setTextColor(...INK);
    pdf.text(`${input.subjectCode} - ${input.subjectName}`, MARGIN, y + 24);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(...MUTED);
    pdf.text([input.sectionName, input.teacher, input.term].filter(Boolean).join("   |   "), MARGIN, y + 38);
    pdf.text(`Generated ${generated}`, pageWidth - MARGIN, y + 38, { align: "right" });
    pdf.setDrawColor(...LINE);
    pdf.line(MARGIN, y + 47, pageWidth - MARGIN, y + 47);
    y += 60;
  };

  drawHeader();

  // Summary tiles.
  const tiles: [string, string][] = [
    ["SESSIONS", String(sessions.length)],
    ["ENROLLED STUDENTS", String(input.roster.length)],
    ["AVERAGE ATTENDANCE", average === null ? "-" : `${Math.round(average * 100)}%`],
  ];
  tiles.forEach(([label, value], index) => {
    const x = MARGIN + index * 160;
    pdf.setDrawColor(...LINE);
    pdf.roundedRect(x, y, 150, 40, 5, 5, "S");
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);
    pdf.setTextColor(...MUTED);
    pdf.text(label, x + 10, y + 13);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(14);
    pdf.setTextColor(...INK);
    pdf.text(value, x + 10, y + 31);
  });
  y += 56;

  if (!sessions.length) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.setTextColor(...MUTED);
    pdf.text("No attendance sessions have been run for this subject yet.", MARGIN, y + 10);
  }

  const rowHeight = 17;
  const headHeight = 26;
  for (let start = 0; start < sessions.length; start += SESSIONS_PER_TABLE) {
    const chunk = sessions.slice(start, start + SESSIONS_PER_TABLE);
    const chunkStatus = statusBySession.slice(start, start + SESSIONS_PER_TABLE);
    const fixed = { index: 22, number: 72, session: 38, attended: 50, rate: 34 };
    const nameWidth = pageWidth - MARGIN * 2 - fixed.index - fixed.number - fixed.session * chunk.length - fixed.attended - fixed.rate;
    const columns = [fixed.index, fixed.number, nameWidth, ...chunk.map(() => fixed.session), fixed.attended, fixed.rate];
    // Left edge of each column.
    const xs = [MARGIN];
    for (let i = 1; i < columns.length; i += 1) xs.push(xs[i - 1] + columns[i - 1]);

    const drawTableHead = () => {
      if (sessions.length > SESSIONS_PER_TABLE) {
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(7.5);
        pdf.setTextColor(...MUTED);
        pdf.text(`SESSIONS ${start + 1}-${start + chunk.length} OF ${sessions.length}`, MARGIN, y + 6);
        y += 12;
      }
      pdf.setFillColor(...HEAD_FILL);
      pdf.rect(MARGIN, y, pageWidth - MARGIN * 2, headHeight, "F");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(7);
      pdf.setTextColor(...INK);
      pdf.text("#", xs[0] + 4, y + 16);
      pdf.text("Student no.", xs[1] + 4, y + 16);
      pdf.text("Name", xs[2] + 4, y + 16);
      chunk.forEach((session, index) => {
        const date = new Date(session.startedAt);
        const center = xs[3 + index] + fixed.session / 2;
        pdf.text(date.toLocaleDateString([], { month: "short", day: "numeric" }), center, y + 11, { align: "center" });
        pdf.setFont("helvetica", "normal");
        pdf.text(date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }), center, y + 20, { align: "center" });
        pdf.setFont("helvetica", "bold");
      });
      pdf.text("Attended", xs[3 + chunk.length] + fixed.attended / 2, y + 16, { align: "center" });
      pdf.text("%", xs[4 + chunk.length] + fixed.rate / 2, y + 16, { align: "center" });
      y += headHeight;
    };

    if (y + headHeight + rowHeight * 2 > pageHeight - MARGIN - 16) { pdf.addPage(); drawHeader(); }
    drawTableHead();
    students.forEach((student, row) => {
      if (y + rowHeight > pageHeight - MARGIN - 16) { pdf.addPage(); drawHeader(); drawTableHead(); }
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7.5);
      pdf.setTextColor(...MUTED);
      pdf.text(String(row + 1), xs[0] + 4, y + 11.5);
      pdf.setTextColor(...INK);
      pdf.text(student.studentNumber, xs[1] + 4, y + 11.5);
      pdf.text(fit(pdf, student.studentName, nameWidth - 8), xs[2] + 4, y + 11.5);
      chunkStatus.forEach((map, index) => {
        const status = map.get(student.studentNumber);
        const [label, color] = status === "late" ? ["L", LATE] : status ? ["P", PRESENT] : ["A", ABSENT];
        pdf.setFont("helvetica", status ? "bold" : "normal");
        pdf.setTextColor(...(color as Rgb));
        pdf.text(label as string, xs[3 + index] + fixed.session / 2, y + 11.5, { align: "center" });
      });
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(...INK);
      pdf.text(`${attended[row]}/${sessions.length}`, xs[3 + chunk.length] + fixed.attended / 2, y + 11.5, { align: "center" });
      pdf.text(`${Math.round((attended[row] * 100) / sessions.length)}%`, xs[4 + chunk.length] + fixed.rate / 2, y + 11.5, { align: "center" });
      pdf.setDrawColor(...LINE);
      pdf.line(MARGIN, y + rowHeight, pageWidth - MARGIN, y + rowHeight);
      y += rowHeight;
    });
    y += 18;
  }

  const pageCount = pdf.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    pdf.setPage(page);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.5);
    pdf.setTextColor(...MUTED);
    pdf.text("P = present   L = late   A = absent   Attended = present or late, of all sessions", MARGIN, pageHeight - 16);
    pdf.text(`Page ${page} of ${pageCount}`, pageWidth - MARGIN, pageHeight - 16, { align: "right" });
  }
  pdf.save(input.fileName);
}

function fit(pdf: { getTextWidth: (text: string) => number }, text: string, width: number) {
  if (pdf.getTextWidth(text) <= width) return text;
  let value = text;
  while (value.length > 1 && pdf.getTextWidth(`${value}...`) > width) value = value.slice(0, -1);
  return `${value.trimEnd()}...`;
}
