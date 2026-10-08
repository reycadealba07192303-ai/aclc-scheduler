import { describe, expect, it } from "vitest";
import { issueStudentAttendanceToken, verifyStudentAttendanceToken } from "@/backend/services/attendance-qr";
import { attendanceWindow, checkInStatus, lateCutoffMinutes, minutesLabel } from "@/backend/services/attendance-status";

const ph = (iso: string) => new Date(`${iso}+08:00`);
const EIGHT_AM = 8 * 60;

describe("late rule (15 minutes after the later of class start and attendance opening)", () => {
  it("is present up to 15 minutes after the scheduled start", () => {
    expect(checkInStatus(ph("2026-10-05T08:10:00"), ph("2026-10-05T07:55:00"), EIGHT_AM)).toBe("present");
    expect(checkInStatus(ph("2026-10-05T08:15:00"), ph("2026-10-05T07:55:00"), EIGHT_AM)).toBe("present");
  });

  it("is late after the cutoff", () => {
    expect(checkInStatus(ph("2026-10-05T08:16:00"), ph("2026-10-05T07:55:00"), EIGHT_AM)).toBe("late");
  });

  it("counts from when attendance opened if the teacher opened it late", () => {
    expect(lateCutoffMinutes(ph("2026-10-05T08:30:00"), EIGHT_AM)).toBe(8 * 60 + 45);
    expect(checkInStatus(ph("2026-10-05T08:40:00"), ph("2026-10-05T08:30:00"), EIGHT_AM)).toBe("present");
    expect(checkInStatus(ph("2026-10-05T08:46:00"), ph("2026-10-05T08:30:00"), EIGHT_AM)).toBe("late");
  });

  it("is late on a later day", () => {
    expect(checkInStatus(ph("2026-10-06T07:00:00"), ph("2026-10-05T07:55:00"), EIGHT_AM)).toBe("late");
  });

  it("formats cutoff times", () => {
    expect(minutesLabel(8 * 60 + 15)).toBe("8:15 AM");
    expect(minutesLabel(13 * 60)).toBe("1:00 PM");
  });
});

describe("attendance window (from 15 minutes before class until it ends, in Philippine time)", () => {
  // Tuesday 8:00–11:30 AM; stored day 1 = Tuesday. 6 October 2026 is a Tuesday.
  const tuesdayClass = { dayOfWeek: 1, startMinutes: 480, endMinutes: 690 };

  it.each([
    ["2026-10-06T07:44:00", false],
    ["2026-10-06T07:45:00", true],
    ["2026-10-06T10:00:00", true],
    ["2026-10-06T11:29:00", true],
    ["2026-10-06T11:30:00", false],
    ["2026-10-07T09:00:00", false],
  ])("at %s open = %s", (iso, open) => {
    expect(attendanceWindow(tuesdayClass, ph(iso)).open).toBe(open);
  });

  it("explains when attendance opens", () => {
    expect(attendanceWindow(tuesdayClass, ph("2026-10-07T09:00:00")).message).toContain("Tuesday 8:00 AM–11:30 AM (from 7:45 AM)");
  });
});

const SESSION = "6ac626b0f1dc13f39fa4a086";
const STUDENT = "6ac4876e9e4b06bd7a249c8f";

describe("student QR tokens", () => {
  it("are valid only within their 10-second window", () => {
    const issuedAt = Date.UTC(2026, 9, 6, 0, 0, 0);
    const token = issueStudentAttendanceToken(SESSION, STUDENT, issuedAt);
    expect(verifyStudentAttendanceToken(token, issuedAt + 5_000)).toEqual({ sessionId: SESSION, studentId: STUDENT });
    expect(verifyStudentAttendanceToken(token, issuedAt + 10_000)).toBeNull();
  });

  it("reject tampered tokens", () => {
    const now = Date.now();
    const token = issueStudentAttendanceToken(SESSION, STUDENT, now);
    expect(verifyStudentAttendanceToken(`${token.slice(0, -2)}xx`, now)).toBeNull();
  });
});
