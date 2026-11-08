import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth/get-session";
import { getClientIp } from "@/lib/auth/network";
import { writeAudit } from "@/lib/auth/audit";
import { parseWelfareInput, saveWelfareItem, WelfareInputError } from "@/lib/admin/welfare";

export const runtime = "nodejs";

/** เพิ่มหรือแก้ไขสวัสดิการตามรหัส (ยังไม่มีรหัสนี้ = เพิ่มใหม่) */
export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "ไม่มีสิทธิ์ดำเนินการ" }, { status: 403 });
  }

  try {
    const body = await req.json();
    if (typeof body.code !== "string" || !body.code) {
      return NextResponse.json({ error: "ไม่พบรหัสสวัสดิการ" }, { status: 400 });
    }

    const { item, created, changes } = await saveWelfareItem(body.code, parseWelfareInput(body.values));
    if (Object.keys(changes).length > 0) {
      await writeAudit({
        action: created ? "WELFARE_CREATE" : "WELFARE_UPDATE",
        userId: session.sub,
        ip: getClientIp(req.headers),
        targetId: item.code,
        detail: item.name,
        changes,
      });
    }
    return NextResponse.json({ ok: true, item });
  } catch (err) {
    if (err instanceof WelfareInputError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("Error saving welfare:", err);
    const pg = err as { code?: string; message?: string };
    if (pg?.code === "P0001" && pg.message) {
      return NextResponse.json({ error: pg.message }, { status: 400 });
    }
    if (pg?.code === "23505") {
      return NextResponse.json({ error: "มีรหัสสวัสดิการนี้ หรือมีวงเงินที่เริ่มใช้วันดังกล่าวอยู่แล้ว" }, { status: 409 });
    }
    if (pg?.code === "23514") {
      return NextResponse.json({ error: "ข้อมูลไม่ผ่านเงื่อนไขของระบบ กรุณาตรวจสอบอีกครั้ง" }, { status: 400 });
    }
    return NextResponse.json({ error: "เกิดข้อผิดพลาดในการบันทึกข้อมูล" }, { status: 500 });
  }
}
