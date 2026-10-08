import { connectDB } from "@/backend/database/db";
import { RateLimit } from "@/backend/models";

export type LimitRule = { name: string; limit: number; windowSeconds: number };

/** Request limits from systemsecured.md (1.3). */
export const LIMITS = {
  login: { name: "login", limit: 10, windowSeconds: 15 * 60 },
  loginPerIp: { name: "login-ip", limit: 50, windowSeconds: 15 * 60 },
  codeRequest: { name: "code-request", limit: 5, windowSeconds: 60 * 60 },
  codeVerify: { name: "code-verify", limit: 20, windowSeconds: 60 * 60 },
  changePassword: { name: "change-password", limit: 5, windowSeconds: 60 * 60 },
  attendanceWrite: { name: "attendance-write", limit: 120, windowSeconds: 60 },
  api: { name: "api", limit: 300, windowSeconds: 60 },
} satisfies Record<string, LimitRule>;

/** The caller's IP as reported by the host's proxy (Vercel sets x-forwarded-for). */
export function clientIp(headers: Headers) {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "unknown";
}

/**
 * Counts one request against `rule` for `key` in a fixed time window shared by
 * every server instance. Returns a 429 response when over the limit, otherwise
 * null. If the database is unreachable the request is allowed (fail open) so a
 * counter outage never locks everyone out.
 */
export async function rateLimit(rule: LimitRule, key: string): Promise<Response | null> {
  const windowMs = rule.windowSeconds * 1000;
  const windowStart = Math.floor(Date.now() / windowMs) * windowMs;
  const resetAt = windowStart + windowMs;
  try {
    await connectDB();
    const counter = await RateLimit.findOneAndUpdate(
      { key: `${rule.name}:${key.toLowerCase()}:${windowStart}` },
      { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date(resetAt) } },
      { upsert: true, new: true, lean: true },
    );
    if (counter && counter.count > rule.limit) {
      const retryAfter = Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));
      const minutes = Math.ceil(retryAfter / 60);
      return Response.json(
        { error: `Too many attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`, code: "rate_limited" },
        { status: 429, headers: { "Retry-After": String(retryAfter) } },
      );
    }
    return null;
  } catch (error) {
    console.error("Rate limit check failed; allowing request:", error);
    return null;
  }
}
