import { type InferSchemaType, type Model, Schema, model, models } from "mongoose";

const studentEnrollmentSchema = new Schema(
  {
    studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true, index: true },
    termId: { type: Schema.Types.ObjectId, ref: "Term", required: true, index: true },
    sectionId: { type: Schema.Types.ObjectId, ref: "Section", required: true, index: true },
  },
  { timestamps: true },
);

// A student can belong to only one section in a given academic term.
studentEnrollmentSchema.index({ studentId: 1, termId: 1 }, { unique: true });
studentEnrollmentSchema.index({ sectionId: 1, termId: 1 });

export type StudentEnrollmentDoc = InferSchemaType<typeof studentEnrollmentSchema>;

export const StudentEnrollment =
  (models.StudentEnrollment as Model<StudentEnrollmentDoc>) ??
  model<StudentEnrollmentDoc>("StudentEnrollment", studentEnrollmentSchema);
