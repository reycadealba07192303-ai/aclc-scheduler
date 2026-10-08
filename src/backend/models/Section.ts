import { type InferSchemaType, type Model, Schema, model, models } from "mongoose";
import { YEAR_LEVELS } from "@/shared/constants";

const ALL_YEAR_LEVELS = [...YEAR_LEVELS.college, ...YEAR_LEVELS.senior_high];

const sectionSchema = new Schema(
  {
    termId: { type: Schema.Types.ObjectId, ref: "Term", required: true, index: true },
    /** e.g. "BSIT 3A" */
    name: { type: String, required: true, trim: true },
    programId: { type: Schema.Types.ObjectId, ref: "Program", required: true, index: true },
    /** Must belong to the program's track; enforced by the API (Zod). */
    yearLevel: { type: String, enum: ALL_YEAR_LEVELS, required: true },
  },
  { timestamps: true },
);

// A section name can recur in a later term, but not twice in the same term.
sectionSchema.index({ termId: 1, name: 1 }, { unique: true });
sectionSchema.index({ termId: 1, programId: 1, yearLevel: 1 });

export type SectionDoc = InferSchemaType<typeof sectionSchema>;

export const Section =
  (models.Section as Model<SectionDoc>) ?? model<SectionDoc>("Section", sectionSchema);
