import { type InferSchemaType, type Model, Schema, model, models } from "mongoose";
import { TRACKS, YEAR_LEVELS } from "@/shared/constants";

const CURRICULUM_YEAR_LEVELS = [...YEAR_LEVELS.college, ...YEAR_LEVELS.senior_high];
const curriculumCourseSchema = new Schema(
  {
    code: { type: String, required: true, trim: true, uppercase: true },
    yearLevel: { type: String, enum: CURRICULUM_YEAR_LEVELS, required: true },
    semester: { type: String, enum: ["1st Semester", "2nd Semester"], required: true },
    prerequisite: { type: String, trim: true, default: "" },
  },
  { _id: false },
);

const programSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, trim: true, uppercase: true },
    name: { type: String, required: true, trim: true },
    track: { type: String, enum: TRACKS, required: true },
    curriculum: { type: [curriculumCourseSchema], default: [] },
  },
  { timestamps: true },
);

export type ProgramDoc = InferSchemaType<typeof programSchema>;

export const Program =
  (models.Program as Model<ProgramDoc>) ?? model<ProgramDoc>("Program", programSchema);
