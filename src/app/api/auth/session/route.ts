import { getCurrentUser } from "@/backend/auth/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ user: null }, { status: 401 });
    return Response.json({ user });
  } catch (error) {
    console.error("Session lookup failed:", error);
    return Response.json({ error: "Could not load the signed-in account." }, { status: 500 });
  }
}
