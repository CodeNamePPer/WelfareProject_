import { NextResponse, type NextRequest } from "next/server";
import { verifySessionToken, SESSION_COOKIE } from "@/lib/auth/session";
import { canAccess } from "@/lib/auth/roles";
import { getClientIp, isOfficeNetwork } from "@/lib/auth/network";

const PUBLIC_PATHS = ["/login", "/access-denied", "/api/auth/login"];

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1) ต้องอยู่ในเครือข่ายที่ทำงานเท่านั้น (เมื่อเปิด ENFORCE_OFFICE_NETWORK)
  if (pathname !== "/access-denied" && !isOfficeNetwork(getClientIp(req.headers))) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "อนุญาตเฉพาะเครือข่ายที่ทำงาน" }, { status: 403 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/access-denied";
    url.search = "?reason=network";
    return NextResponse.rewrite(url);
  }

  // 2) ตรวจ session
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (!session && !isPublic(pathname) && pathname !== "/api/auth/logout") {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname + req.nextUrl.search)}`;
    return NextResponse.redirect(url);
  }

  if (session && pathname === "/login") {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // 3) ตรวจสิทธิ์ตาม Role
  if (session && !canAccess(pathname, session.role)) {
    return NextResponse.redirect(new URL("/access-denied?reason=role", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
