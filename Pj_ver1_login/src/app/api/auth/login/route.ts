import { NextResponse, type NextRequest } from "next/server";
import { findUserByIdentifier, markLogin, verifyPassword } from "@/lib/auth/users";
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/session";
import { verifyRecaptcha } from "@/lib/auth/recaptcha";
import { checkLock, clearFailures, registerFailure } from "@/lib/auth/rate-limit";
import { getClientIp } from "@/lib/auth/network";
import { writeAudit } from "@/lib/auth/audit";

export const runtime = "nodejs";

const GENERIC_ERROR = "อีเมล/รหัสพนักงาน หรือรหัสผ่านไม่ถูกต้อง";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);

  let body: { identifier?: unknown; password?: unknown; recaptchaToken?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }

  const identifier = typeof body.identifier === "string" ? body.identifier.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const recaptchaToken = typeof body.recaptchaToken === "string" ? body.recaptchaToken : undefined;

  if (!identifier || !password || identifier.length > 200 || password.length > 200) {
    return NextResponse.json({ error: "กรุณากรอกอีเมลหรือรหัสพนักงาน และรหัสผ่าน" }, { status: 400 });
  }

  // 1) บัญชีถูกล็อกชั่วคราวจากการใส่รหัสผิดซ้ำ
  const lockKey = identifier.toLowerCase();
  const lock = checkLock(lockKey);
  if (lock.locked) {
    await writeAudit({ action: "LOGIN_BLOCKED_LOCKED", userId: null, identifier, ip });
    const minutes = Math.ceil(lock.retryAfterSec / 60);
    return NextResponse.json(
      { error: `ใส่รหัสผ่านผิดหลายครั้ง กรุณารอ ${minutes} นาทีแล้วลองใหม่ หรือติดต่อ IT Support` },
      { status: 429 },
    );
  }

  // 2) ตรวจ Google reCAPTCHA ฝั่ง server
  if (!(await verifyRecaptcha(recaptchaToken, ip))) {
    await writeAudit({ action: "LOGIN_BLOCKED_RECAPTCHA", userId: null, identifier, ip });
    return NextResponse.json({ error: "การยืนยัน reCAPTCHA ไม่ผ่าน กรุณาลองใหม่" }, { status: 400 });
  }

  // 3) ตรวจรหัสผ่าน
  const user = await findUserByIdentifier(identifier);
  const passwordOk = await verifyPassword(user, password);

  if (!user || !passwordOk) {
    registerFailure(lockKey);
    await writeAudit({ action: "LOGIN_FAILED", userId: user?.employeeId ?? null, identifier, ip });
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
  }

  // 4) พนักงานที่ลาออกแล้ว (RESIGNED) หรือไม่ได้อยู่ในสถานะ ACTIVE
  if (user.status === "RESIGNED") {
    await writeAudit({ action: "LOGIN_BLOCKED_INACTIVE", userId: user.employeeId, identifier, ip });
    return NextResponse.json(
      { error: "บัญชีนี้พ้นสภาพการเป็นพนักงานแล้ว (ลาออก) ไม่สามารถเข้าสู่ระบบได้ กรุณาติดต่อฝ่ายบุคคล (HR)" },
      { status: 403 },
    );
  }

  if (user.status !== "ACTIVE") {
    await writeAudit({ action: "LOGIN_BLOCKED_INACTIVE", userId: user.employeeId, identifier, ip });
    return NextResponse.json(
      { error: "บัญชีนี้ไม่ได้อยู่ในสถานะที่สามารถใช้งานได้ กรุณาติดต่อฝ่ายบุคคล (HR)" },
      { status: 403 },
    );
  }

  // 5) สำเร็จ: ออก session ใน httpOnly cookie
  clearFailures(lockKey);
  const token = await createSessionToken({
    sub: user.employeeId,
    name: user.name,
    email: user.email,
    role: user.role,
  });

  await markLogin(user.employeeId);
  await writeAudit({ action: "LOGIN_SUCCESS", userId: user.employeeId, identifier, ip });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
  return res;
}
