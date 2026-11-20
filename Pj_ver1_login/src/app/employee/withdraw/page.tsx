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

  const params = await searchParams;
  // คำขอที่จะแก้ (ถ้ามี) โหลดพร้อมกับข้อมูลอื่น ไม่ต้องรอทีละอย่าง
  const [profile, benefits, paySettings, subordinates, editing] = await Promise.all([
    getMyProfile(session.sub),
    getEmployeeBenefits(session.sub),
    getPaySettings().catch(() => DEFAULT_PAY_SETTINGS),
    getSubordinates(session.sub),
    params.claim ? getClaim(params.claim) : Promise.resolve(null),
  ]);
  const round = currentRound(paySettings);
  if (!profile || !benefits) {
    return <p className="text-13 text-status-rejected">โหลดข้อมูลพนักงานหรือสิทธิ์สวัสดิการไม่สำเร็จ กรุณาลองใหม่อีกครั้ง</p>;
  }

  let initial: WithdrawInitial | null = null;
  let ownerBenefits: EmployeeBenefit[] | null = null;
  if (editing) {
    const claim = editing;
    // ร่างที่ยื่นแทนไว้ แก้ต่อได้เฉพาะเมื่อยังเป็นหัวหน้าแผนกของเจ้าของคำขอ (กฎเดียวกับ saveClaim)
    const canEditProxy = claim.submittedByCode === session.sub && Boolean(subordinates?.some((employee) => employee.id === claim.employeeCode));
    if ((claim.employeeCode === session.sub || canEditProxy) && (claim.status === "draft" || claim.status === "needs_revision")) {
      if (claim.employeeCode !== session.sub) {
        ownerBenefits = await getEmployeeBenefits(claim.employeeCode);
      }
      const receipt = claim.receipts[0];
      initial = {
        claimNo: claim.claimNo,
        employeeCode: claim.employeeCode,
        benefitCode: claim.benefitCode,
        values: toFormValues(claim.formType, claim),
        note: claim.note ?? "",
        receiptNo: receipt?.receiptNo ?? "",
        receiptDate: receipt?.receiptDate ?? "",
        attachments: claim.attachments.map((file) => ({
          name: file.fileName,
          src: `/api/claims/attachments/${file.id}`,
          isImage: Boolean(file.mimeType?.startsWith("image/")),
        })),
        isAdvance: claim.isAdvance,
        revisionNote: claim.status === "needs_revision" ? ([...claim.events].reverse().find((event) => event.kind === "revision_requested")?.note ?? null) : null,
      };
    }
  }

  // หัวหน้าแผนกยื่นแทนพนักงานในแผนกได้ (เดิมอยู่หน้า /employee/HeadEm) ยกเว้นตอนแก้ไขคำขอที่มีอยู่
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
      benefits={ownerBenefits ?? benefits}
      initial={initial}
      initialBenefitCode={params.benefit ?? null}
    />
  );
}
