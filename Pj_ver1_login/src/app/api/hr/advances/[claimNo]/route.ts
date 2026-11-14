import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth/get-session";
import { AdvanceInputError, settleAdvance, type AdvanceAction } from "@/lib/hr/advances";

export const runtime = "nodejs";

const ACTIONS: AdvanceAction[] = ["approve", "return", "cancel_overdue"];

// ตรวจใบเสร็จเบิกล่วงหน้า (ดีไซน์ H13): เฉพาะ HR · บันทึก welfare_claim_advance และประวัติใน welfare_claim_event
export async function POST(req: NextRequest, { params }: { params: Promise<{ claimNo: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "HR") return NextResponse.json({ error: "ตรวจใบเสร็จเบิกล่วงหน้าได้เฉพาะ HR" }, { status: 403 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }
  const action = ACTIONS.find((item) => item === body.action);
  if (!action) return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  const { claimNo } = await params;

  try {
    const result = await settleAdvance(
      decodeURIComponent(claimNo),
      { action, extraAmount: typeof body.extraAmount === "number" ? body.extraAmount : undefined, note: typeof body.note === "string" ? body.note : "" },
      { sub: session.sub, role: session.role },
    );
    return NextResponse.json({ ok: true, status: result.status });
  } catch (err) {
    if (err instanceof AdvanceInputError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("[hr advances] save failed", err);
    return NextResponse.json({ error: "บันทึกผลการตรวจไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" }, { status: 500 });
  }
}
