import { Suspense } from "react";
import { HistoryDetailsHeader } from "@/features/payroll/components/payroll/PageHeaders";
import { PaymentDetailsSkeleton } from "@/features/payroll/components/payroll/PageSkeletons";
import { PaymentDetailsView } from "@/features/payroll/components/payroll/PaymentDetailsView";
import { fetchPaymentRequests } from "@/features/payroll/lib/api";

// หน้า "ประวัติ > ข้อมูลเพิ่มเติม" (wireframe Payroll-4.png)
export default async function HistoryDetailsPage() {
  const paid = (await fetchPaymentRequests()).filter((r) => r.status === "paid");
  return (
    <>
      <HistoryDetailsHeader />
      <Suspense fallback={<PaymentDetailsSkeleton />}>
        <PaymentDetailsView requests={paid} mode="history" />
      </Suspense>
    </>
  );
}
