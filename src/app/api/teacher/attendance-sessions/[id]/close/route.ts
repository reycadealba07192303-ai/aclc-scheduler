import { z } from "zod";
import { requireRole } from "@/backend/auth/auth";
import { connectDB } from "@/backend/database/db";
import { AttendanceSession } from "@/backend/models";

const idSchema = z.string().regex(/^[a-f\d]{24}$/i);

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireRole("teacher");
  if (auth.response) return auth.response;
  const { id } = await context.params;
  if (!idSchema.safeParse(id).success) return Response.json({ error: "Invalid attendance session ID." }, { status: 400 });
  try {
    await connectDB();
    const session = await AttendanceSession.findOneAndUpdate(
      { _id: id, teacherId: auth.user.teacherId, status: "active" },
      { $set: { status: "closed", endedAt: new Date() } },
      { new: true },
    ).select("_id status endedAt").lean();
    if (!session) return Response.json({ error: "This active session was not found." }, { status: 404 });
    return Response.json({ ok: true, endedAt: session.endedAt });
  } catch (error) {
    console.error("Teacher attendance session close failed:", error);
    return Response.json({ error: "Could not close this attendance session." }, { status: 500 });
  }
}
