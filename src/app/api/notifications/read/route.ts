import { z } from "zod";
import { getCurrentUser } from "@/backend/auth/auth";
import { Notification } from "@/backend/models";
import { notificationRecipient } from "@/backend/services/notifications";

const readSchema = z.union([
  z.object({ all: z.literal(true) }),
  z.object({ ids: z.array(z.string().regex(/^[a-f\d]{24}$/i)).min(1).max(100) }),
]);

/** Marks the user's own notifications read: `{ all: true }` or `{ ids: [...] }`. */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "Sign in to continue." }, { status: 401 });
    const parsed = readSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return Response.json({ error: "Choose notifications to mark as read." }, { status: 400 });
    const recipient = notificationRecipient(user);
    if (!recipient) return Response.json({ ok: true });
    await Notification.updateMany(
      { ...recipient, readAt: null, ...("ids" in parsed.data ? { _id: { $in: parsed.data.ids } } : {}) },
      { $set: { readAt: new Date() } },
    );
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Notification read update failed:", error);
    return Response.json({ error: "Could not update notifications." }, { status: 500 });
  }
}
