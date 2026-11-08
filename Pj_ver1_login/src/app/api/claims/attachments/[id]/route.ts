import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth/get-session";
import { claimErrorResponse, getAttachmentUrl } from "@/lib/claims/service";

export const runtime = "nodejs";

/** เปิดไฟล์แนบผ่านลิงก์ชั่วคราว หลังตรวจสิทธิ์ของผู้ที่เข้าระบบ */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });

  try {
    const { id } = await params;
    const url = await getAttachmentUrl(id, { sub: session.sub, role: session.role });
    if (!url) return NextResponse.json({ error: "ไม่พบไฟล์นี้" }, { status: 404 });
    return NextResponse.redirect(url);
  } catch (err) {
    const { status, body } = claimErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}
