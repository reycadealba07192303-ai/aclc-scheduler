"use client";

import type {
  AdminUser,
  AuthenticatedUser,
  ClassModality,
  Program,
  Room,
  RoomBooking,
  ScheduleSlot,
  Section,
  SectionSubjectAssignment,
  Semester,
  Subject,
  Teacher,
  Term,
  Track,
} from "@/shared/types";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type AcademicState = {
  setupLoading: boolean;
  setupError: string | null;
  currentUser: AuthenticatedUser | null;
  terms: Term[];
  activeTermId: string | null;
  programs: Program[];
  sections: Section[];
  subjects: Subject[];
  rooms: Room[];
  scheduleSlots: ScheduleSlot[];
  roomBookings: RoomBooking[];
  sectionAssignments: SectionSubjectAssignment[];
  teachers: Teacher[];
  admins: AdminUser[];
};

type AcademicStore = Omit<AcademicState, "sections" | "scheduleSlots" | "roomBookings"> & {
  /** The term every page works on. */
  activeTerm: Term | undefined;
  /** Sections of the active term only. */
  sections: Section[];
  /** Classes of the active term only. */
  scheduleSlots: ScheduleSlot[];
  /** Every term — for checks that span terms (e.g. "is this program in use?"). */
  allSections: Section[];
  allScheduleSlots: ScheduleSlot[];
  /** Sanitized FTF occupancy used by Teacher classroom availability. */
  roomBookings: RoomBooking[];

  addTerm: (startYear: number, semester: Semester) => Promise<Term>;
  setActiveTerm: (id: string) => void;
  deleteTerm: (id: string) => Promise<void>;
  /** Copies sections (not classes) from one term into another; skips names that already exist. */
  copySections: (fromTermId: string, toTermId: string) => Promise<number>;

  getSubject: (id: string) => Subject | undefined;
  getRoomName: (id?: string) => string | undefined;
  getTeacherName: (id: string) => string;
  /** Track (Senior High / College) of a section, taken from its program. */
  getSectionTrack: (section: Section) => Track;

  addTeacher: (data: Omit<Teacher, "id" | "hasLogin">) => Promise<Teacher>;
  updateTeacher: (id: string, data: Partial<Omit<Teacher, "id" | "hasLogin">>) => Promise<void>;
  addAdmin: (data: Omit<AdminUser, "id" | "hasLogin">, password: string) => Promise<AdminUser>;
  updateAdmin: (id: string, data: Partial<Omit<AdminUser, "id" | "hasLogin">>, password?: string) => Promise<void>;
  addProgram: (data: Omit<Program, "id">) => Promise<Program>;
  updateProgram: (id: string, data: Partial<Omit<Program, "id">>) => Promise<void>;
  deleteProgram: (id: string) => Promise<void>;
  /** Adds a section to the active term. Returns null when no term is active. */
  addSection: (data: Omit<Section, "id" | "termId">) => Promise<Section | null>;
  updateSection: (id: string, data: Partial<Omit<Section, "id" | "termId">>) => Promise<void>;
  deleteSection: (id: string) => Promise<void>;
  addSubject: (data: Omit<Subject, "id">) => Promise<Subject>;
  updateSubject: (id: string, data: Partial<Omit<Subject, "id">>) => Promise<void>;
  deleteSubject: (id: string) => Promise<void>;
  addRoom: (data: Omit<Room, "id">) => Promise<Room>;
  updateRoom: (id: string, data: Partial<Omit<Room, "id">>) => Promise<void>;
  deleteRoom: (id: string) => Promise<void>;
  addScheduleSlot: (
    slot: Omit<ScheduleSlot, "id">,
  ) => Promise<{ ok: true; slot: ScheduleSlot } | { ok: false; conflicts: string[] }>;
  updateScheduleSlot: (
    id: string,
    slot: Omit<ScheduleSlot, "id">,
  ) => Promise<{ ok: true; slot: ScheduleSlot } | { ok: false; conflicts: string[] }>;
  deleteScheduleSlot: (id: string) => Promise<void>;
  upsertAssignment: (sectionId: string, subjectId: string, teacherId: string) => void;
};

