import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { GET as sessionDetail } from "@/app/api/teacher/attendance-sessions/[id]/route";
import { POST as closeSession } from "@/app/api/teacher/attendance-sessions/[id]/close/route";
import { POST as markStudent } from "@/app/api/teacher/attendance-sessions/[id]/mark/route";
import { POST as checkIn } from "@/app/api/teacher/attendance-sessions/check-in/route";
import { GET as history } from "@/app/api/teacher/attendance-history/route";
import { GET as studentSessions } from "@/app/api/student/attendance-sessions/route";
import { GET as studentSubject } from "@/app/api/student/attendance/[subjectId]/route";
import { issueStudentAttendanceToken } from "@/backend/services/attendance-qr";
import { actAs } from "../support/context";
import { disconnect, jsonRequest, routeContext, seedSchool } from "../support/seed";

let school: Awaited<ReturnType<typeof seedSchool>>;
beforeAll(async () => { school = await seedSchool(); });
afterAll(disconnect);

const session = () => routeContext({ id: school.ids.sessionA });

describe("teachers only reach their own classes", () => {
  it("another teacher cannot open, mark, or close teacher A's session", async () => {
    actAs(school.tokens.teacherB);
    expect((await sessionDetail(jsonRequest("/x"), session())).status).toBe(404);
    expect((await markStudent(jsonRequest("/x", "POST", { studentId: school.ids.student1, status: "present" }), session())).status).toBe(404);
    expect((await closeSession(jsonRequest("/x", "POST"), session())).status).toBe(404);
  });

  it("another teacher's subject history comes back empty", async () => {
    actAs(school.tokens.teacherB);
    const response = await history(jsonRequest(`/api/teacher/attendance-history?sectionId=${school.ids.section1}&subjectId=${school.ids.subject}`));
    expect(response.status).toBe(200);
    expect((await response.json()).sessions).toEqual([]);
  });

  it("the owner sees only their section's students", async () => {
    actAs(school.tokens.teacherA);
    const response = await sessionDetail(jsonRequest("/x"), session());
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.roster.map((entry: { studentNumber: string }) => entry.studentNumber)).toEqual(["S-001"]);
  });

  it("the owner cannot mark a student from another section", async () => {
    actAs(school.tokens.teacherA);
    const response = await markStudent(jsonRequest("/x", "POST", { studentId: school.ids.student2, status: "present" }), session());
    expect(response.status).toBe(403);
  });
});

describe("QR check-in", () => {
  it("rejects a teacher scanning into someone else's session", async () => {
    actAs(school.tokens.teacherB);
    const token = issueStudentAttendanceToken(school.ids.sessionA, school.ids.student1);
    expect((await checkIn(jsonRequest("/x", "POST", { token }))).status).toBe(409);
  });

  it("rejects a student who isn't in the section", async () => {
    actAs(school.tokens.teacherA);
    const token = issueStudentAttendanceToken(school.ids.sessionA, school.ids.student2);
    expect((await checkIn(jsonRequest("/x", "POST", { token }))).status).toBe(403);
  });

  it("records an enrolled student once", async () => {
    actAs(school.tokens.teacherA);
    const first = await checkIn(jsonRequest("/x", "POST", { token: issueStudentAttendanceToken(school.ids.sessionA, school.ids.student1) }));
    expect(first.status).toBe(201);
    const second = await checkIn(jsonRequest("/x", "POST", { token: issueStudentAttendanceToken(school.ids.sessionA, school.ids.student1) }));
    expect(second.status).toBe(409);
  });
});

describe("students only see their own section", () => {
  it("sees open attendance for their own section only", async () => {
    actAs(school.tokens.student1);
    expect((await (await studentSessions()).json()).sessions).toHaveLength(1);
    actAs(school.tokens.student2);
    expect((await (await studentSessions()).json()).sessions).toHaveLength(0);
  });

  it("subject attendance lists only their section's sessions", async () => {
    actAs(school.tokens.student2);
    const response = await studentSubject(jsonRequest("/x"), routeContext({ subjectId: school.ids.subject }));
    expect(response.status).toBe(200);
    expect((await response.json()).sessions).toEqual([]);
  });
});
