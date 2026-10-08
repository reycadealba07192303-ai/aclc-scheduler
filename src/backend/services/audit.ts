import { getCurrentUser } from "@/backend/auth/auth";
import { Administrator, AuditEvent, Program, Room, Section, Subject, Teacher, Term } from "@/backend/models";
import type { AuthenticatedUser } from "@/shared/types";

export type AuditCategory = "schedule" | "roster" | "setup" | "attendance" | "account";
type Actor = Pick<AuthenticatedUser, "id" | "role" | "name"> | { role: "system"; name: string; id?: undefined };

/**
 * Records who changed what (systemsecured.md 1.1). Never throws: a failed
 * audit write must not undo or block the change itself.
 */
export async function audit(
  actor: Actor,
  category: AuditCategory,
  action: string,
  summary: string,
  target?: { type: string; id: string },
) {
  try {
    await AuditEvent.create({
      actorRole: actor.role,
      actorAccountId: actor.id ?? null,
      actorName: actor.name,
      category,
      action,
      summary,
      targetType: target?.type ?? null,
      targetId: target?.id ?? null,
    });
  } catch (error) {
    console.error("Audit log write failed:", error);
  }
}

const SETUP_NAMES: Record<string, string> = {
  terms: "term",
  programs: "program",
  subjects: "subject",
  rooms: "room",
  sections: "section",
  teachers: "teacher",
  admins: "administrator",
};

/** A readable name for an admin-setup record, from its fields. */
function setupLabel(resource: string, item: Record<string, unknown> | null | undefined) {
  if (!item) return "";
  switch (resource) {
    case "terms": return `A.Y. ${item.startYear}-${Number(item.startYear) + 1} ${item.semester ?? ""}`.trim();
    case "programs": return String(item.code ?? item.name ?? "");
    case "subjects": return [item.code, item.name].filter(Boolean).join(" ");
    case "teachers":
    case "admins": return [item.firstName, item.lastName].filter(Boolean).join(" ");
    default: return String(item.name ?? "");
  }
}

const SETUP_MODELS = { terms: Term, programs: Program, subjects: Subject, rooms: Room, sections: Section, teachers: Teacher, admins: Administrator } as const;

/** Looks up a setup record's name before it is deleted. */
export async function setupItemLabel(resource: string, id: string) {
  const Model = SETUP_MODELS[resource as keyof typeof SETUP_MODELS];
  if (!Model) return "";
  try {
    const item = await (Model as typeof Term).findById(id).lean();
    return setupLabel(resource, item as Record<string, unknown> | null);
  } catch {
    return "";
  }
}

/** Audits a successful admin-setup create, update, or delete. */
export async function auditSetupChange(
  kind: "create" | "update" | "delete",
  resource: string,
  response: Response,
  known?: { id: string; label: string },
) {
  if (!response.ok || !SETUP_NAMES[resource]) return;
  try {
    const user = await getCurrentUser();
    if (!user) return;
    const body = kind === "delete" ? null : await response.clone().json().catch(() => null);
    const item = body?.item as Record<string, unknown> | undefined;
    const label = known?.label || setupLabel(resource, item) || "record";
    const verb = kind === "create" ? "Added" : kind === "update" ? "Updated" : "Deleted";
    const category: AuditCategory = resource === "teachers" || resource === "admins" ? "account" : "setup";
    await audit(user, category, `${resource}.${kind}`, `${verb} ${SETUP_NAMES[resource]}: ${label}`, {
      type: resource,
      id: known?.id ?? String(item?.id ?? ""),
    });
  } catch (error) {
    console.error("Setup audit failed:", error);
  }
}
