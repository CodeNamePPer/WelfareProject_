import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth/get-session";
import { getClientIp } from "@/lib/auth/network";
import { writeAudit } from "@/lib/auth/audit";
import { markAlertsRead, markAlertUnread, markAllAlertsRead, resolveAlert } from "@/lib/admin/alerts";

export const runtime = "nodejs";

const ACTIONS = ["read", "unread", "read_all", "resolve"] as const;
type Action = (typeof ACTIONS)[number];

/**
 * อัปเดตสถานะแจ้งเตือนของ admin ที่ล็อกอินอยู่
 * body: { action: "read" | "unread" | "resolve", id } หรือ { action: "read_all" }
 * อ่าน/ยังไม่อ่านเป็นของแต่ละคน จึงไม่ลง audit log — บันทึกเฉพาะการกดตรวจสอบ (resolve)
 */
export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "ไม่มีสิทธิ์ดำเนินการ" }, { status: 403 });
  }

  let body: { action?: unknown; id?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }

  const action = body.action as Action;
  if (!ACTIONS.includes(action)) {
    return NextResponse.json({ error: "คำสั่งไม่ถูกต้อง" }, { status: 400 });
  }
  if (typeof body.id === "string" && body.id.startsWith("prop-")) {
    return NextResponse.json({ ok: true });
  }
  const id = Number(body.id);
  if (action !== "read_all" && !(Number.isSafeInteger(id) && id > 0)) {
    return NextResponse.json({ error: "ไม่พบรหัสแจ้งเตือน" }, { status: 400 });
  }

  try {
    if (action === "read_all") {
      await markAllAlertsRead(session.sub);
    } else if (action === "read") {
      await markAlertsRead(session.sub, [id]);
    } else if (action === "unread") {
      await markAlertUnread(session.sub, id);
    } else {
      const result = await resolveAlert(session.sub, id);
      if (!result.found) {
        return NextResponse.json({ error: "ไม่พบการแจ้งเตือน" }, { status: 404 });
      }
      if (result.resolved) {
        await writeAudit({
          action: "NOTIFICATION_RESOLVE",
          userId: session.sub,
          ip: getClientIp(req.headers),
          targetId: String(id),
          detail: result.title,
        });
      }
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    // 23503 = อ้าง notification_id ที่ไม่มีอยู่
    if ((err as { code?: string })?.code === "23503") {
      return NextResponse.json({ error: "ไม่พบการแจ้งเตือน" }, { status: 404 });
    }
    console.error("Error updating notification:", err);
    return NextResponse.json({ error: "บันทึกสถานะการแจ้งเตือนไม่สำเร็จ" }, { status: 500 });
  }
}
