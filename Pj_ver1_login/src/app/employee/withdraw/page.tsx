import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { getMyProfile } from "@/lib/employee/profile";
import { getSubordinates } from "@/lib/employee/subordinates";
import type { EmployeeBenefit } from "@/lib/claims/types";
import { getClaim, getEmployeeBenefits, getPaySettings } from "@/lib/claims/service";
import { currentRound, thaiDate } from "@/lib/claims/requester";
import { DEFAULT_PAY_SETTINGS } from "@/features/payroll/lib/pay-settings";
import { toFormValues } from "@/lib/claims/forms";
import WithdrawClient, { type WithdrawInitial } from "./WithdrawClient";

export default async function WithdrawPage({ searchParams }: { searchParams: Promise<{ claim?: string; benefit?: string; for?: string }> }) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const [profile, benefits, params, paySettings, subordinates] = await Promise.all([
    getMyProfile(session.sub),
    getEmployeeBenefits(session.sub),
    searchParams,
    getPaySettings().catch(() => DEFAULT_PAY_SETTINGS),
    getSubordinates(session.sub),
  ]);
  const round = currentRound(paySettings);
  if (!profile || !benefits) {
    return <p className="text-13 text-status-rejected">โหลดข้อมูลพนักงานหรือสิทธิ์สวัสดิการไม่สำเร็จ กรุณาลองใหม่อีกครั้ง</p>;
  }

  let initial: WithdrawInitial | null = null;
  if (params.claim) {
    const claim = await getClaim(params.claim);
    if (claim && claim.employeeCode === session.sub && (claim.status === "draft" || claim.status === "needs_revision")) {
      const receipt = claim.receipts[0];
      initial = {
        claimNo: claim.claimNo,
        benefitCode: claim.benefitCode,
        values: toFormValues(claim.formType, claim),
        note: claim.note ?? "",
        receiptNo: receipt?.receiptNo ?? "",
        receiptDate: receipt?.receiptDate ?? "",
        attachments: claim.attachments.map((file) => file.fileName),
        revisionNote: claim.status === "needs_revision" ? ([...claim.events].reverse().find((event) => event.kind === "revision_requested")?.note ?? null) : null,
      };
    }
  }

  // หัวหน้ายื่นแทนลูกน้องโดยตรงได้ (เดิมอยู่หน้า /employee/HeadEm) ยกเว้นตอนแก้ไขคำขอของตัวเอง
  const team = initial ? [] : (subordinates ?? []);
  const teamBenefits = await Promise.all(team.map((employee) => getEmployeeBenefits(employee.id)));
  const benefitsByEmployee: Record<string, EmployeeBenefit[]> = Object.fromEntries(team.map((employee, index) => [employee.id, teamBenefits[index] ?? []]));

  return (
    <WithdrawClient
      applicant={{ code: profile.code, fullName: profile.name, department: profile.department ?? "—", position: profile.position ?? "—", manager: profile.managerName ?? "—" }}
      subordinates={team.map((employee) => ({ code: employee.id, fullName: employee.name, department: employee.department, position: employee.position, manager: profile.name }))}
      benefitsByEmployee={benefitsByEmployee}
      initialProxy={params.for === "proxy"}
      expectedPay={{ date: thaiDate(round.payDate), note: `ยื่นวันนี้อยู่ในรอบที่ ${round.roundNo} ถ้า HR และการเงินอนุมัติทัน ไม่ทันจะเลื่อนไปรอบถัดไป` }}
      benefits={benefits}
      initial={initial}
      initialBenefitCode={params.benefit ?? null}
    />
  );
}
