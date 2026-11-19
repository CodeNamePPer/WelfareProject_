import type { Metadata } from "next";
import { bangkokToday, thaiDayMonth } from "@/lib/claims/requester";
import { getAdvanceItems } from "@/lib/payroll/finance";
import { HrPage } from "@/features/hr/ui";
import { RefundsClient, type RefundRow } from "./RefundsClient";
import { toBangkokDate } from "@/lib/claims/mappers";

export const metadata: Metadata = { title: "เงินที่ต้องคืน" };
export const dynamic = "force-dynamic";

const thb = (value: number | null) => `฿${(value ?? 0).toLocaleString("th-TH")}`;

// F09 เงินที่ต้องคืน: เงินเบิกล่วงหน้าที่พนักงานต้องคืนบริษัท (ใบเสร็จน้อยกว่ายอดล่วงหน้า หรือเกินกำหนดแนบใบเสร็จ)
export default async function RefundsPage() {
  const items = await getAdvanceItems();
  if (!items) return <p className="text-13 text-status-rejected-ink">โหลดรายการเงินคืนไม่สำเร็จ กรุณารีเฟรชหน้าอีกครั้ง</p>;
  const year = bangkokToday().slice(0, 4);

  const rows: RefundRow[] = items
    .filter((item) => (item.refundAmount ?? 0) > 0)
    .sort((a, b) => Number(Boolean(a.refundReceivedAt)) - Number(Boolean(b.refundReceivedAt)))
    .map((item) => {
      const overdue = item.status === "cancelled_overdue";
      return {
        claimNo: item.claimNo,
        person: item.person,
        cause: overdue ? "เบิกล่วงหน้า เกินกำหนดแนบใบเสร็จ" : "ใบเสร็จน้อยกว่ายอดเบิกล่วงหน้า",
        meta: overdue
          ? `${item.claimNo} · ยกเลิกรายการอัตโนมัติ${item.cancelledAt ? ` ${thaiDayMonth(item.cancelledAt)}` : ""}`
          : `${item.claimNo} · ใบเสร็จ ${thb(item.receiptAmount)} รับไป ${thb(item.advanceAmount)}`,
        amount: item.refundAmount ?? 0,
        receivedAt: item.refundReceivedAt ? thaiDayMonth(item.refundReceivedAt) : null,
        receivedThisYear: Boolean(item.refundReceivedAt && toBangkokDate(item.refundReceivedAt).startsWith(year)),
      };
    });

  return (
    <HrPage>
      <RefundsClient rows={rows} />
    </HrPage>
  );
}
