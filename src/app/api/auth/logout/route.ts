import { clearSessionCookie, revokeCurrentSession } from "@/backend/auth/auth";

export async function POST() {
  try {
    await revokeCurrentSession();
  } catch (error) {
    // Still sign the browser out even if the revocation record can't be saved.
    console.error("Session revocation failed:", error);
  }
  await clearSessionCookie();
  return Response.json({ ok: true });
}
