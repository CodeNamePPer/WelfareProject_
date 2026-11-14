import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { getHrEmployees } from "@/lib/hr/employees";
import { getHrHeadCode } from "@/lib/hr/hrHead";
import { findEmployeeUuidByCode } from "@/lib/auth/users";
import { getProposal, getProposalOptions, signedImageUrl, type ProposalInput } from "@/lib/hr/proposals";
import { HrPage } from "@/features/hr/ui";
import { ProposalForm } from "./ProposalForm";

export const metadata: Metadata = { title: "เสนอสวัสดิการใหม่" };
export const dynamic = "force-dynamic";

// H04 ฟอร์มเสนอสวัสดิการ 4 ขั้น + พรีวิว · หัวหน้า HR ใช้ฟอร์มเดียวกันสร้างเองได้ทันที · ?draft=<id> แก้ฉบับร่างของตัวเอง
export default async function ProposePage({ searchParams }: { searchParams: Promise<{ draft?: string }> }) {
  const [session, headCode, options, employees, params] = await Promise.all([getSession(), getHrHeadCode(), getProposalOptions(), getHrEmployees(), searchParams]);
  const isHead = session?.role === "HR" && headCode !== null && session.sub === headCode;
  const headName = headCode ? (employees?.find((employee) => employee.code === headCode)?.name ?? null) : null;

  let initial: { id: string; input: ProposalInput; imageUrl: string | null } | undefined;
  if (params.draft && !isHead) {
    const [proposal, me] = await Promise.all([getProposal(params.draft), session ? findEmployeeUuidByCode(session.sub) : null]);
    if (!proposal || proposal.status !== "draft" || proposal.proposedById !== me) notFound();
    initial = { id: proposal.id, input: proposal.input, imageUrl: await signedImageUrl(proposal.input.imagePath) };
  }

  return (
    <HrPage>
      <ProposalForm mode={isHead ? "direct" : "propose"} levels={options.levels} categories={options.categories} headName={headName} initial={initial} />
    </HrPage>
  );
}
