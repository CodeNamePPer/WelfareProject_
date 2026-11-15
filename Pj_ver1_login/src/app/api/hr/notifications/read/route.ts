import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth/get-session";
import { getHrNotifications, markHrNotificationsRead } from "@/lib/hr/notifications";

export const runtime = "nodejs";

// ทำเครื่องหมายแจ้งเตือนของ HR ว่าอ่านแล้ว: { keys: [...] } หรือ { all: true } = ทุกรายการที่เห็นอยู่ตอนนี้
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== "HR" && session.role !== "SUPER_ADMIN")) return NextResponse.json({ error: "ไม่มีสิทธิ์ดำเนินการ" }, { status: 403 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }
  try {
    let keys: string[];
    if (body.all === true) {
      keys = ((await getHrNotifications(session.sub, session.role)) ?? []).filter((notice) => !notice.read).map((notice) => notice.id);
    } else {
      keys = Array.isArray(body.keys) ? body.keys.filter((key): key is string => typeof key === "string") : [];
    }
    await markHrNotificationsRead(session.sub, keys);
    return NextResponse.json({ ok: true, marked: keys.length });
  } catch (err) {
    console.error("[hr notifications] mark read failed", err);
    return NextResponse.json({ error: "บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" }, { status: 500 });
  }
}
