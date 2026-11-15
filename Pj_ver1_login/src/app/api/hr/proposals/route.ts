import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth/get-session";
import { getClientIp } from "@/lib/auth/network";
import { writeAudit } from "@/lib/auth/audit";
import { isHrHead } from "@/lib/hr/hrHead";
import { parseProposalInput } from "@/lib/hr/proposalInput";
import { ProposalError, closeBenefitDirect, createBenefitDirect, createProposal, updateBenefitDirect } from "@/lib/hr/proposals";

export const runtime = "nodejs";

// HR หรือ Admin เสนอสร้าง/แก้ไข/ปิดใช้สวัสดิการ (ร่าง หรือส่งให้หัวหน้า HR) · หัวหน้า HR สร้าง แก้ไข หรือปิดเองได้ทันที
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== "HR" && session.role !== "SUPER_ADMIN")) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์ดำเนินการ" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }
  const kind = body.kind === "update" || body.kind === "close" ? body.kind : "create";
  const benefitCode = typeof body.benefitCode === "string" ? body.benefitCode.trim() : undefined;
  const input = parseProposalInput(body.input);
  try {
    if (session.role === "HR" && (await isHrHead(session))) {
      const done =
        kind === "create"
          ? await createBenefitDirect(input)
          : kind === "update"
            ? await updateBenefitDirect(benefitCode, input)
            : await closeBenefitDirect(benefitCode, input);
      const verb = kind === "create" ? "สร้าง" : kind === "update" ? "แก้ไข" : "ปิดรับคำขอ";
      await writeAudit({
        action: kind === "create" ? "WELFARE_CREATE" : "WELFARE_UPDATE",
        userId: session.sub,
        ip: getClientIp(req.headers),
        targetId: done.code,
        detail: `หัวหน้า HR ${verb}สวัสดิการ ${input.name.trim()}`,
        reason: input.reason.trim() || undefined,
      });
      return NextResponse.json({ ok: true, direct: true, benefitCode: done.code }, { status: kind === "create" ? 201 : 200 });
    }
    const proposal = await createProposal(
      input,
      { code: session.sub, role: session.role },
      body.submit === true,
      { kind, benefitCode },
    );
    return NextResponse.json({ ok: true, ...proposal }, { status: 201 });
  } catch (err) {
    if (err instanceof ProposalError) return NextResponse.json({ error: err.message, field: err.field }, { status: err.status });
    console.error("[hr proposals] create failed", err);
    return NextResponse.json({ error: "บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" }, { status: 500 });
  }
}
