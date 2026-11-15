import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth/get-session";
import { CONTACT_FIELDS, ProfileError, submitOwnEditRequest, type ContactField } from "@/lib/hr/profile";

export const runtime = "nodejs";

// HR ขอแก้ข้อมูลติดต่อของตัวเอง (P01) ส่งเป็นคำขอให้ HR คนอื่นตรวจที่หน้า H12
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== "HR" && session.role !== "SUPER_ADMIN")) return NextResponse.json({ error: "ไม่มีสิทธิ์ดำเนินการ" }, { status: 403 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }
  const raw = (body.changes && typeof body.changes === "object" ? body.changes : {}) as Record<string, unknown>;
  const changes: Partial<Record<ContactField, string>> = {};
  for (const field of CONTACT_FIELDS) if (typeof raw[field] === "string") changes[field] = raw[field] as string;
  try {
    await submitOwnEditRequest(session.sub, changes, typeof body.reason === "string" ? body.reason : "");
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    if (err instanceof ProfileError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("[hr profile] edit request failed", err);
    return NextResponse.json({ error: "ส่งคำขอไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" }, { status: 500 });
  }
}
