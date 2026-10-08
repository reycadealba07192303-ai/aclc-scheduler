import { type InferSchemaType, type Model, Schema, model, models } from "mongoose";
import { TRACKS } from "@/shared/constants";

const subjectSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, trim: true, uppercase: true },
    name: { type: String, required: true, trim: true },
    units: { type: Number, required: true, min: 1, max: 12 },
    track: { type: String, enum: TRACKS, required: true },
  },
  { timestamps: true },
);

export type SubjectDoc = InferSchemaType<typeof subjectSchema>;

export const Subject =
  (models.Subject as Model<SubjectDoc>) ?? model<SubjectDoc>("Subject", subjectSchema);
