import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PREFIXES = ["/auth", "/_next", "/favicon.ico", "/robots.txt", "/sitemap.xml"];
const ACCESS_COOKIE = "access_token";

function isPublic(pathname: string) {
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isPublic(pathname) || pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  // ✅ tạm thời không chặn nữa (hoặc ít nhất bỏ /friends)
  if (pathname.startsWith("/friends")) return NextResponse.next();

  return NextResponse.next();
}

export const config = {
  matcher: ["/friends/:path*", "/groups/:path*", "/profile/:path*", "/chat/:path*"],
};