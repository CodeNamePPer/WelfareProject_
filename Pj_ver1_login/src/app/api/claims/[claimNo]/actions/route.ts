import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth/get-session";
import { applyClaimAction, claimErrorResponse } from "@/lib/claims/service";

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: Promise<{ claimNo: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });

  try {
    const { claimNo } = await params;
    const body = await req.json();
    await applyClaimAction(
      decodeURIComponent(claimNo),
      {
        action: body.action,
        note: typeof body.note === "string" ? body.note : undefined,
        amountApproved: typeof body.amountApproved === "number" ? body.amountApproved : undefined,
        transferRef: typeof body.transferRef === "string" ? body.transferRef : undefined,
      },
      { sub: session.sub, role: session.role },
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    const { status, body } = claimErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}
