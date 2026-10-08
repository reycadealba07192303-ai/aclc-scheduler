import { z } from "zod";

const objectId = z.string().regex(/^[a-f\d]{24}$/i);
const hhmm = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/);

export const scheduleInputSchema = z.object({
  sectionId: objectId,
  subjectId: objectId,
  teacherId: objectId,
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: hhmm,
  endTime: hhmm,
  modality: z.enum(["face_to_face", "online"]),
  roomId: objectId.optional(),
});
