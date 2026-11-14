import type { Metadata } from "next";
import { getSession } from "@/lib/auth/get-session";
import { getHrEmployees } from "@/lib/hr/employees";
import { getPaySettings, listClaims } from "@/lib/claims/service";
import { baht, bangkokToday, nextPayDate, thaiDate } from "@/lib/claims/requester";
import { DEFAULT_PAY_SETTINGS } from "@/features/payroll/lib/pay-settings";
import { daysSince, initialsOf, proxyReasonOf, tabOf, type QueueRow, type QueueTab } from "@/features/hr/queue";
import { HrQueueClient } from "./HrQueueClient";

export const metadata: Metadata = { title: "คิวคำขอสวัสดิการ" };
export const dynamic = "force-dynamic";

// H01 คิวคำขอ: HR ตัดสินในหน้ารายละเอียดเท่านั้น แถวในคิวเปิดหน้าตรวจคำขอ
export default async function HrQueuePage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const [session, employees, claims, settings, params] = await Promise.all([
    getSession(),
    getHrEmployees(),
    listClaims(),
    getPaySettings().catch(() => DEFAULT_PAY_SETTINGS),
    searchParams,
  ]);
  if (!claims) return <p className="text-13 text-status-rejected">โหลดคำขอไม่สำเร็จ กรุณารีเฟรชหน้าอีกครั้ง</p>;

  const viewer = session?.sub ?? null;
  const byCode = new Map((employees ?? []).map((employee) => [employee.code, employee]));
  const rows: QueueRow[] = claims.flatMap((claim) => {
    const tab = tabOf(claim.status);
    if (!tab) return [];
    const person = byCode.get(claim.employeeCode);
    const proxy = claim.submittedByCode !== claim.employeeCode;
    const reason = proxy ? proxyReasonOf(claim.note) : null;
    const revision = [...claim.events].reverse().find((event) => event.kind === "revision_requested" || event.kind === "returned");
    const left = claim.limit > 0 ? Math.max(claim.limit - claim.used - claim.amountRequested, 0) : null;
    const hint: QueueRow["hint"] =
      claim.status === "needs_revision"
        ? { text: revision?.note ? `รอผู้ขอแก้: ${revision.note}` : "รอผู้ขอแก้ไข", tone: "muted" }
        : claim.status === "finance_returned"
          ? { text: `การเงินส่งกลับ${revision?.note ? `: ${revision.note}` : ""}`, tone: "amber" }
          : reason
            ? { text: `เหตุที่ยื่นแทน: ${reason}`, tone: "amber" }
            : { text: left !== null ? `เหลือ ${baht(left)} หลังเบิก` : "ไม่มีเพดานวงเงินรายปี", tone: "muted" };
    const own = claim.employeeCode === viewer;
    return [
      {
        claimNo: claim.claimNo,
        status: claim.status,
        tab,
        employeeCode: claim.employeeCode,
        employeeName: person?.name ?? claim.employeeName,
        initials: initialsOf(person?.name ?? claim.employeeName),
        role: [claim.employeeCode, person?.position, person?.department ?? claim.department].filter(Boolean).join(" · "),
        department: person?.department ?? claim.department ?? "ไม่ระบุแผนก",
        proxyBy: proxy ? claim.submittedByName : null,
        benefitName: claim.benefitName,
        meta: [claim.claimNo, proxy ? "ยื่นแทน" : "ยื่นเอง", claim.submittedAt ? `ยื่น ${thaiDate(claim.submittedAt)}` : null].filter(Boolean).join(" · "),
        hint,
        amount: claim.amountApproved ?? claim.amountRequested,
        action: tab === "pending" ? (own ? "own" : "review") : tab === "revision" ? "waiting" : "view",
        submittedAt: claim.submittedAt,
      },
    ];
  });

  const pending = rows.filter((row) => row.tab === "pending");
  const oldest = pending.reduce<string | null>((min, row) => (row.submittedAt && (!min || row.submittedAt < min) ? row.submittedAt : min), null);
  const today = bangkokToday();
  const payDate = nextPayDate(settings, today);
  const daysToPay = Math.max(0, Math.round((new Date(`${payDate}T00:00:00+07:00`).getTime() - new Date(`${today}T00:00:00+07:00`).getTime()) / 86_400_000));
  const stats = [
    { label: "รอตรวจ", value: String(pending.filter((row) => row.action === "review").length), note: oldest ? `เก่าสุดรอ ${daysSince(oldest)} วัน` : "ไม่มีคำขอค้าง", warn: true },
    { label: "ส่งกลับให้แก้ไข", value: String(rows.filter((row) => row.tab === "revision").length), note: "รอผู้ขอ" },
    { label: "คำขอของคุณเอง", value: String(pending.filter((row) => row.action === "own").length), note: "ต้องให้ HR คนอื่นตรวจ" },
    { label: `รอบจ่าย ${thaiDate(payDate)}`, value: daysToPay === 0 ? "วันนี้" : `ใน ${daysToPay} วัน`, note: "ตรวจก่อนเพื่อให้ทันรอบ" },
  ];
  const initialTab = (["pending", "revision", "approved", "rejected", "all"] as QueueTab[]).find((tab) => tab === params.tab) ?? "pending";

  return (
    <div className="mx-auto flex w-full max-w-[1140px] flex-col gap-4 text-14 text-ink">
      <HrQueueClient rows={rows} stats={stats} initialTab={initialTab} />
    </div>
  );
}
