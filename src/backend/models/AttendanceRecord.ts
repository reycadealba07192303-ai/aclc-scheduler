import mongoose, { type InferSchemaType, type Model, Schema, model, models } from "mongoose";

const attendanceRecordSchema = new Schema(
  {
    sessionId: { type: Schema.Types.ObjectId, ref: "AttendanceSession", required: true },
    termId: { type: Schema.Types.ObjectId, ref: "Term", required: true, index: true },
    sectionId: { type: Schema.Types.ObjectId, ref: "Section", required: true, index: true },
    subjectId: { type: Schema.Types.ObjectId, ref: "Subject", required: true },
    teacherId: { type: Schema.Types.ObjectId, ref: "Teacher", required: true },
    studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true, index: true },
    checkedInAt: { type: Date, required: true, default: Date.now },
    status: { type: String, enum: ["present", "late"], default: "present", required: true },
    /** "qr" when the teacher scanned the student's code; "manual" when the teacher set it by hand. */
    source: { type: String, enum: ["qr", "manual"], default: "qr", required: true },
  },
  { timestamps: true },
);

attendanceRecordSchema.index({ sessionId: 1, studentId: 1 }, { unique: true });
attendanceRecordSchema.index({ studentId: 1, termId: 1, checkedInAt: -1 });

export type AttendanceRecordDoc = InferSchemaType<typeof attendanceRecordSchema>;
const cachedAttendanceRecord = models.AttendanceRecord as Model<AttendanceRecordDoc> | undefined;
if (process.env.NODE_ENV === "development" && cachedAttendanceRecord && !cachedAttendanceRecord.schema.path("source")) mongoose.deleteModel("AttendanceRecord");
export const AttendanceRecord =
  (models.AttendanceRecord as Model<AttendanceRecordDoc>) ?? model<AttendanceRecordDoc>("AttendanceRecord", attendanceRecordSchema);
