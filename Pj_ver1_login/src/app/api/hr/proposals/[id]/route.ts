import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth/get-session";
import { parseProposalInput } from "@/lib/hr/proposalInput";
import { ProposalError, getProposal, reviseProposal, withdrawProposal } from "@/lib/hr/proposals";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || (session.role !== "HR" && session.role !== "SUPER_ADMIN")) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์ดำเนินการ" }, { status: 403 });
  }
  const { id } = await params;
  const proposal = await getProposal(id);
  if (!proposal) return NextResponse.json({ error: "ไม่พบข้อเสนอนี้" }, { status: 404 });
  return NextResponse.json({ proposal });
}

// ผู้เสนอแก้ข้อเสนอแล้วส่งกลับ (H14) หรือถอนข้อเสนอ
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || (session.role !== "HR" && session.role !== "SUPER_ADMIN")) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์ดำเนินการ" }, { status: 403 });
  }
  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }
  const message = typeof body.message === "string" ? body.message : "";
  try {
    if (body.action === "withdraw") await withdrawProposal(id, session.sub, message);
    else await reviseProposal(id, parseProposalInput(body.input), session.sub, body.submit === true, message);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ProposalError) return NextResponse.json({ error: err.message, field: err.field }, { status: err.status });
    console.error("[hr proposals] update failed", err);
    return NextResponse.json({ error: "บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" }, { status: 500 });
  }
}
