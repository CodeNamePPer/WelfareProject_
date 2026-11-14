import { listClaims } from "@/lib/claims/service";
import { toBangkokDate } from "@/lib/claims/mappers";
import { CLAIM_STATUS_LABEL } from "@/lib/claims/types";
import { bangkokToday, thaiDate } from "@/lib/claims/requester";
import ReportsClient, { type ReportClaim } from "./ReportsClient";

export const dynamic = "force-dynamic";

// H06 รายงานและสถิติ: คำนวณจาก welfare_claim ทั้งหมด (ยกเว้นฉบับร่าง) แล้วให้ client สลับช่วงเวลา
export default async function ReportsPage() {
  const claims = await listClaims();
  if (!claims) return <p className="text-13 text-status-rejected">โหลดรายงานไม่สำเร็จ กรุณารีเฟรชหน้าอีกครั้ง</p>;

  const rows: ReportClaim[] = claims
    .filter((claim) => claim.status !== "draft" && claim.submittedAt)
    .map((claim) => ({
      claimNo: claim.claimNo,
      employeeCode: claim.employeeCode,
      employeeName: claim.employeeName,
      department: claim.department ?? "ไม่ระบุแผนก",
      benefit: claim.benefitName,
      status: claim.status,
      statusLabel: CLAIM_STATUS_LABEL[claim.status],
      amount: claim.amountApproved ?? claim.amountRequested,
      submitted: toBangkokDate(claim.submittedAt!),
      paid: claim.status === "paid" && claim.payment?.paidAt ? toBangkokDate(claim.payment.paidAt) : null,
    }));

  const today = bangkokToday();
  return (
    <div className="mx-auto flex w-full max-w-[1140px] flex-col gap-4 text-14 text-ink">
      <ReportsClient claims={rows} today={today} todayLabel={thaiDate(`${today}T00:00:00+07:00`)} />
    </div>
  );
}
