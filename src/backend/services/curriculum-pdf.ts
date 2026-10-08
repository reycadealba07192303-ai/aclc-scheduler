import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import type { TextItem } from "pdfjs-dist/types/src/display/api";

type TextSpan = Pick<TextItem, "str" | "transform">;

export type CurriculumRow = {
  code: string;
  name: string;
  units: number;
  yearLevel: string;
  semester: "1st Semester" | "2nd Semester";
  prerequisite: string;
};

const yearNames: Record<string, string> = {
  "1st": "1st Year",
  "2nd": "2nd Year",
  "3rd": "3rd Year",
  "4th": "4th Year",
};

function textOf(spans: TextSpan[], minX: number, maxX: number, y: number) {
  return spans
    .filter((span) => {
      const x = span.transform[4];
      const spanY = span.transform[5];
      return x >= minX && x < maxX && spanY >= y - 1 && spanY <= y + 15;
    })
    .sort((a, b) => b.transform[5] - a.transform[5] || a.transform[4] - b.transform[4])
    .map((span) => span.str.trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function fallbackCode(name: string) {
  const majorElective = name.match(/IS Major Elective\s*(\d+)/i);
  if (majorElective) return `IS-MAJOR-ELECTIVE-${majorElective[1]}`;
  if (/^Free Elective\s*\(GE\)/i.test(name)) return "GE-FREE-ELECTIVE";
  return "";
}

function acronym(name: string) {
  return name
    .split(/\s+/)
    .filter((word) => !["of", "in", "and", "the", "for"].includes(word.toLowerCase()))
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

export async function parseCurriculumPdf(data: Uint8Array) {
  const loadingTask = getDocument({ data, useSystemFonts: true });
  const pdf = await loadingTask.promise;
  const allRows: CurriculumRow[] = [];
  let programName = "";

  try {
    if (pdf.numPages > 12) throw new Error("This PDF has too many pages. Upload curriculum pages only.");

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const spans = content.items.filter((item): item is TextItem => "str" in item && "transform" in item);

      if (!programName) {
        programName = spans.find((span) => /Bachelor of .* in .*|Bachelor of .* of .*/i.test(span.str.trim()))?.str.trim() ?? "";
      }

      const yearHeaders = spans.flatMap((span) => {
        if (span.transform[4] > 120) return [];
        const match = span.str.trim().match(/^(1st|2nd|3rd|4th) Year$/i);
        return match ? [{ y: span.transform[5], yearLevel: yearNames[match[1].toLowerCase()] }] : [];
      });
      const semesterHeaders = spans.flatMap((span) => {
        const label = span.str.trim();
        if (label !== "1st Semester" && label !== "2nd Semester") return [];
        return [{ y: span.transform[5], side: span.transform[4] < 200 ? "left" : "right", semester: label as CurriculumRow["semester"] }];
      });

      for (const unitSpan of spans) {
        const x = unitSpan.transform[4];
        const units = Number(unitSpan.str.trim());
        const side = x >= 220 && x < 270 ? "left" : x >= 480 && x < 520 ? "right" : null;
        if (!side || !Number.isInteger(units) || units < 1 || units > 12) continue;

        const y = unitSpan.transform[5];
        const year = yearHeaders
          .filter((header) => header.y >= y)
          .sort((a, b) => a.y - b.y)[0];
        const semester = semesterHeaders
          .filter((header) => header.side === side && header.y >= y)
          .sort((a, b) => a.y - b.y)[0];
        if (!year || !semester) continue;

        const codeText = textOf(spans, side === "left" ? 65 : 325, side === "left" ? 120 : 385, y);
        const name = textOf(spans, side === "left" ? 120 : 380, side === "left" ? 230 : 490, y);
        const prerequisite = textOf(spans, side === "left" ? 250 : 515, side === "left" ? 325 : 580, y);
        const code = codeText.match(/[A-Z][A-Z0-9-]{2,}/i)?.[0]?.toUpperCase() ?? fallbackCode(name);
        if (!name || !code) continue;

        allRows.push({
          code,
          name,
          units,
          yearLevel: year.yearLevel,
          semester: semester.semester,
          prerequisite: prerequisite === "-" ? "" : prerequisite,
        });
      }
    }
  } finally {
    await loadingTask.destroy();
  }

  if (!programName || allRows.length === 0) {
    throw new Error("Could not find a curriculum table. Use a PDF with selectable text and course codes, units, and semester headings.");
  }

  const uniqueSubjects = new Map<string, { code: string; name: string; units: number; track: "college" }>();
  for (const row of allRows) {
    if (!uniqueSubjects.has(row.code)) {
      uniqueSubjects.set(row.code, { code: row.code, name: row.name, units: row.units, track: "college" });
    }
  }

  return {
    programCode: acronym(programName),
    programName,
    subjects: [...uniqueSubjects.values()],
    curriculum: allRows,
  };
}
