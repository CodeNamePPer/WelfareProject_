import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/get-session";
import { getAdminLogRows } from "@/lib/admin/logs";

export const runtime = "nodejs";

/** ประวัติของระบบทั้งหมดสำหรับส่งออก CSV (หน้า /admin/logs แสดงแค่รายการล่าสุด) */
export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "ไม่มีสิทธิ์ดำเนินการ" }, { status: 403 });
  }
  try {
    return NextResponse.json({ rows: await getAdminLogRows({ all: true }) });
  } catch (err) {
    console.error("[admin logs] export failed", err);
    return NextResponse.json({ error: "โหลดประวัติไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" }, { status: 500 });
  }
}
