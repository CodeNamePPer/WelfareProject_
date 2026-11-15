import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth/get-session";
import { getClientIp } from "@/lib/auth/network";
import { writeAudit } from "@/lib/auth/audit";
import { isHrHead } from "@/lib/hr/hrHead";
import { setUnavailableDisplay } from "@/lib/hr/benefitVisibility";

export const runtime = "nodejs";

// หัวหน้า HR ตั้งการแสดงสวัสดิการที่ใช้ไม่ได้ (HH3): faded / hidden มีผลทันที บันทึก Log
export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session || !(await isHrHead(session))) return NextResponse.json({ error: "ตั้งค่าได้เฉพาะหัวหน้า HR" }, { status: 403 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }
  const code = typeof body.code === "string" ? body.code.trim() : "";
  const display = body.display === "faded" || body.display === "hidden" ? body.display : null;
  if (!/^WEL-[0-9]{3,}$/.test(code) || !display) return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  try {
    await setUnavailableDisplay(code, display);
    await writeAudit({
      action: "WELFARE_UPDATE",
      userId: session.sub,
      ip: getClientIp(req.headers),
      targetId: code,
      detail: `ตั้งการแสดงเมื่อใช้ไม่ได้ของ ${code} เป็น${display === "hidden" ? "ซ่อน" : "แสดงเป็นสีเทา"}`,
      changes: { unavailable_display: { old: display === "hidden" ? "faded" : "hidden", new: display } },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[hr visibility] save failed", err);
    return NextResponse.json({ error: "บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" }, { status: 500 });
  }
}