const AcademicContext = createContext<AcademicStore | null>(null);

async function setupRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof result.error === "string" ? result.error : "Could not save setup data.");
  }
  return result as T;
}

const newId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

async function scheduleRequest<T>(url: string, init: RequestInit): Promise<{ item: T } | { conflicts: string[] }> {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init.headers },
  });
  const result = await response.json().catch(() => ({}));
  if (response.status === 409) {
    return { conflicts: Array.isArray(result.conflicts) ? result.conflicts : [String(result.error ?? "Schedule conflict detected.")] };
  }
  if (!response.ok) {
    throw new Error(typeof result.error === "string" ? result.error : "Could not save the schedule slot.");
  }
  return result as { item: T };
}

function assignmentsFromSchedules(slots: ScheduleSlot[]): SectionSubjectAssignment[] {
  const assignments = new Map<string, SectionSubjectAssignment>();
  for (const slot of slots) {
    const key = `${slot.sectionId}:${slot.subjectId}`;
    assignments.set(key, {
      id: `assignment-${slot.sectionId}-${slot.subjectId}`,
      sectionId: slot.sectionId,
      subjectId: slot.subjectId,
      teacherId: slot.teacherId,
    });
  }
  return [...assignments.values()];
}

const SEMESTER_ORDER: Record<Semester, number> = {
  "1st Semester": 1,
  "2nd Semester": 2,
  Summer: 3,
};

/** "A.Y. 2026–2027 · 1st Semester" */
export function termLabel(term: Term | undefined, short = false) {
  if (!term) return "No term";
  const sem = short ? term.semester.replace(" Semester", " Sem") : term.semester;
  return `A.Y. ${term.startYear}–${term.startYear + 1} · ${sem}`;
}

/** Newest first. */
export function sortTerms(terms: Term[]) {
  return [...terms].sort(
    (a, b) =>
      b.startYear - a.startYear || SEMESTER_ORDER[b.semester] - SEMESTER_ORDER[a.semester],
  );
}

