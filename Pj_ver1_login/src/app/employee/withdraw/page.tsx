import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { getMyProfile } from "@/lib/employee/profile";
import { getClaim, getEmployeeBenefits } from "@/lib/claims/service";
import { toFormValues } from "@/lib/claims/forms";
import WithdrawClient, { type WithdrawInitial } from "./WithdrawClient";

export default async function WithdrawPage({ searchParams }: { searchParams: Promise<{ claim?: string; benefit?: string }> }) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const [profile, benefits, params] = await Promise.all([getMyProfile(session.sub), getEmployeeBenefits(session.sub), searchParams]);
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

  return (
    <WithdrawClient
      applicant={{ employeeId: profile.code, fullName: profile.name, department: profile.department ?? "—" }}
      benefits={benefits}
      initial={initial}
      initialBenefitCode={params.benefit ?? null}
    />
  );
}
