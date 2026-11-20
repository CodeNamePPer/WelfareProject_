import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth/get-session";
import { getClientIp } from "@/lib/auth/network";
import { writeAudit } from "@/lib/auth/audit";
import { LimitInputError } from "@/lib/hr/employeeLimits";
import { getEmployeeTotalLimit, saveEmployeeTotalLimit } from "@/lib/hr/employeeTotalLimit";
import { isHrHead } from "@/lib/hr/hrHead";

export const runtime = "nodejs";

// ปรับวงเงินรวมต่อปีรายคน: เฉพาะหัวหน้า HR และบันทึก Log ทุกครั้ง amount = null คือไม่จำกัด
export async function POST(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const session = await getSession();
  if (!session || !(await isHrHead(session))) return NextResponse.json({ error: "ปรับวงเงินรวมได้เฉพาะหัวหน้า HR" }, { status: 403 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }
  const { code } = await params;
  const employeeCode = decodeURIComponent(code);
  const amount = body.amount === null ? null : typeof body.amount === "number" ? body.amount : Number.NaN;
  const effectiveFrom = typeof body.effectiveFrom === "string" ? body.effectiveFrom : "";
  const reason = typeof body.reason === "string" ? body.reason : "";

  try {
    const before = (await getEmployeeTotalLimit(employeeCode))?.current ?? null;
    await saveEmployeeTotalLimit({ employeeCode, amount, effectiveFrom, reason });
    await writeAudit({
      action: "EMPLOYEE_TOTAL_LIMIT_UPDATE",
      userId: session.sub,
      ip: getClientIp(req.headers),
      targetId: employeeCode,
      detail: `ปรับวงเงินรวมต่อปีของ ${employeeCode} มีผล ${effectiveFrom}`,
      changes: { total: { old: before?.amount ?? null, new: amount } },
      reason: reason.trim(),
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof LimitInputError) return NextResponse.json({ error: err.message, field: err.field }, { status: 400 });
    console.error("[hr employee total limit] save failed", err);
    return NextResponse.json({ error: "บันทึกวงเงินรวมไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" }, { status: 500 });
  }
}
