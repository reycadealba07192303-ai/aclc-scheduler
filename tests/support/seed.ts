import mongoose from "mongoose";
import { createSessionToken, hashPassword } from "@/backend/auth/auth";
import { connectDB } from "@/backend/database/db";
import {
  Administrator,
  AttendanceSession,
  AuthAccount,
  ClassSchedule,
  Program,
  Room,
  Section,
  Student,
  StudentEnrollment,
  Subject,
  Teacher,
  Term,
} from "@/backend/models";

export const PASSWORD = "correct horse battery staple";

/** Stored day (0 = Monday) that is never today in school time, so attendance windows are closed. */
export function notTodaySchoolDay() {
  const today = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Manila", weekday: "long" }).format(new Date());
  const index = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].indexOf(today);
  return (index + 3) % 7;
}

/**
 * Empties the test database and creates a small school:
 * an admin, two teachers (A teaches section 1, B teaches section 2), and one
 * student in each section, each with a sign-in account and a session token.
 */
export async function seedSchool() {
  await connectDB();
  await mongoose.connection.db!.dropDatabase();
  // Dropping the database also drops its indexes. Rebuild them (and wait) before
  // seeding, because rules such as "one check-in per student" rely on unique indexes.
  await Promise.all(Object.values(mongoose.connection.models).map((model) => model.createIndexes()));

  const term = await Term.create({ startYear: 2026, semester: "1st Semester" });
  const program = await Program.create({ code: "BSIS", name: "BS Information Systems", track: "college" });
  const [section1, section2] = await Section.create([
    { termId: term._id, programId: program._id, name: "BSIS A1", yearLevel: "1st Year" },
    { termId: term._id, programId: program._id, name: "BSIS B1", yearLevel: "1st Year" },
  ]);
  const subject = await Subject.create({ code: "GE6114", name: "Mathematics in the Modern World", units: 3, track: "college" });
  const room = await Room.create({ name: "COMLAB 1", building: "MAIN", capacity: 40 });

  const admin = await Administrator.create({ firstName: "Ada", lastName: "Admin", email: "admin@test.edu" });
  const [teacherA, teacherB] = await Teacher.create([
    { employeeNumber: "T-001", firstName: "Tess", lastName: "Alpha", email: "teacher.a@test.edu", status: "active" },
    { employeeNumber: "T-002", firstName: "Tom", lastName: "Beta", email: "teacher.b@test.edu", status: "active" },
  ]);
  const [student1, student2] = await Student.create([
    { studentNumber: "S-001", name: "ONE, STUDENT", email: "student.1@test.edu", status: "active" },
    { studentNumber: "S-002", name: "TWO, STUDENT", email: "student.2@test.edu", status: "active" },
  ]);
  await StudentEnrollment.create([
    { studentId: student1._id, termId: term._id, sectionId: section1._id },
    { studentId: student2._id, termId: term._id, sectionId: section2._id },
  ]);

  const day = notTodaySchoolDay();
  const [scheduleA, scheduleB] = await ClassSchedule.create([
    { termId: term._id, sectionId: section1._id, subjectId: subject._id, teacherId: teacherA._id, dayOfWeek: day, startMinutes: 480, endMinutes: 600, mode: "f2f", roomId: room._id },
    { termId: term._id, sectionId: section2._id, subjectId: subject._id, teacherId: teacherB._id, dayOfWeek: day, startMinutes: 600, endMinutes: 720, mode: "online" },
  ]);
  const sessionA = await AttendanceSession.create({
    scheduleId: scheduleA._id, termId: term._id, sectionId: section1._id, subjectId: subject._id, teacherId: teacherA._id, status: "active", startedAt: new Date(),
  });

  const passwordHash = await hashPassword(PASSWORD);
  const accounts = await AuthAccount.create([
    { email: "admin@test.edu", role: "admin", passwordHash, administratorId: admin._id },
    { email: "teacher.a@test.edu", role: "teacher", passwordHash, teacherId: teacherA._id },
    { email: "teacher.b@test.edu", role: "teacher", passwordHash, teacherId: teacherB._id },
    { email: "student.1@test.edu", role: "student", passwordHash, studentId: student1._id },
    { email: "student.2@test.edu", role: "student", passwordHash, studentId: student2._id },
  ]);
  const [adminToken, teacherAToken, teacherBToken, student1Token, student2Token] = await Promise.all(accounts.map((account) => createSessionToken(account)));

  return {
    ids: {
      term: String(term._id), section1: String(section1._id), section2: String(section2._id), subject: String(subject._id),
      teacherA: String(teacherA._id), teacherB: String(teacherB._id), student1: String(student1._id), student2: String(student2._id),
      scheduleA: String(scheduleA._id), scheduleB: String(scheduleB._id), sessionA: String(sessionA._id),
    },
    tokens: { admin: adminToken, teacherA: teacherAToken, teacherB: teacherBToken, student1: student1Token, student2: student2Token },
  };
}

export async function disconnect() {
  await mongoose.disconnect();
}

/** Route context with every dynamic segment the API uses. */
export function routeContext(params: Record<string, string> = {}) {
  const id = "0123456789abcdef01234567";
  return { params: Promise.resolve({ id, resource: "rooms", subjectId: id, sessionId: id, sectionId: id, ...params }) };
}

export function jsonRequest(url: string, method = "GET", body?: unknown) {
  return new Request(`http://localhost${url}`, {
    method,
    headers: { "content-type": "application/json" },
    ...(body === undefined || method === "GET" ? {} : { body: JSON.stringify(body) }),
  });
}
