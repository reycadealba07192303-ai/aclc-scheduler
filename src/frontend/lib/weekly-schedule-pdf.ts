import type { jsPDF } from "jspdf";
import { formatTime, toMinutes } from "@/shared/lib/time";

export type WeeklyPdfClass = {
  /** 0 = Sunday, 1 = Monday … 6 = Saturday (same as the UI). */
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  title: string;
  lines: string[];
  online: boolean;
};

type Rgb = [number, number, number];
const MARGIN = 30;
const NAVY: Rgb = [32, 61, 145];
const INK: Rgb = [24, 34, 56];
const MUTED: Rgb = [113, 128, 150];
const LINE: Rgb = [226, 231, 238];
const HALF_LINE: Rgb = [240, 243, 247];
const BLOCK_FILL: Rgb = [238, 242, 251];
const ONLINE_INK: Rgb = [3, 105, 161];
const DAYS = [
  { id: 1, label: "MON" },
  { id: 2, label: "TUE" },
  { id: 3, label: "WED" },
  { id: 4, label: "THU" },
  { id: 5, label: "FRI" },
  { id: 6, label: "SAT" },
  { id: 0, label: "SUN" },
];

/**
 * Downloads a one-page landscape A4 weekly calendar (Mon–Sun columns, hour
 * rows) with each class drawn as a block, like the on-screen schedule grid.
 */
export async function downloadWeeklySchedulePdf(input: {
  heading: string;
  title: string;
  subtitle: string;
  classes: WeeklyPdfClass[];
  fileName: string;
}) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  // Header.
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.setTextColor(...NAVY);
  pdf.text(input.heading, MARGIN, MARGIN + 4);
  pdf.setFontSize(18);
  pdf.setTextColor(...INK);
  pdf.text(input.title, MARGIN, MARGIN + 25);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9.5);
  pdf.setTextColor(...MUTED);
  pdf.text(input.subtitle, MARGIN, MARGIN + 40);
  pdf.text(
    `${input.classes.length} ${input.classes.length === 1 ? "class" : "classes"}   |   Generated ${new Date().toLocaleDateString([], { year: "numeric", month: "long", day: "numeric" })}`,
    pageWidth - MARGIN,
    MARGIN + 40,
    { align: "right" },
  );

  // Start at 7 AM like the on-screen grid; end at 5 PM or the last class, up to 9 PM.
  const ends = input.classes.map((item) => toMinutes(item.endTime));
  const firstHour = 7;
  const lastHour = Math.min(21, Math.max(17, ...ends.map((m) => Math.ceil(m / 60))));

  const timeColumn = 46;
  const gridTop = MARGIN + 74;
  const gridLeft = MARGIN + timeColumn;
  const gridWidth = pageWidth - MARGIN - gridLeft;
  const gridHeight = pageHeight - MARGIN - 18 - gridTop;
  const columnWidth = gridWidth / DAYS.length;
  const hourHeight = gridHeight / (lastHour - firstHour);
  const yOf = (minutes: number) => gridTop + ((minutes - firstHour * 60) / 60) * hourHeight;

  // Day headings.
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8.5);
  pdf.setTextColor(...MUTED);
  DAYS.forEach((day, index) => {
    pdf.text(day.label, gridLeft + columnWidth * index + columnWidth / 2, gridTop - 9, { align: "center" });
  });

  // Hour and half-hour lines, hour labels, and day columns.
  pdf.setLineWidth(0.6);
  for (let hour = firstHour; hour <= lastHour; hour += 1) {
    const y = yOf(hour * 60);
    pdf.setDrawColor(...LINE);
    pdf.line(gridLeft, y, gridLeft + gridWidth, y);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(...MUTED);
    pdf.text(formatTime(hour * 60).replace(":00", ""), gridLeft - 7, y + 3, { align: "right" });
    if (hour < lastHour) {
      pdf.setDrawColor(...HALF_LINE);
      pdf.line(gridLeft, y + hourHeight / 2, gridLeft + gridWidth, y + hourHeight / 2);
    }
  }
  pdf.setDrawColor(...LINE);
  for (let index = 0; index <= DAYS.length; index += 1) {
    const x = gridLeft + columnWidth * index;
    pdf.line(x, gridTop, x, gridTop + gridHeight);
  }

  // Class blocks.
  for (const item of input.classes) {
    const column = DAYS.findIndex((day) => day.id === item.dayOfWeek);
    if (column < 0) continue;
    const x = gridLeft + columnWidth * column + 3;
    const width = columnWidth - 6;
    const top = yOf(toMinutes(item.startTime)) + 1.5;
    const height = yOf(toMinutes(item.endTime)) - 1.5 - top;
    drawBlock(pdf, item, x, top, width, height);
  }

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7.5);
  pdf.setTextColor(...MUTED);
  pdf.text("Solid blocks: face-to-face   |   Dashed blocks: online", MARGIN, pageHeight - MARGIN + 6);
  pdf.save(input.fileName);
}

function drawBlock(pdf: jsPDF, item: WeeklyPdfClass, x: number, y: number, width: number, height: number) {
  if (item.online) {
    pdf.setFillColor(255, 255, 255);
    pdf.roundedRect(x, y, width, height, 3, 3, "F");
    pdf.setDrawColor(150, 160, 178);
    pdf.setLineDashPattern([2, 2], 0);
    pdf.setLineWidth(0.7);
    pdf.roundedRect(x, y, width, height, 3, 3, "S");
    pdf.setLineDashPattern([], 0);
  } else {
    pdf.setFillColor(...BLOCK_FILL);
    pdf.roundedRect(x, y, width, height, 3, 3, "F");
    pdf.setFillColor(...NAVY);
    pdf.rect(x, y, 2.5, height, "F");
  }

  // Fill in as many lines as the block's height allows.
  const textX = x + 7;
  const textWidth = width - 11;
  const bottom = y + height - 3;
  let cursor = y + 11;
  const write = (text: string, size: number, color: Rgb, bold = false) => {
    if (cursor > bottom) return;
    pdf.setFont("helvetica", bold ? "bold" : "normal");
    pdf.setFontSize(size);
    pdf.setTextColor(...color);
    pdf.text(truncate(pdf, text, textWidth), textX, cursor);
    cursor += size + 2.5;
  };
  write(item.title, 8.5, item.online ? ONLINE_INK : NAVY, true);
  item.lines.forEach((line, index) => write(line, index === 0 ? 7.5 : 7, index === 0 ? INK : MUTED));
}

function truncate(pdf: jsPDF, text: string, width: number) {
  if (pdf.getTextWidth(text) <= width) return text;
  let value = text;
  while (value.length > 1 && pdf.getTextWidth(`${value}...`) > width) value = value.slice(0, -1);
  return `${value.trimEnd()}...`;
}
