import bcrypt from "bcryptjs";
import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth/get-session";
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/session";
import { getClientIp } from "@/lib/auth/network";
import { writeAudit } from "@/lib/auth/audit";
import { checkLock, clearFailures, registerFailure } from "@/lib/auth/rate-limit";
import { getPasswordHash, savePassword } from "@/lib/auth/credential";
import { checkNewPassword, PASSWORD_MAX } from "@/lib/auth/password-policy";

export const runtime = "nodejs";

/**
 * เจ้าของบัญชีเปลี่ยนรหัสผ่านเอง (ทั้งแบบสมัครใจ และแบบถูกบังคับหลังรีเซ็ต/บัญชีใหม่)
 * ต้องยืนยันรหัสปัจจุบันเสมอ แม้ล็อกอินอยู่ เพื่อกันคนที่ได้ session ไปเปลี่ยนรหัสแทน
 * สำเร็จแล้ว session อื่นทั้งหมดใช้ไม่ได้ ส่วนเครื่องนี้ได้ session ใหม่
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  const ip = getClientIp(req.headers);

  let body: { currentPassword?: unknown; newPassword?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }
  const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
  const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";
  if (!currentPassword || !newPassword || currentPassword.length > PASSWORD_MAX) {
    return NextResponse.json({ error: "กรุณากรอกรหัสผ่านปัจจุบันและรหัสผ่านใหม่" }, { status: 400 });
  }

  const lockKey = `pwchange:${session.sub}`;
  const lock = checkLock(lockKey);
  if (lock.locked) {
    const minutes = Math.ceil(lock.retryAfterSec / 60);
    return NextResponse.json({ error: `ใส่รหัสผ่านปัจจุบันผิดหลายครั้ง กรุณารอ ${minutes} นาทีแล้วลองใหม่` }, { status: 429 });
  }

  const policyError = checkNewPassword(newPassword, { employeeId: session.sub, loginName: session.email });
  if (policyError) return NextResponse.json({ error: policyError }, { status: 400 });

  try {
    const hash = await getPasswordHash(session.sub);
    if (!hash || !(await bcrypt.compare(currentPassword, hash))) {
      registerFailure(lockKey);
      await writeAudit({ action: "PASSWORD_CHANGE_FAILED", userId: session.sub, identifier: session.sub, ip });
      return NextResponse.json({ error: "รหัสผ่านปัจจุบันไม่ถูกต้อง" }, { status: 400 });
    }
    if (await bcrypt.compare(newPassword, hash)) {
      return NextResponse.json({ error: "รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสผ่านปัจจุบัน" }, { status: 400 });
    }

    const state = await savePassword(session.sub, await bcrypt.hash(newPassword, 10), false);
    clearFailures(lockKey);

    await writeAudit({
      action: "PASSWORD_CHANGE",
      userId: session.sub,
      ip,
      detail: session.mcp ? "ตั้งรหัสใหม่หลังรีเซ็ต/บัญชีใหม่" : "เปลี่ยนรหัสผ่านจากหน้าโปรไฟล์",
    });

    const token = await createSessionToken({
      sub: session.sub,
      name: session.name,
      email: session.email,
      role: session.role,
      pwd: state.changedAt,
    });
    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
    return res;
  } catch (err) {
    console.error("Error changing password:", err);
    return NextResponse.json({ error: "เปลี่ยนรหัสผ่านไม่สำเร็จ" }, { status: 500 });
  }
}
