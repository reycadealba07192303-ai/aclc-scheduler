import "server-only";

import nodemailer from "nodemailer";

function smtpTransport() {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  // Google displays App Passwords in four-character groups; accept pasted spaces.
  const password = process.env.SMTP_PASSWORD?.replace(/\s+/g, "");
  const from = process.env.SMTP_FROM?.trim();
  const port = Number(process.env.SMTP_PORT ?? 587);
  if (!host || !user || !password || !from || !Number.isInteger(port) || port < 1 || port > 65535) {
    return null;
  }
  return {
    from,
    transport: nodemailer.createTransport({
      host,
      port,
      secure: process.env.SMTP_SECURE === "true",
      auth: { user, pass: password },
    }),
  };
}

export function isSmtpConfigured() {
  return smtpTransport() !== null;
}

export async function sendTeacherSetupCode(email: string, code: string) {
  const config = smtpTransport();
  if (!config) throw new Error("SMTP is not configured.");
  await config.transport.sendMail({
    from: config.from,
    to: email,
    subject: "Your ACLC Scheduler verification code",
    text: `Your ACLC Scheduler verification code is ${code}. It expires in 10 minutes. If you did not request an account setup or password reset, ignore this email.`,
    html: `<p>Your ACLC Scheduler verification code is:</p><p style="font-size:24px;font-weight:700;letter-spacing:4px">${code}</p><p>This code expires in 10 minutes. If you did not request an account setup or password reset, ignore this email.</p>`,
  });
}
