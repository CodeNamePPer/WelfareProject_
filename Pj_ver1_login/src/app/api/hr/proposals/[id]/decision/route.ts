import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth/get-session";
import { getClientIp } from "@/lib/auth/network";
import { writeAudit } from "@/lib/auth/audit";
import { isHrHead } from "@/lib/hr/hrHead";
import { ProposalError, decideProposal } from "@/lib/hr/proposals";

export const runtime = "nodejs";

const DECISIONS = ["approve", "needs_info", "reject"] as const;

// หัวหน้า HR ตัดสินข้อเสนอ (HH2): อนุมัติและเปิดใช้ / ขอข้อมูลเพิ่ม / ไม่อนุมัติ
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || !(await isHrHead(session))) return NextResponse.json({ error: "ตัดสินข้อเสนอได้เฉพาะหัวหน้า HR" }, { status: 403 });
  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }
  const decision = DECISIONS.find((item) => item === body.decision);
  if (!decision) return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  const note = typeof body.note === "string" ? body.note : "";
  try {
    const result = await decideProposal(id, decision, note, session.sub);
    if (result.benefitCode) {
      await writeAudit({
        action: "WELFARE_CREATE",
        userId: session.sub,
        ip: getClientIp(req.headers),
        targetId: result.benefitCode,
        detail: `อนุมัติข้อเสนอและสร้างสวัสดิการ ${result.benefitCode}`,
        reason: note.trim() || undefined,
      });
    }
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    if (err instanceof ProposalError) return NextResponse.json({ error: err.message, field: err.field }, { status: err.status });
    console.error("[hr proposals] decision failed", err);
    return NextResponse.json({ error: "บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" }, { status: 500 });
  }
}
