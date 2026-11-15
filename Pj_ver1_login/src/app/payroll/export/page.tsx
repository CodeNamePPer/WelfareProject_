import type { Metadata } from "next";
import { getAdvanceItems, getFinanceData, getPrimaryAccounts, parseRoundKey } from "@/lib/payroll/finance";
import { thaiDate, thaiDayMonth } from "@/lib/claims/requester";
import { CLAIM_STATUS_LABEL } from "@/lib/claims/types";
import { HrPage } from "@/features/hr/ui";
import { ExportClient, type ExportAdvance, type ExportClaim } from "./ExportClient";

export const metadata: Metadata = { title: "Export รายงาน (Excel)" };
export const dynamic = "force-dynamic";

// F04 Export รายงาน: เลือกปี เดือน รอบ และประเภทรายงาน แล้วดาวน์โหลด (ไม่มีข้อมูลสุขภาพในไฟล์)
export default async function ExportPage() {
  const [data, advances] = await Promise.all([getFinanceData(), getAdvanceItems()]);
  if (!data || !advances) return <p className="text-13 text-status-rejected-ink">โหลดข้อมูลไม่สำเร็จ กรุณารีเฟรชหน้าอีกครั้ง</p>;
  const accounts = await getPrimaryAccounts([...new Set(data.claims.map((item) => item.person.code))]);

  const claims: ExportClaim[] = data.claims.flatMap((item) => {
    const round = item.roundKey ? parseRoundKey(item.roundKey) : null;
    if (!round || item.claim.status === "finance_returned") return [];
    const paidTo = item.claim.status === "paid" ? item.claim.payment : null;
    // การโอนที่บันทึกตอนไม่มีบัญชีหลักเก็บ "ไม่ระบุ" / "-" ไว้ ให้เป็นช่องว่าง
    const account = paidTo ? (paidTo.bankCode === "ไม่ระบุ" ? null : { bankCode: paidTo.bankCode, accountMasked: paidTo.accountMasked }) : accounts.get(item.person.code);
    return [
      {
        claimNo: item.claim.claimNo,
        year: round.year + 543,
        month: round.month,
        roundNo: round.roundNo,
        status: item.claim.status,
        statusLabel: CLAIM_STATUS_LABEL[item.claim.status],
        code: item.person.code,
        name: item.person.name,
        department: item.person.department ?? "ไม่ระบุแผนก",
        benefit: item.claim.benefitName,
        amount: item.amount,
        payDate: item.payDate ? thaiDate(item.payDate) : "",
        payDateIso: item.payDate ? item.payDate.slice(0, 10) : null,
        bankCode: account?.bankCode ?? "",
        accountMasked: account?.accountMasked ?? "",
        transferRef: item.claim.payment?.transferRef ?? "",
      },
    ];
  });

  const outstanding: ExportAdvance[] = advances
    // ยังไม่โอนเงินล่วงหน้า = ยังไม่ค้างใบเสร็จ
    .filter((item) => item.advancePaidAt !== null && (item.status === "awaiting_receipt" || item.status === "receipt_returned" || item.status === "receipt_submitted"))
    .map((item) => ({
      claimNo: item.claimNo,
      code: item.person.code,
      name: item.person.name,
      department: item.person.department ?? "ไม่ระบุแผนก",
      benefit: item.benefitName,
      amount: item.advanceAmount,
      paidAt: item.advancePaidAt ? thaiDate(item.advancePaidAt) : "",
      dueDate: thaiDate(item.receiptDueDate),
      status: item.status === "receipt_submitted" ? "รอ HR ตรวจใบเสร็จ" : "ค้างใบเสร็จ",
    }));

  // รอบที่เลือกได้ในแต่ละเดือน พร้อมวันจ่าย เช่น "รอบที่ 1 (จ่าย 25 พ.ย.)"
  const payDates = Object.fromEntries([...data.rounds.values()].map((round) => [round.key, thaiDayMonth(round.payDate)]));
  const [year, month] = data.today.split("-").map(Number);

  return (
    <HrPage>
      <ExportClient claims={claims} outstanding={outstanding} payDates={payDates} initial={{ year: year + 543, month }} />
    </HrPage>
  );
}
