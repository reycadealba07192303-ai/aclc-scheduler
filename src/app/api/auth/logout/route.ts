import { clearSessionCookie } from "@/backend/auth/auth";

export async function POST() {
  await clearSessionCookie();
  return Response.json({ ok: true });
}
