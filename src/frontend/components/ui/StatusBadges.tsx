import { Badge } from "@/frontend/components/ui/Badge";
import type { AccountStatus, ClassModality } from "@/shared/types";
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

export function AccountBadge({ status }: { status: AccountStatus }) {
  return (
    <Badge tone={status === "active" ? "ok" : "neutral"} dot>
      {status === "active" ? "Active" : "Inactive"}
    </Badge>
  );
}
