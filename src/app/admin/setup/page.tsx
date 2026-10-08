"use client";

import { AddTermModal } from "@/frontend/components/admin/TermSwitcher";
import { Badge } from "@/frontend/components/ui/Badge";
import { Button } from "@/frontend/components/ui/Button";
import { DataTable, EditModal, EmptyCard, RowActions, useToast } from "@/frontend/components/ui/Crud";
import { Field, Input, Select } from "@/frontend/components/ui/Field";
import { PageHeader, Panel } from "@/frontend/components/ui/Page";
import { sortTerms, termLabel, useAcademicStore } from "@/frontend/context/AcademicStore";
import type { Room, Subject, Track } from "@/shared/types";
import { Building2, CalendarRange, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type ModalState = { kind: "subject"; item?: Subject } | { kind: "room"; item?: Room } | null;

export default function SetupPage() {
  const { subjects, rooms, terms, allSections, setActiveTerm, addSubject, updateSubject, deleteSubject, addRoom, updateRoom, deleteRoom, deleteTerm, setupLoading, setupError } = useAcademicStore();
  const router = useRouter();
  const { flash, toast } = useToast();
  const [modal, setModal] = useState<ModalState>(null);
  const [showTermModal, setShowTermModal] = useState(false);

  if (setupLoading) {
    return <div className="rounded-xl border border-line bg-bg-elevated p-8 text-sm text-ink-muted">Loading setup data from the database…</div>;
  }
  if (setupError) {
    return <div role="alert" className="rounded-xl border border-danger/30 bg-danger-soft p-6 text-sm text-danger">
      <p className="font-semibold">Could not connect to the database.</p>
      <p className="mt-1">{setupError}</p>
      <button type="button" onClick={() => window.location.reload()} className="mt-3 font-semibold underline">Try again</button>
    </div>;
  }

  return <div>
    <PageHeader title="Setup" description="Terms, subjects, and rooms save directly to the database. They remain available after refresh." />

    <Panel id="terms" className="mb-5" title="Terms" action={<Button onClick={() => setShowTermModal(true)}><Plus className="h-4 w-4" />New term</Button>}>
      {terms.length ? <DataTable head={["Academic year", "Semester", "Sections", ""]} rows={sortTerms(terms).map((term) => {
        const count = allSections.filter((section) => section.termId === term.id).length;
        return [<span key="year" className="font-semibold">A.Y. {term.startYear}–{term.startYear + 1}</span>, <Badge key="sem" tone="info">{term.semester}</Badge>, count, <RowActions key="actions" onDelete={async () => { if (window.confirm(`Delete ${termLabel(term)} and all its sections and schedules?`)) { try { await deleteTerm(term.id); flash("Term deleted"); } catch (error) { flash(error instanceof Error ? error.message : "Could not delete the term"); } } }}><button type="button" onClick={() => { setActiveTerm(term.id); router.push("/admin/programs"); }} className="rounded px-2 py-1 text-xs font-semibold text-accent hover:bg-accent-soft">Open programs</button></RowActions>];
      })} /> : <EmptyCard icon={<CalendarRange className="h-6 w-6" />} title="No terms yet" text="Create the academic year and semester you want to schedule." action={<Button onClick={() => setShowTermModal(true)}><Plus className="h-4 w-4" />Create term</Button>} />}
    </Panel>

    <Panel className="mb-5" title="Subjects" action={<Button onClick={() => setModal({ kind: "subject" })}><Plus className="h-4 w-4" />Add subject</Button>}>
      {subjects.length ? <DataTable head={["Code", "Subject", "Track", "Units", ""]} maxBodyHeight={400} rows={[...subjects].sort((a, b) => a.code.localeCompare(b.code)).map((subject) => [<span key="code" className="font-semibold text-accent">{subject.code}</span>, subject.name, <Badge key="track" tone={subject.track === "senior_high" ? "warn" : "info"}>{subject.track === "senior_high" ? "Senior High" : "College"}</Badge>, subject.units, <RowActions key="actions" onEdit={() => setModal({ kind: "subject", item: subject })} onDelete={async () => { if (window.confirm(`Delete ${subject.code} and its scheduled classes?`)) { try { await deleteSubject(subject.id); flash("Subject deleted"); } catch (error) { flash(error instanceof Error ? error.message : "Could not delete the subject"); } } }} />])} /> : <p className="py-7 text-center text-sm text-ink-muted">No subjects yet.</p>}
    </Panel>

    <Panel title="Rooms" action={<Button onClick={() => setModal({ kind: "room" })}><Plus className="h-4 w-4" />Add room</Button>}>
      {rooms.length ? <DataTable head={["Room", "Building", "Capacity", ""]} rows={[...rooms].sort((a, b) => a.name.localeCompare(b.name)).map((room) => [<span key="name" className="font-semibold">{room.name}</span>, room.building, room.capacity, <RowActions key="actions" onEdit={() => setModal({ kind: "room", item: room })} onDelete={async () => { if (window.confirm(`Delete ${room.name} and its scheduled classes?`)) { try { await deleteRoom(room.id); flash("Room deleted"); } catch (error) { flash(error instanceof Error ? error.message : "Could not delete the room"); } } }} />])} /> : <EmptyCard icon={<Building2 className="h-6 w-6" />} title="No rooms yet" text="Add classrooms and labs for face-to-face schedules." />}
    </Panel>

    {modal ? <EditModal title={`${modal.item ? "Edit" : "Add"} ${modal.kind}`} onClose={() => setModal(null)} onSubmit={async (fd) => {
      try {
      if (modal.kind === "subject") {
        const data = { code: String(fd.get("code")).trim().toUpperCase(), name: String(fd.get("name")).trim(), units: Number(fd.get("units")), track: String(fd.get("track")) as Track };
        if (subjects.some((item) => item.code === data.code && item.id !== modal.item?.id)) { flash(`${data.code} already exists`); return; }
        if (modal.item) await updateSubject(modal.item.id, data); else await addSubject(data);
        flash(modal.item ? "Subject updated" : "Subject added");
      } else {
        const data = { name: String(fd.get("name")).trim(), building: String(fd.get("building")).trim(), capacity: Number(fd.get("capacity")) };
        if (rooms.some((item) => item.name.toLowerCase() === data.name.toLowerCase() && item.building.toLowerCase() === data.building.toLowerCase() && item.id !== modal.item?.id)) { flash("That room already exists in this building"); return; }
        if (modal.item) await updateRoom(modal.item.id, data); else await addRoom(data);
        flash(modal.item ? "Room updated" : "Room added");
      }
      setModal(null);
      } catch (error) {
        flash(error instanceof Error ? error.message : "Could not save the record.");
      }
    }}>
      {modal.kind === "subject" ? <>
        <Field label="Code"><Input name="code" required autoFocus defaultValue={(modal.item as Subject | undefined)?.code} placeholder="CC 104" /></Field>
        <Field label="Name"><Input name="name" required defaultValue={(modal.item as Subject | undefined)?.name} /></Field>
        <div className="grid grid-cols-2 gap-3"><Field label="Track"><Select name="track" defaultValue={(modal.item as Subject | undefined)?.track ?? "college"}><option value="college">College</option><option value="senior_high">Senior High</option></Select></Field><Field label="Units"><Input name="units" type="number" min="1" max="12" required defaultValue={(modal.item as Subject | undefined)?.units ?? 3} /></Field></div>
      </> : <>
        <Field label="Room name"><Input name="name" required autoFocus defaultValue={(modal.item as Room | undefined)?.name} placeholder="Comlab 1" /></Field>
        <Field label="Building"><Input name="building" required defaultValue={(modal.item as Room | undefined)?.building} placeholder="Main" /></Field>
        <Field label="Capacity"><Input name="capacity" type="number" min="1" required defaultValue={(modal.item as Room | undefined)?.capacity ?? 40} /></Field>
      </>}
    </EditModal> : null}
    {showTermModal ? <AddTermModal onClose={() => setShowTermModal(false)} onCreated={(message) => { flash(message); setShowTermModal(false); }} /> : null}
    {toast}
  </div>;
}
