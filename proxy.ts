import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth/auth";
import { isAuthRoute } from "@/modules/auth/constants";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isAuthRoute(pathname)) {
    return NextResponse.next();
  }

  // Validate the session against the database, not just the cookie's presence:
  // a cookie can outlive its session (user deleted, session revoked/expired).
  // Proxy runs on Node.js in Next 16, so it can query the DB directly.
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session) {
    const response = NextResponse.redirect(new URL("/sign-in", request.url));
    // Drop the stale cookie so the browser stops sending a dead session.
    for (const { name } of request.cookies.getAll()) {
      if (name.includes("better-auth.session")) response.cookies.delete(name);
    }
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
