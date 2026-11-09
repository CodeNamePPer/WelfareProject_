import { listClaims } from "@/lib/claims/service";
import { hrStatusOf, toBangkokDate } from "@/lib/claims/mappers";
import { HR_STATUSES } from "../home/statusRows";
import ReportsClient, { type ReportRequest } from "./ReportsClient";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const claims = await listClaims({ statuses: HR_STATUSES });
  if (!claims) return <p className="queue-alert" role="alert">โหลดรายงานไม่สำเร็จ กรุณารีเฟรชหน้าอีกครั้ง</p>;

  const requests = claims.map((claim): ReportRequest => {
    const status = hrStatusOf(claim.status);
    return {
      id: claim.employeeCode,
      requestNumber: claim.claimNo,
      documentNumber: claim.approvalNo ?? "-",
      name: claim.employeeName,
      department: claim.department ?? "-",
      benefit: claim.benefitName,
      amount: claim.amountApproved ?? claim.amountRequested,
      date: toBangkokDate(claim.submittedAt ?? claim.createdAt),
      status: status === "approved" ? "อนุมัติแล้ว" : status === "rejected" ? "ปฏิเสธแล้ว" : "รอตรวจสอบ",
    };
  });

  return <ReportsClient requests={requests} />;
}
