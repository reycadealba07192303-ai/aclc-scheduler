import { type InferSchemaType, type Model, Schema, model, models } from "mongoose";

const roomSchema = new Schema(
  {
    /** e.g. "Comlab 1" */
    name: { type: String, required: true, trim: true },
    building: { type: String, required: true, trim: true },
    capacity: { type: Number, required: true, min: 1 },
  },
  { timestamps: true },
);

// The same room name may exist in different buildings.
roomSchema.index({ name: 1, building: 1 }, { unique: true });

export type RoomDoc = InferSchemaType<typeof roomSchema>;

export const Room = (models.Room as Model<RoomDoc>) ?? model<RoomDoc>("Room", roomSchema);
