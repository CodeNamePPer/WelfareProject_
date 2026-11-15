import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth/get-session";
import { ClaimInputError, claimErrorResponse } from "@/lib/claims/service";
import { carryToNextRound, recordPaymentResult, recordRefund, rescheduleRound } from "@/lib/payroll/actions";

export const runtime = "nodejs";

// คำสั่งของการเงิน: บันทึกผลการโอน (F06) ยกไปรอบถัดไป (F06) เลื่อนวันจ่ายของรอบ (F07) รับเงินคืน (F09)
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (session?.role !== "FINANCE") return NextResponse.json({ error: "ไม่มีสิทธิ์ดำเนินการ" }, { status: 403 });
  const actor = { sub: session.sub, role: session.role };
  try {
    const body = await req.json();
    const text = (value: unknown) => (typeof value === "string" ? value : "");
    switch (body.type) {
      case "payment_result":
        if (body.result !== "success" && body.result !== "failed") throw new ClaimInputError("ข้อมูลไม่ถูกต้อง");
        await recordPaymentResult(text(body.claimNo), { result: body.result, ref: text(body.ref), reason: text(body.reason) }, actor);
        return NextResponse.json({ ok: true });
      case "carry_over":
        await carryToNextRound(text(body.claimNo), actor);
        return NextResponse.json({ ok: true });
      case "reschedule_round":
        return NextResponse.json({ ok: true, ...(await rescheduleRound(text(body.key), text(body.date), text(body.reason), actor)) });
      case "refund_received":
        await recordRefund(text(body.claimNo), actor);
        return NextResponse.json({ ok: true });
      default:
        throw new ClaimInputError("คำสั่งไม่ถูกต้อง");
    }
  } catch (err) {
    const { status, body } = claimErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}
