import type {
  AttendanceRecord,
  AttendanceSession,
  ClassInstance,
  Room,
  ScheduleSlot,
  Section,
  SectionSubjectAssignment,
  Student,
  Subject,
  Teacher,
} from "@/types";

export const sections: Section[] = [
  { id: "sec-1", name: "BSIT 3-A", program: "BSIT", yearLevel: "3rd Year" },
  { id: "sec-2", name: "BSIT 3-B", program: "BSIT", yearLevel: "3rd Year" },
  { id: "sec-3", name: "BSCS 2-A", program: "BSCS", yearLevel: "2nd Year" },
  { id: "sec-4", name: "BSIS 4-A", program: "BSIS", yearLevel: "4th Year" },
  { id: "sec-5", name: "STEM 11-A", program: "STEM", yearLevel: "Grade 11" },
];

export const subjects: Subject[] = [
  { id: "sub-1", code: "IT312", name: "Web Systems Integration", units: 3, track: "college" },
  { id: "sub-2", code: "IT313", name: "Mobile Application Development", units: 3, track: "college" },
  { id: "sub-3", code: "IT314", name: "Information Assurance & Security", units: 3, track: "college" },
  { id: "sub-4", code: "CS211", name: "Data Structures", units: 3, track: "college" },
  { id: "sub-5", code: "IS401", name: "Capstone Project 1", units: 3, track: "college" },
  { id: "sub-6", code: "ORALCOM", name: "Oral Communication", units: 3, track: "senior_high" },
];

export const rooms: Room[] = [
  { id: "rm-1", name: "Lab 101", building: "Main", capacity: 40 },
  { id: "rm-2", name: "Lab 102", building: "Main", capacity: 35 },
  { id: "rm-3", name: "Room 201", building: "Annex", capacity: 45 },
  { id: "rm-4", name: "Room 305", building: "Annex", capacity: 50 },
];

export const teachers: Teacher[] = [
  {
    id: "t-1",
    employeeNumber: "EMP-1001",
    firstName: "Maria",
    lastName: "Santos",
    email: "maria.santos@aclc.edu",
    photoUrl: "https://api.dicebear.com/9.x/avataaars/svg?seed=Maria",
    status: "active",
  },
  {
    id: "t-2",
    employeeNumber: "EMP-1002",
    firstName: "Juan",
    lastName: "Dela Cruz",
    email: "juan.delacruz@aclc.edu",
    photoUrl: "https://api.dicebear.com/9.x/avataaars/svg?seed=Juan",
    status: "active",
  },
  {
    id: "t-3",
    employeeNumber: "EMP-1003",
    firstName: "Ana",
    lastName: "Reyes",
    email: "ana.reyes@aclc.edu",
    photoUrl: "https://api.dicebear.com/9.x/avataaars/svg?seed=Ana",
    status: "active",
  },
  {
    id: "t-4",
    employeeNumber: "EMP-1004",
    firstName: "Carlo",
    lastName: "Mendoza",
    email: "carlo.mendoza@aclc.edu",
    photoUrl: "https://api.dicebear.com/9.x/avataaars/svg?seed=Carlo",
    status: "inactive",
  },
];

