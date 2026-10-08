import type { Types } from "mongoose";
import { Administrator, Notification, Room, Section, StudentEnrollment, Subject } from "@/backend/models";
import type { AuthenticatedUser } from "@/shared/types";

type Role = "admin" | "teacher" | "student";
type Id = string | Types.ObjectId;
export type NotificationPayload = { type: string; title: string; body?: string; link?: string };

/** Who a signed-in user is for notifications: their role and profile ID. */
export function notificationRecipient(user: AuthenticatedUser) {
  const id = user.role === "admin" ? user.administratorId : user.role === "teacher" ? user.teacherId : user.studentId;
  return id ? { recipientRole: user.role, recipientId: id } : null;
}

/**
 * Sends one notification to each recipient. Never throws: a failed
 * notification must not undo the action that triggered it.
 */
export async function notify(role: Role, recipientIds: Id[], payload: NotificationPayload) {
  const ids = [...new Set(recipientIds.map(String))];
  if (!ids.length) return;
  try {
    await Notification.insertMany(ids.map((recipientId) => ({
      recipientRole: role,
      recipientId,
      type: payload.type,
      title: payload.title,
      body: payload.body ?? "",
      link: payload.link ?? null,
    })));
  } catch (error) {
    console.error("Notification delivery failed:", error);
  }
}

export async function notifyAdmins(payload: NotificationPayload) {
  try {
    const admins = await Administrator.find({ status: "active" }).select("_id").lean();
    await notify("admin", admins.map((admin) => admin._id), payload);
  } catch (error) {
    console.error("Admin notification failed:", error);
  }
}

export async function notifySectionStudents(sectionId: Id, termId: Id, payload: NotificationPayload) {
  try {
    const enrollments = await StudentEnrollment.find({ sectionId, termId }).select("studentId").lean();
    await notify("student", enrollments.map((item) => item.studentId), payload);
  } catch (error) {
    console.error("Section notification failed:", error);
  }
}

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const clock = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  return `${hours % 12 || 12}:${String(minutes % 60).padStart(2, "0")} ${hours >= 12 ? "PM" : "AM"}`;
};

/** Human-readable parts of a stored class schedule document (day 0 = Monday). */
export async function describeClass(slot: {
  sectionId: Id;
  subjectId: Id;
  dayOfWeek: number;
  startMinutes: number;
  endMinutes: number;
  mode: string;
  roomId?: Id | null;
}) {
  const [subject, section, room] = await Promise.all([
    Subject.findById(slot.subjectId).select("code name").lean(),
    Section.findById(slot.sectionId).select("name").lean(),
    slot.roomId ? Room.findById(slot.roomId).select("name").lean() : null,
  ]);
  return {
    subject: subject ? `${subject.code} ${subject.name}` : "A class",
    code: subject?.code ?? "Class",
    section: section?.name ?? "your section",
    when: `${DAY_NAMES[slot.dayOfWeek] ?? ""} ${clock(slot.startMinutes)}–${clock(slot.endMinutes)}`,
    where: slot.mode === "online" ? "Online" : room?.name ?? "Room to be announced",
  };
}

type StoredClass = Parameters<typeof describeClass>[0] & { termId: Id; teacherId: Id };

/**
 * Tells the professor and the section's students when an administrator adds,
 * changes, or removes a class. `before` is the class as it was (update/delete);
 * `after` is the class as saved (create/update).
 */
export async function notifyScheduleChange(before: StoredClass | null, after: StoredClass | null) {
  try {
    if (after && !before) {
      const info = await describeClass(after);
      await Promise.all([
        notify("teacher", [after.teacherId], { type: "schedule", title: `New class: ${info.code} · ${info.section}`, body: `${info.subject} — ${info.when} · ${info.where}`, link: "/teacher" }),
        notifySectionStudents(after.sectionId, after.termId, { type: "schedule", title: `New class added: ${info.code}`, body: `${info.subject} — ${info.when} · ${info.where}`, link: "/student" }),
      ]);
    } else if (before && !after) {
      const info = await describeClass(before);
      await Promise.all([
        notify("teacher", [before.teacherId], { type: "schedule", title: `Class removed: ${info.code} · ${info.section}`, body: `${info.when} is no longer on your schedule.`, link: "/teacher" }),
        notifySectionStudents(before.sectionId, before.termId, { type: "schedule", title: `Class removed: ${info.code}`, body: `${info.subject} on ${info.when} was removed from your schedule.`, link: "/student" }),
      ]);
    } else if (before && after) {
      const [old, now] = await Promise.all([describeClass(before), describeClass(after)]);
      const sameTeacher = String(before.teacherId) === String(after.teacherId);
      const sameSection = String(before.sectionId) === String(after.sectionId);
      await Promise.all([
        notify("teacher", [after.teacherId], sameTeacher
          ? { type: "schedule", title: `Class updated: ${now.code} · ${now.section}`, body: `Now ${now.when} · ${now.where}`, link: "/teacher" }
          : { type: "schedule", title: `New class: ${now.code} · ${now.section}`, body: `${now.subject} — ${now.when} · ${now.where}`, link: "/teacher" }),
        sameTeacher ? null : notify("teacher", [before.teacherId], { type: "schedule", title: `Class reassigned: ${old.code} · ${old.section}`, body: `${old.when} is no longer assigned to you.`, link: "/teacher" }),
        notifySectionStudents(after.sectionId, after.termId, { type: "schedule", title: `Schedule changed: ${now.code}`, body: `${now.subject} is now ${now.when} · ${now.where}`, link: "/student" }),
        sameSection ? null : notifySectionStudents(before.sectionId, before.termId, { type: "schedule", title: `Class removed: ${old.code}`, body: `${old.subject} on ${old.when} was removed from your schedule.`, link: "/student" }),
      ]);
    }
  } catch (error) {
    console.error("Schedule notification failed:", error);
  }
}
