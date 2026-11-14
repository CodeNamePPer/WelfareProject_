import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { getHrEmployees } from "@/lib/hr/employees";
import { getBenefitMaxClaims } from "@/lib/hr/claimReview";
import { getClaimAdvance, summarizeAdvance, type AdvanceStatus } from "@/lib/hr/advances";
import { getEmployeeBenefits } from "@/lib/claims/service";
import { thaiDate, thaiDayMonth } from "@/lib/claims/requester";
import { HrPage, type BadgeTone } from "@/features/hr/ui";
import { ReceiptReviewClient, type ReceiptReviewData } from "./ReceiptReviewClient";

export const dynamic = "force-dynamic";

type Params = Promise<{ claimNo: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { claimNo } = await params;
  return { title: `ตรวจใบเสร็จเบิกล่วงหน้า ${decodeURIComponent(claimNo)}` };
}

const money = (value: number) => `฿${value.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const plain = (value: number) => value.toLocaleString("th-TH", { maximumFractionDigits: 2 });

const STATUS: Record<AdvanceStatus, { label: string; tone: BadgeTone }> = {
  awaiting_receipt: { label: "รอผู้ขอแนบใบเสร็จ", tone: "neutral" },
  receipt_submitted: { label: "รอ HR ตรวจใบเสร็จ", tone: "review" },
  receipt_returned: { label: "ส่งกลับให้แนบใหม่", tone: "revise" },
  settled: { label: "ตรวจใบเสร็จแล้ว", tone: "approved" },
  cancelled_overdue: { label: "ยกเลิก เกินกำหนดแนบใบเสร็จ", tone: "rejected" },
};

/** อายุงานจากวันเริ่มงาน เช่น "8 ปี 7 เดือน" */
function tenureOf(hireDate: string, today = new Date()) {
  const start = new Date(`${hireDate}T00:00:00+07:00`);
  let months = (today.getFullYear() - start.getFullYear()) * 12 + today.getMonth() - start.getMonth();
  if (today.getDate() < start.getDate()) months -= 1;
  if (months < 0) return "—";
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return [years ? `${years} ปี` : "", rest ? `${rest} เดือน` : "", !years && !rest ? "ไม่ถึง 1 เดือน" : ""].filter(Boolean).join(" ");
}

// H13 ตรวจใบเสร็จเบิกล่วงหน้า: อ่านจาก welfare_claim_advance (ไม่พบรายการ = 404)
export default async function ReceiptReviewPage({ params }: { params: Params }) {
  const { claimNo } = await params;
  const found = await getClaimAdvance(decodeURIComponent(claimNo)).catch(() => null);
  if (!found) notFound();
  const { claim, advance } = found;

  const [session, employees, benefits, maxClaims] = await Promise.all([
    getSession(),
    getHrEmployees(),
    getEmployeeBenefits(claim.employeeCode).catch(() => null),
    getBenefitMaxClaims().catch(() => null),
  ]);
  const employee = employees?.find((item) => item.code === claim.employeeCode) ?? null;
  const summary = summarizeAdvance(claim, advance);
  const remainingAll = benefits ? benefits.reduce((sum, item) => sum + Math.max(item.remaining, 0), 0) : null;
  const claimsAll = benefits ? benefits.reduce((sum, item) => sum + item.claimsThisYear, 0) : null;
  const maxAll = maxClaims ? [...maxClaims.values()].reduce<number>((sum, value) => sum + (value ?? 0), 0) : 0;
  const due = thaiDayMonth(advance.receiptDueDate);
  const own = claim.employeeCode === session?.sub;
  const isHr = session?.role === "HR";

  const rows: ReceiptReviewData["rows"] = [
    { label: "ยอดตามใบเสร็จ", value: advance.receiptAmount === null ? "ยังไม่ได้แนบ" : money(advance.receiptAmount) },
    { label: `จ่ายล่วงหน้าแล้ว${advance.advancePaidAt ? ` (${thaiDayMonth(advance.advancePaidAt)})` : ""}`, value: `− ${money(advance.advanceAmount)}` },
    { label: "วงเงินคงเหลือสิทธิ์นี้", value: summary.remainingLimit === null ? "ไม่มีเพดาน" : money(summary.remainingLimit) },
  ];
  const result: ReceiptReviewData["result"] =
    advance.status === "cancelled_overdue"
      ? { label: "ผู้ขอต้องคืนยอดล่วงหน้าทั้งหมด", value: money(advance.advanceAmount), tone: "warn" }
      : advance.status === "settled"
        ? advance.settlement === "extra_payment"
          ? { label: "จ่ายเพิ่มที่อนุมัติ", value: money(advance.extraAmountApproved ?? 0), tone: "info" }
          : advance.settlement === "refund"
            ? { label: "ผู้ขอคืนส่วนต่าง", value: money(advance.refundAmount ?? 0), tone: "warn" }
            : { label: "ยอดตรงกับเงินล่วงหน้า", value: money(0), tone: "info" }
        : summary.difference === null
          ? null
          : summary.difference > 0
            ? { label: "จ่ายเพิ่มได้ (ไม่เกินวงเงิน)", value: money(summary.maxExtra), tone: "info" }
            : summary.difference < 0
              ? { label: "ผู้ขอต้องคืนส่วนต่าง", value: money(summary.refund), tone: "warn" }
              : { label: "ยอดตรงกับเงินล่วงหน้า", value: money(0), tone: "info" };

  const data: ReceiptReviewData = {
    claimNo: claim.claimNo,
    subtitle: [
      claim.benefitName,
      advance.receiptSubmittedAt
        ? `แนบใบเสร็จ ${thaiDate(advance.receiptSubmittedAt)} (${advance.receiptSubmittedAt.slice(0, 10) <= advance.receiptDueDate ? "ก่อน" : "หลัง"}ครบกำหนด ${due})`
        : `ครบกำหนดแนบใบเสร็จ ${thaiDate(advance.receiptDueDate)}`,
    ].join(" · "),
    status: STATUS[advance.status],
    person: {
      name: employee?.name ?? claim.employeeName,
      code: claim.employeeCode,
      position: employee?.position ?? null,
      department: employee?.department ?? claim.department,
      level: employee?.jobLevel ?? null,
      tenure: employee ? tenureOf(employee.hireDate) : null,
      supervisor: employee?.manager?.name ?? null,
      employmentStatus: employee?.statusLabel ?? "ไม่พบในระบบ",
      claimsThisYear: claimsAll === null ? null : maxAll > 0 ? `${claimsAll}/${maxAll} ครั้ง` : `${claimsAll} ครั้ง`,
      available: remainingAll !== null ? `฿${plain(remainingAll)}` : null,
      profileHref: employee ? `/hr/employees/${encodeURIComponent(employee.code)}` : undefined,
    },
    rows,
    result,
    overLimitNote: advance.status === "receipt_submitted" && summary.overLimit > 0 ? `อีก ฿${plain(summary.overLimit)} เกินวงเงิน ผู้ขอรับผิดชอบเอง` : null,
    attachments: claim.attachments.map((file) => ({ id: file.id, name: file.fileName, src: `/api/claims/attachments/${file.id}`, isImage: file.mimeType.startsWith("image/") })),
    canReview: advance.status === "receipt_submitted" && isHr && !own,
    canCancel: summary.overdue && isHr && !own,
    maxExtra: summary.difference !== null && summary.difference > 0 ? summary.maxExtra : null,
    dueLabel: due,
    reviewNote: advance.reviewNote,
    readOnlyReason:
      advance.status === "receipt_submitted" || summary.overdue ? (!isHr ? "เปิดดูได้อย่างเดียว การตรวจใบเสร็จเป็นงานของ HR" : own ? "เป็นคำขอของคุณเอง ต้องให้ HR คนอื่นตรวจ" : null) : null,
  };

  return (
    <HrPage>
      <ReceiptReviewClient data={data} />
    </HrPage>
  );
}
