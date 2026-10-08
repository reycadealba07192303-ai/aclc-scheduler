import {
  DAY_END_MINUTES,
  DAY_START_MINUTES,
  SLOT_STEP_MINUTES,
} from "@/shared/constants";

/** "08:30" → 510 */
export function toMinutes(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** 510 → "08:30" */
export function toHHMM(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** "13:30" or 810 → "1:30 PM" */
export function formatTime(value: string | number) {
  const minutes = typeof value === "string" ? toMinutes(value) : value;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

/** "13:00", "15:30" → "1:00 PM – 3:30 PM" */
export function formatRange(start: string, end: string) {
  return `${formatTime(start)} – ${formatTime(end)}`;
}

/** Compact range for small spaces: "8:00 – 10:00 AM", but "11:00 AM – 1:00 PM" across noon. */
export function formatRangeShort(start: string, end: string) {
  const a = formatTime(start);
  const b = formatTime(end);
  return a.slice(-2) === b.slice(-2) ? `${a.slice(0, -3)} – ${b}` : `${a} – ${b}`;
}

/** Every 30 minutes from 07:00 to 21:00, as "HH:mm". */
export const TIME_OPTIONS = Array.from(
  { length: (DAY_END_MINUTES - DAY_START_MINUTES) / SLOT_STEP_MINUTES + 1 },
  (_, i) => toHHMM(DAY_START_MINUTES + i * SLOT_STEP_MINUTES),
);

/** A class can start up to 20:30 and end from 07:30. */
export const START_OPTIONS = TIME_OPTIONS.slice(0, -1);
export const END_OPTIONS = TIME_OPTIONS.slice(1);

export { DAY_END_MINUTES, DAY_START_MINUTES, SLOT_STEP_MINUTES };

/** Monday-first week. `id` is the current UI value (JS numbering, 0 = Sunday). */
export const DAY_LABELS = [
  { id: 1, label: "Mon", long: "Monday" },
  { id: 2, label: "Tue", long: "Tuesday" },
  { id: 3, label: "Wed", long: "Wednesday" },
  { id: 4, label: "Thu", long: "Thursday" },
  { id: 5, label: "Fri", long: "Friday" },
  { id: 6, label: "Sat", long: "Saturday" },
  { id: 0, label: "Sun", long: "Sunday" },
] as const;
