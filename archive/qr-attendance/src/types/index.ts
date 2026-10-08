export type AccountStatus = "active" | "inactive";

export type AttendanceStatus =
  | "present"
  | "late"
  | "absent"
  | "excused"
  | "not_scanned";

export type SessionStatus = "upcoming" | "open" | "closed" | "done";

export type ClassModality = "face_to_face" | "online";

export type Track = "senior_high" | "college";

export interface Student {
  id: string;
  studentNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  sectionId: string;
  photoUrl: string;
  status: AccountStatus;
}

export interface Teacher {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  photoUrl: string;
  status: AccountStatus;
}

export interface Section {
  id: string;
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

export interface AttendanceSession {
  id: string;
  scheduleId: string;
  date: string;
  status: "open" | "closed";
  openedAt: string;
  closedAt?: string;
  presentCount: number;
  lateCount: number;
  absentCount: number;
  totalStudents: number;
}

export interface AttendanceRecord {
  id: string;
  sessionId: string;
  studentId: string;
  status: AttendanceStatus;
  scannedAt?: string;
  note?: string;
}

export interface ClassInstance {
  scheduleId: string;
  date: string;
  startTime: string;
  endTime: string;
  subjectCode: string;
  subjectName: string;
  sectionName: string;
  roomName?: string;
  teacherName: string;
  modality: ClassModality;
  sessionStatus: SessionStatus;
  sessionId?: string;
}
