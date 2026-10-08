"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useAcademicStore } from "@/context/AcademicStore";
import type { Student } from "@/types";
import { cn } from "@/lib/utils";
import { Download, FileSpreadsheet, X } from "lucide-react";
import { readSheet } from "read-excel-file/browser";
import { useRef, useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Student numbers already in the system; rows with these are skipped. */
  existingNumbers: string[];
  onImport: (students: Student[]) => void;
};

type PreviewRow = {
  line: number;
  studentNumber: string;
  name: string;
  section: string;
  sectionId?: string;
  error?: string;
};

const HEADERS = {
  id: ["student id", "studentid", "student number", "student no", "id", "id number"],
  name: ["name", "student name", "full name"],
  section: ["section", "section name"],
};

const norm = (v: unknown) => String(v ?? "").trim().toLowerCase().replace(/[._]/g, " ");
const text = (v: unknown) => String(v ?? "").trim();

function splitName(full: string) {
  // "Dela Cruz, Juan" or "Juan Dela Cruz"
  if (full.includes(",")) {
    const [last, ...first] = full.split(",");
    return { firstName: first.join(",").trim(), lastName: last.trim() };
  }
  const parts = full.split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts.slice(0, -1).join(" "), lastName: parts[parts.length - 1] };
}

export function ImportStudentsModal({
  open,
  onClose,
  existingNumbers,
  onImport,
}: Props) {
  const { sections } = useAcademicStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [fatal, setFatal] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const valid = rows.filter((r) => !r.error);

  function reset() {
    setFileName(null);
    setRows([]);
    setFatal(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function close() {
    reset();
    onClose();
  }

  async function handleFile(file: File) {
    reset();
    setFileName(file.name);
    setBusy(true);
    try {
      const data = await readSheet(file);
      if (data.length === 0) {
        setFatal("The file is empty.");
        return;
      }

      // Use the header row when it names the columns, otherwise assume ID, Name, Section.
      const head = data[0].map(norm);
      const find = (keys: string[]) => head.findIndex((h) => keys.includes(h));
      const hasHeader =
        find(HEADERS.id) >= 0 || find(HEADERS.name) >= 0 || find(HEADERS.section) >= 0;
      const col = hasHeader
        ? { id: find(HEADERS.id), name: find(HEADERS.name), section: find(HEADERS.section) }
        : { id: 0, name: 1, section: 2 };
      if (col.id < 0 || col.name < 0 || col.section < 0) {
        setFatal("Couldn't find the columns. Use: Student ID, Name, Section.");
        return;
      }

      const taken = new Set(existingNumbers.map((n) => n.toLowerCase()));
      const bySection = new Map(
        sections.map((s) => [s.name.trim().toLowerCase(), s.id] as const),
      );

      const parsed: PreviewRow[] = [];
      data.slice(hasHeader ? 1 : 0).forEach((r, i) => {
        const studentNumber = text(r[col.id]);
        const name = text(r[col.name]);
        const section = text(r[col.section]);
        if (!studentNumber && !name && !section) return; // blank line

        const sectionId = bySection.get(section.toLowerCase());
        let error: string | undefined;
        if (!studentNumber) error = "Missing student ID";
        else if (!name) error = "Missing name";
        else if (!section) error = "Missing section";
        else if (!sectionId) error = `Section "${section}" not found`;
        else if (taken.has(studentNumber.toLowerCase()))
          error = "Student ID already exists";

        if (!error) taken.add(studentNumber.toLowerCase()); // catches duplicates inside the file
        parsed.push({
          line: i + (hasHeader ? 2 : 1),
          studentNumber,
          name,
          section,
          sectionId,
          error,
        });
      });

      if (parsed.length === 0) setFatal("No student rows found.");
      setRows(parsed);
    } catch {
      setFatal("Couldn't read that file. Please upload an .xlsx Excel file.");
    } finally {
      setBusy(false);
    }
  }

  function handleImport() {
    const students: Student[] = valid.map((r, i) => {
      const { firstName, lastName } = splitName(r.name);
      return {
        id: `s-${Date.now()}-${i}`,
        studentNumber: r.studentNumber,
        firstName,
        lastName,
        email: `${r.studentNumber.toLowerCase().replace(/\s+/g, "")}@student.aclc.edu`,
        sectionId: r.sectionId!,
        photoUrl: `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(firstName)}`,
        status: "active",
      };
    });
    onImport(students);
    reset();
  }

  function downloadTemplate() {
    const sample = sections[0]?.name ?? "BSIT 1-A";
    const csv = `Student ID,Name,Section\r\n2026-0001,Juan Dela Cruz,${sample}\r\n`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "students-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-line bg-bg-elevated shadow-2xl sm:rounded-3xl">
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
              Import students from Excel
            </h2>
            <p className="mt-0.5 text-sm text-ink-muted">
              Columns: <strong>Student ID</strong>, <strong>Name</strong>,{" "}
              <strong>Section</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            className="rounded-xl border border-line p-2 text-ink-muted hover:text-ink"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5 sm:px-6">
          <label
            className={cn(
              "flex cursor-pointer flex-col items-center gap-2 rounded-2xl border border-dashed px-6 py-8 text-center transition",
              fileName
                ? "border-accent/50 bg-accent-soft/30"
                : "border-line bg-bg/50 hover:border-accent/40",
            )}
          >
            <FileSpreadsheet className="h-8 w-8 text-accent" />
            <span className="text-sm font-semibold text-ink">
              {fileName ?? "Choose an .xlsx file"}
            </span>
            <span className="text-xs text-ink-muted">
              {busy ? "Reading…" : "Section must match a section name in Academic setup."}
            </span>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleFile(f);
              }}
            />
          </label>

          <button
            type="button"
            onClick={downloadTemplate}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:underline"
          >
            <Download className="h-4 w-4" />
            Download template
          </button>

          {sections.length === 0 ? (
            <p className="rounded-xl border border-warn/30 bg-warn-soft px-3 py-2 text-sm text-warn">
              No sections exist yet. Create sections in Academic setup first, or every
              row will be rejected.
            </p>
          ) : null}

          {fatal ? (
            <p
              role="alert"
              className="rounded-xl border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger"
            >
              {fatal}
            </p>
          ) : null}

          {rows.length > 0 ? (
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
                <Badge tone="ok">{valid.length} ready</Badge>
                {rows.length - valid.length > 0 ? (
                  <Badge tone="danger">{rows.length - valid.length} skipped</Badge>
                ) : null}
              </div>
              <div className="max-h-72 overflow-auto rounded-2xl border border-line/80">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-bg text-xs uppercase tracking-wide text-ink-muted">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Row</th>
                      <th className="px-3 py-2 font-semibold">Student ID</th>
                      <th className="px-3 py-2 font-semibold">Name</th>
                      <th className="px-3 py-2 font-semibold">Section</th>
                      <th className="px-3 py-2 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/60">
                    {rows.map((r) => (
                      <tr key={r.line} className={r.error ? "bg-danger-soft/40" : undefined}>
                        <td className="px-3 py-2 text-ink-muted">{r.line}</td>
                        <td className="px-3 py-2 font-medium">{r.studentNumber || "—"}</td>
                        <td className="px-3 py-2">{r.name || "—"}</td>
                        <td className="px-3 py-2">{r.section || "—"}</td>
                        <td className="px-3 py-2">
                          {r.error ? (
                            <span className="text-danger">{r.error}</span>
                          ) : (
                            <span className="text-ok">OK</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-line px-5 py-4 sm:px-6">
          <Button type="button" variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button type="button" disabled={valid.length === 0} onClick={handleImport}>
            Import {valid.length > 0 ? `${valid.length} student${valid.length === 1 ? "" : "s"}` : ""}
          </Button>
        </div>
      </div>
    </div>
  );
}
