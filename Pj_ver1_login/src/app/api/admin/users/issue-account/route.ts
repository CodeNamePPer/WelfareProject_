import bcrypt from "bcryptjs";
import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth/get-session";
import { getClientIp } from "@/lib/auth/network";
import { writeAudit } from "@/lib/auth/audit";
import { createAdminAlert } from "@/lib/admin/alerts";
import { deliverTempPassword, generateTempPassword } from "@/lib/auth/tempPassword";
import { getUserWithProfileById, issueUserAccount } from "@/lib/auth/users";
import { deliverableEmail } from "@/lib/email/address";
import { escapeHtml } from "@/lib/email/resend";

export const runtime = "nodejs";

function welcomeEmail(name: string, loginName: string, tempPassword: string, loginUrl: string) {
  const subject = "บัญชีเข้าสู่ระบบพนักงานและสวัสดิการของคุณ";
  const text = [
    `เรียน ${name}`,
    "",
    "ผู้ดูแลระบบได้สร้างบัญชีเข้าสู่ระบบพนักงานและสวัสดิการให้คุณแล้ว",
    `ชื่อล็อกอิน: ${loginName}`,
    `รหัสผ่านชั่วคราว: ${tempPassword}`,
    "",
    `เข้าสู่ระบบที่ ${loginUrl} แล้วระบบจะให้ตั้งรหัสผ่านใหม่ทันที`,
  ].join("\n");
  const html = `<div style="font-family:sans-serif;font-size:14px;line-height:1.6;color:#0f172a">
<p>เรียน ${escapeHtml(name)}</p>
<p>ผู้ดูแลระบบได้สร้างบัญชีเข้าสู่ระบบพนักงานและสวัสดิการให้คุณแล้ว</p>
<p>ชื่อล็อกอิน: <strong>${escapeHtml(loginName)}</strong><br>
รหัสผ่านชั่วคราว: <strong style="font-family:monospace;font-size:16px;letter-spacing:1px">${escapeHtml(tempPassword)}</strong></p>
<p><a href="${escapeHtml(loginUrl)}">เข้าสู่ระบบ</a> แล้วระบบจะให้ตั้งรหัสผ่านใหม่ทันที</p>
</div>`;
  return { subject, text, html };
}

/** Admin ออกบัญชีให้พนักงานที่มีข้อมูลแล้วแต่ยังเข้าระบบไม่ได้: ใช้อีเมลติดต่อเป็นชื่อล็อกอิน บทบาทเริ่มต้นเป็นพนักงาน */
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
  if (!reason) return NextResponse.json({ error: "กรุณาระบุเหตุผลการออกบัญชี" }, { status: 400 });
  if (reason.length > 500) return NextResponse.json({ error: "เหตุผลยาวเกินไป" }, { status: 400 });

  try {
    const target = await getUserWithProfileById(employeeId);
    if (!target) return NextResponse.json({ error: "ไม่พบพนักงาน" }, { status: 404 });
    if (target.hasAccount) return NextResponse.json({ error: "พนักงานคนนี้มีบัญชีอยู่แล้ว" }, { status: 409 });

    const contactEmail = deliverableEmail(target.profile.contactEmail);
    if (!contactEmail) {
      return NextResponse.json({ error: "พนักงานคนนี้ยังไม่มีอีเมลที่ใช้เป็นชื่อล็อกอินได้" }, { status: 400 });
    }

    const tempPassword = generateTempPassword();
    await issueUserAccount(employeeId, contactEmail, await bcrypt.hash(tempPassword, 10));

    const mail = welcomeEmail(target.name, contactEmail, tempPassword, new URL("/login", req.url).toString());
    const { emailedTo, emailError, fallback } = await deliverTempPassword(contactEmail, mail);

    await writeAudit({
      action: "ACCOUNT_CREATE",
      userId: session.sub,
      ip: getClientIp(req.headers),
      targetId: employeeId,
      reason,
      detail: emailedTo ? `ส่งรหัสชั่วคราวทางอีเมล ${emailedTo}` : `แสดงรหัสชั่วคราวบนหน้าจอ (${emailError})`,
    });
    await createAdminAlert({
      category: "access",
      title: "ออกบัญชีผู้ใช้งานแล้ว",
      description: `${session.name} ออกบัญชีให้ ${target.name} (${employeeId})`,
    });

    // บัญชีถูกสร้างแล้ว ถ้าโหลดข้อมูลล่าสุดไม่ได้ต้องไม่ทำให้รหัสชั่วคราวหาย
    const user = await getUserWithProfileById(employeeId).catch(() => null);
    return NextResponse.json(
      emailedTo ? { ok: true, emailedTo, user } : { ok: true, tempPassword, fallback, user },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    const pg = err as { code?: string; message?: string };
    if (pg?.code === "23505") return NextResponse.json({ error: "อีเมลนี้ถูกใช้เป็นชื่อล็อกอินแล้ว" }, { status: 409 });
    console.error("Error issuing account:", err);
    if (pg?.code === "P0001" && pg.message) return NextResponse.json({ error: pg.message }, { status: 400 });
    return NextResponse.json({ error: "ออกบัญชีไม่สำเร็จ" }, { status: 500 });
  }
}
