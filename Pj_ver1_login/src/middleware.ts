import { NextResponse, type NextRequest } from "next/server";
import { verifySessionToken, SESSION_COOKIE, type SessionPayload } from "@/lib/auth/session";
import { canAccess } from "@/lib/auth/roles";
import { getClientIp, isOfficeNetwork } from "@/lib/auth/network";
import { getPasswordState } from "@/lib/auth/credential";

const PUBLIC_PATHS = ["/login", "/access-denied", "/api/auth/login"];

/** เส้นทางที่ใช้ได้ระหว่างถูกบังคับตั้งรหัสผ่านใหม่ */
const CHANGE_PASSWORD_PATH = "/change-password";
const CHANGE_PASSWORD_ALLOWED = [CHANGE_PASSWORD_PATH, "/api/auth/change-password", "/api/auth/logout"];

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

/*
 * session ที่ออกก่อนเปลี่ยน/รีเซ็ตรหัสผ่านต้องใช้ไม่ได้ จึงเทียบ pwd ใน token กับ password_changed_at ในตาราง
 * เก็บผลไว้สั้น ๆ ต่อ instance เพื่อไม่ให้ทุก request ต้องถามฐานข้อมูล (รหัสที่ถูกรีเซ็ตมีผลภายใน ~15 วินาที)
 */
const STATE_TTL_MS = 15_000;
const stateCache = new Map<string, { changedAt: number | null; expires: number }>();

async function isSessionCurrent(session: SessionPayload): Promise<boolean> {
  if (typeof session.pwd !== "number") return false; // token รุ่นก่อนมี pwd
  const now = Date.now();
  let cached = stateCache.get(session.sub);
  // ค่าไม่ตรงอาจเพราะ cache เก่า (เพิ่งเปลี่ยนรหัสแล้วได้ token ใหม่) จึงถามฐานข้อมูลซ้ำก่อนตัด session
  if (!cached || cached.expires <= now || cached.changedAt !== session.pwd) {
    try {
      const state = await getPasswordState(session.sub);
      cached = { changedAt: state?.changedAt ?? null, expires: now + STATE_TTL_MS };
      stateCache.set(session.sub, cached);
    } catch (err) {
      // ฐานข้อมูลล่ม: ไม่ตัด session ทุกคนออก (หน้าอื่นจะ error เองอยู่แล้ว) และไม่ cache ผล
      console.error("[middleware] password state check failed", err);
      return true;
    }
  }
  return cached.changedAt !== null && cached.changedAt === session.pwd;
}

function expired(req: NextRequest, pathname: string) {
  const res = pathname.startsWith("/api/")
    ? NextResponse.json({ error: "session หมดอายุ กรุณาเข้าสู่ระบบใหม่" }, { status: 401 })
    : NextResponse.redirect(new URL("/login?reason=password", req.url));
  res.cookies.delete(SESSION_COOKIE);
  return res;
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

  if (session && !(await isSessionCurrent(session))) {
    return expired(req, pathname);
  }

  if (!session && !isPublic(pathname) && pathname !== "/api/auth/logout") {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname + req.nextUrl.search)}`;
    return NextResponse.redirect(url);
  }

  // 3) ต้องตั้งรหัสผ่านใหม่ก่อน (บัญชีใหม่ / หลังรีเซ็ต)
  if (session?.mcp && !CHANGE_PASSWORD_ALLOWED.includes(pathname)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "กรุณาตั้งรหัสผ่านใหม่ก่อนใช้งาน" }, { status: 403 });
    }
    return NextResponse.redirect(new URL(CHANGE_PASSWORD_PATH, req.url));
  }
  if (session && !session.mcp && pathname === CHANGE_PASSWORD_PATH) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  if (session && pathname === "/login") {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // 4) ตรวจสิทธิ์ตาม Role
  if (session && !canAccess(pathname, session.role)) {
    return NextResponse.redirect(new URL("/access-denied?reason=role", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
