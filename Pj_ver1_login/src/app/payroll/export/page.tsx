import { ExportHeader } from "@/features/payroll/components/payroll/PageHeaders";
import { ExportView } from "@/features/payroll/components/payroll/ExportView";
import { fetchPaymentRequests } from "@/features/payroll/lib/api";

// หน้า "รายงานและส่งออกข้อมูล (Excel)" (wireframe Payroll-2.png)
export default async function ExportPage() {
  const requests = await fetchPaymentRequests();
  return (
    <>
      <ExportHeader />
      <ExportView requests={requests} />
    </>
  );
}
