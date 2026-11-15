import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getFinanceData } from "@/lib/payroll/finance";
import { buildPayout } from "@/lib/payroll/payout";
import { HrPage } from "@/features/hr/ui";
import { PayoutTable } from "@/features/finance/PayoutTable";

export const metadata: Metadata = { title: "รายการในรอบจ่าย" };
export const dynamic = "force-dynamic";

// F08 > ดูรายการ: รายการโอนของรอบที่ปิดแล้ว (อ่านอย่างเดียว ใช้ตารางเดียวกับ F06)
export default async function HistoryRoundPage({ params }: { params: Promise<{ round: string }> }) {
  const [{ round }, data] = await Promise.all([params, getFinanceData()]);
  if (!data) return <p className="text-13 text-status-rejected-ink">โหลดรายการไม่สำเร็จ กรุณารีเฟรชหน้าอีกครั้ง</p>;
  const payout = await buildPayout(data, decodeURIComponent(round));
  if (!payout) notFound();
  return (
    <HrPage>
      <PayoutTable
        readOnly
        crumbs={[{ label: "ดูข้อมูลย้อนหลัง", href: "/payroll/history" }, { label: payout.round.label }]}
        title={payout.round.label}
        subtitle={payout.subtitle.replace(/ · (ปิดรอบแล้ว|ปิดรอบ) .*$/, "")}
        rows={payout.rows}
        fileName={`ไฟล์ธนาคาร-${payout.round.payDate}`}
        nextPayDate={null}
      />
    </HrPage>
  );
}
