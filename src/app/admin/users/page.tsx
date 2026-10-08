"use client";

import { Avatar } from "@/frontend/components/ui/Avatar";
import { Badge } from "@/frontend/components/ui/Badge";
import { Button } from "@/frontend/components/ui/Button";
import { Field, Input, Select } from "@/frontend/components/ui/Field";
import { PageHeader, TableCard, Tabs, td, th } from "@/frontend/components/ui/Page";
import { AccountBadge } from "@/frontend/components/ui/StatusBadges";
import { useAcademicStore } from "@/frontend/context/AcademicStore";
import { DAY_LABELS, formatRange, toMinutes } from "@/shared/lib/time";
import type { AccountStatus, AdminUser, Teacher } from "@/shared/types";
import {
  CalendarDays,
  ClipboardCopy,
  Eye,
  KeyRound,
  Mail,
  Pencil,
  Plus,
  Power,
  Search,
  UserPlus,
  X,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

type Category = "all" | "professors" | "admins";
type Kind = "professor" | "admin";

type UnifiedUser =
  | { kind: "professor"; id: string; name: string; email: string; idNumber: string; status: AccountStatus; raw: Teacher }
  | { kind: "admin"; id: string; name: string; email: string; idNumber: string; status: AccountStatus; raw: AdminUser };

// Monday first, Sunday last (UI day ids use 0 = Sunday).
const dayOrder = (day: number) => (day === 0 ? 7 : day);
const dayLong = (id: number) => DAY_LABELS.find((d) => d.id === id)?.long ?? "";

export default function UsersPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-xl border border-line bg-bg-elevated p-8 text-sm text-ink-muted">
          Loading users…
        </div>
      }
    >
      <UsersPageInner />
    </Suspense>
  );
}

