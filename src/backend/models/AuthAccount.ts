import mongoose, { type InferSchemaType, type Model, Schema, model, models } from "mongoose";

const authAccountSchema = new Schema(
  {
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    role: { type: String, enum: ["admin", "teacher", "student"], required: true },
    passwordHash: { type: String, required: true, select: false },
    authVersion: { type: Number, default: 0, required: true },
    isBootstrapAdmin: { type: Boolean, default: false },
    administratorId: { type: Schema.Types.ObjectId, ref: "Administrator", unique: true, sparse: true },
    teacherId: { type: Schema.Types.ObjectId, ref: "Teacher", unique: true, sparse: true },
    studentId: { type: Schema.Types.ObjectId, ref: "Student", unique: true, sparse: true },
  },
  { timestamps: true },
);

authAccountSchema.index(
  { isBootstrapAdmin: 1 },
  { unique: true, partialFilterExpression: { isBootstrapAdmin: true } },
);

export type AuthAccountDoc = InferSchemaType<typeof authAccountSchema>;

const cachedAuthAccount = models.AuthAccount as Model<AuthAccountDoc> | undefined;
if (
  process.env.NODE_ENV === "development" &&
  cachedAuthAccount &&
  !cachedAuthAccount.schema.path("studentId")
) {
  mongoose.deleteModel("AuthAccount");
}

export const AuthAccount =
  (models.AuthAccount as Model<AuthAccountDoc>) ?? model<AuthAccountDoc>("AuthAccount", authAccountSchema);
