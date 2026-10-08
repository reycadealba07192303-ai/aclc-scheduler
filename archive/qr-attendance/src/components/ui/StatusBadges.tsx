import { Badge } from "@/components/ui/Badge";
import type {
  AccountStatus,
  AttendanceStatus,
  ClassModality,
  SessionStatus,
} from "@/types";
import { Monitor, School } from "lucide-react";

export function ModalityBadge({ modality }: { modality: ClassModality }) {
  if (modality === "online") {
    return (
      <Badge tone="info">
        <Monitor className="h-3 w-3" />
        Online
      </Badge>
    );
  }
  return (
    <Badge tone="accent">
      <School className="h-3 w-3" />
      Face-to-face
    </Badge>
  );
}

export function SessionBadge({ status }: { status: SessionStatus }) {
  const map = {
    upcoming: { tone: "neutral" as const, label: "Upcoming" },
    open: { tone: "ok" as const, label: "Open" },
    closed: { tone: "neutral" as const, label: "Closed" },
    done: { tone: "info" as const, label: "Done" },
  };
  const item = map[status];
  return (
    <Badge tone={item.tone} className={status === "open" ? "live-pulse" : undefined}>
      {status === "open" ? <span className="h-1.5 w-1.5 rounded-full bg-ok" /> : null}
      {item.label}
    </Badge>
  );
}

export function AttendanceBadge({ status }: { status: AttendanceStatus }) {
  const map = {
    present: { tone: "ok" as const, label: "Present" },
    late: { tone: "warn" as const, label: "Late" },
    absent: { tone: "danger" as const, label: "Absent" },
    excused: { tone: "info" as const, label: "Excused" },
    not_scanned: { tone: "neutral" as const, label: "Not scanned" },
  };
  const item = map[status];
  return <Badge tone={item.tone}>{item.label}</Badge>;
}

export function AccountBadge({ status }: { status: AccountStatus }) {
  return (
    <Badge tone={status === "active" ? "ok" : "neutral"}>
      {status === "active" ? "Active" : "Inactive"}
    </Badge>
  );
}