export function AcademicProvider({ children }: { children: ReactNode }) {
  // Everything starts empty: the admin enters real data.
  const [state, setState] = useState<AcademicState>({
    setupLoading: true,
    setupError: null,
    currentUser: null,
    terms: [],
    activeTermId: null,
    programs: [],
    sections: [],
    subjects: [],
    rooms: [],
    scheduleSlots: [],
    roomBookings: [],
    sectionAssignments: [],
    teachers: [],
    admins: [],
  });

  useEffect(() => {
    let cancelled = false;
    async function loadPortal() {
      const sessionResponse = await fetch("/api/auth/session", { cache: "no-store" });
      if (sessionResponse.status === 401) {
        if (cancelled) return;
        setState((prev) => ({ ...prev, setupLoading: false, setupError: null, currentUser: null }));
        return;
      }
      const sessionResult = await sessionResponse.json();
      if (!sessionResponse.ok || !sessionResult.user) throw new Error(sessionResult.error ?? "Could not verify your account.");
      const currentUser = sessionResult.user as AuthenticatedUser;
      if (currentUser.role === "student") {
        if (cancelled) return;
        setState((prev) => ({ ...prev, currentUser, setupLoading: false, setupError: null }));
        return;
      }
      const data: {
        terms: Term[];
        programs: Program[];
        subjects: Subject[];
        rooms: Room[];
        teachers: Teacher[];
        admins: AdminUser[];
        sections: Section[];
        schedules: ScheduleSlot[];
        roomBookings: RoomBooking[];
      } = currentUser.role === "admin"
        ? await Promise.all([
            setupRequest<{ terms: Term[]; programs: Program[]; subjects: Subject[]; rooms: Room[]; teachers: Teacher[]; admins: AdminUser[]; sections: Section[] }>("/api/admin/setup"),
            setupRequest<{ items: ScheduleSlot[] }>("/api/admin/schedules"),
          ]).then(([setup, schedules]) => ({ ...setup, schedules: schedules.items, roomBookings: [] }))
        : await setupRequest<{ terms: Term[]; programs: Program[]; subjects: Subject[]; rooms: Room[]; teachers: Teacher[]; admins: AdminUser[]; sections: Section[]; schedules: ScheduleSlot[]; roomBookings: RoomBooking[] }>("/api/teacher/portal");

      if (cancelled) return;
      const { terms, programs, subjects, rooms, teachers, admins, sections, schedules: scheduleSlots, roomBookings } = data;
        const preferredId = window.localStorage.getItem("aclc-active-term");
        const activeTermId = terms.some((term) => term.id === preferredId)
          ? preferredId
          : sortTerms(terms)[0]?.id ?? null;
        setState((prev) => ({
          ...prev,
          currentUser,
          terms,
          programs,
          activeTermId,
          subjects,
          rooms,
          teachers,
          admins,
          sections,
          scheduleSlots,
          roomBookings,
          sectionAssignments: assignmentsFromSchedules(scheduleSlots),
          setupLoading: false,
          setupError: null,
        }));
    }

    loadPortal().catch((error: unknown) => {
        if (cancelled) return;
        setState((prev) => ({
          ...prev,
          setupLoading: false,
          setupError: error instanceof Error ? error.message : "Could not load setup data.",
        }));
      });
    return () => { cancelled = true; };
  }, []);

  // ---- terms ----
  const addTerm = useCallback(async (startYear: number, semester: Semester) => {
    const { item: term } = await setupRequest<{ item: Term }>("/api/admin/setup/terms", {
      method: "POST",
      body: JSON.stringify({ startYear, semester }),
    });
    setState((prev) => ({ ...prev, terms: [...prev.terms, term], activeTermId: term.id }));
    window.localStorage.setItem("aclc-active-term", term.id);
    return term;
  }, []);

  const setActiveTerm = useCallback((id: string) => {
    setState((prev) => ({ ...prev, activeTermId: id }));
    window.localStorage.setItem("aclc-active-term", id);
  }, []);

  const deleteTerm = useCallback(async (id: string) => {
    await setupRequest(`/api/admin/setup/terms/${id}`, { method: "DELETE" });
    setState((prev) => {
      const secIds = prev.sections.filter((s) => s.termId === id).map((s) => s.id);
      const terms = prev.terms.filter((t) => t.id !== id);
      const activeTermId = prev.activeTermId === id ? (sortTerms(terms)[0]?.id ?? null) : prev.activeTermId;
      if (activeTermId) window.localStorage.setItem("aclc-active-term", activeTermId);
      else window.localStorage.removeItem("aclc-active-term");
      return {
        ...prev,
        terms,
        activeTermId,
        sections: prev.sections.filter((s) => s.termId !== id),
        scheduleSlots: prev.scheduleSlots.filter((s) => !secIds.includes(s.sectionId)),
        sectionAssignments: prev.sectionAssignments.filter((a) => !secIds.includes(a.sectionId)),
      };
    });
  }, []);

  const copySections = useCallback(
    async (fromTermId: string, toTermId: string) => {
      const existing = new Set(
        state.sections.filter((s) => s.termId === toTermId).map((s) => s.name.toLowerCase()),
      );
      const sources = state.sections.filter((s) => s.termId === fromTermId && !existing.has(s.name.toLowerCase()));
      const copies = await Promise.all(sources.map(async (section) => {
        const { item } = await setupRequest<{ item: Section }>("/api/admin/setup/sections", {
          method: "POST",
          body: JSON.stringify({ name: section.name, program: section.program, yearLevel: section.yearLevel, termId: toTermId }),
        });
        return item;
      }));
      if (copies.length > 0) {
        setState((prev) => ({ ...prev, sections: [...prev.sections, ...copies] }));
      }
      return copies.length;
    },
    [state.sections],
  );

  // ---- people ----
  const addTeacher = useCallback(async (data: Omit<Teacher, "id" | "hasLogin">) => {
    const { item: teacher } = await setupRequest<{ item: Teacher }>("/api/admin/setup/teachers", {
      method: "POST",
      body: JSON.stringify(data),
    });
    setState((prev) => ({ ...prev, teachers: [...prev.teachers, teacher] }));
    return teacher;
  }, []);

  const updateTeacher = useCallback(async (id: string, data: Partial<Omit<Teacher, "id" | "hasLogin">>) => {
    const { item: teacher } = await setupRequest<{ item: Teacher }>(`/api/admin/setup/teachers/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
    setState((prev) => ({
      ...prev,
      teachers: prev.teachers.map((t) => (t.id === id ? teacher : t)),
    }));
  }, []);

  const addAdmin = useCallback(async (data: Omit<AdminUser, "id" | "hasLogin">, password: string) => {
    const { item: admin } = await setupRequest<{ item: AdminUser }>("/api/admin/setup/admins", {
      method: "POST",
      body: JSON.stringify({ ...data, password }),
    });
    setState((prev) => ({ ...prev, admins: [...prev.admins, admin] }));
    return admin;
  }, []);

  const updateAdmin = useCallback(async (id: string, data: Partial<Omit<AdminUser, "id" | "hasLogin">>, password?: string) => {
    const { item: admin } = await setupRequest<{ item: AdminUser }>(`/api/admin/setup/admins/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ ...data, ...(password ? { password } : {}) }),
    });
    setState((prev) => ({
      ...prev,
      admins: prev.admins.map((a) => (a.id === id ? admin : a)),
    }));
  }, []);

  // ---- programs ----
  const addProgram = useCallback(async (data: Omit<Program, "id">) => {
    const { item: program } = await setupRequest<{ item: Program }>("/api/admin/setup/programs", {
      method: "POST",
      body: JSON.stringify(data),
    });
    setState((prev) => ({ ...prev, programs: [...prev.programs, program] }));
    return program;
  }, []);

  // Sections store the program code, so a renamed code follows along.
  const updateProgram = useCallback(async (id: string, data: Partial<Omit<Program, "id">>) => {
    const { item } = await setupRequest<{ item: Program }>(`/api/admin/setup/programs/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
    setState((prev) => {
      const old = prev.programs.find((p) => p.id === id);
      const renamed = old && data.code && data.code !== old.code;
      return {
        ...prev,
        programs: prev.programs.map((p) => (p.id === id ? item : p)),
        sections: renamed
          ? prev.sections.map((s) => (s.program === old.code ? { ...s, program: data.code! } : s))
          : prev.sections,
      };
    });
  }, []);

  const deleteProgram = useCallback(async (id: string) => {
    await setupRequest(`/api/admin/setup/programs/${id}`, { method: "DELETE" });
    setState((prev) => ({ ...prev, programs: prev.programs.filter((p) => p.id !== id) }));
  }, []);

  // ---- sections ----
  const addSection = useCallback(
    async (data: Omit<Section, "id" | "termId">) => {
      if (!state.activeTermId) return null;
      const { item: section } = await setupRequest<{ item: Section }>("/api/admin/setup/sections", {
        method: "POST",
        body: JSON.stringify({ ...data, termId: state.activeTermId }),
      });
      setState((prev) => ({ ...prev, sections: [...prev.sections, section] }));
      return section;
    },
    [state.activeTermId],
  );

  const updateSection = useCallback(
    async (id: string, data: Partial<Omit<Section, "id" | "termId">>) => {
      const { item: section } = await setupRequest<{ item: Section }>(`/api/admin/setup/sections/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
      setState((prev) => ({
        ...prev,
        sections: prev.sections.map((s) => (s.id === id ? section : s)),
      }));
    },
    [],
  );

  const deleteSection = useCallback(async (id: string) => {
    await setupRequest(`/api/admin/setup/sections/${id}`, { method: "DELETE" });
    setState((prev) => ({
      ...prev,
      sections: prev.sections.filter((s) => s.id !== id),
      scheduleSlots: prev.scheduleSlots.filter((s) => s.sectionId !== id),
      sectionAssignments: prev.sectionAssignments.filter((a) => a.sectionId !== id),
    }));
  }, []);

  // ---- subjects ----
  const addSubject = useCallback(async (data: Omit<Subject, "id">) => {
    const { item: subject } = await setupRequest<{ item: Subject }>("/api/admin/setup/subjects", {
      method: "POST",
      body: JSON.stringify(data),
    });
    setState((prev) => ({ ...prev, subjects: [...prev.subjects, subject] }));
    return subject;
  }, []);

  const updateSubject = useCallback(async (id: string, data: Partial<Omit<Subject, "id">>) => {
    const { item } = await setupRequest<{ item: Subject }>(`/api/admin/setup/subjects/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
    setState((prev) => ({
      ...prev,
      subjects: prev.subjects.map((subject) => (subject.id === id ? item : subject)),
    }));
  }, []);

  const deleteSubject = useCallback(async (id: string) => {
    await setupRequest(`/api/admin/setup/subjects/${id}`, { method: "DELETE" });
    setState((prev) => ({
      ...prev,
      subjects: prev.subjects.filter((s) => s.id !== id),
      scheduleSlots: prev.scheduleSlots.filter((s) => s.subjectId !== id),
      sectionAssignments: prev.sectionAssignments.filter((a) => a.subjectId !== id),
    }));
  }, []);

  // ---- rooms ----
  const addRoom = useCallback(async (data: Omit<Room, "id">) => {
    const { item: room } = await setupRequest<{ item: Room }>("/api/admin/setup/rooms", {
      method: "POST",
      body: JSON.stringify(data),
    });
    setState((prev) => ({ ...prev, rooms: [...prev.rooms, room] }));
    return room;
  }, []);

  const updateRoom = useCallback(async (id: string, data: Partial<Omit<Room, "id">>) => {
    const { item } = await setupRequest<{ item: Room }>(`/api/admin/setup/rooms/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
    setState((prev) => ({
      ...prev,
      rooms: prev.rooms.map((room) => (room.id === id ? item : room)),
    }));
  }, []);

  // Face-to-face classes booked in a deleted room go with it.
  const deleteRoom = useCallback(async (id: string) => {
    await setupRequest(`/api/admin/setup/rooms/${id}`, { method: "DELETE" });
    setState((prev) => ({
      ...prev,
      rooms: prev.rooms.filter((r) => r.id !== id),
      scheduleSlots: prev.scheduleSlots.filter((s) => s.roomId !== id),
    }));
  }, []);

  // ---- lookups ----
  const getRoomName = useCallback(
    (id?: string) => state.rooms.find((r) => r.id === id)?.name,
    [state.rooms],
  );

  const getSubject = useCallback(
    (id: string) => state.subjects.find((s) => s.id === id),
    [state.subjects],
  );

  const getTeacherName = useCallback(
    (id: string) => {
      const t = state.teachers.find((x) => x.id === id);
      return t ? `${t.firstName} ${t.lastName}` : "—";
    },
    [state.teachers],
  );

  const getSectionTrack = useCallback(
    (section: Section): Track =>
      state.programs.find((p) => p.code === section.program)?.track ?? "college",
    [state.programs],
  );

  // ---- schedule ----
  const addScheduleSlot = useCallback(async (draft: Omit<ScheduleSlot, "id">) => {
    const result = await scheduleRequest<ScheduleSlot>("/api/admin/schedules", {
      method: "POST",
      body: JSON.stringify(draft),
    });
    if ("conflicts" in result) return { ok: false as const, conflicts: result.conflicts };
    const slot = result.item;
    setState((prev) => {
      const scheduleSlots = [slot, ...prev.scheduleSlots];
      return { ...prev, scheduleSlots, sectionAssignments: assignmentsFromSchedules(scheduleSlots) };
    });
    return { ok: true as const, slot };
  }, []);

  const updateScheduleSlot = useCallback(async (id: string, draft: Omit<ScheduleSlot, "id">) => {
    const result = await scheduleRequest<ScheduleSlot>(`/api/admin/schedules/${id}`, {
      method: "PATCH",
      body: JSON.stringify(draft),
    });
    if ("conflicts" in result) return { ok: false as const, conflicts: result.conflicts };
    const slot = result.item;
    setState((prev) => {
      const scheduleSlots = prev.scheduleSlots.map((entry) => (entry.id === id ? slot : entry));
      return { ...prev, scheduleSlots, sectionAssignments: assignmentsFromSchedules(scheduleSlots) };
    });
    return { ok: true as const, slot };
  }, []);

  const deleteScheduleSlot = useCallback(async (id: string) => {
    await setupRequest(`/api/admin/schedules/${id}`, { method: "DELETE" });
    setState((prev) => ({
      ...prev,
      scheduleSlots: prev.scheduleSlots.filter((s) => s.id !== id),
      sectionAssignments: assignmentsFromSchedules(prev.scheduleSlots.filter((s) => s.id !== id)),
    }));
  }, []);

  const upsertAssignment = useCallback(
    (sectionId: string, subjectId: string, teacherId: string) => {
      setState((prev) => {
        const existing = prev.sectionAssignments.find(
          (a) => a.sectionId === sectionId && a.subjectId === subjectId,
        );
        if (existing) {
          return {
            ...prev,
            sectionAssignments: prev.sectionAssignments.map((a) =>
              a.id === existing.id ? { ...a, teacherId } : a,
            ),
          };
        }
        return {
          ...prev,
          sectionAssignments: [
            { id: newId("ssa"), sectionId, subjectId, teacherId },
            ...prev.sectionAssignments,
          ],
        };
      });
    },
    [],
  );

  const value = useMemo(() => {
    const activeTerm = state.terms.find((t) => t.id === state.activeTermId);
    const sections = state.sections.filter((s) => s.termId === state.activeTermId);
    const sectionIds = new Set(sections.map((s) => s.id));
    const scheduleSlots = state.scheduleSlots.filter((s) => sectionIds.has(s.sectionId));
    const roomBookings = state.roomBookings.filter((booking) => booking.termId === state.activeTermId);
    return {
      ...state,
      activeTerm,
      sections,
      scheduleSlots,
      roomBookings,
      allSections: state.sections,
      allScheduleSlots: state.scheduleSlots,
      addTerm,
      setActiveTerm,
      deleteTerm,
      copySections,
      getSubject,
      getRoomName,
      getTeacherName,
      getSectionTrack,
      addTeacher,
      updateTeacher,
      addAdmin,
      updateAdmin,
      addProgram,
      updateProgram,
      deleteProgram,
      addSection,
      updateSection,
      deleteSection,
      addSubject,
      updateSubject,
      deleteSubject,
      addRoom,
      updateRoom,
      deleteRoom,
      addScheduleSlot,
      updateScheduleSlot,
      deleteScheduleSlot,
      upsertAssignment,
    };
  }, [
    state,
    addTerm,
    setActiveTerm,
    deleteTerm,
    copySections,
    getSubject,
    getRoomName,
    getTeacherName,
    getSectionTrack,
    addTeacher,
    updateTeacher,
    addAdmin,
    updateAdmin,
    addProgram,
    updateProgram,
    deleteProgram,
    addSection,
    updateSection,
    deleteSection,
    addSubject,
    updateSubject,
    deleteSubject,
    addRoom,
    updateRoom,
    deleteRoom,
    addScheduleSlot,
    updateScheduleSlot,
    deleteScheduleSlot,
    upsertAssignment,
  ]);

  return <AcademicContext.Provider value={value}>{children}</AcademicContext.Provider>;
}

export function useAcademicStore() {
  const ctx = useContext(AcademicContext);
  if (!ctx) {
    throw new Error("useAcademicStore must be used within AcademicProvider");
  }
  return ctx;
}

/** Year levels offered per track. A section picks one of these. */
export const LEVEL_OPTIONS: Record<Track, { name: string; order: number }[]> = {
  senior_high: [
    { name: "Grade 11", order: 1 },
    { name: "Grade 12", order: 2 },
  ],
  college: [
    { name: "1st Year", order: 1 },
    { name: "2nd Year", order: 2 },
    { name: "3rd Year", order: 3 },
    { name: "4th Year", order: 4 },
  ],
};

export const SEMESTERS: Semester[] = ["1st Semester", "2nd Semester", "Summer"];

export type { ClassModality };