export const students: Student[] = [
  {
    id: "s-1",
    studentNumber: "2023-0001",
    firstName: "Reyca",
    lastName: "Lopez",
    email: "reyca.lopez@student.aclc.edu",
    sectionId: "sec-1",
    photoUrl: "https://api.dicebear.com/9.x/avataaars/svg?seed=Reyca",
    status: "active",
  },
  {
    id: "s-2",
    studentNumber: "2023-0002",
    firstName: "Miguel",
    lastName: "Torres",
    email: "miguel.torres@student.aclc.edu",
    sectionId: "sec-1",
    photoUrl: "https://api.dicebear.com/9.x/avataaars/svg?seed=Miguel",
    status: "active",
  },
  {
    id: "s-3",
    studentNumber: "2023-0003",
    firstName: "Sofia",
    lastName: "Garcia",
    email: "sofia.garcia@student.aclc.edu",
    sectionId: "sec-1",
    photoUrl: "https://api.dicebear.com/9.x/avataaars/svg?seed=Sofia",
    status: "active",
  },
  {
    id: "s-4",
    studentNumber: "2023-0010",
    firstName: "Leo",
    lastName: "Navarro",
    email: "leo.navarro@student.aclc.edu",
    sectionId: "sec-2",
    photoUrl: "https://api.dicebear.com/9.x/avataaars/svg?seed=Leo",
    status: "active",
  },
  {
    id: "s-5",
    studentNumber: "2024-0042",
    firstName: "Ivy",
    lastName: "Cruz",
    email: "ivy.cruz@student.aclc.edu",
    sectionId: "sec-3",
    photoUrl: "https://api.dicebear.com/9.x/avataaars/svg?seed=Ivy",
    status: "active",
  },
  {
    id: "s-6",
    studentNumber: "2022-0088",
    firstName: "Paolo",
    lastName: "Lim",
    email: "paolo.lim@student.aclc.edu",
    sectionId: "sec-4",
    photoUrl: "https://api.dicebear.com/9.x/avataaars/svg?seed=Paolo",
    status: "inactive",
  },
];

export const sectionAssignments: SectionSubjectAssignment[] = [
  { id: "ssa-1", sectionId: "sec-1", subjectId: "sub-1", teacherId: "t-1" },
  { id: "ssa-2", sectionId: "sec-1", subjectId: "sub-2", teacherId: "t-2" },
  { id: "ssa-3", sectionId: "sec-1", subjectId: "sub-3", teacherId: "t-1" },
  { id: "ssa-4", sectionId: "sec-2", subjectId: "sub-3", teacherId: "t-1" },
  { id: "ssa-5", sectionId: "sec-3", subjectId: "sub-4", teacherId: "t-3" },
  { id: "ssa-6", sectionId: "sec-4", subjectId: "sub-5", teacherId: "t-2" },
];

/** dayOfWeek: 0=Sun, 1=Mon ... 6=Sat */
export const scheduleSlots: ScheduleSlot[] = [
  {
    id: "sch-1",
    dayOfWeek: 1,
    startTime: "08:00",
    endTime: "10:00",
    teacherId: "t-1",
    subjectId: "sub-1",
    sectionId: "sec-1",
    modality: "face_to_face",
    roomId: "rm-1",
  },
  {
    id: "sch-2",
    dayOfWeek: 1,
    startTime: "10:30",
    endTime: "12:30",
    teacherId: "t-2",
    subjectId: "sub-2",
    sectionId: "sec-1",
    modality: "face_to_face",
    roomId: "rm-2",
  },
  {
    id: "sch-3",
    dayOfWeek: 2,
    startTime: "08:00",
    endTime: "10:00",
    teacherId: "t-1",
    subjectId: "sub-3",
    sectionId: "sec-2",
    modality: "face_to_face",
    roomId: "rm-1",
  },
  {
    id: "sch-4",
    dayOfWeek: 3,
    startTime: "13:00",
    endTime: "15:00",
    teacherId: "t-3",
    subjectId: "sub-4",
    sectionId: "sec-3",
    modality: "online",
  },
  {
    id: "sch-5",
    dayOfWeek: 4,
    startTime: "09:00",
    endTime: "11:00",
    teacherId: "t-2",
    subjectId: "sub-5",
    sectionId: "sec-4",
    modality: "face_to_face",
    roomId: "rm-4",
  },
  {
    id: "sch-6",
    dayOfWeek: 5,
    startTime: "08:00",
    endTime: "10:00",
    teacherId: "t-1",
    subjectId: "sub-1",
    sectionId: "sec-1",
    modality: "face_to_face",
    roomId: "rm-1",
  },
  {
    id: "sch-7",
    dayOfWeek: 6,
    startTime: "09:00",
    endTime: "11:00",
    teacherId: "t-2",
    subjectId: "sub-2",
    sectionId: "sec-1",
    modality: "online",
  },
  {
    id: "sch-8",
    dayOfWeek: 0,
    startTime: "13:00",
    endTime: "15:00",
    teacherId: "t-3",
    subjectId: "sub-3",
    sectionId: "sec-1",
    modality: "face_to_face",
    roomId: "rm-3",
  },
];

