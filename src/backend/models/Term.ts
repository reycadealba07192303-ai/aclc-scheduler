import { type InferSchemaType, type Model, Schema, model, models } from "mongoose";
import { SEMESTERS } from "@/shared/constants";

const termSchema = new Schema(
  {
    /** Start year; 2026 represents A.Y. 2026–2027. */
    startYear: { type: Number, required: true, min: 2000, max: 2100 },
    semester: { type: String, enum: SEMESTERS, required: true },
  },
  { timestamps: true },
);

termSchema.index({ startYear: 1, semester: 1 }, { unique: true });

export type TermDoc = InferSchemaType<typeof termSchema>;

export const Term = (models.Term as Model<TermDoc>) ?? model<TermDoc>("Term", termSchema);
