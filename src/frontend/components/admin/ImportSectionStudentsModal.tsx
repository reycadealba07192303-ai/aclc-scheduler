"use client";

import { Button } from "@/frontend/components/ui/Button";
import { cn } from "@/shared/lib/utils";
import { FileSpreadsheet, X } from "lucide-react";
import { readSheet } from "read-excel-file/browser";
import { useRef, useState } from "react";

export type StudentImportRow = { studentId: string; name: string; email: string };

type PreviewRow = StudentImportRow & { line: number; error?: string; note?: string };

type Props = {
  sectionName: string;
  existingStudentIds: string[];
  onClose: () => void;
  onImport: (students: StudentImportRow[]) => Promise<void>;
};

const text = (value: unknown) => String(value ?? "").trim();
const normalizeHeader = (value: unknown) => text(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export function ImportSectionStudentsModal({ sectionName, existingStudentIds, onClose, onImport }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [error, setError] = useState("");
  const [reading, setReading] = useState(false);
  const [saving, setSaving] = useState(false);
  const validRows = rows.filter((row) => !row.error);

  function reset() {
    setFileName("");
    setRows([]);
    setError("");
    if (fileRef.current) fileRef.current.value = "";
  }

  function close() {
    reset();
    onClose();
  }

  async function handleFile(file: File) {
    reset();
    setFileName(file.name);
    setReading(true);
    try {
      const data = await readSheet(file);
      if (!data.length) {
        setError("The Excel file is empty.");
        return;
      }
      const headers = data[0].map(normalizeHeader);
      const studentIdColumn = headers.findIndex((header) => ["student id", "student number", "student no"].includes(header));
      const nameColumn = headers.findIndex((header) => header === "name" || header === "student name");
      const emailColumn = headers.findIndex((header) => ["email", "school email", "student email"].includes(header));
      if (studentIdColumn < 0 || nameColumn < 0 || emailColumn < 0) {
        setError("Add a header row with student_id, NAME, and EMAIL columns.");
        return;
      }

      const seen = new Set<string>();
      const existing = new Set(existingStudentIds.map((id) => id.trim().toUpperCase()));
      const parsed: PreviewRow[] = [];
      data.slice(1).forEach((cells, index) => {
        const studentId = text(cells[studentIdColumn]).toUpperCase();
        const name = text(cells[nameColumn]);
        const email = text(cells[emailColumn]).toLowerCase();
        if (!studentId && !name && !email) return;
        let rowError: string | undefined;
        if (!studentId) rowError = "Missing student ID";
        else if (!name) rowError = "Missing name";
        else if (seen.has(studentId)) rowError = "Duplicate ID in this file";
        else if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) rowError = "Missing or invalid school email";
        if (studentId) seen.add(studentId);
        parsed.push({ line: index + 2, studentId, name, email, error: rowError, note: existing.has(studentId) ? "Update existing roster" : undefined });
      });
      if (!parsed.length) {
        setError("No student rows found below the header row.");
        return;
      }
      setRows(parsed);
    } catch {
      setError("Could not read the file. Please choose a valid .xlsx Excel file.");
    } finally {
      setReading(false);
    }
  }

  async function submitImport() {
    if (!validRows.length) return;
    setSaving(true);
    setError("");
    try {
      await onImport(validRows.map(({ studentId, name, email }) => ({ studentId, name, email })));
      reset();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not import students.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4">
      <section role="dialog" aria-modal="true" aria-labelledby="student-import-title" className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-line bg-bg-elevated shadow-2xl sm:rounded-3xl">
        <header className="flex items-start justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
          <div>
            <h2 id="student-import-title" className="font-[family-name:var(--font-display)] text-xl font-semibold">Import students</h2>
            <p className="mt-1 text-sm text-ink-muted">For {sectionName}. Excel columns: <strong>student_id</strong>, <strong>NAME</strong>, and <strong>EMAIL</strong>.</p>
          </div>
          <button type="button" onClick={close} aria-label="Close" className="rounded-lg p-2 text-ink-muted hover:bg-bg hover:text-ink"><X className="h-4 w-4" /></button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5 sm:px-6">
          <label className={cn("flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed px-5 py-7 text-center transition", fileName ? "border-accent/50 bg-accent-soft/30" : "border-line bg-bg/50 hover:border-accent/40")}>
            <FileSpreadsheet className="h-8 w-8 text-accent" />
            <span className="text-sm font-semibold text-ink">{fileName || "Choose an .xlsx file"}</span>
            <span className="text-xs text-ink-muted">{reading ? "Reading spreadsheet..." : "Only students for this section will be imported."}</span>
            <input ref={fileRef} type="file" accept=".xlsx" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) void handleFile(file); }} />
          </label>

          {error ? <p role="alert" className="rounded-lg border border-danger/25 bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p> : null}

          {rows.length ? <div>
            <div className="mb-2 flex gap-2 text-sm"><span className="rounded-full bg-ok-soft px-2.5 py-1 font-medium text-ok">{validRows.length} ready</span><span className="rounded-full bg-bg px-2.5 py-1 text-ink-muted">{rows.length - validRows.length} skipped</span></div>
            <div className="max-h-72 overflow-auto rounded-xl border border-line">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-bg text-xs uppercase tracking-wide text-ink-muted"><tr><th className="px-3 py-2">Row</th><th className="px-3 py-2">Student ID</th><th className="px-3 py-2">Name</th><th className="px-3 py-2">Email</th><th className="px-3 py-2">Status</th></tr></thead>
                <tbody className="divide-y divide-line/60">{rows.map((row) => <tr key={row.line} className={row.error ? "bg-danger-soft/40" : undefined}><td className="px-3 py-2 text-ink-muted">{row.line}</td><td className="px-3 py-2 font-medium">{row.studentId || "—"}</td><td className="px-3 py-2">{row.name || "—"}</td><td className="px-3 py-2">{row.email || "—"}</td><td className={`px-3 py-2 ${row.error ? "text-danger" : "text-ok"}`}>{row.error ?? row.note ?? "Ready"}</td></tr>)}</tbody>
              </table>
            </div>
          </div> : null}
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-line px-5 py-4 sm:px-6">
          <Button type="button" variant="secondary" onClick={close} disabled={saving}>Cancel</Button>
          <Button type="button" onClick={() => void submitImport()} disabled={!validRows.length || reading || saving}>{saving ? "Importing..." : `Import ${validRows.length || "students"}`}</Button>
        </footer>
      </section>
    </div>
  );
}
