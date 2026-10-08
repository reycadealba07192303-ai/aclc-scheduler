import { requireRole } from "@/backend/auth/auth";

/*
 * Ownership rules in one place (systemsecured.md 1.2). MongoDB has no row-level
 * security, so every teacher or student query must be filtered to the signed-in
 * person's own records. These helpers return a guaranteed profile ID and a
 * ready-made filter, and refuse the request when the account isn't linked to a
 * profile. A missing ID must never reach a query: MongoDB ignores an undefined
 * filter value, which would match everyone's records.
 */

const notLinked = (who: string) =>
  Response.json({ error: `This account is not linked to a ${who} profile.` }, { status: 403 });

export async function requireTeacher() {
  const auth = await requireRole("teacher");
  if (auth.response) return { response: auth.response } as const;
  const teacherId = auth.user.teacherId;
  if (!teacherId) return { response: notLinked("teacher") } as const;
  return { response: null, user: auth.user, teacherId, scope: { teacherId } } as const;
}

export async function requireStudent() {
  const auth = await requireRole("student");
  if (auth.response) return { response: auth.response } as const;
  const studentId = auth.user.studentId;
  if (!studentId) return { response: notLinked("student") } as const;
  return { response: null, user: auth.user, studentId, scope: { studentId } } as const;
}