function UsersPageInner() {
  const searchParams = useSearchParams();
  const param = searchParams.get("category");
  const { setupLoading, setupError, teachers, admins, addTeacher, updateTeacher, addAdmin, updateAdmin } = useAcademicStore();

  const [category, setCategory] = useState<Category>(
    param === "professors" || param === "admins" ? param : "all",
  );
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [form, setForm] = useState<{ kind: Kind; editingId: string | null } | null>(null);
  const [viewing, setViewing] = useState<{ kind: Kind; id: string } | null>(null);

  const users: UnifiedUser[] = [
    ...admins.map((a) => ({
      kind: "admin" as const,
      id: a.id,
      name: `${a.firstName} ${a.lastName}`,
      email: a.email,
      idNumber: "—",
      status: a.status,
      raw: a,
    })),
    ...teachers.map((t) => ({
      kind: "professor" as const,
      id: t.id,
      name: `${t.firstName} ${t.lastName}`,
      email: t.email,
      idNumber: t.employeeNumber,
      status: t.status,
      raw: t,
    })),
  ];

  const filtered = users.filter((u) => {
    if (category === "professors" && u.kind !== "professor") return false;
    if (category === "admins" && u.kind !== "admin") return false;
    const q = query.trim().toLowerCase();
    return (
      !q ||
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.idNumber.toLowerCase().includes(q)
    );
  });

  function flash(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), 2400);
  }

  async function toggleStatus(user: UnifiedUser) {
    const status: AccountStatus = user.status === "active" ? "inactive" : "active";
    try {
      if (user.kind === "professor") await updateTeacher(user.id, { status });
      else await updateAdmin(user.id, { status });
      flash(`${user.name} ${status === "active" ? "activated" : "deactivated"}`);
    } catch (error) {
      flash(error instanceof Error ? error.message : "Could not update user status");
    }
  }

  const editing = form?.editingId
    ? users.find((u) => u.id === form.editingId && u.kind === form.kind)
    : undefined;
  const viewed = viewing
    ? users.find((u) => u.id === viewing.id && u.kind === viewing.kind)
    : undefined;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form) return;
    const fd = new FormData(e.currentTarget);
    const firstName = String(fd.get("firstName")).trim();
    const lastName = String(fd.get("lastName")).trim();
    const email = String(fd.get("email")).trim().toLowerCase();
    const password = String(fd.get("password") ?? "");
    const kind = (fd.get("kind") as Kind | null) ?? form.kind;

    const emailTaken = users.some(
      (u) => u.email.toLowerCase() === email && !(u.id === form.editingId && u.kind === kind),
    );
    if (emailTaken) {
      flash(`${email} is already used by another user`);
      return;
    }

    try {
    if (kind === "professor") {
      const employeeNumber = String(fd.get("employeeNumber")).trim();
      const taken = teachers.some(
        (t) =>
          t.employeeNumber.toLowerCase() === employeeNumber.toLowerCase() &&
          t.id !== form.editingId,
      );
      if (taken) {
        flash(`Employee number ${employeeNumber} already exists`);
        return;
      }
      if (form.editingId) {
        await updateTeacher(form.editingId, { firstName, lastName, email, employeeNumber });
      } else {
        await addTeacher({ firstName, lastName, email, employeeNumber, status: "active" });
      }
    } else if (form.editingId) {
      await updateAdmin(form.editingId, { firstName, lastName, email }, password || undefined);
    } else {
      await addAdmin({ firstName, lastName, email, status: "active" }, password);
    }

    setForm(null);
    flash(form.editingId ? "User updated" : "User added");
    } catch (error) {
      flash(error instanceof Error ? error.message : "Could not save user");
    }
  }

  const openAdd = () =>
    setForm({ kind: category === "admins" ? "admin" : "professor", editingId: null });

  if (setupLoading) return <div className="rounded-xl border border-line bg-bg-elevated p-8 text-center text-sm text-ink-muted">Loading users from the database...</div>;
  if (setupError) return <div role="alert" className="rounded-xl border border-danger/30 bg-danger-soft p-6 text-sm text-danger">{setupError}</div>;

  return (
    <div>
      <PageHeader
        title="Users"
        description="Professors and administrators. Professors can be assigned to classes."
        actions={
          users.length > 0 ? (
            <Button onClick={openAdd}>
              <Plus className="h-4 w-4" />
              Add user
            </Button>
          ) : null
        }
      />

      {users.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl border border-dashed border-line bg-bg-elevated px-6 py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-soft text-accent">
            <UserPlus className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-base font-semibold text-ink">No users yet</h2>
          <p className="mt-1 max-w-sm text-sm text-ink-muted">
            Add your professors first — they are needed when scheduling classes.
          </p>
          <Button className="mt-6" onClick={openAdd}>
            <Plus className="h-4 w-4" />
            Add user
          </Button>
        </div>
      ) : (
        <>
          <Tabs
            value={category}
            onChange={setCategory}
            tabs={[
              { id: "all", label: "All users", count: users.length },
              { id: "professors", label: "Professors", count: teachers.length },
              { id: "admins", label: "Admins", count: admins.length },
            ]}
          />

          <TableCard
            toolbar={
              <div className="relative w-full max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
                <Input
                  className="pl-9"
                  placeholder="Search by name, email, or employee no."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  aria-label="Search users"
                />
              </div>
            }
          >
            <table className="w-full min-w-[720px]">
              <thead className="bg-bg/70">
                <tr>
                  <th className={th}>Name</th>
                  <th className={th}>Role</th>
                  <th className={th}>Employee no.</th>
                  <th className={th}>Status</th>
                  <th className={`${th} text-right`}>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.map((u) => (
                  <tr key={`${u.kind}-${u.id}`} className="transition hover:bg-bg/60">
                    <td className={td}>
                      <button
                        type="button"
                        onClick={() => setViewing({ kind: u.kind, id: u.id })}
                        className="flex items-center gap-3 text-left"
                      >
                        <Avatar name={u.name} />
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-ink hover:text-accent">
                            {u.name}
                          </span>
                          <span className="block truncate text-xs text-ink-muted">{u.email}</span>
                        </span>
                      </button>
                    </td>
                    <td className={td}>{u.kind === "professor" ? "Professor" : "Administrator"}</td>
                    <td className={`${td} tabular-nums text-ink-muted`}>{u.idNumber}</td>
                    <td className={td}>
                      <div className="flex flex-wrap items-center gap-2">
                        <AccountBadge status={u.status} />
                        <Badge tone={u.raw.hasLogin ? "ok" : u.kind === "professor" && u.raw.passwordSetupPending ? "info" : "warn"}>
                          {u.kind === "professor"
                            ? u.raw.hasLogin ? "Verified" : u.raw.passwordSetupPending ? "Creating password" : "Password setup pending"
                            : u.raw.hasLogin ? "Login ready" : "Set password"}
                        </Badge>
                      </div>
                    </td>
                    <td className={td}>
                      <div className="flex justify-end gap-1">
                        <IconAction label="View info" onClick={() => setViewing({ kind: u.kind, id: u.id })}>
                          <Eye className="h-4 w-4" />
                        </IconAction>
                        <IconAction label="Edit" onClick={() => setForm({ kind: u.kind, editingId: u.id })}>
                          <Pencil className="h-4 w-4" />
                        </IconAction>
                        <IconAction
                          label={u.kind === "professor"
                            ? u.raw.hasLogin ? "Copy sign-in link" : "Copy teacher password setup link"
                            : u.raw.hasLogin ? "Reset password" : "Set password"}
                          onClick={() => {
                            if (u.kind === "professor") {
                              const path = u.raw.hasLogin ? "/login" : "/create-password";
                              void navigator.clipboard.writeText(`${window.location.origin}${path}`)
                                .then(() => flash(u.raw.hasLogin
                                  ? `Sign-in link copied for ${u.email}`
                                  : `Password setup link copied. ${u.name} must use ${u.email}.`))
                                .catch(() => flash(`Ask ${u.name} to visit ${window.location.origin}${path} using ${u.email}.`));
                              return;
                            }
                            setForm({ kind: u.kind, editingId: u.id });
                          }}
                        >
                          {u.kind === "professor" ? <ClipboardCopy className="h-4 w-4" /> : <KeyRound className="h-4 w-4" />}
                        </IconAction>
                        <IconAction
                          label={u.status === "active" ? "Deactivate" : "Activate"}
                          tone={u.status === "active" ? "danger" : "ok"}
                          onClick={() => toggleStatus(u)}
                        >
                          <Power className="h-4 w-4" />
                        </IconAction>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 ? (
              <p className="px-4 py-12 text-center text-sm text-ink-muted">
                No users match your search.
              </p>
            ) : null}
          </TableCard>
        </>
      )}

      {toast ? (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 z-[70] -translate-x-1/2 rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-white shadow-lg"
        >
          {toast}
        </div>
      ) : null}

      {viewed ? (
        <UserDrawer
          user={viewed}
          onClose={() => setViewing(null)}
          onEdit={() => {
            setViewing(null);
            setForm({ kind: viewed.kind, editingId: viewed.id });
          }}
        />
      ) : null}

      {form ? (
        <UserForm
          key={form.editingId ?? `new-${form.kind}`}
          initialKind={form.kind}
          editing={editing}
          onCancel={() => setForm(null)}
          onSubmit={handleSubmit}
        />
      ) : null}
    </div>
  );
}

