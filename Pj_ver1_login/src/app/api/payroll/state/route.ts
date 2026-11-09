import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth/get-session";
import { claimErrorResponse, ClaimInputError, getPayrollState, savePaySettings, setPayDate } from "@/lib/claims/service";
import { validatePaySettings, type PaySettings } from "@/features/payroll/lib/pay-settings";

export const runtime = "nodejs";

async function financeSession() {
  const session = await getSession();
  return session?.role === "FINANCE" ? session : null;
}

const forbidden = () => NextResponse.json({ error: "ไม่มีสิทธิ์ดำเนินการ" }, { status: 403 });

export async function GET() {
  if (!(await financeSession())) return forbidden();
  try {
    return NextResponse.json(await getPayrollState());
  } catch (err) {
    const { status, body } = claimErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}

/** บันทึกวันจ่ายของแต่ละรอบ */
export async function PUT(req: NextRequest) {
  if (!(await financeSession())) return forbidden();
  try {
    const settings = (await req.json()) as PaySettings;
    const errors = validatePaySettings(settings);
    if (errors.round1 || errors.round2) throw new ClaimInputError((errors.round1 ?? errors.round2) as string);
    await savePaySettings(settings);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const { status, body } = claimErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}

/** เลื่อนวันจ่ายรายคำขอ (date = null คือยกเลิกการเลื่อน) */
export async function POST(req: NextRequest) {
  const session = await financeSession();
  if (!session) return forbidden();
  try {
    const body = await req.json();
    if (!Array.isArray(body.ids)) throw new ClaimInputError("ข้อมูลไม่ถูกต้อง");
    await setPayDate(body.ids, body.date ?? null, String(body.reason ?? ""), { sub: session.sub, role: session.role });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const { status, body } = claimErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}
