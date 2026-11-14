import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { getHrEmployees } from "@/lib/hr/employees";
import { getHrHeadCode } from "@/lib/hr/hrHead";
import { findEmployeeUuidByCode } from "@/lib/auth/users";
import { getHrBenefits } from "@/lib/hr/benefits";
import { getProposal, getProposalOptions, signedImageUrl, type BudgetType, type ProposalInput } from "@/lib/hr/proposals";
import { HrPage } from "@/features/hr/ui";
import { ProposalForm } from "./ProposalForm";

export const metadata: Metadata = { title: "เสนอสวัสดิการ" };
export const dynamic = "force-dynamic";

const BUDGET_DB: Record<string, BudgetType> = {
  รายปี: "yearly",
  รายเดือน: "monthly",
  ต่อครั้ง: "per_claim",
};

// H04 ฟอร์มเสนอสวัสดิการ 4 ขั้น + พรีวิว · ?draft=<id> แก้ฉบับร่าง · ?edit=<code > เสนอแก้ไขสวัสดิการที่มีอยู่
export default async function ProposePage({ searchParams }: { searchParams: Promise<{ draft?: string; edit?: string }> }) {
  const [session, headCode, options, employees, params] = await Promise.all([
    getSession(),
    getHrHeadCode(),
    getProposalOptions(),
    getHrEmployees(),
    searchParams,
  ]);
  const isHead = session?.role === "HR" && headCode !== null && session.sub === headCode;
  const headName = headCode ? (employees?.find((employee) => employee.code === headCode)?.name ?? null) : null;

  let initial: { id?: string; input: ProposalInput; imageUrl: string | null } | undefined;
  let kind: "create" | "update" = "create";
  let benefitCode: string | undefined;

  if (params.edit) {
    const benefits = await getHrBenefits();
    const target = benefits?.find((b) => b.code === params.edit);
    if (!target) notFound();
    kind = "update";
    benefitCode = target.code;
    const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Bangkok" });
    const limits =
      target.levelLimits && target.levelLimits.length > 0
        ? target.levelLimits.map((lvl) => ({ levelId: lvl.levelId, amount: lvl.amount }))
        : options.levels.map((lvl) => ({ levelId: lvl.id, amount: target.amount }));
    initial = {
      input: {
        name: target.name,
        category: target.category ?? "",
        description: target.description ?? "",
        detail: target.detail ?? "",
        imagePath: target.imagePath ?? null,
        budgetType: BUDGET_DB[target.budgetType] ?? "yearly",
        limits,
        maxClaims: target.maxClaimsPerYear,
        effectiveFrom: target.startDate && target.startDate >= today ? target.startDate : today,
        allowFamily: Boolean(target.allowFamily),
        allowInsurance: Boolean(target.allowInsurance),
        allowAdvance: Boolean(target.allowAdvance),
        documents: target.documents,
        reason: "",
      },
      imageUrl: await signedImageUrl(target.imagePath ?? null),
    };
  } else if (params.draft && !isHead) {
    const [proposal, me] = await Promise.all([getProposal(params.draft), session ? findEmployeeUuidByCode(session.sub) : null]);
    if (!proposal || proposal.status !== "draft" || proposal.proposedById !== me) notFound();
    kind = proposal.kind === "update" ? "update" : "create";
    benefitCode = proposal.benefitCode ?? undefined;
    initial = { id: proposal.id, input: proposal.input, imageUrl: await signedImageUrl(proposal.input.imagePath) };
  }

  return (
    <HrPage>
      <ProposalForm
        mode={isHead && kind === "create" ? "direct" : "propose"}
        kind={kind}
        benefitCode={benefitCode}
        levels={options.levels}
        categories={options.categories}
        headName={headName}
        initial={initial}
      />
    </HrPage>
  );
}
