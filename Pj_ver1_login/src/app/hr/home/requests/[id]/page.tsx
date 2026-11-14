import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { getHrEmployees } from "@/lib/hr/employees";
import { getClaim, getEmployeeBenefits, getPaySettings } from "@/lib/claims/service";
import { toPendingRequest } from "@/lib/claims/mappers";
import { CLAIM_STATUS_LABEL } from "@/lib/claims/types";
import { baht, payDateOf, thaiDate } from "@/lib/claims/requester";
import { DEFAULT_PAY_SETTINGS } from "@/features/payroll/lib/pay-settings";
import { currentRound } from "@/lib/claims/requester";
import { initialsOf, proxyReasonOf, tabOf } from "@/features/hr/queue";
import { findBlockers } from "../../queueRules";
import { ReviewClient, type ReviewData } from "./ReviewClient";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  return { title: `ตรวจคำขอ ${decodeURIComponent(id)}` };
}

const DECIDED_KIND = { approved: "hr_approved", rejected: "rejected", revision: "revision_requested" } as const;

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

// H02 ตรวจคำขอ: HR ตัดสินคำขอที่หน้านี้เท่านั้น (อนุมัติพร้อมปรับยอด / ส่งกลับ / ไม่อนุมัติ)
export default async function ReviewPage({ params }: { params: Params }) {
  const { id } = await params;
  const claim = await getClaim(decodeURIComponent(id));
  const tab = claim ? tabOf(claim.status) : null;
  if (!claim || !tab) notFound();

  const [employees, session, benefits, settings] = await Promise.all([
    getHrEmployees(),
    getSession(),
    getEmployeeBenefits(claim.employeeCode),
    getPaySettings().catch(() => DEFAULT_PAY_SETTINGS),
  ]);
  const employee = employees?.find((item) => item.code === claim.employeeCode) ?? null;
  const request = toPendingRequest(claim);
  const blockers = findBlockers(request, employee, session?.sub ?? null);
  const benefit = benefits?.find((item) => item.code === claim.benefitCode) ?? null;
  const name = employee?.name ?? claim.employeeName;
  const proxy = claim.submittedByCode !== claim.employeeCode;
  const decided = tab === "pending" ? null : [...claim.events].reverse().find((event) => event.kind === DECIDED_KIND[tab]);
  const counted = tab === "pending" || tab === "revision";
  const usedBefore = claim.used;
  const leftAfter = claim.limit > 0 ? claim.limit - usedBefore - claim.amountRequested : null;
  const claimsBefore = benefit ? benefit.claimsThisYear - (counted || tab === "approved" ? 1 : 0) : null;
  const payDate = payDateOf(claim) ?? currentRound(settings).payDate;
  const remainingAll = benefits ? benefits.reduce((sum, item) => sum + Math.max(item.remaining, 0), 0) : null;
  const claimsAll = benefits ? benefits.reduce((sum, item) => sum + item.claimsThisYear, 0) : null;

  const facts = [
    { label: "ผู้รับสิทธิ์", value: "ตัวเอง" },
    { label: "ผู้ให้บริการ", value: claim.providerName || "—" },
    { label: "วันที่เกิดค่าใช้จ่าย", value: claim.expenseDate ? thaiDate(`${claim.expenseDate}T00:00:00+07:00`) : "—" },
    { label: "เลขที่ใบเสร็จ", value: claim.receipts[0]?.receiptNo || "—" },
    { label: "วันที่ในใบเสร็จ", value: claim.receipts[0]?.receiptDate ? thaiDate(`${claim.receipts[0].receiptDate}T00:00:00+07:00`) : "—" },
    { label: "ยอดขอเบิก", value: baht(claim.amountRequested), strong: true },
    ...Object.entries(claim.details).map(([label, value]) => ({ label, value })),
    ...(claim.note ? [{ label: "หมายเหตุ", value: claim.note, wide: true }] : []),
  ];

  const checks = [
    { ok: !blockers.some((item) => item.message.includes("วงเงิน")), text: leftAfter !== null ? (leftAfter >= 0 ? "ไม่เกินวงเงินคงเหลือ" : `เกินวงเงินคงเหลือ ${baht(-leftAfter)}`) : "สวัสดิการนี้ไม่มีเพดานวงเงินรายปี" },
    {
      ok: !(benefit && benefit.maxClaims !== null && benefit.claimsThisYear > benefit.maxClaims),
      text: benefit?.maxClaims != null ? `จำนวนครั้ง ${benefit.claimsThisYear}/${benefit.maxClaims} ครั้งของปีนี้` : "ไม่จำกัดจำนวนครั้ง",
    },
    { ok: claim.attachments.length > 0, text: claim.attachments.length > 0 ? `แนบเอกสาร ${claim.attachments.length} ไฟล์` : "ไม่มีใบเสร็จหรือเอกสารประกอบ" },
    { ok: employee?.status === "ACTIVE", text: employee ? `พนักงาน${employee.statusLabel}` : "ไม่พบพนักงานในระบบ" },
  ];

  const data: ReviewData = {
    claimNo: claim.claimNo,
    status: claim.status,
    statusLabel: CLAIM_STATUS_LABEL[claim.status],
    tab,
    title: claim.benefitName,
    subtitle: [claim.benefitName, proxy ? `ยื่นแทนโดย ${claim.submittedByName}` : "ยื่นเอง", claim.submittedAt ? `ยื่น ${thaiDate(claim.submittedAt)}` : null].filter(Boolean).join(" · "),
    person: {
      name,
      initials: initialsOf(name),
      position: employee?.position ?? "—",
      line: [claim.employeeCode, employee?.department ?? claim.department].filter(Boolean).join(" · "),
      grid: [
        { label: "ระดับ", value: employee?.jobLevel ?? "—" },
        { label: "อายุงาน", value: employee ? tenureOf(employee.hireDate) : "—" },
        { label: "หัวหน้า", value: employee?.manager?.name ?? "—" },
        { label: "สถานะ", value: employee?.statusLabel ?? "ไม่พบในระบบ" },
        { label: "เบิกปีนี้", value: claimsAll !== null ? `${claimsAll} ครั้ง` : "—" },
        { label: "วงเงินใช้ได้", value: remainingAll !== null ? baht(remainingAll) : "—" },
      ],
      profileHref: employee ? `/hr/employees/${encodeURIComponent(employee.code)}` : null,
    },
    proxy: proxy ? { by: claim.submittedByName, reason: proxyReasonOf(claim.note) } : null,
    entitlement: {
      title: `สิทธิ์${claim.benefitName}ของผู้ขอ`,
      rows: [
        { label: "วงเงิน", value: claim.limit > 0 ? `${baht(claim.limit)} / ${benefit?.budgetLabel ?? "รอบ"}` : "ไม่มีเพดาน" },
        { label: "ใช้ไปก่อนคำขอนี้", value: `${baht(usedBefore)}${benefit?.maxClaims != null && claimsBefore !== null ? ` · ${Math.max(claimsBefore, 0)}/${benefit.maxClaims} ครั้ง` : ""}` },
        {
          label: "หลังอนุมัติ",
          value: `${leftAfter !== null ? `เหลือ ${baht(Math.max(leftAfter, 0))}` : "—"}${benefit?.maxClaims != null && claimsBefore !== null ? ` · ${Math.max(claimsBefore, 0) + 1}/${benefit.maxClaims} ครั้ง` : ""}`,
          strong: true,
        },
      ],
    },
    facts,
    checks,
    blockers: blockers.map((item) => ({ message: item.message, action: item.action, reason: item.reason })),
    attachments: request.attachments ?? [],
    amountRequested: claim.amountRequested,
    amountApproved: claim.amountApproved,
    financeNote: request.financeReturnNote ?? null,
    payNote: `อนุมัติแล้วผู้ขอได้รับเงินรอบ ${thaiDate(payDate)} ถ้าการเงินอนุมัติทัน · บันทึกในประวัติการแก้ไข`,
    decided: decided ? { actor: decided.actorName ?? "HR", at: thaiDate(decided.at), note: decided.note } : null,
    canDecide: tab === "pending" && session?.role === "HR" && !blockers.some((item) => item.action === null),
    readOnlyReason: tab !== "pending" ? null : session?.role !== "HR" ? "เปิดดูได้อย่างเดียว การตัดสินคำขอเป็นงานของ HR" : blockers.find((item) => item.action === null)?.message ?? null,
  };

  return (
    <div className="mx-auto flex w-full max-w-[1140px] flex-col gap-4 text-14 text-ink">
      <ReviewClient data={data} />
    </div>
  );
}
