export type AccountStatus = "active" | "inactive";
export type AuthRole = "admin" | "teacher" | "student";

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: AuthRole;
  name: string;
  administratorId?: string;
  teacherId?: string;
  studentId?: string;
  studentNumber?: string;
}

export type ClassModality = "face_to_face" | "online";

export type Track = "senior_high" | "college";

export type Semester = "1st Semester" | "2nd Semester" | "Summer";

/** One academic year + semester, e.g. A.Y. 2026–2027 · 1st Semester. */
export interface Term {
  id: string;
  /** 2026 for A.Y. 2026–2027 */
  startYear: number;
  semester: Semester;
}

export interface Teacher {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  status: AccountStatus;
  hasLogin?: boolean;
  passwordSetupPending?: boolean;
}

export interface AdminUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: AccountStatus;
  hasLogin?: boolean;
}

/** A class section for one term. The same name can exist again in another term. */
export interface Section {
  id: string;
  termId: string;
  name: string;
  /** Program code, e.g. BSIT */
  program: string;
  /** e.g. "3rd Year" or "Grade 11" */
  yearLevel: string;
}

export interface Program {
  id: string;
  code: string;
  name: string;
  track: Track;
  curriculum?: ProgramCurriculumCourse[];
}

export interface ProgramCurriculumCourse {
  code: string;
  yearLevel: string;
  semester: "1st Semester" | "2nd Semester";
  prerequisite: string;
}

export interface Subject {
  id: string;
  code: string;
  name: string;
  units: number;
  track: Track;
}

export interface Room {
  id: string;
  name: string;
  building: string;
  capacity: number;
}

/** Professor assigned to a subject within a section */
export interface SectionSubjectAssignment {
  id: string;
  sectionId: string;
  subjectId: string;
  teacherId: string;
}

/** A class. Its term comes from its section. */
export interface ScheduleSlot {
  id: string;
  sectionId: string;
  subjectId: string;
  teacherId: string;
  dayOfWeek: number; // 0=Sun ... 6=Sat
  startTime: string; // HH:mm
  endTime: string;
  modality: ClassModality;
  /** Required when modality is face_to_face */
  roomId?: string;
}

/** Minimal classroom occupancy data exposed to the Teacher portal. */
export interface RoomBooking {
  id: string;
  termId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  roomId?: string;
}
