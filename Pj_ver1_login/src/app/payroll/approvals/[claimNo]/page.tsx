import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { getHrEmployee } from "@/lib/hr/employees";
import { getPrimaryBankAccount } from "@/lib/hr/bankAccount";
import { getClaim, getEmployeeBenefits, getPaySettings } from "@/lib/claims/service";
import { availableTotal } from "@/lib/claims/totalCap";
import { getEmployeeTotalCap } from "@/lib/hr/employeeTotalLimit";
import { CLAIM_STATUS_LABEL } from "@/lib/claims/types";
import { payDateOf, thaiDate } from "@/lib/claims/requester";
import { DEFAULT_PAY_SETTINGS, resolvePayDate } from "@/features/payroll/lib/pay-settings";
import { FIN_STATUSES, accountLabel, tenureOf } from "@/lib/payroll/finance";
import { HrPage } from "@/features/hr/ui";
import { ClaimDetailClient, type ClaimDetailData } from "./ClaimDetailClient";

export const dynamic = "force-dynamic";

type Params = Promise<{ claimNo: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { claimNo } = await params;
  return { title: `คำขอ ${decodeURIComponent(claimNo)}` };
}

const plain = (value: number) => value.toLocaleString("th-TH", { maximumFractionDigits: 2 });
const money = (value: number) => value.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const IMAGE = /^image\//;

// F05 รายละเอียดคำขอ (มุมการเงิน): ยอดแก้ไม่ได้ เห็นเฉพาะใบเสร็จ อนุมัติจ่ายหรือส่งกลับ HR
export default async function FinClaimDetailPage({ params }: { params: Params }) {
  const { claimNo } = await params;
  const claim = await getClaim(decodeURIComponent(claimNo));
  if (!claim || !FIN_STATUSES.includes(claim.status)) notFound();

  const [owner, benefits, account, settings, session, totalCap] = await Promise.all([
    getHrEmployee(claim.employeeCode),
    getEmployeeBenefits(claim.employeeCode).catch(() => null),
    getPrimaryBankAccount(claim.employeeCode).catch(() => null),
    getPaySettings().catch(() => DEFAULT_PAY_SETTINGS),
    getSession(),
    getEmployeeTotalCap(claim.employeeCode),
  ]);
  const employee = owner ?? null;
  const hr = [...claim.events].reverse().find((event) => event.kind === "hr_approved") ?? null;
  const returned = [...claim.events].reverse().find((event) => event.kind === "returned") ?? null;
  const paid = [...claim.events].reverse().find((event) => event.kind === "paid") ?? null;

  // วันจ่าย: วันที่เลื่อน/รอบที่ผูกไว้ ถ้ายังไม่ผูกรอบใช้รอบของวันที่ยื่น
  let payDate = payDateOf(claim);
  if (!payDate && claim.submittedAt) {
    const [year, month, day] = new Date(claim.submittedAt).toLocaleDateString("sv-SE", { timeZone: "Asia/Bangkok" }).split("-").map(Number);
    payDate = resolvePayDate(year, month, day <= 15 ? 1 : 2, settings);
  }

  const remainingAll = benefits ? availableTotal(benefits, totalCap) : null;
  const claimsAll = benefits ? benefits.reduce((sum, item) => sum + item.claimsThisYear, 0) : null;
  const maxAll = benefits ? benefits.reduce((sum, item) => sum + (item.maxClaims ?? 0), 0) : 0;
  const approved = claim.amountApproved ?? claim.amountRequested;
  const adjusted = claim.amountApproved !== null && claim.amountApproved !== claim.amountRequested;

  const data: ClaimDetailData = {
    own: claim.employeeCode === session?.sub || claim.submittedByCode === session?.sub,
    claimNo: claim.claimNo,
    status: claim.status,
    statusLabel: claim.status === "pending_finance" ? "รอการเงินอนุมัติ" : claim.status === "finance_returned" ? "ส่งกลับ HR" : CLAIM_STATUS_LABEL[claim.status],
    title: `${claim.claimNo} · ${claim.benefitName}`,
    subtitle: [hr ? `HR อนุมัติ ${thaiDate(hr.at)}${hr.actorName ? ` โดย ${hr.actorName}` : ""}` : null, payDate ? `${claim.status === "paid" ? "จ่ายเมื่อ" : "รอบจ่าย"} ${thaiDate(payDate)}` : null]
      .filter(Boolean)
      .join(" · "),
    payDateShort: payDate ? new Date(`${payDate.slice(0, 10)}T00:00:00+07:00`).toLocaleDateString("th-TH", { day: "numeric", month: "short", timeZone: "Asia/Bangkok" }) : null,
    person: {
      name: employee?.name ?? claim.employeeName,
      code: claim.employeeCode,
      photoUrl: employee?.photoUrl ?? null,
      position: employee?.position ?? null,
      department: employee?.department ?? claim.department,
      level: employee?.jobLevel ?? null,
      tenure: employee ? tenureOf(employee.hireDate) : null,
      supervisor: employee?.manager?.name ?? null,
      employmentStatus: employee?.statusLabel ?? "ไม่พบในระบบ",
      claimsThisYear: claimsAll === null ? null : maxAll > 0 ? `${claimsAll}/${maxAll} ครั้ง` : `${claimsAll} ครั้ง`,
      available: remainingAll !== null ? `฿${plain(remainingAll)}` : null,
      proxyBy: claim.submittedByCode !== claim.employeeCode ? claim.submittedByName : null,
    },
    account: account && accountLabel(account) !== "ไม่มีบัญชีรับเงิน" ? accountLabel(account) : null,
    amounts: { requested: money(claim.amountRequested), approved: money(approved), transfer: money(approved) },
    adjustNote: adjusted ? `HR ปรับยอด${hr?.note ? `: ${hr.note}` : ` จาก ฿${plain(claim.amountRequested)} เป็น ฿${plain(approved)}`}` : null,
    // การเงินเห็นเฉพาะใบเสร็จ เอกสารสุขภาพ (is_restricted / ใบรับรองแพทย์) ไม่ส่งมาที่หน้านี้
    receipts: claim.attachments
      .filter(
        (file) =>
          !file.isRestricted &&
          file.docKind !== "medical_certificate" &&
          !/(ใบรับรองแพทย์|medical|med[-_ ]?cert)/i.test(file.fileName) &&
          ((file.docKind ?? "receipt") === "receipt" || file.docKind === "other"),
      )
      .map((file) => ({ id: file.id, name: file.fileName, isImage: IMAGE.test(file.mimeType), src: `/api/claims/attachments/${file.id}` })),
    receiptLines: claim.receipts.map((receipt) => ({
      label: [receipt.issuerName, receipt.receiptNo ? `เลขที่ ${receipt.receiptNo}` : null, receipt.receiptDate ? thaiDate(receipt.receiptDate) : null].filter(Boolean).join(" · ") || "ใบเสร็จ",
      amount: receipt.amount === null ? "—" : money(receipt.amount),
    })),
    history:
      claim.status === "finance_returned" && returned
        ? `ส่งกลับ HR ${thaiDate(returned.at)}${returned.actorName ? ` โดย ${returned.actorName}` : ""}: ${returned.note ?? ""}`
        : claim.status === "paid" && paid
          ? `โอนแล้ว ${thaiDate(paid.at)}${claim.payment?.transferRef ? ` · เลขอ้างอิง ${claim.payment.transferRef}` : ""}`
          : null,
    advance: Boolean(claim.advance),
  };

  return (
    <HrPage>
      <ClaimDetailClient data={data} />
    </HrPage>
  );
}
