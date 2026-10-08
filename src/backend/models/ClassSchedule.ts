import { type InferSchemaType, type Model, Schema, model, models } from "mongoose";
import {
  DAY_END_MINUTES,
  DAY_MAX,
  DAY_MIN,
  DAY_START_MINUTES,
  SCHEDULE_MODES,
} from "@/shared/constants";

// Shape only. Business rules (30-minute steps, end > start, room required for f2f,
// conflicts) are enforced by the API with Zod and lib/schedule-conflict.ts.
const classScheduleSchema = new Schema(
  {
    termId: { type: Schema.Types.ObjectId, ref: "Term", required: true, index: true },
    sectionId: { type: Schema.Types.ObjectId, ref: "Section", required: true },
    subjectId: { type: Schema.Types.ObjectId, ref: "Subject", required: true },
    teacherId: { type: Schema.Types.ObjectId, ref: "Teacher", required: true },
    /** 0 = Monday … 6 = Sunday */
    dayOfWeek: { type: Number, required: true, min: DAY_MIN, max: DAY_MAX },
    startMinutes: { type: Number, required: true, min: DAY_START_MINUTES, max: DAY_END_MINUTES },
    endMinutes: { type: Number, required: true, min: DAY_START_MINUTES, max: DAY_END_MINUTES },
    mode: { type: String, enum: SCHEDULE_MODES, required: true },
    /** Required for f2f, null for online. */
    roomId: { type: Schema.Types.ObjectId, ref: "Room", default: null },
  },
  { timestamps: true },
);

// Conflict checks load one day at a time per room / teacher / section.
classScheduleSchema.index({ termId: 1, dayOfWeek: 1, roomId: 1 });
classScheduleSchema.index({ termId: 1, dayOfWeek: 1, teacherId: 1 });
classScheduleSchema.index({ termId: 1, dayOfWeek: 1, sectionId: 1 });

export type ClassScheduleDoc = InferSchemaType<typeof classScheduleSchema>;

export const ClassSchedule =
  (models.ClassSchedule as Model<ClassScheduleDoc>) ??
  model<ClassScheduleDoc>("ClassSchedule", classScheduleSchema);
