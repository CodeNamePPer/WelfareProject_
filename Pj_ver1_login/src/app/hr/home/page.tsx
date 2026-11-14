import type { Metadata } from "next";
import { getSession } from "@/lib/auth/get-session";
import { getHrEmployees } from "@/lib/hr/employees";
import { getBenefitMaxClaims, getQueueFields } from "@/lib/hr/claimReview";
import { getPaySettings, listClaims } from "@/lib/claims/service";
import { CLAIM_STATUS_LABEL } from "@/lib/claims/types";
import { baht, bangkokToday, nextPayDate, thaiDayMonth } from "@/lib/claims/requester";
import { DEFAULT_PAY_SETTINGS } from "@/features/payroll/lib/pay-settings";
import { COUNTED, claimKindOf, daysBetween, daysSince, proxyReasonOf, queueTabOf, tabOf, type QueueRow } from "@/features/hr/queue";
import { HrPage } from "@/features/hr/ui";
import { HrQueueClient, type QueueStat } from "./HrQueueClient";

export const metadata: Metadata = { title: "คิวคำขอสวัสดิการ" };
export const dynamic = "force-dynamic";

/** "ก, ข และ ค" */
const thaiList = (items: string[]) => (items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} และ ${items[items.length - 1]}`);

// H01 คิวคำขอ (ตามดีไซน์): HR ตัดสินในหน้าตรวจคำขอเท่านั้น แถวในคิวเปิดหน้านั้น
export default async function HrQueuePage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const [session, employees, claims, settings, maxClaims, params] = await Promise.all([
    getSession(),
    getHrEmployees(),
    listClaims(),
    getPaySettings().catch(() => DEFAULT_PAY_SETTINGS),
    getBenefitMaxClaims().catch(() => new Map<string, number | null>()),
    searchParams,
  ]);
  if (!claims) return <p className="text-13 text-status-rejected-ink">โหลดคำขอไม่สำเร็จ กรุณารีเฟรชหน้าอีกครั้ง</p>;

  const extra = await getQueueFields(claims.map((claim) => claim.id)).catch(() => new Map<string, { proxyReason: string | null; insurancePaid: number | null }>());
  const viewer = session?.sub ?? null;
  const byCode = new Map((employees ?? []).map((employee) => [employee.code, employee]));

  /** ครั้งที่ใช้ไปของสวัสดิการเดียวกันในปีงบเดียวกัน (รวมคำขอนี้) */
  const usedTimes = (employeeCode: string, benefitCode: string, year: string | undefined) =>
    claims.filter((item) => item.employeeCode === employeeCode && item.benefitCode === benefitCode && item.expenseDate?.slice(0, 4) === year && COUNTED.includes(item.status)).length;

  const rows: QueueRow[] = claims.flatMap((claim) => {
    const tab = tabOf(claim.status);
    if (!tab) return [];
    const person = byCode.get(claim.employeeCode);
    const fields = extra.get(claim.id);
    const proxy = claim.submittedByCode !== claim.employeeCode;
    const reason = proxy ? (fields?.proxyReason ?? proxyReasonOf(claim.note)) : null;
    const own = claim.employeeCode === viewer;
    const revision = [...claim.events].reverse().find((event) => event.kind === "revision_requested" || event.kind === "returned");
    const max = maxClaims.get(claim.benefitCode) ?? null;
    const times = usedTimes(claim.employeeCode, claim.benefitCode, claim.expenseDate?.slice(0, 4));
    const left = claim.limit > 0 ? Math.max(claim.limit - claim.used - claim.amountRequested, 0) : null;
    const usage = [max !== null ? `ใช้ ${times}/${max} ครั้ง` : `ใช้ ${times} ครั้ง`, left !== null ? `เหลือ ${baht(left)} หลังเบิก` : null].filter(Boolean).join(" · ");
    const hint: QueueRow["hint"] = own
      ? { text: "คำขอของ HR ตรวจโดยหัวหน้า HR", tone: "muted" }
      : claim.status === "needs_revision"
        ? { text: revision?.note ? `รอผู้ขอแก้: ${revision.note}` : "รอผู้ขอแก้ไข", tone: "muted" }
        : claim.status === "finance_returned"
          ? { text: `การเงินส่งกลับ${revision?.note ? `: ${revision.note}` : ""}`, tone: "amber" }
          : reason && tab === "pending"
            ? { text: `เหตุที่ยื่นแทน: ${reason}`, tone: "amber" }
            : { text: usage, tone: "muted" };
    return [
      {
        claimNo: claim.claimNo,
        status: claim.status,
        statusLabel: own && tab === "pending" ? "ส่งหัวหน้า HR ตรวจ" : claim.status === "needs_revision" ? "ส่งกลับให้แก้ไข" : CLAIM_STATUS_LABEL[claim.status],
        tab,
        employeeCode: claim.employeeCode,
        employeeName: person?.name ?? claim.employeeName,
        position: person?.position ?? null,
        department: person?.department ?? claim.department ?? "ไม่ระบุแผนก",
        proxyBy: proxy ? claim.submittedByName : null,
        benefitName: claim.benefitName,
        meta: [claim.claimNo, claimKindOf({ insurancePaid: fields?.insurancePaid }).short, claim.submittedAt ? `ยื่น ${thaiDayMonth(claim.submittedAt)}` : null].filter(Boolean).join(" · "),
        hint,
        amount: claim.amountApproved ?? claim.amountRequested,
        action: own ? "own" : tab === "pending" ? "review" : tab === "revision" ? "waiting" : "view",
        submittedAt: claim.submittedAt,
      },
    ];
  });

  const toReview = rows.filter((row) => row.action === "review");
  const own = rows.filter((row) => row.action === "own" && row.tab === "pending");
  const oldest = toReview.reduce<string | null>((min, row) => (row.submittedAt && (!min || row.submittedAt < min) ? row.submittedAt : min), null);
  const today = bangkokToday();
  const payDate = nextPayDate(settings, today);
  const daysToPay = Math.max(0, daysBetween(today, payDate));
  const stats: QueueStat[] = [
    { label: "รอตรวจ", value: String(toReview.length), note: oldest ? `เก่าสุดรอ ${daysSince(oldest)} วัน` : "ไม่มีคำขอค้าง", warn: true },
    { label: "ส่งกลับให้แก้ไข", value: String(rows.filter((row) => row.tab === "revision").length), note: "รอผู้ขอ" },
    { label: "ส่งหัวหน้า HR ตรวจ", value: String(own.length), note: "คำขอของคุณเอง ส่งหัวหน้า HR" },
    { label: `ตัดรอบ ${thaiDayMonth(payDate)}`, value: daysToPay === 0 ? "วันนี้" : `ใน ${daysToPay} วัน`, note: "ตรวจก่อนเพื่อให้ทันรอบ" },
  ];
  const departments = [...new Set(rows.filter((row) => row.tab === "pending").map((row) => row.department))];
  const description = departments.length > 0 ? `คำขอที่ส่งถึงคุณ · ${thaiList(departments)}` : "คำขอที่ส่งถึงคุณ";

  return (
    <HrPage>
      <HrQueueClient rows={rows} stats={stats} description={description} initialTab={queueTabOf(params.tab)} />
    </HrPage>
  );
}
