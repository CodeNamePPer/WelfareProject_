import { randomInt } from "node:crypto";
import bcrypt from "bcryptjs";
import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth/get-session";
import { getClientIp } from "@/lib/auth/network";
import { writeAudit } from "@/lib/auth/audit";
import { createAdminAlert } from "@/lib/admin/alerts";
import { clearFailures } from "@/lib/auth/rate-limit";
import { savePassword } from "@/lib/auth/credential";
import { getUserWithProfileById } from "@/lib/auth/users";
import { escapeHtml, isEmailConfigured, sendEmail } from "@/lib/email/resend";

export const runtime = "nodejs";

// ตัดตัวที่อ่านสับสน (0/O, 1/l/I) เพราะ admin ต้องบอกรหัสให้พนักงานด้วยปากหรือกระดาษ
const LETTERS = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";
const DIGITS = "23456789";
const TEMP_LENGTH = 12;
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** อีเมลติดต่อที่ส่งได้จริง (บัญชีที่ไม่มีอีเมลระบบตั้งเป็น ...@no-email.invalid) */
function deliverableEmail(email: string | null): string | null {
  const value = email?.trim() ?? "";
  return EMAIL_RE.test(value) && !value.toLowerCase().endsWith(".invalid") ? value : null;
}

function resetEmail(name: string, loginName: string, tempPassword: string, loginUrl: string) {
  const subject = "รหัสผ่านชั่วคราวสำหรับเข้าสู่ระบบพนักงานและสวัสดิการ";
  const text = [
    `เรียน ${name}`,
    "",
    "ผู้ดูแลระบบได้รีเซ็ตรหัสผ่านของคุณตามที่แจ้งไว้",
    `ชื่อล็อกอิน: ${loginName}`,
    `รหัสผ่านชั่วคราว: ${tempPassword}`,
    "",
    `เข้าสู่ระบบที่ ${loginUrl} แล้วระบบจะให้ตั้งรหัสผ่านใหม่ทันที`,
    "ถ้าคุณไม่ได้ขอรีเซ็ตรหัสผ่าน กรุณาแจ้งฝ่ายบุคคล (HR) หรือ IT ทันที",
  ].join("\n");
  const html = `<div style="font-family:sans-serif;font-size:14px;line-height:1.6;color:#0f172a">
<p>เรียน ${escapeHtml(name)}</p>
<p>ผู้ดูแลระบบได้รีเซ็ตรหัสผ่านของคุณตามที่แจ้งไว้</p>
<p>ชื่อล็อกอิน: <strong>${escapeHtml(loginName)}</strong><br>
รหัสผ่านชั่วคราว: <strong style="font-family:monospace;font-size:16px;letter-spacing:1px">${escapeHtml(tempPassword)}</strong></p>
<p><a href="${escapeHtml(loginUrl)}">เข้าสู่ระบบ</a> แล้วระบบจะให้ตั้งรหัสผ่านใหม่ทันที</p>
<p style="color:#64748b">ถ้าคุณไม่ได้ขอรีเซ็ตรหัสผ่าน กรุณาแจ้งฝ่ายบุคคล (HR) หรือ IT ทันที</p>
</div>`;
  return { subject, text, html };
}

