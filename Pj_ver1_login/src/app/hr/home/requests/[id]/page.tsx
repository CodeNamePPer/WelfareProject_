import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { getHrEmployees } from "@/lib/hr/employees";
import { getPrimaryBankAccount } from "@/lib/hr/bankAccount";
import { getBenefitMaxClaims, getClaimReviewFields, type DocKind } from "@/lib/hr/claimReview";
import { getClaim, getEmployeeBenefits, getPaySettings } from "@/lib/claims/service";
import { toPendingRequest } from "@/lib/claims/mappers";
import { CLAIM_STATUS_LABEL } from "@/lib/claims/types";
import { currentRound, payDateOf, thaiDate, thaiDayMonth } from "@/lib/claims/requester";
import { DEFAULT_PAY_SETTINGS } from "@/features/payroll/lib/pay-settings";
import { claimKindOf, proxyReasonOf, roundCutoff, tabOf } from "@/features/hr/queue";
import { HrPage } from "@/features/hr/ui";
import { findBlockers } from "../../queueRules";
import { ReviewClient, type ReviewData } from "./ReviewClient";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  return { title: `ตรวจคำขอ ${decodeURIComponent(id)}` };
}

const DECIDED_KIND = { approved: "hr_approved", rejected: "rejected", revision: "revision_requested" } as const;

