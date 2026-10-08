import { AuthAccount } from "@/backend/models";
import { connectDB } from "@/backend/database/db";

export async function GET() {
  try {
    if (!process.env.AUTH_BOOTSTRAP_KEY || Buffer.from(process.env.AUTH_SECRET ?? "", "base64url").length < 32) {
      return Response.json({ canBootstrap: false });
    }
    await connectDB();
    const hasAdmin = await AuthAccount.exists({ role: "admin" });
    return Response.json({ canBootstrap: !hasAdmin });
  } catch (error) {
    console.error("Bootstrap status check failed:", error);
    return Response.json({ error: "Could not check first-admin setup." }, { status: 500 });
  }
}
