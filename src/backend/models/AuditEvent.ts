import { type InferSchemaType, type Model, Schema, model, models } from "mongoose";

const AUDIT_DAYS = 365;

/** One recorded change: who did it, what kind, and a readable summary. Kept for a year. */
const auditEventSchema = new Schema(
  {
    actorRole: { type: String, enum: ["admin", "teacher", "student", "system"], required: true },
    /** Sign-in account ID; null for actions without a signed-in user (e.g. account setup). */
    actorAccountId: { type: Schema.Types.ObjectId, default: null },
    actorName: { type: String, required: true, trim: true },
    category: { type: String, enum: ["schedule", "roster", "setup", "attendance", "account"], required: true },
    /** Machine-readable verb, e.g. "schedule.update" or "attendance.mark". */
    action: { type: String, required: true, trim: true },
    summary: { type: String, required: true, trim: true },
    targetType: { type: String, default: null },
    targetId: { type: String, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

auditEventSchema.index({ createdAt: -1 });
auditEventSchema.index({ category: 1, createdAt: -1 });
auditEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: AUDIT_DAYS * 24 * 60 * 60 });

export type AuditEventDoc = InferSchemaType<typeof auditEventSchema>;
export const AuditEvent = (models.AuditEvent as Model<AuditEventDoc>) ?? model<AuditEventDoc>("AuditEvent", auditEventSchema);
