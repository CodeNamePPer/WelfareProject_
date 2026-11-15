import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth/get-session";
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/session";
import { getClientIp } from "@/lib/auth/network";
import { writeAudit } from "@/lib/auth/audit";
import { revokeAllSessions } from "@/lib/auth/credential";

export const runtime = "nodejs";

// ออกจากระบบทุกอุปกรณ์: session อื่นทั้งหมดใช้ไม่ได้ เครื่องนี้ได้ token ใหม่และยังใช้งานต่อได้
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  try {
    const state = await revokeAllSessions(session.sub);
    await writeAudit({ action: "LOGOUT_ALL", userId: session.sub, ip: getClientIp(req.headers), detail: "ออกจากระบบทุกอุปกรณ์" });
    const token = await createSessionToken({ sub: session.sub, name: session.name, email: session.email, role: session.role, pwd: state.changedAt, ...(session.mcp ? { mcp: true } : {}) });
    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
    return res;
  } catch (err) {
    console.error("[auth] logout all failed", err);
    return NextResponse.json({ error: "ออกจากระบบทุกอุปกรณ์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" }, { status: 500 });
  }
}
