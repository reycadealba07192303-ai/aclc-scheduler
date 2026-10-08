import mongoose, { type InferSchemaType, type Model, Schema, model, models } from "mongoose";

const passwordSetupTokenSchema = new Schema(
  {
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    purpose: { type: String, enum: ["setup", "reset"], default: "setup", required: true },
    accountId: { type: Schema.Types.ObjectId, ref: "AuthAccount" },
    teacherId: { type: Schema.Types.ObjectId, ref: "Teacher" },
    studentId: { type: Schema.Types.ObjectId, ref: "Student" },
    codeHash: { type: String, required: true, select: false },
    attempts: { type: Number, default: 0, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

passwordSetupTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type PasswordSetupTokenDoc = InferSchemaType<typeof passwordSetupTokenSchema>;

// Next dev can keep a compiled Mongoose model after schema edits. Refresh this
// model when its persisted OTP purpose field is missing from the cached schema.
const cachedPasswordSetupToken = models.PasswordSetupToken as Model<PasswordSetupTokenDoc> | undefined;
if (process.env.NODE_ENV === "development" && cachedPasswordSetupToken && !cachedPasswordSetupToken.schema.path("purpose")) {
  mongoose.deleteModel("PasswordSetupToken");
}

export const PasswordSetupToken =
  (models.PasswordSetupToken as Model<PasswordSetupTokenDoc>) ??
  model<PasswordSetupTokenDoc>("PasswordSetupToken", passwordSetupTokenSchema);
