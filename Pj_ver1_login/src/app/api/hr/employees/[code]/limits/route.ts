import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth/get-session";
import { getClientIp } from "@/lib/auth/network";
import { writeAudit } from "@/lib/auth/audit";
import { LimitInputError, getEmployeeLimits, saveEmployeeLimit } from "@/lib/hr/employeeLimits";
import { isHrHead } from "@/lib/hr/hrHead";

export const runtime = "nodejs";

// ปรับวงเงินรายคน (ดีไซน์ H09): เฉพาะหัวหน้า HR (หัวหน้าฝ่ายทรัพยากรบุคคล) และบันทึก Log ทุกครั้ง
export async function POST(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const session = await getSession();
  if (!session || !(await isHrHead(session))) return NextResponse.json({ error: "ปรับวงเงินรายคนได้เฉพาะหัวหน้า HR" }, { status: 403 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }
  const { code } = await params;
  const employeeCode = decodeURIComponent(code);
  const benefitCode = typeof body.benefitCode === "string" ? body.benefitCode : "";
  const amount = typeof body.amount === "number" ? body.amount : Number.NaN;
  const effectiveFrom = typeof body.effectiveFrom === "string" ? body.effectiveFrom : "";
  const reason = typeof body.reason === "string" ? body.reason : "";

  try {
    const before = (await getEmployeeLimits(employeeCode))?.get(benefitCode)?.current ?? null;
    await saveEmployeeLimit({ employeeCode, benefitCode, amount, effectiveFrom, reason });
    await writeAudit({
      action: "EMPLOYEE_LIMIT_UPDATE",
      userId: session.sub,
      ip: getClientIp(req.headers),
      targetId: employeeCode,
      detail: `ปรับวงเงินรายคน ${benefitCode} ของ ${employeeCode} มีผล ${effectiveFrom}`,
      changes: { [benefitCode]: { old: before?.amount ?? null, new: amount } },
      reason: reason.trim(),
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof LimitInputError) return NextResponse.json({ error: err.message, field: err.field }, { status: 400 });
    console.error("[hr employee limits] save failed", err);
    return NextResponse.json({ error: "บันทึกวงเงินไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" }, { status: 500 });
  }
}
