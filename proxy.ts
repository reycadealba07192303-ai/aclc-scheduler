import { NextRequest, NextResponse } from "next/server";
import { readSessionToken } from "@/backend/auth/auth-token";

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  let session = null;
  try {
    session = await readSessionToken(request.cookies.get("aclc_session")?.value);
  } catch {
    // A missing AUTH_SECRET invalidates the session and the server-side APIs report configuration errors.
  }

  if (pathname.startsWith("/admin") || pathname.startsWith("/teacher") || pathname.startsWith("/student")) {
    if (!session) return NextResponse.redirect(new URL("/login", request.url));
    if (pathname.startsWith("/admin") && session.role !== "admin") {
      return NextResponse.redirect(new URL(session.role === "student" ? "/student" : "/teacher", request.url));
    }
    if (pathname.startsWith("/teacher") && session.role !== "teacher") {
      return NextResponse.redirect(new URL(session.role === "admin" ? "/admin" : "/student", request.url));
    }
    if (pathname.startsWith("/student") && session.role !== "student") {
      return NextResponse.redirect(new URL(session.role === "admin" ? "/admin" : "/teacher", request.url));
    }
  }

  if (pathname === "/" && session) {
    return NextResponse.redirect(new URL(session.role === "admin" ? "/admin" : session.role === "student" ? "/student" : "/teacher", request.url));
  }
  if ((pathname === "/login" || pathname === "/setup-admin" || pathname === "/create-password") && session) {
    return NextResponse.redirect(new URL(session.role === "admin" ? "/admin" : session.role === "student" ? "/student" : "/teacher", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
