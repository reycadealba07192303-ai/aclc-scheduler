import { z } from "zod";
import { requireRole } from "@/backend/auth/auth";
import { connectDB } from "@/backend/database/db";
import { AuditEvent } from "@/backend/models";

const PAGE_SIZE = 50;
const querySchema = z.object({
  category: z.enum(["schedule", "roster", "setup", "attendance", "account"]).optional(),
  before: z.coerce.date().optional(),
});

/** The audit log, newest first, 50 at a time; `before` pages back in time. */
export async function GET(request: Request) {
  const auth = await requireRole("admin");
  if (auth.response) return auth.response;
  const params = new URL(request.url).searchParams;
  const parsed = querySchema.safeParse({
    category: params.get("category") ?? undefined,
    before: params.get("before") ?? undefined,
  });
  if (!parsed.success) return Response.json({ error: "Invalid filter." }, { status: 400 });
  try {
    await connectDB();
    const { category, before } = parsed.data;
    const events = await AuditEvent.find({
      ...(category ? { category } : {}),
      ...(before ? { createdAt: { $lt: before } } : {}),
    }).sort({ createdAt: -1 }).limit(PAGE_SIZE + 1).lean();
    return Response.json({
      hasMore: events.length > PAGE_SIZE,
      events: events.slice(0, PAGE_SIZE).map((event) => ({
        id: String(event._id),
        category: event.category,
        action: event.action,
        summary: event.summary,
        actorName: event.actorName,
        actorRole: event.actorRole,
        createdAt: event.createdAt,
      })),
    });
  } catch (error) {
    console.error("Activity log load failed:", error);
    return Response.json({ error: "Could not load the activity log." }, { status: 500 });
  }
}
