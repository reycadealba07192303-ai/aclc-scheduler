import { memo } from "@/backend/cache/memo";
import { StudentEnrollment, Term } from "@/backend/models";

const semesterOrder: Record<string, number> = { "1st Semester": 1, "2nd Semester": 2, Summer: 3 };

/** How long a student's current enrollment is reused on one server instance. */
const ENROLLMENT_CACHE_MS = 60_000;

/**
 * The student's enrollment in their most recent term, or null when they have
 * none. Cached for a minute per student: it changes only when the roster is
 * re-imported, and student pages poll it often.
 */
export function findCurrentEnrollment(studentId: string) {
  return memo(`enrollment:${studentId}`, ENROLLMENT_CACHE_MS, async () => {
    const enrollments = await StudentEnrollment.find({ studentId }).lean();
    if (!enrollments.length) return null;
    const terms = await Term.find({ _id: { $in: enrollments.map((entry) => entry.termId) } }).lean();
    terms.sort((a, b) => b.startYear - a.startYear || semesterOrder[b.semester] - semesterOrder[a.semester]);
    const term = terms[0];
    const enrollment = term && enrollments.find((entry) => String(entry.termId) === String(term._id));
    return term && enrollment ? { term, enrollment } : null;
  });
}
