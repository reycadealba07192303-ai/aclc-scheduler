import { type InferSchemaType, type Model, Schema, model, models } from "mongoose";
import { ACCOUNT_STATUSES } from "@/shared/constants";

const administratorSchema = new Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    status: { type: String, enum: ACCOUNT_STATUSES, default: "active" },
  },
  { timestamps: true },
);

export type AdministratorDoc = InferSchemaType<typeof administratorSchema>;

export const Administrator =
  (models.Administrator as Model<AdministratorDoc>) ?? model<AdministratorDoc>("Administrator", administratorSchema);
