/** Class times are stored as school-local minutes, so lateness is judged in the school's time zone. */
export const SCHOOL_TIME_ZONE = "Asia/Manila";
/** A check-in this many minutes past the cutoff start counts as late. */
export const LATE_GRACE_MINUTES = 15;

export type CheckInStatus = "present" | "late";

const partsFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: SCHOOL_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** The school-local calendar day (YYYY-MM-DD) and minutes since midnight of an instant. */
function schoolClock(date: Date) {
  const parts = Object.fromEntries(partsFormatter.formatToParts(date).map((part) => [part.type, part.value]));
  return { day: `${parts.year}-${parts.month}-${parts.day}`, minutes: Number(parts.hour) * 60 + Number(parts.minute) };
}

/**
 * Minutes since school-local midnight after which a check-in is late: the
 * scheduled start, or when attendance was opened if that was later, plus the
 * grace period.
 */
export function lateCutoffMinutes(sessionStartedAt: Date, scheduleStartMinutes: number) {
  return Math.max(scheduleStartMinutes, schoolClock(sessionStartedAt).minutes) + LATE_GRACE_MINUTES;
}

export function checkInStatus(checkedInAt: Date, sessionStartedAt: Date, scheduleStartMinutes: number): CheckInStatus {
  const checkIn = schoolClock(checkedInAt);
  if (checkIn.day !== schoolClock(sessionStartedAt).day) return "late";
  return checkIn.minutes > lateCutoffMinutes(sessionStartedAt, scheduleStartMinutes) ? "late" : "present";
}

/** "8:15 AM" for minutes since midnight. */
export function minutesLabel(minutes: number) {
  const hours = Math.floor(minutes / 60) % 24;
  return `${hours % 12 || 12}:${String(minutes % 60).padStart(2, "0")} ${hours >= 12 ? "PM" : "AM"}`;
}

/** Attendance can be opened this many minutes before a class starts. */
export const EARLY_OPEN_MINUTES = 15;
const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const weekdayFormatter = new Intl.DateTimeFormat("en-US", { timeZone: SCHOOL_TIME_ZONE, weekday: "long" });

/**
 * Whether attendance for a class may be opened at `now`: on its scheduled day
 * (stored 0 = Monday), from 15 minutes before it starts until it ends, in
 * school time. `message` explains when it opens otherwise.
 */
export function attendanceWindow(schedule: { dayOfWeek: number; startMinutes: number; endMinutes: number }, now = new Date()) {
  const today = DAY_NAMES.indexOf(weekdayFormatter.format(now));
  const minutes = schoolClock(now).minutes;
  const opensAt = Math.max(0, schedule.startMinutes - EARLY_OPEN_MINUTES);
  const open = today === schedule.dayOfWeek && minutes >= opensAt && minutes < schedule.endMinutes;
  return {
    open,
    message: open
      ? ""
      : `Attendance can only be opened during this class: ${DAY_NAMES[schedule.dayOfWeek]} ${minutesLabel(schedule.startMinutes)}–${minutesLabel(schedule.endMinutes)} (from ${minutesLabel(opensAt)}).`,
  };
}
