import type { Metadata } from "next";
import { getSession } from "@/lib/auth/get-session";
import { getFinanceData, currentRoundKey, daysFrom, getPrimaryAccounts, accountLabel } from "@/lib/payroll/finance";
import { baht, thaiDate, thaiDayMonth } from "@/lib/claims/requester";
import { HrPage } from "@/features/hr/ui";
import { ApprovalsClient, type ApprovalRow } from "./ApprovalsClient";

export const metadata: Metadata = { title: "รายการอนุมัติ / รอจ่าย" };
export const dynamic = "force-dynamic";

// F01 รายการอนุมัติ / รอจ่าย: คำขอที่ HR อนุมัติแล้ว การเงินอนุมัติจ่ายได้ทั้งในแถวและในหน้ารายละเอียด (F05)
// แท็บรอจ่าย: บันทึกจ่ายแล้วได้ทั้งในแถวและในหน้ารายละเอียด (คำขอของตัวเองบันทึกเองไม่ได้)
export default async function ApprovalsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const [data, params, session] = await Promise.all([getFinanceData(), searchParams, getSession()]);
  if (!data) return <p className="text-13 text-status-rejected-ink">โหลดรายการคำขอไม่สำเร็จ กรุณารีเฟรชหน้าอีกครั้ง</p>;

  const current = data.rounds.get(currentRoundKey(data.today));
  // บัญชีรับเงินของคำขอที่รอจ่าย ใช้แสดงในหน้าต่างบันทึกจ่ายแล้ว
  const accounts = await getPrimaryAccounts([...new Set(data.claims.filter(({ claim }) => claim.status === "awaiting_payment").map(({ claim }) => claim.employeeCode))]);
  const rows: ApprovalRow[] = data.claims.map(({ claim, person, roundKey, payDate, amount, hrApprovedAt }) => {
    const returned = [...claim.events].reverse().find((event) => event.kind === "returned");
    return {
      claimNo: claim.claimNo,
      status: claim.status,
      person,
      benefitName: claim.benefitName,
      meta: [claim.claimNo, claim.status === "finance_returned" && returned ? `ส่งกลับ ${thaiDayMonth(returned.at)}` : hrApprovedAt ? `HR อนุมัติ ${thaiDayMonth(hrApprovedAt)}` : null]
        .filter(Boolean)
        .join(" · "),
      amount,
      payDate: payDate ? thaiDate(payDate) : "—",
      roundKey,
      paidAt: claim.status === "paid" ? (claim.payment?.paidAt ?? null) : null,
      account: accounts.has(claim.employeeCode) && accountLabel(accounts.get(claim.employeeCode)) !== "ไม่มีบัญชีรับเงิน" ? accountLabel(accounts.get(claim.employeeCode)) : null,
      advance: Boolean(claim.advance),
      // ผู้อนุมัติต้องไม่ใช่เจ้าของคำขอ (guard_welfare_claim_event)
      own: claim.employeeCode === session?.sub || claim.submittedByCode === session?.sub,
    };
  });

  const sum = (list: ApprovalRow[]) => list.reduce((total, row) => total + row.amount, 0);
  const pending = rows.filter((row) => row.status === "pending_finance");
  const awaiting = rows.filter((row) => row.status === "awaiting_payment");
  const inRound = current ? rows.filter((row) => row.roundKey === current.key && (row.status === "pending_finance" || row.status === "awaiting_payment")) : [];
  const daysToCutoff = current ? daysFrom(data.today, current.cutoff) : null;

  const rounds = [...data.rounds.values()]
    .filter((round) => rows.some((row) => row.roundKey === round.key))
    .sort((a, b) => b.payDate.localeCompare(a.payDate))
    .map((round) => ({ key: round.key, label: `${round.label} · จ่าย ${thaiDayMonth(round.payDate)}` }));

  return (
    <HrPage>
      <ApprovalsClient
        description={current ? `คำขอที่ HR อนุมัติแล้ว · รอบจ่ายปัจจุบัน ${thaiDate(current.payDate)} (รอบที่ ${current.roundNo})` : "คำขอที่ HR อนุมัติแล้ว"}
        stats={[
          { label: "รอการเงินอนุมัติ", value: String(pending.length), note: baht(sum(pending)), tone: "finance" },
          { label: "อนุมัติแล้ว รอจ่าย", value: String(awaiting.length), note: baht(sum(awaiting)) },
          { label: current ? `ยอดรอบ ${thaiDayMonth(current.payDate)}` : "ยอดรอบนี้", value: baht(sum(inRound)), note: `${inRound.length} รายการ ถ้าอนุมัติครบ` },
          {
            label: "ปิดรอบใน",
            value: daysToCutoff === null ? "—" : daysToCutoff < 0 ? "ปิดแล้ว" : daysToCutoff === 0 ? "วันนี้" : `${daysToCutoff} วัน`,
            note: current ? thaiDate(current.cutoff) : "",
          },
        ]}
        rows={rows}
        rounds={rounds}
        initialTab={params.tab}
      />
    </HrPage>
  );
}
