import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { POST as changePassword } from "@/app/api/auth/change-password/route";
import { POST as login } from "@/app/api/auth/login/route";
import { POST as logout } from "@/app/api/auth/logout/route";
import { GET as profile } from "@/app/api/profile/route";
import { POST as openAttendance } from "@/app/api/teacher/attendance-sessions/route";
import { actAs } from "../support/context";
import { PASSWORD, disconnect, jsonRequest, seedSchool } from "../support/seed";

let school: Awaited<ReturnType<typeof seedSchool>>;
beforeAll(async () => { school = await seedSchool(); });
afterAll(disconnect);

const signIn = (identifier: string, password: string, client: "web" | "mobile" = "mobile") =>
  login(jsonRequest("/api/auth/login", "POST", { identifier, password, client }));

describe("sign-in rate limit", () => {
  it("blocks the 11th attempt within 15 minutes with Retry-After", async () => {
    actAs(null, "10.9.9.9");
    for (let attempt = 1; attempt <= 10; attempt += 1) {
      expect((await signIn("nobody@test.edu", "wrong password")).status).toBe(401);
    }
    const blocked = await signIn("nobody@test.edu", "wrong password");
    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers.get("Retry-After"))).toBeGreaterThan(0);
  });

  it("does not affect other people", async () => {
    actAs(null, "10.8.8.8");
    expect((await signIn("teacher.b@test.edu", PASSWORD)).status).toBe(200);
  });
});

describe("sessions", () => {
  it("logout makes the token unusable", async () => {
    actAs(null, "10.7.7.7");
    const { token } = await (await signIn("teacher.b@test.edu", PASSWORD)).json();
    actAs(token);
    expect((await profile()).status).toBe(200);
    await logout();
    expect((await profile()).status).toBe(401);
  });

  it("changing the password signs out other sessions and keeps this one", async () => {
    actAs(school.tokens.student1);
    const response = await changePassword(jsonRequest("/x", "POST", { currentPassword: PASSWORD, newPassword: "a brand new long password" }));
    expect(response.status).toBe(200);
    const { token } = await response.json();
    actAs(school.tokens.student1);
    expect((await profile()).status).toBe(401);
    actAs(token);
    expect((await profile()).status).toBe(200);
  });

  it("rejects a wrong current password", async () => {
    actAs(school.tokens.admin);
    const response = await changePassword(jsonRequest("/x", "POST", { currentPassword: "not my password", newPassword: "another long password here" }));
    expect(response.status).toBe(400);
  });
});

describe("attendance can only be opened during class time", () => {
  it("refuses outside the scheduled day and time", async () => {
    actAs(school.tokens.teacherB);
    const response = await openAttendance(jsonRequest("/x", "POST", { scheduleId: school.ids.scheduleB }));
    expect(response.status).toBe(409);
    expect((await response.json()).code).toBe("outside_schedule");
  });
});
