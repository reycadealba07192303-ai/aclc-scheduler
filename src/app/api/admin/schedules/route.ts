import { ClassSchedule } from "@/backend/models";
import { connectDB } from "@/backend/database/db";
import { saveScheduleDraft, ScheduleRequestError, serializeSchedule } from "@/backend/services/schedule-service";
import { requireRole } from "@/backend/auth/auth";
import { notifyScheduleChange } from "@/backend/services/notifications";

export async function GET() {
  const auth = await requireRole("admin");
  if (auth.response) return auth.response;
  try {
    await connectDB();
    const items = await ClassSchedule.find().sort({ dayOfWeek: 1, startMinutes: 1 }).lean();
    return Response.json({
      items: items.map((item) => serializeSchedule(item as unknown as Parameters<typeof serializeSchedule>[0])),
    });
  } catch (error) {
    console.error("Schedule load failed:", error);
    return Response.json({ error: "Could not load schedule data from the database." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireRole("admin");
  if (auth.response) return auth.response;
  try {
    await connectDB();
    const item = await saveScheduleDraft(await request.json());
    await notifyScheduleChange(null, await ClassSchedule.findById(item.id).lean());
    return Response.json({ item }, { status: 201 });
  } catch (error) {
    if (error instanceof ScheduleRequestError) {
      return Response.json({ error: error.message, conflicts: error.conflicts }, { status: error.status });
    }
    console.error("Schedule create failed:", error);
    return Response.json({ error: "Could not save the schedule slot." }, { status: 500 });
  }
}
