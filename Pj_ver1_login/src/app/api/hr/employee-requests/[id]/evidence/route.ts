import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth/get-session";
import { getEditRequestEvidenceUrl } from "@/lib/hr/editRequests";

export const runtime = "nodejs";

// HR เปิดดูหลักฐานของคำขอแก้ไขข้อมูล: พาไปที่ signed URL อายุสั้น
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "HR") return NextResponse.json({ error: "ไม่มีสิทธิ์ดำเนินการ" }, { status: 403 });
  const { id } = await params;
  try {
    const url = await getEditRequestEvidenceUrl(id);
    if (!url) return NextResponse.json({ error: "คำขอนี้ไม่มีหลักฐานแนบ" }, { status: 404 });
    return NextResponse.redirect(url);
  } catch (err) {
    console.error("[hr edit requests] open evidence failed", err);
    return NextResponse.json({ error: "เปิดหลักฐานไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" }, { status: 500 });
  }
}