export const attendanceSessions: AttendanceSession[] = [
  {
    id: "sess-1",
    scheduleId: "sch-1",
    date: "2026-10-05",
    status: "open",
    openedAt: "2026-10-05T07:50:00",
    presentCount: 28,
    lateCount: 3,
    absentCount: 0,
    totalStudents: 38,
  },
  {
    id: "sess-2",
    scheduleId: "sch-3",
    date: "2026-10-04",
    status: "closed",
    openedAt: "2026-10-04T07:48:00",
    closedAt: "2026-10-04T10:05:00",
    presentCount: 30,
    lateCount: 2,
    absentCount: 4,
    totalStudents: 36,
  },
  {
    id: "sess-3",
    scheduleId: "sch-5",
    date: "2026-10-03",
    status: "closed",
    openedAt: "2026-10-03T08:50:00",
    closedAt: "2026-10-03T11:02:00",
    presentCount: 32,
    lateCount: 1,
    absentCount: 5,
    totalStudents: 38,
  },
];

export const attendanceRecords: AttendanceRecord[] = [
  {
    id: "ar-1",
    sessionId: "sess-1",
    studentId: "s-1",
    status: "present",
    scannedAt: "2026-10-05T08:02:00",
  },
  {
    id: "ar-2",
    sessionId: "sess-1",
    studentId: "s-2",
    status: "late",
    scannedAt: "2026-10-05T08:22:00",
  },
  {
    id: "ar-3",
    sessionId: "sess-1",
    studentId: "s-3",
    status: "not_scanned",
  },
  {
    id: "ar-4",
    sessionId: "sess-2",
    studentId: "s-4",
    status: "present",
    scannedAt: "2026-10-04T08:05:00",
  },
  {
    id: "ar-5",
    sessionId: "sess-3",
    studentId: "s-5",
    status: "excused",
    note: "Medical appointment",
  },
];

export const currentStudentId = "s-1";

export function getSectionName(sectionId: string) {
  return sections.find((s) => s.id === sectionId)?.name ?? "—";
}

export function getTeacherName(teacherId: string) {
  const t = teachers.find((x) => x.id === teacherId);
  return t ? `${t.firstName} ${t.lastName}` : "—";
}

export function getSubject(subjectId: string) {
  return subjects.find((s) => s.id === subjectId);
}

export function getRoomName(roomId?: string) {
  if (!roomId) return undefined;
  return rooms.find((r) => r.id === roomId)?.name;
}

export function getSectionPath(sectionId: string) {
  const section = sections.find((s) => s.id === sectionId);
  if (!section) return "—";
  return [section.program, section.yearLevel, section.name].join(" · ");
}

export function getStudentClassesToday(): ClassInstance[] {
  return [
    {
      scheduleId: "sch-1",
      date: "2026-10-05",
      startTime: "08:00",
      endTime: "10:00",
      subjectCode: "IT312",
      subjectName: "Web Systems Integration",
      sectionName: "BSIT 3-A",
      roomName: "Lab 101",
      teacherName: "Maria Santos",
      modality: "face_to_face",
      sessionStatus: "open",
      sessionId: "sess-1",
    },
    {
      scheduleId: "sch-2",
      date: "2026-10-05",
      startTime: "10:30",
      endTime: "12:30",
      subjectCode: "IT313",
      subjectName: "Mobile Application Development",
      sectionName: "BSIT 3-A",
      roomName: "Lab 102",
      teacherName: "Juan Dela Cruz",
      modality: "face_to_face",
      sessionStatus: "upcoming",
    },
  ];
}