function generateTempPassword(): string {
  const all = LETTERS + DIGITS;
  const chars = [LETTERS[randomInt(LETTERS.length)], DIGITS[randomInt(DIGITS.length)]];
  while (chars.length < TEMP_LENGTH) chars.push(all[randomInt(all.length)]);
  // สลับตำแหน่ง ไม่ให้ตัวอักษร/ตัวเลขที่บังคับอยู่ต้นรหัสเสมอ
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

/**
 * Admin รีเซ็ตรหัสผ่านให้พนักงานที่ลืมรหัส (หลัง HR/IT ยืนยันตัวตนนอกระบบแล้ว)
 * ออกรหัสชั่วคราวแสดงครั้งเดียว + บังคับตั้งรหัสใหม่ตอนล็อกอิน + ตัด session เดิมทั้งหมด
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "ไม่มีสิทธิ์ดำเนินการ" }, { status: 403 });
  }

  let body: { employeeId?: unknown; reason?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }
  const employeeId = typeof body.employeeId === "string" ? body.employeeId.trim() : "";
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";

  if (!employeeId) return NextResponse.json({ error: "ไม่พบรหัสพนักงาน" }, { status: 400 });
  if (!reason) return NextResponse.json({ error: "กรุณาระบุเหตุผลการรีเซ็ตรหัสผ่าน" }, { status: 400 });
  if (reason.length > 500) return NextResponse.json({ error: "เหตุผลยาวเกินไป" }, { status: 400 });
  if (employeeId === session.sub) {
    return NextResponse.json(
      { error: "รีเซ็ตรหัสผ่านของตัวเองไม่ได้ ให้เปลี่ยนรหัสผ่านที่หน้าโปรไฟล์แทน" },
      { status: 400 },
    );
  }

  try {
    const target = await getUserWithProfileById(employeeId);
    if (!target) return NextResponse.json({ error: "ไม่พบผู้ใช้งาน" }, { status: 404 });
    if (target.status !== "ACTIVE") {
      return NextResponse.json({ error: "รีเซ็ตได้เฉพาะบัญชีที่ยังทำงานอยู่" }, { status: 400 });
    }

    const tempPassword = generateTempPassword();
    await savePassword(employeeId, await bcrypt.hash(tempPassword, 10), true);

    // ปลดล็อกการล็อกอินผิดซ้ำของบัญชีนี้ด้วย (key = ค่าที่พิมพ์ในช่องล็อกอิน)
    clearFailures(target.email.toLowerCase());
    clearFailures(employeeId.toLowerCase());

    // ส่งรหัสทางอีเมลติดต่อของพนักงาน ถ้าส่งไม่ได้ (ไม่มีอีเมล / ยังไม่ตั้งค่า Resend / ส่งพลาด) ให้แสดงบนจอแทน
    const contactEmail = deliverableEmail(target.profile.contactEmail);
    let emailedTo: string | null = null;
    let emailError: string | null = null;
    if (!contactEmail) {
      emailError = "พนักงานคนนี้ยังไม่มีอีเมลติดต่อ";
    } else if (!isEmailConfigured()) {
      emailError = "ระบบยังไม่ได้ตั้งค่าการส่งอีเมล";
    } else {
      const mail = resetEmail(target.name, target.email, tempPassword, new URL("/login", req.url).toString());
      const sent = await sendEmail({ to: contactEmail, ...mail });
      if (sent.ok) emailedTo = sent.deliveredTo;
      else emailError = "ส่งอีเมลไม่สำเร็จ";
    }

    await writeAudit({
      action: "PASSWORD_RESET",
      userId: session.sub,
      ip: getClientIp(req.headers),
      targetId: employeeId,
      reason,
      detail: emailedTo ? `ส่งรหัสชั่วคราวทางอีเมล ${emailedTo}` : `แสดงรหัสชั่วคราวบนหน้าจอ (${emailError})`,
    });
    await createAdminAlert({
      category: "security",
      title: "รีเซ็ตรหัสผ่านแล้ว",
      description: `${session.name} รีเซ็ตรหัสผ่านของ ${target.name} (${employeeId})${
        target.role === "SUPER_ADMIN" ? " · บัญชีนี้เป็น Admin" : ""
      }`,
    });

    // ส่งอีเมลสำเร็จแล้วไม่ส่งรหัสกลับมาที่หน้าจอ admin ไม่จำเป็นต้องเห็นรหัสของคนอื่น
    return NextResponse.json(
      emailedTo ? { ok: true, emailedTo } : { ok: true, tempPassword, emailError },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("Error resetting password:", err);
    return NextResponse.json({ error: "รีเซ็ตรหัสผ่านไม่สำเร็จ" }, { status: 500 });
  }
}
