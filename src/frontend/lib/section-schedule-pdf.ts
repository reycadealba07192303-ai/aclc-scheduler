import type { jsPDF } from "jspdf";

export type SectionScheduleRow = {
  day: string;
  time: string;
  subject: string;
  units: string;
  professor: string;
  classType: string;
  room: string;
};

export type SectionProfessorRow = {
  subject: string;
  professor: string;
  classes: string;
};

type Column = { label: string; width: number };

const MARGIN = 36;
const NAVY: [number, number, number] = [32, 61, 145];
const INK: [number, number, number] = [24, 34, 56];
const MUTED: [number, number, number] = [113, 128, 150];
const LINE: [number, number, number] = [226, 231, 238];
const STRIPE: [number, number, number] = [246, 248, 251];

/**
 * Downloads a landscape A4 PDF for one section: its weekly class schedule and
 * the professor assigned to each subject.
 */
export async function downloadSectionSchedulePdf(input: {
  sectionName: string;
  subtitle: string;
  term: string;
  schedule: SectionScheduleRow[];
  professors: SectionProfessorRow[];
  fileName: string;
}) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const contentWidth = pageWidth - MARGIN * 2;
  let y = MARGIN;

  // Title block.
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.setTextColor(...NAVY);
  pdf.text("ACLC COLLEGE  |  SECTION CLASS SCHEDULE", MARGIN, y + 6);
  pdf.setFontSize(20);
  pdf.setTextColor(...INK);
  pdf.text(input.sectionName, MARGIN, y + 30);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(...MUTED);
  pdf.text([input.subtitle, input.term].filter(Boolean).join("   |   "), MARGIN, y + 47);
  pdf.text(`Generated ${new Date().toLocaleDateString([], { year: "numeric", month: "long", day: "numeric" })}`, pageWidth - MARGIN, y + 47, { align: "right" });
  y += 60;
  pdf.setDrawColor(...LINE);
  pdf.line(MARGIN, y, pageWidth - MARGIN, y);
  y += 22;

  const sectionHeading = (title: string, note: string) => {
    if (y + 80 > pageHeight - MARGIN) { pdf.addPage(); y = MARGIN; }
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    pdf.setTextColor(...INK);
    pdf.text(title, MARGIN, y);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(...MUTED);
    pdf.text(note, pageWidth - MARGIN, y, { align: "right" });
    y += 10;
  };

  const drawTable = (columns: Column[], rows: string[][], empty: string) => {
    const drawHeader = () => {
      pdf.setFillColor(...NAVY);
      pdf.rect(MARGIN, y, contentWidth, 24, "F");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9);
      pdf.setTextColor(255, 255, 255);
      let x = MARGIN;
      for (const column of columns) {
        pdf.text(column.label, x + 7, y + 16);
        x += column.width;
      }
      y += 24;
    };
    drawHeader();
    if (!rows.length) {
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.setTextColor(...MUTED);
      pdf.text(empty, MARGIN + 7, y + 18);
      y += 30;
      return;
    }
    rows.forEach((values, rowIndex) => {
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      const wrapped = values.map((value, index) => pdf.splitTextToSize(value || "-", columns[index].width - 14) as string[]);
      const rowHeight = Math.max(26, ...wrapped.map((lines) => lines.length * 11.5 + 12));
      if (y + rowHeight > pageHeight - MARGIN - 14) {
        pdf.addPage();
        y = MARGIN;
        drawHeader();
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9);
      }
      if (rowIndex % 2 === 1) {
        pdf.setFillColor(...STRIPE);
        pdf.rect(MARGIN, y, contentWidth, rowHeight, "F");
      }
      pdf.setDrawColor(...LINE);
      pdf.line(MARGIN, y + rowHeight, pageWidth - MARGIN, y + rowHeight);
      pdf.setTextColor(...INK);
      let x = MARGIN;
      wrapped.forEach((lines, index) => {
        pdf.text(lines, x + 7, y + 16);
        x += columns[index].width;
      });
      y += rowHeight;
    });
  };

  const fit = (columns: Column[], flexIndex: number) => {
    const fixed = columns.reduce((sum, column, index) => (index === flexIndex ? sum : sum + column.width), 0);
    return columns.map((column, index) => (index === flexIndex ? { ...column, width: contentWidth - fixed } : column));
  };

  sectionHeading("Weekly schedule", `${input.schedule.length} ${input.schedule.length === 1 ? "class" : "classes"}`);
  drawTable(
    fit([
      { label: "Day", width: 68 },
      { label: "Time", width: 118 },
      { label: "Subject", width: 0 },
      { label: "Units", width: 42 },
      { label: "Professor", width: 130 },
      { label: "Class type", width: 82 },
      { label: "Room", width: 110 },
    ], 2),
    input.schedule.map((row) => [row.day, row.time, row.subject, row.units, row.professor, row.classType, row.room]),
    "No classes have been scheduled for this section yet.",
  );

  y += 26;
  sectionHeading("Professors", `${input.professors.length} ${input.professors.length === 1 ? "subject" : "subjects"}`);
  drawTable(
    fit([
      { label: "Subject", width: 0 },
      { label: "Professor", width: 220 },
      { label: "Class meetings", width: 200 },
    ], 0),
    input.professors.map((row) => [row.subject, row.professor, row.classes]),
    "No subjects are set for this section.",
  );

  addPageNumbers(pdf, pageWidth, pageHeight);
  pdf.save(input.fileName);
}

function addPageNumbers(pdf: jsPDF, pageWidth: number, pageHeight: number) {
  const pageCount = pdf.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    pdf.setPage(page);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(...MUTED);
    pdf.text(`Page ${page} of ${pageCount}`, pageWidth - MARGIN, pageHeight - 16, { align: "right" });
  }
}