/** ยอดเงินแบบดีไซน์ H02: ทศนิยม 2 ตำแหน่งเสมอ เช่น ฿5,200.00 */
const money = (value: number) => `฿${value.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
/** ตัวเลขในข้อความตรวจ เช่น 5,200 */
const plain = (value: number) => value.toLocaleString("th-TH", { maximumFractionDigits: 2 });

const RELATION: Record<string, string> = { self: "ตัวเอง", spouse: "คู่สมรส", child: "บุตร", parent: "บิดามารดา" };
const DOC_LABEL: Record<DocKind, string> = {
  receipt: "ใบเสร็จ",
  medical_certificate: "ใบรับรองแพทย์",
  insurance_claim: "ใบแจ้งผลสินไหม",
  certificate: "ใบประกาศนียบัตร",
  other: "เอกสารอื่น",
};
const MEDICAL_FORMS = ["medical", "dental", "checkup", "child_medical", "child_vaccine"];

/** ป้ายของช่องผู้ให้บริการและวันที่ ตามชนิดแบบฟอร์ม */
function labelsOf(formType: string | null) {
  if (formType && MEDICAL_FORMS.includes(formType)) return { provider: "สถานพยาบาล", date: "วันที่รับบริการ" };
  if (formType === "training") return { provider: "สถาบัน", date: "วันที่อบรม" };
  return { provider: "ผู้ให้บริการ", date: "วันที่เกิดค่าใช้จ่าย" };
}

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

// H02 ตรวจคำขอ (ตามดีไซน์): HR ตัดสินคำขอที่หน้านี้เท่านั้น
export default async function ReviewPage({ params }: { params: Params }) {
  const { id } = await params;
  const claim = await getClaim(decodeURIComponent(id));
  const tab = claim ? tabOf(claim.status) : null;
  if (!claim || !tab) notFound();

  // ยื่นแทน: วงเงิน จำนวนครั้ง และบัญชี ใช้ของพนักงานเจ้าของสิทธิ์ (employeeCode) ไม่ใช่คนกรอก
  const [employees, session, benefits, settings, account, fields, maxClaims] = await Promise.all([
    getHrEmployees(),
    getSession(),
    getEmployeeBenefits(claim.employeeCode),
    getPaySettings().catch(() => DEFAULT_PAY_SETTINGS),
    getPrimaryBankAccount(claim.employeeCode).catch(() => null),
    getClaimReviewFields(claim.id).catch(() => null),
    getBenefitMaxClaims().catch(() => null),
  ]);
  const employee = employees?.find((item) => item.code === claim.employeeCode) ?? null;
  const request = toPendingRequest(claim);
  const blockers = findBlockers(request, employee, session?.sub ?? null);
  const benefit = benefits?.find((item) => item.code === claim.benefitCode) ?? null;
  const name = employee?.name ?? claim.employeeName;
  const proxy = claim.submittedByCode !== claim.employeeCode;
  const decided = tab === "pending" ? null : [...claim.events].reverse().find((event) => event.kind === DECIDED_KIND[tab]);
  const counted = tab === "pending" || tab === "revision" || tab === "approved";
  const leftAfter = claim.limit > 0 ? claim.limit - claim.used - claim.amountRequested : null;
  const max = benefit?.maxClaims ?? null;
  const before = benefit ? Math.max(benefit.claimsThisYear - (counted ? 1 : 0), 0) : null;
  const times = (count: number | null) => (count === null ? "" : max !== null ? ` · ${count}/${max} ครั้ง` : ` · ${count} ครั้ง`);
  const round = currentRound(settings);
  const payDate = payDateOf(claim) ?? round.payDate;
  const cutoff = roundCutoff(round.year, round.month, round.roundNo);
  const remainingAll = benefits ? benefits.reduce((sum, item) => sum + Math.max(item.remaining, 0), 0) : null;
  const claimsAll = benefits ? benefits.reduce((sum, item) => sum + item.claimsThisYear, 0) : null;
  // เพดานรวมชุดเดียวกับหน้ารายชื่อพนักงาน (H05) เพื่อให้ตัวเลข "เบิกปีนี้" ตรงกันทุกหน้า
  const maxAll = maxClaims ? [...maxClaims.values()].reduce<number>((sum, value) => sum + (value ?? 0), 0) : 0;

  const insurancePaid = fields?.insurancePaid ?? null;
  const insured = insurancePaid !== null && insurancePaid > 0;
  const receiptTotal = claim.receipts.reduce((sum, item) => sum + (item.amount ?? 0), 0);
  const totalCost = fields?.totalCost ?? (receiptTotal > 0 ? receiptTotal : claim.amountRequested);
  const labels = labelsOf(claim.formType);
  const relation = fields?.beneficiaryRelation ?? "self";

  // รายละเอียดคำขอ 6 ช่องตามดีไซน์ H02
  const facts: ReviewData["facts"] = [
    { label: "ผู้รับสิทธิ์", value: relation === "self" ? "ตัวเอง" : `${RELATION[relation] ?? relation}${fields?.beneficiaryName ? ` · ${fields.beneficiaryName}` : ""}` },
    { label: labels.provider, value: claim.providerName || "—" },
    { label: labels.date, value: claim.expenseDate ? thaiDate(`${claim.expenseDate}T00:00:00+07:00`) : "—" },
    { label: "ค่าใช้จ่ายทั้งหมด", value: money(totalCost) },
    { label: "ประกันจ่ายแล้ว", value: insured ? `${money(insurancePaid)}${fields?.insurerName ? ` · ${fields.insurerName}` : ""}` : "ไม่มี" },
    { label: insured ? "ขอเบิก (ส่วนเกิน)" : "ขอเบิก", value: money(claim.amountRequested), strong: true },
  ];

  const withinLimit = !blockers.some((item) => item.message.includes("วงเงิน")) && !(max !== null && benefit && benefit.claimsThisYear > max);
  const checks = [
    ...(insured
      ? [{ ok: totalCost - insurancePaid === claim.amountRequested, text: `ยอดส่วนเกินตรงกับใบเสร็จและใบแจ้งสินไหม (${plain(totalCost)} − ${plain(insurancePaid)} = ${plain(totalCost - insurancePaid)})` }]
      : []),
    { ok: withinLimit, text: withinLimit ? "ไม่เกินวงเงินและจำนวนครั้ง" : "เกินวงเงินหรือจำนวนครั้งที่เบิกได้" },
    { ok: claim.attachments.length > 0, text: claim.attachments.length > 0 ? `เอกสารครบ ${claim.attachments.length} รายการ` : "ไม่มีเอกสารแนบ" },
    // พนักงานลาออก/เสียชีวิตเบิกไม่ได้ แสดงเฉพาะเมื่อไม่ผ่าน
    ...(employee?.status === "ACTIVE" ? [] : [{ ok: false, text: employee ? `พนักงาน${employee.statusLabel} ไม่มีสิทธิ์เบิก` : "ไม่พบพนักงานในระบบ" }]),
  ];

  // ปุ่มเอกสารตั้งชื่อตามประเภท ถ้าซ้ำกันเติมลำดับ
  const seen = new Map<string, number>();
  const attachments = claim.attachments.map((file, index) => {
    const kind = fields?.docKinds[file.id] ?? "other";
    const base = DOC_LABEL[kind];
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    return { ...(request.attachments ?? [])[index], label: base, kind, locked: kind === "medical_certificate", n };
  });
  const labelled = attachments.map((file) => ({ ...file, label: (seen.get(file.label) ?? 0) > 1 ? `${file.label} ${file.n}` : file.label }));

  const data: ReviewData = {
    claimNo: claim.claimNo,
    status: claim.status,
    statusLabel: CLAIM_STATUS_LABEL[claim.status],
    tab,
    subtitle: [claim.benefitName, claimKindOf({ insurancePaid }).long, claim.submittedAt ? `ยื่น ${thaiDate(claim.submittedAt)}` : null].filter(Boolean).join(" · "),
    person: {
      name,
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
      proxyBy: proxy ? claim.submittedByName : null,
    },
    proxy: proxy
      ? {
          by: claim.submittedByName,
          reason: fields?.proxyReason ?? proxyReasonOf(claim.note),
          owner: name,
          account: account ? `${account.bankCode} ${account.accountMasked}` : null,
        }
      : null,
    entitlement: {
      title: `สิทธิ์${claim.benefitName}ของผู้ขอ`,
      rows: [
        { label: "วงเงิน", value: claim.limit > 0 ? `฿${plain(claim.limit)} / ${benefit?.budgetLabel ?? "รอบ"}` : "ไม่มีเพดาน" },
        { label: "ใช้ไปก่อนคำขอนี้", value: `฿${plain(claim.used)}${times(before)}` },
        {
          label: "หลังอนุมัติ",
          value: `${leftAfter !== null ? `เหลือ ฿${plain(Math.max(leftAfter, 0))}` : "ไม่มีเพดาน"}${times(before === null ? null : before + 1)}`,
          strong: true,
          warn: leftAfter !== null && leftAfter < 0,
        },
      ],
    },
    facts,
    checks,
    blockers: blockers.map((item) => ({ message: item.message, action: item.action, reason: item.reason })),
    attachments: labelled.map(({ name: fileName, size, src, isImage, label, locked }) => ({ name: fileName, size, src, isImage, label, locked })),
    amountRequested: claim.amountRequested,
    amountApproved: claim.amountApproved,
    financeNote: request.financeReturnNote ?? null,
    payNote: `อนุมัติภายใน ${thaiDayMonth(cutoff)} ผู้ขอได้รับเงินรอบ ${thaiDate(payDate)} · บันทึกใน Log`,
    decided: decided ? { actor: decided.actorName ?? "HR", at: thaiDate(decided.at), note: decided.note } : null,
    canDecide: tab === "pending" && session?.role === "HR" && !blockers.some((item) => item.action === null),
    readOnlyReason: tab !== "pending" ? null : session?.role !== "HR" ? "เปิดดูได้อย่างเดียว การตัดสินคำขอเป็นงานของ HR" : blockers.find((item) => item.action === null)?.message ?? null,
  };

  return (
    <HrPage>
      <ReviewClient data={data} />
    </HrPage>
  );
}
