import mongoose, { type InferSchemaType, type Model, Schema, model, models } from "mongoose";

const attendanceSessionSchema = new Schema(
  {
    scheduleId: { type: Schema.Types.ObjectId, ref: "ClassSchedule", required: true },
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

// At most one open session per class. Explicitly named: an unnamed plain
// `scheduleId` index would get the same automatic name ("scheduleId_1"), and
// MongoDB would silently keep whichever was created first. Lookups by class
// always filter on status "active", so this index serves them too.
attendanceSessionSchema.index(
  { scheduleId: 1 },
  { name: "one_active_session_per_class", unique: true, partialFilterExpression: { status: "active" } },
);

// History pages: a teacher's sessions by date, and one subject's sessions in a section.
attendanceSessionSchema.index({ teacherId: 1, startedAt: -1 });
attendanceSessionSchema.index({ sectionId: 1, subjectId: 1, startedAt: -1 });

export type AttendanceSessionDoc = InferSchemaType<typeof attendanceSessionSchema>;
const cachedAttendanceSession = models.AttendanceSession as Model<AttendanceSessionDoc> | undefined;
if (process.env.NODE_ENV === "development" && cachedAttendanceSession && !cachedAttendanceSession.schema.path("scheduleId")) mongoose.deleteModel("AttendanceSession");
export const AttendanceSession =
  (models.AttendanceSession as Model<AttendanceSessionDoc>) ?? model<AttendanceSessionDoc>("AttendanceSession", attendanceSessionSchema);
