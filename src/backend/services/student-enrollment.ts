import { StudentEnrollment, Term } from "@/backend/models";

const semesterOrder: Record<string, number> = { "1st Semester": 1, "2nd Semester": 2, Summer: 3 };

/** The student's enrollment in their most recent term, or null when they have none. */
export async function findCurrentEnrollment(studentId: string) {
  const enrollments = await StudentEnrollment.find({ studentId }).lean();
  if (!enrollments.length) return null;
  const terms = await Term.find({ _id: { $in: enrollments.map((entry) => entry.termId) } }).lean();
  terms.sort((a, b) => b.startYear - a.startYear || semesterOrder[b.semester] - semesterOrder[a.semester]);
  const term = terms[0];
  const enrollment = term && enrollments.find((entry) => String(entry.termId) === String(term._id));
  return term && enrollment ? { term, enrollment } : null;
}
