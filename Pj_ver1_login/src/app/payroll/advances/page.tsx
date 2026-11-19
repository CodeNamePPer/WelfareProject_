import type { Metadata } from "next";
import { bangkokToday, thaiDate, thaiDayMonth } from "@/lib/claims/requester";
import { daysFrom, getAdvanceItems, type AdvanceItem } from "@/lib/payroll/finance";
import { HrPage } from "@/features/hr/ui";
import { AdvancesClient, type AdvanceRow, type AdvanceTab } from "./AdvancesClient";
import { toBangkokDate } from "@/lib/claims/mappers";

export const metadata: Metadata = { title: "เบิกล่วงหน้า / ค้างใบเสร็จ" };
export const dynamic = "force-dynamic";

/** แท็บตามดีไซน์ F03 */
function tabOf(item: AdvanceItem): AdvanceTab {
  if (item.status === "awaiting_receipt" || item.status === "receipt_returned") return "awaiting";
  if (item.status === "receipt_submitted") return "review";
  const refundOpen = (item.refundAmount ?? 0) > 0 && !item.refundReceivedAt;
  const extraOpen = item.settlement === "extra_payment" && (item.extraAmountApproved ?? 0) > 0;
  return refundOpen || extraOpen ? "settle" : "closed";
}

const thb = (value: number | null) => `฿${(value ?? 0).toLocaleString("th-TH")}`;

// F03 เบิกล่วงหน้า / ค้างใบเสร็จ: ติดตามเงินล่วงหน้าจนกว่าจะแนบใบเสร็จและปิดรายการ
export default async function AdvancesPage() {
  const items = await getAdvanceItems();
  if (!items) return <p className="text-13 text-status-rejected-ink">โหลดรายการเบิกล่วงหน้าไม่สำเร็จ กรุณารีเฟรชหน้าอีกครั้ง</p>;
  const today = bangkokToday();
  const year = today.slice(0, 4);

  const rows: AdvanceRow[] = items.map((item) => {
    const left = daysFrom(today, item.receiptDueDate);
    const tab = tabOf(item);
    const due: AdvanceRow["due"] =
      tab === "awaiting"
        ? { text: `${thaiDayMonth(item.receiptDueDate)} · ${left < 0 ? `เกิน ${-left} วัน` : left === 0 ? "วันนี้" : `อีก ${left} วัน`}`, tone: left < 0 ? "rejected" : "review" }
        : tab === "review"
          ? { text: `ใบเสร็จ ${thb(item.receiptAmount)}`, tone: "finance" }
          : tab === "settle"
            ? item.settlement === "extra_payment"
              ? { text: `จ่ายเพิ่ม ${thb(item.extraAmountApproved)}`, tone: "approved" }
              : { text: `รอคืน ${thb(item.refundAmount)}`, tone: "review" }
            : { text: item.status === "cancelled_overdue" ? "ยกเลิก · คืนเงินแล้ว" : "ปิดแล้ว", tone: "paid" };
    return {
      claimNo: item.claimNo,
      tab,
      person: item.person,
      benefitName: item.benefitName,
      meta: [item.claimNo, item.remaining !== null ? `วงเงินคงเหลือ ${thb(item.remaining)}` : null].filter(Boolean).join(" · "),
      amount: item.advanceAmount,
      paidAt: item.advancePaidAt ? thaiDate(item.advancePaidAt) : "ยังไม่จ่าย",
      due,
      dueSoon: tab === "awaiting" && left >= 0 && left <= 7,
      overdue: tab === "awaiting" && left < 0,
      closedThisYear: tab === "closed" && ((at) => (at ? toBangkokDate(at) : ""))(item.refundReceivedAt ?? item.reviewedAt ?? item.cancelledAt).startsWith(year),
    };
  });

  return (
    <HrPage>
      <AdvancesClient rows={rows} />
    </HrPage>
  );
}
