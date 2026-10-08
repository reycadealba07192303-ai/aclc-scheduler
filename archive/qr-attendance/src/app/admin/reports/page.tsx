"use client";

import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Field";
import { PageHeader, Panel } from "@/components/ui/Page";
import { Download } from "lucide-react";
import { useState } from "react";

const rows = [
  {
    section: "BSIT 3-A",
    subject: "IT312",
    date: "2026-10-01",
    present: 34,
    late: 2,
    absent: 2,
    rate: "94.7%",
  },
  {
    section: "BSIT 3-A",
    subject: "IT313",
    date: "2026-10-01",
    present: 31,
    late: 4,
    absent: 3,
    rate: "92.1%",
  },
  {
    section: "BSIT 3-B",
    subject: "IT314",
    date: "2026-10-02",
    present: 33,
    late: 1,
    absent: 2,
    rate: "94.4%",
  },
  {
    section: "BSCS 2-A",
    subject: "CS211",
    date: "2026-10-03",
    present: 32,
    late: 1,
    absent: 5,
    rate: "86.8%",
  },
];

export default function ReportsPage() {
  const [exported, setExported] = useState(false);

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Attendance summaries by section, subject, and date range — exportable to CSV."
        actions={
          <Button
            onClick={() => {
              setExported(true);
              setTimeout(() => setExported(false), 2500);
            }}
          >
            <Download className="h-4 w-4" />
            {exported ? "CSV ready (mock)" : "Export CSV"}
          </Button>
        }
      />

      <Panel className="mb-6">
        <div className="grid gap-3 md:grid-cols-4">
          <Field label="Section">
            <Select defaultValue="all">
              <option value="all">All sections</option>
              <option value="sec-1">BSIT 3-A</option>
              <option value="sec-2">BSIT 3-B</option>
              <option value="sec-3">BSCS 2-A</option>
            </Select>
          </Field>
          <Field label="Subject">
            <Select defaultValue="all">
              <option value="all">All subjects</option>
              <option value="IT312">IT312</option>
              <option value="IT313">IT313</option>
              <option value="CS211">CS211</option>
            </Select>
          </Field>
          <Field label="From">
            <Input type="date" defaultValue="2026-10-01" />
          </Field>
          <Field label="To">
            <Input type="date" defaultValue="2026-10-05" />
          </Field>
        </div>
      </Panel>

      <Panel title="Summary table">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-muted">
                <th className="pb-3 font-semibold">Date</th>
                <th className="pb-3 font-semibold">Section</th>
                <th className="pb-3 font-semibold">Subject</th>
                <th className="pb-3 font-semibold">Present</th>
                <th className="pb-3 font-semibold">Late</th>
                <th className="pb-3 font-semibold">Absent</th>
                <th className="pb-3 font-semibold">Rate</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={`${r.date}-${r.section}-${r.subject}`}
                  className="border-b border-line/70 last:border-0"
                >
                  <td className="py-3">{r.date}</td>
                  <td className="py-3 font-semibold">{r.section}</td>
                  <td className="py-3">{r.subject}</td>
                  <td className="py-3 text-ok">{r.present}</td>
                  <td className="py-3 text-warn">{r.late}</td>
                  <td className="py-3 text-danger">{r.absent}</td>
                  <td className="py-3 font-semibold">{r.rate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
