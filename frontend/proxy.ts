import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PREFIXES = ["/auth", "/_next", "/favicon.ico", "/robots.txt", "/sitemap.xml"];
const ACCESS_COOKIE = "access_token";

function isPublic(pathname: string) {
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // bỏ qua public + api
  if (isPublic(pathname) || pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  // check cookie
  const hasAccess = req.cookies.get(ACCESS_COOKIE);
  if (hasAccess) return NextResponse.next();

  // chưa login -> về login
  const url = req.nextUrl.clone();
  url.pathname = "/auth/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

// chặn các route private bạn cần
export const config = {
  matcher: ["/", "/friends/:path*", "/groups/:path*", "/profile/:path*", "/chat/:path*"],
};