function IconAction({
  label,
  tone,
  onClick,
  children,
}: {
  label: string;
  tone?: "danger" | "ok";
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`rounded-lg p-2 transition hover:bg-bg ${
        tone === "danger"
          ? "text-ink-muted hover:text-danger"
          : tone === "ok"
            ? "text-ok hover:bg-ok-soft"
            : "text-ink-muted hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

/** Read-only details. Professors also show their weekly teaching load. */
function UserDrawer({
  user,
  onClose,
  onEdit,
}: {
  user: UnifiedUser;
  onClose: () => void;
  onEdit: () => void;
}) {
  const { scheduleSlots, sections, getSubject, getRoomName } = useAcademicStore();

  const classes =
    user.kind === "professor"
      ? scheduleSlots
          .filter((s) => s.teacherId === user.id)
          .sort(
            (a, b) =>
              dayOrder(a.dayOfWeek) - dayOrder(b.dayOfWeek) ||
              a.startTime.localeCompare(b.startTime),
          )
      : [];
  const minutes = classes.reduce(
    (sum, s) => sum + toMinutes(s.endTime) - toMinutes(s.startTime),
    0,
  );
  const hours = Math.round((minutes / 60) * 10) / 10;
  const subjectCount = new Set(classes.map((s) => s.subjectId)).size;
  const sectionCount = new Set(classes.map((s) => s.sectionId)).size;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink/30" onClick={onClose}>
      <aside
        role="dialog"
        aria-label={`${user.name} details`}
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-md flex-col border-l border-line bg-bg-elevated shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h2 className="text-base font-semibold text-ink">User details</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-ink-muted hover:bg-bg hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
          <div className="flex items-center gap-4">
            <Avatar name={user.name} className="h-14 w-14 text-base" />
            <div className="min-w-0">
              <p className="truncate font-[family-name:var(--font-display)] text-lg font-bold text-ink">
                {user.name}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <Badge tone="accent">
                  {user.kind === "professor" ? "Professor" : "Administrator"}
                </Badge>
                <AccountBadge status={user.status} />
              </div>
            </div>
          </div>

          <dl className="divide-y divide-line rounded-xl border border-line">
            <InfoRow label="Email">
              <a href={`mailto:${user.email}`} className="inline-flex items-center gap-1.5 text-accent hover:underline">
                <Mail className="h-3.5 w-3.5" />
                {user.email}
              </a>
            </InfoRow>
            {user.kind === "professor" ? (
              <InfoRow label="Employee no.">{user.idNumber}</InfoRow>
            ) : null}
            <InfoRow label="Role">
              {user.kind === "professor"
                ? "Can be assigned to classes; sees own schedule in the Teacher portal."
                : "Full access to setup, users, and the schedule."}
            </InfoRow>
          </dl>

          {user.kind === "professor" ? (
            <section>
              <h3 className="mb-3 text-sm font-semibold text-ink">Teaching load</h3>
              <div className="grid grid-cols-3 gap-2">
                <Stat label="Classes / week" value={classes.length} />
                <Stat label="Hours / week" value={hours} />
                <Stat label="Subjects" value={subjectCount} hint={`${sectionCount} section${sectionCount === 1 ? "" : "s"}`} />
              </div>

              <div className="mt-4">
                {classes.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-ink-muted">
                    No classes assigned yet.
                  </p>
                ) : (
                  <ul className="divide-y divide-line rounded-xl border border-line">
                    {classes.map((s) => (
                      <li key={s.id} className="flex items-start gap-3 px-4 py-3">
                        <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-ink-muted" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-ink">
                            {getSubject(s.subjectId)?.code ?? "—"}{" "}
                            <span className="font-normal text-ink-muted">
                              · {sections.find((x) => x.id === s.sectionId)?.name ?? "—"}
                            </span>
                          </p>
                          <p className="text-xs text-ink-muted">
                            {dayLong(s.dayOfWeek)}, {formatRange(s.startTime, s.endTime)}
                          </p>
                        </div>
                        <Badge tone={s.modality === "online" ? "info" : "neutral"}>
                          {s.modality === "online" ? "Online" : getRoomName(s.roomId) ?? "—"}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          ) : null}
        </div>

        <div className="flex justify-end gap-2 border-t border-line bg-bg/50 px-6 py-3.5">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button onClick={onEdit}>
            <Pencil className="h-4 w-4" />
            Edit
          </Button>
        </div>
      </aside>
    </div>
  );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[110px_1fr] gap-3 px-4 py-3 text-sm">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="min-w-0 break-words text-ink">{children}</dd>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="rounded-xl border border-line px-3 py-3">
      <p className="text-xs text-ink-muted">{label}</p>
      <p className="mt-1 font-[family-name:var(--font-display)] text-xl font-bold text-ink">{value}</p>
      {hint ? <p className="text-[11px] text-ink-muted">{hint}</p> : null}
    </div>
  );
}

function UserForm({
  initialKind,
  editing,
  onCancel,
  onSubmit,
}: {
  initialKind: Kind;
  editing?: UnifiedUser;
  onCancel: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void | Promise<void>;
}) {
  const [kind, setKind] = useState<Kind>(initialKind);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/40 p-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-lg rounded-xl border border-line bg-bg-elevated shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h2 className="text-base font-semibold text-ink">{editing ? "Edit user" : "Add user"}</h2>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            className="rounded-lg p-1.5 text-ink-muted hover:bg-bg hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          {!editing ? (
            <Field label="Role">
              <Select name="kind" value={kind} onChange={(e) => setKind(e.target.value as Kind)}>
                <option value="professor">Professor</option>
                <option value="admin">Administrator</option>
              </Select>
            </Field>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="First name">
              <Input name="firstName" required autoFocus defaultValue={editing?.raw.firstName} />
            </Field>
            <Field label="Last name">
              <Input name="lastName" required defaultValue={editing?.raw.lastName} />
            </Field>
          </div>
          {kind === "professor" ? (
            <Field label="Employee number">
              <Input
                name="employeeNumber"
                required
                placeholder="EMP-1001"
                defaultValue={editing?.kind === "professor" ? editing.raw.employeeNumber : ""}
              />
            </Field>
          ) : null}
          <Field label="Email">
            <Input
              name="email"
              type="email"
              required
              placeholder="name@aclc.edu"
              defaultValue={editing?.email}
            />
          </Field>
          {kind === "admin" ? (
            <>
              <Field label={editing?.raw.hasLogin ? "New password (optional)" : "Password"}>
                <Input
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required={!editing || !editing.raw.hasLogin}
                  minLength={12}
                  placeholder={editing?.raw.hasLogin ? "Leave blank to keep current password" : "At least 12 characters"}
                />
              </Field>
              {!editing || !editing.raw.hasLogin ? (
                <p className="-mt-3 text-xs text-ink-muted">This password lets the administrator sign in with their email.</p>
              ) : null}
            </>
          ) : (
            <p className="rounded-lg bg-accent-soft px-3 py-2.5 text-sm text-ink-muted">
              The teacher creates their own password after verifying this email address at <span className="font-medium text-accent">/create-password</span>.
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-line bg-bg/50 px-6 py-3.5">
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">{editing ? "Save changes" : "Add user"}</Button>
        </div>
      </form>
    </div>
  );
}
