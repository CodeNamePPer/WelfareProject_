import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth/get-session";
import { claimErrorResponse, ClaimInputError, saveClaim } from "@/lib/claims/service";

export const runtime = "nodejs";

/** บันทึกฉบับร่างหรือยื่นคำขอ: multipart โดยมีช่อง payload เป็น JSON และช่อง files เป็นไฟล์แนบ */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });

  try {
    const form = await req.formData();
    const raw = form.get("payload");
    if (typeof raw !== "string") throw new ClaimInputError("ข้อมูลไม่ถูกต้อง");
    const payload = JSON.parse(raw) as Record<string, unknown>;
    const text = (key: string) => (typeof payload[key] === "string" ? (payload[key] as string).trim() : "");
    const details = typeof payload.details === "object" && payload.details !== null ? (payload.details as Record<string, string>) : {};
    const files = form.getAll("files").filter((item): item is File => item instanceof File && item.size > 0);

    const result = await saveClaim(
      {
        claimNo: text("claimNo") || undefined,
        employeeCode: text("employeeCode") || session.sub,
        benefitCode: text("benefitCode"),
        amount: Number(payload.amount) || 0,
        expenseDate: text("expenseDate"),
        providerName: text("providerName"),
        note: text("note"),
        details,
        receiptNo: text("receiptNo"),
        receiptDate: text("receiptDate"),
        submit: payload.submit === true,
        files,
      },
      { sub: session.sub, role: session.role },
    );
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const { status, body } = claimErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}
