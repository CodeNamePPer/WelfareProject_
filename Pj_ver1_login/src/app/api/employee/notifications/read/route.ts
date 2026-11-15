import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/get-session";
import { markAllNotificationsSeen } from "@/lib/employee/notifications";

export const runtime = "nodejs";

// พนักงานกด "อ่านทั้งหมดแล้ว" ในหน้าแจ้งเตือน
export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  try {
    await markAllNotificationsSeen(session.sub);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[employee notifications] mark seen failed", err);
    return NextResponse.json({ error: "บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" }, { status: 500 });
  }
}
