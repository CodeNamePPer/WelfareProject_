import { HistoryHeader } from "@/features/payroll/components/payroll/PageHeaders";
import { HistoryView } from "@/features/payroll/components/payroll/HistoryView";
import { fetchPaymentRequests } from "@/features/payroll/lib/api";

// หน้า "ประวัติการจ่ายเงินสวัสดิการ" (wireframe Payroll-3.png) แสดงเฉพาะรายการที่จ่ายแล้ว
export default async function HistoryPage() {
  const paid = (await fetchPaymentRequests()).filter((r) => r.status === "paid");
  return (
    <>
      <HistoryHeader />
      <HistoryView requests={paid} />
    </>
  );
}
