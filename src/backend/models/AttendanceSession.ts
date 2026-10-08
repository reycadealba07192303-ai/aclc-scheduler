import mongoose, { type InferSchemaType, type Model, Schema, model, models } from "mongoose";

const attendanceSessionSchema = new Schema(
  {
    scheduleId: { type: Schema.Types.ObjectId, ref: "ClassSchedule", required: true, index: true },
    termId: { type: Schema.Types.ObjectId, ref: "Term", required: true, index: true },
    sectionId: { type: Schema.Types.ObjectId, ref: "Section", required: true, index: true },
    subjectId: { type: Schema.Types.ObjectId, ref: "Subject", required: true },
    teacherId: { type: Schema.Types.ObjectId, ref: "Teacher", required: true, index: true },
    status: { type: String, enum: ["active", "closed"], default: "active", required: true },
    startedAt: { type: Date, required: true, default: Date.now },
    endedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

attendanceSessionSchema.index(
  { scheduleId: 1 },
  { unique: true, partialFilterExpression: { status: "active" } },
);

export type AttendanceSessionDoc = InferSchemaType<typeof attendanceSessionSchema>;
const cachedAttendanceSession = models.AttendanceSession as Model<AttendanceSessionDoc> | undefined;
if (process.env.NODE_ENV === "development" && cachedAttendanceSession && !cachedAttendanceSession.schema.path("scheduleId")) mongoose.deleteModel("AttendanceSession");
export const AttendanceSession =
  (models.AttendanceSession as Model<AttendanceSessionDoc>) ?? model<AttendanceSessionDoc>("AttendanceSession", attendanceSessionSchema);
