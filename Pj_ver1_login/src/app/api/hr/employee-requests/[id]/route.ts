import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth/get-session";
import { getClientIp } from "@/lib/auth/network";
import { writeAudit } from "@/lib/auth/audit";
import { EditRequestError, decideEditRequest } from "@/lib/hr/editRequests";

export const runtime = "nodejs";

// HR ตัดสินคำขอแก้ไขข้อมูลพนักงาน (H12): อนุมัติและบันทึก / ไม่อนุมัติ
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "HR") return NextResponse.json({ error: "ไม่มีสิทธิ์ดำเนินการ" }, { status: 403 });
  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }
  const decision = body.decision === "approve" || body.decision === "reject" ? body.decision : null;
  if (!decision) return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  const note = typeof body.note === "string" ? body.note : "";
  try {
    const result = await decideEditRequest(id, decision, note, session.sub);
    if (decision === "approve") {
      await writeAudit({
        action: "USER_UPDATE",
        userId: session.sub,
        ip: getClientIp(req.headers),
        targetId: result.employeeCode,
        detail: `อนุมัติคำขอแก้ไขข้อมูลของ ${result.employeeCode}`,
        changes: result.changes,
        reason: note.trim() || undefined,
      });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof EditRequestError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("[hr edit requests] decision failed", err);
    return NextResponse.json({ error: "บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" }, { status: 500 });
  }
}
