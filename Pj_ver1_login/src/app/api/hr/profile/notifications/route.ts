import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth/get-session";
import { ProfileError, saveNotificationPreferences } from "@/lib/hr/profile";

export const runtime = "nodejs";

// บันทึกการตั้งค่าแจ้งเตือนของตัวเอง (แท็บ "การแจ้งเตือน" P01/P02)
export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== "HR" && session.role !== "SUPER_ADMIN")) return NextResponse.json({ error: "ไม่มีสิทธิ์ดำเนินการ" }, { status: 403 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }
  const prefs = Array.isArray(body.prefs)
    ? body.prefs.flatMap((item) => {
        const row = (item ?? {}) as Record<string, unknown>;
        return typeof row.topic === "string" ? [{ topic: row.topic, inApp: row.inApp !== false, email: row.email === true }] : [];
      })
    : [];
  try {
    await saveNotificationPreferences(session.sub, prefs.slice(0, 50));
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ProfileError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("[hr profile] notification prefs failed", err);
    return NextResponse.json({ error: "บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" }, { status: 500 });
  }
}
