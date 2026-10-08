import { type InferSchemaType, type Model, Schema, model, models } from "mongoose";

/** Sessions ended by logout. Kept until the token would have expired anyway. */
const revokedSessionSchema = new Schema({
  sessionId: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true },
});

revokedSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type RevokedSessionDoc = InferSchemaType<typeof revokedSessionSchema>;
export const RevokedSession =
  (models.RevokedSession as Model<RevokedSessionDoc>) ?? model<RevokedSessionDoc>("RevokedSession", revokedSessionSchema);
