import { type InferSchemaType, type Model, Schema, model, models } from "mongoose";
import { ACCOUNT_STATUSES } from "@/shared/constants";

const teacherSchema = new Schema(
  {
    employeeNumber: { type: String, required: true, unique: true, trim: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    status: { type: String, enum: ACCOUNT_STATUSES, default: "active" },
  },
  { timestamps: true },
);

export type TeacherDoc = InferSchemaType<typeof teacherSchema>;

export const Teacher =
  (models.Teacher as Model<TeacherDoc>) ?? model<TeacherDoc>("Teacher", teacherSchema);
