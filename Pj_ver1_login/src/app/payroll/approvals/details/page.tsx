import { Suspense } from "react";
import { ApprovalDetailsHeader } from "@/features/payroll/components/payroll/PageHeaders";
import { PaymentDetailsSkeleton } from "@/features/payroll/components/payroll/PageSkeletons";
import { PaymentDetailsView } from "@/features/payroll/components/payroll/PaymentDetailsView";
import { fetchPaymentRequests } from "@/features/payroll/lib/api";

// หน้า "รายการอนุมัติ / รอจ่าย > ข้อมูลเพิ่มเติม" (wireframe Payroll-5.png)
export default async function ApprovalDetailsPage() {
  const requests = (await fetchPaymentRequests()).filter((r) => r.status !== "paid");
  return (
    <>
      <ApprovalDetailsHeader />
      {/* Suspense: ระหว่างอ่าน ?q= จาก URL ให้แสดง skeleton ก่อน */}
      <Suspense fallback={<PaymentDetailsSkeleton />}>
        <PaymentDetailsView requests={requests} mode="approvals" />
      </Suspense>
    </>
  );
}
