import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/jwt";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const needsAdmin = pathname.startsWith("/admin");
  const needsEditor = !needsAdmin && (pathname === "/lyrics/new" || /^\/lyrics\/[^/]+\/edit$/.test(pathname));
  const needsAuth =
    !needsAdmin && !needsEditor && (pathname.startsWith("/playlists") || pathname.startsWith("/favorites"));

  if (!needsAdmin && !needsEditor && !needsAuth) {
    return NextResponse.next();
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (!session) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (needsAdmin && session.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/", req.url));
  }

  if (needsEditor && session.role !== "ADMIN" && session.role !== "EDITOR") {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/lyrics/new", "/lyrics/:id/edit", "/playlists/:path*", "/favorites/:path*"],
};
