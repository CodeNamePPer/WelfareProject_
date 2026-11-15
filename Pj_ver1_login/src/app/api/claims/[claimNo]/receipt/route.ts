import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth/get-session";
import { claimErrorResponse, submitAdvanceReceipt } from "@/lib/claims/service";

export const runtime = "nodejs";

/** ผู้ขอแนบใบเสร็จจริงของคำขอเบิกล่วงหน้า: multipart amount, receiptNo, receiptDate, issuerName, files */
export async function POST(req: NextRequest, { params }: { params: Promise<{ claimNo: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });

  try {
    const { claimNo } = await params;
    const form = await req.formData();
    const text = (key: string) => {
      const value = form.get(key);
      return typeof value === "string" ? value.trim() : "";
    };
    await submitAdvanceReceipt(
      decodeURIComponent(claimNo),
      {
        amount: Number(text("amount")) || 0,
        receiptNo: text("receiptNo"),
        receiptDate: text("receiptDate"),
        issuerName: text("issuerName"),
        files: form.getAll("files").filter((item): item is File => item instanceof File && item.size > 0),
      },
      { sub: session.sub, role: session.role },
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    const { status, body } = claimErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}
