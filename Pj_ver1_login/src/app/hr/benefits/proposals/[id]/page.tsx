import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { findEmployeeUuidByCode } from "@/lib/auth/users";
import { getProposal, getProposalOptions } from "@/lib/hr/proposals";
import { Badge, HrPage, PageHeader } from "@/features/hr/ui";
import { PROPOSAL_STATUS, ProposalFacts, thaiDate } from "../../../proposals/ProposalFacts";
import { ReviseClient } from "./ReviseClient";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export async function generateMetadata(): Promise<Metadata> {
  return { title: "ข้อเสนอสวัสดิการ" };
}

// H14 ผู้เสนอดูข้อเสนอของตัวเอง · ถ้าหัวหน้า HR ขอข้อมูลเพิ่ม แก้แล้วส่งกลับได้ที่หน้านี้
export default async function MyProposalPage({ params }: { params: Params }) {
  const { id } = await params;
  const [session, proposal] = await Promise.all([getSession(), getProposal(id)]);
  if (!proposal) notFound();
  const me = session ? await findEmployeeUuidByCode(session.sub) : null;
  const mine = me !== null && proposal.proposedById === me;
  if (proposal.status === "draft" && mine) redirect(`/hr/benefits/propose?draft=${proposal.id}`);

  const status = PROPOSAL_STATUS[proposal.status];
  const crumbs = [{ label: "จัดการสวัสดิการ", href: "/hr/benefits" }, { label: proposal.proposalNo }];

  if (proposal.status === "needs_info" && mine) {
    const options = await getProposalOptions();
    return (
      <HrPage>
        <PageHeader
          crumbs={crumbs}
          title={`แก้ข้อเสนอ ${proposal.proposalNo} · ${proposal.name}`}
          description="หัวหน้า HR ขอข้อมูลเพิ่ม · แก้แล้วส่งกลับ"
          actions={<Badge tone={status.tone}>{status.label}</Badge>}
        />
        <ReviseClient proposal={{ id: proposal.id, input: proposal.input }} request={proposal.infoRequest} levels={options.levels} />
      </HrPage>
    );
  }

  return (
    <HrPage>
      <PageHeader
        crumbs={crumbs}
        title={`ข้อเสนอ ${proposal.proposalNo} · ${proposal.name}`}
        description={`เสนอโดย ${proposal.proposerName} · ${thaiDate(proposal.submittedAt)}`}
        actions={<Badge tone={status.tone}>{status.label}</Badge>}
      />
      {proposal.decisionNote || proposal.appliedBenefitCode ? (
        <p className="rounded-[8px] border border-line bg-white px-5 py-3.5 text-13">
          {proposal.status === "approved" ? `อนุมัติแล้ว · สร้างสวัสดิการ ${proposal.appliedBenefitCode ?? ""}` : status.label}
          {proposal.decidedByName ? ` โดย ${proposal.decidedByName} · ${thaiDate(proposal.decidedAt)}` : ""}
          {proposal.decisionNote ? <span className="mt-1 block text-ink-soft">&ldquo;{proposal.decisionNote}&rdquo;</span> : null}
        </p>
      ) : null}
      <ProposalFacts proposal={proposal} />
    </HrPage>
  );
}
