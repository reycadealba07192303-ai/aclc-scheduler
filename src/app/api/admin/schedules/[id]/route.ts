import { Types } from "mongoose";
import { ClassSchedule } from "@/backend/models";
import { connectDB } from "@/backend/database/db";
import { saveScheduleDraft, ScheduleRequestError } from "@/backend/services/schedule-service";
import { requireRole } from "@/backend/auth/auth";
import { describeClass, notifyScheduleChange } from "@/backend/services/notifications";
import { audit } from "@/backend/services/audit";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireRole("admin");
  if (auth.response) return auth.response;
  const { id } = await context.params;
  if (!Types.ObjectId.isValid(id)) return Response.json({ error: "Invalid schedule id." }, { status: 400 });
  try {
    await connectDB();
    const before = await ClassSchedule.findById(id).lean();
    const item = await saveScheduleDraft(await request.json(), id);
    const after = await ClassSchedule.findById(id).lean();
    await notifyScheduleChange(before, after);
    if (before && after) {
      const [old, now] = await Promise.all([describeClass(before), describeClass(after)]);
      await audit(auth.user, "schedule", "schedule.update", `Changed ${now.code} · ${now.section}: ${old.when} · ${old.where} → ${now.when} · ${now.where}`, { type: "class", id });
    }
    return Response.json({ item });
  } catch (error) {
    if (error instanceof ScheduleRequestError) {
      return Response.json({ error: error.message, conflicts: error.conflicts }, { status: error.status });
    }
    console.error("Schedule update failed:", error);
    return Response.json({ error: "Could not update the schedule slot." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireRole("admin");
  if (auth.response) return auth.response;
  const { id } = await context.params;
  if (!Types.ObjectId.isValid(id)) return Response.json({ error: "Invalid schedule id." }, { status: 400 });
  try {
    await connectDB();
    const item = await ClassSchedule.findByIdAndDelete(id);
    if (!item) return Response.json({ error: "Schedule slot was not found." }, { status: 404 });
    await notifyScheduleChange(item.toObject(), null);
    const info = await describeClass(item.toObject());
    await audit(auth.user, "schedule", "schedule.delete", `Removed ${info.code} · ${info.section} — ${info.when}`, { type: "class", id });
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Schedule delete failed:", error);
    return Response.json({ error: "Could not delete the schedule slot." }, { status: 500 });
  }
}
