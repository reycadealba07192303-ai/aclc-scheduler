import { createHmac, timingSafeEqual } from "node:crypto";

export const QR_TOKEN_SECONDS = 10;

function secretKey() {
  const secret = process.env.AUTH_SECRET;
  const key = secret ? Buffer.from(secret, "base64url") : Buffer.alloc(0);
  if (key.length < 32) throw new Error("AUTH_SECRET must contain at least 32 random bytes.");
  return key;
}

function signature(value: string) {
  return createHmac("sha256", secretKey()).update(`aclc-attendance:${value}`).digest("base64url");
}

export function issueStudentAttendanceToken(sessionId: string, studentId: string, now = Date.now()) {
  const tick = Math.floor(now / (QR_TOKEN_SECONDS * 1000));
  const payload = `student.${sessionId}.${studentId}.${tick}`;
  return `${payload}.${signature(payload)}`;
}

export function verifyStudentAttendanceToken(token: string, now = Date.now()) {
  const [audience, sessionId, studentId, tickValue, submittedSignature, extra] = token.split(".");
  if (audience !== "student" || !/^[a-f\d]{24}$/i.test(sessionId ?? "") || !/^[a-f\d]{24}$/i.test(studentId ?? "") || !tickValue || !submittedSignature || extra !== undefined) return null;
  const tick = Number(tickValue);
  if (!Number.isSafeInteger(tick) || tick !== Math.floor(now / (QR_TOKEN_SECONDS * 1000))) return null;
  const payload = `student.${sessionId}.${studentId}.${tick}`;
  const expected = Buffer.from(signature(payload));
  const submitted = Buffer.from(submittedSignature);
  if (expected.length !== submitted.length || !timingSafeEqual(expected, submitted)) return null;
  return { sessionId, studentId };
}

export function tokenExpiry(now = Date.now()) {
  return (Math.floor(now / (QR_TOKEN_SECONDS * 1000)) + 1) * QR_TOKEN_SECONDS * 1000;
}
