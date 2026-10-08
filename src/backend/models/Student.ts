import mongoose, { type InferSchemaType, type Model, Schema, model, models } from "mongoose";

const studentSchema = new Schema(
  {
    studentNumber: { type: String, required: true, trim: true, uppercase: true, unique: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true, unique: true, sparse: true },
    rosterEmail: { type: String, trim: true, lowercase: true },
    status: { type: String, enum: ["active", "inactive"], default: "active", required: true },
  },
  { timestamps: true },
);

export type StudentDoc = InferSchemaType<typeof studentSchema>;

const cachedStudent = models.Student as Model<StudentDoc> | undefined;
if (process.env.NODE_ENV === "development" && cachedStudent && !cachedStudent.schema.path("rosterEmail")) {
  mongoose.deleteModel("Student");
}

export const Student =
  (models.Student as Model<StudentDoc>) ?? model<StudentDoc>("Student", studentSchema);
