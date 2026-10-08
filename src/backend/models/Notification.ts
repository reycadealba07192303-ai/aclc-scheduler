import { type InferSchemaType, type Model, Schema, model, models } from "mongoose";

const NOTIFICATION_DAYS = 90;

/**
 * An in-app message for one person, addressed by role and profile ID
 * (Administrator, Teacher, or Student), so it reaches them on any device.
 */
const notificationSchema = new Schema(
  {
    recipientRole: { type: String, enum: ["admin", "teacher", "student"], required: true },
    recipientId: { type: Schema.Types.ObjectId, required: true },
    /** e.g. "schedule", "attendance", "account" — used for the icon. */
    type: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    body: { type: String, default: "", trim: true },
    /** Web path to open, e.g. "/student/attendance". */
    link: { type: String, default: null },
    readAt: { type: Date, default: null },
  },
  { timestamps: true },
);

notificationSchema.index({ recipientRole: 1, recipientId: 1, createdAt: -1 });
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: NOTIFICATION_DAYS * 24 * 60 * 60 });

export type NotificationDoc = InferSchemaType<typeof notificationSchema>;

export const Notification =
  (models.Notification as Model<NotificationDoc>) ?? model<NotificationDoc>("Notification", notificationSchema);
