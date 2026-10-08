import { getCurrentUser } from "@/backend/auth/auth";
import { Notification } from "@/backend/models";
import { notificationRecipient } from "@/backend/services/notifications";

const PAGE_SIZE = 30;

/** The signed-in user's latest notifications and how many are unread. Works for every role. */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "Sign in to continue." }, { status: 401 });
    const recipient = notificationRecipient(user);
    if (!recipient) return Response.json({ notifications: [], unread: 0 });
    const [items, unread] = await Promise.all([
      Notification.find(recipient).sort({ createdAt: -1 }).limit(PAGE_SIZE).lean(),
      Notification.countDocuments({ ...recipient, readAt: null }),
    ]);
    return Response.json({
      unread,
      notifications: items.map((item) => ({
        id: String(item._id),
        type: item.type,
        title: item.title,
        body: item.body,
        link: item.link,
        read: Boolean(item.readAt),
        createdAt: item.createdAt,
      })),
    });
  } catch (error) {
    console.error("Notifications load failed:", error);
    return Response.json({ error: "Could not load notifications." }, { status: 500 });
  }
}