export function getStudentWeeklySchedule(): ScheduleSlot[] {
  return scheduleSlots.filter((s) => s.sectionId === "sec-1");
}

export function getAdminTodayClasses(): ClassInstance[] {
  const classes: ClassInstance[] = [
    {
      scheduleId: "sch-1",
      date: "2026-10-05",
      startTime: "08:00",
      endTime: "10:00",
      subjectCode: "IT312",
      subjectName: "Web Systems Integration",
      sectionName: "BSIT 3-A",
      roomName: "Lab 101",
      teacherName: "Maria Santos",
      modality: "face_to_face",
      sessionStatus: "open",
      sessionId: "sess-1",
    },
    {
      scheduleId: "sch-2",
      date: "2026-10-05",
      startTime: "10:30",
      endTime: "12:30",
      subjectCode: "IT313",
      subjectName: "Mobile Application Development",
      sectionName: "BSIT 3-A",
      roomName: "Lab 102",
      teacherName: "Juan Dela Cruz",
      modality: "face_to_face",
      sessionStatus: "upcoming",
    },
    {
      scheduleId: "sch-4",
      date: "2026-10-05",
      startTime: "13:00",
      endTime: "15:00",
      subjectCode: "CS211",
      subjectName: "Data Structures",
      sectionName: "BSCS 2-A",
      teacherName: "Ana Reyes",
      modality: "online",
      sessionStatus: "upcoming",
    },
    {
      scheduleId: "sch-5",
      date: "2026-10-05",
      startTime: "15:30",
      endTime: "17:30",
      subjectCode: "IS401",
      subjectName: "Capstone Project 1",
      sectionName: "BSIS 4-A",
      roomName: "Room 305",
      teacherName: "Juan Dela Cruz",
      modality: "face_to_face",
      sessionStatus: "upcoming",
    },
  ];
  return classes;
}

export const dashboardStats = {
  todayClasses: 12,
  openSessions: 3,
  overallAttendanceRate: 91.4,
  activeStudents: 428,
  activeTeachers: 36,
  ftfToday: 9,
  onlineToday: 3,
  roomsInUse: 7,
  totalRooms: 12,
  sectionsActive: 24,
  weekAttendance: [
    { day: "Mon", rate: 93 },
    { day: "Tue", rate: 89 },
    { day: "Wed", rate: 94 },
    { day: "Thu", rate: 91 },
    { day: "Fri", rate: 88 },
    { day: "Sat", rate: 86 },
    { day: "Sun", rate: 0 },
  ],
  liveSessions: [
    {
      id: "sess-1",
      subjectCode: "IT312",
      subjectName: "Web Systems Integration",
      sectionName: "BSIT 3-A",
      roomName: "Lab 101",
      professor: "Maria Santos",
      openedAt: "2026-10-05T07:50:00",
      presentCount: 28,
      lateCount: 3,
      totalStudents: 38,
    },
    {
      id: "sess-live-2",
      subjectCode: "IT314",
      subjectName: "Info Assurance & Security",
      sectionName: "BSIT 3-B",
      roomName: "Lab 101",
      professor: "Maria Santos",
      openedAt: "2026-10-05T08:05:00",
      presentCount: 22,
      lateCount: 1,
      totalStudents: 36,
    },
    {
      id: "sess-live-3",
      subjectCode: "ORALCOM",
      subjectName: "Oral Communication",
      sectionName: "STEM 11-A",
      roomName: "Room 201",
      professor: "Ana Reyes",
      openedAt: "2026-10-05T08:00:00",
      presentCount: 35,
      lateCount: 2,
      totalStudents: 40,
    },
  ],
};

export const DAY_LABELS = [
  { id: 1, label: "Mon", short: "M" },
  { id: 2, label: "Tue", short: "T" },
  { id: 3, label: "Wed", short: "W" },
  { id: 4, label: "Thu", short: "Th" },
  { id: 5, label: "Fri", short: "F" },
  { id: 6, label: "Sat", short: "Sa" },
  { id: 0, label: "Sun", short: "Su" },
] as const;
