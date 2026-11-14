import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { isHrHead } from "@/lib/hr/hrHead";
import { estimateBudget, getProposal, signedImageUrl } from "@/lib/hr/proposals";
import { Avatar, Badge, BenefitPreview, Card, HrPage, PageHeader, StatRow, StatTile } from "@/features/hr/ui";
import { PROPOSAL_STATUS, ProposalFacts, thaiDate } from "../ProposalFacts";
import { DecisionClient } from "./DecisionClient";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export async function generateMetadata(): Promise<Metadata> {
  return { title: "ตรวจข้อเสนอสวัสดิการ" };
}

const ROLE = { HR: "HR", SUPER_ADMIN: "Admin" } as const;

// HH2 ตรวจข้อเสนอ + พรีวิว เฉพาะหัวหน้า HR
export default async function ProposalReviewPage({ params }: { params: Params }) {
  const session = await getSession();
  if (!(await isHrHead(session))) redirect("/hr/home");
  const { id } = await params;
  const proposal = await getProposal(id);
  if (!proposal || proposal.status === "draft" || proposal.status === "withdrawn") notFound();

  const [imageUrl, budget] = await Promise.all([signedImageUrl(proposal.imagePath), estimateBudget(proposal.levelLimits)]);
  const status = PROPOSAL_STATUS[proposal.status];
  const input = proposal.input;
  const chips = [input.allowFamily ? "เบิกให้ครอบครัวได้" : null, input.allowInsurance ? "เบิกส่วนเกินประกันได้" : null, input.allowAdvance ? "เบิกล่วงหน้าได้" : null].filter((chip): chip is string => chip !== null);
  // พรีวิวใช้วงเงินระดับที่ 3 ตามดีไซน์ (ถ้ามี)
  const previewAmount = proposal.levelLimits[2]?.amount ?? proposal.levelLimits.at(-1)?.amount ?? null;
  const perYear = input.budgetType === "monthly" ? 12 : 1;

  return (
    <HrPage>
      <PageHeader
        crumbs={[{ label: "อนุมัติสวัสดิการใหม่", href: "/hr/proposals" }, { label: proposal.proposalNo }]}
        title={`ข้อเสนอ ${proposal.proposalNo} · ${proposal.name}`}
        description={`เสนอโดย ${proposal.proposerName} (${ROLE[proposal.proposerRole]}) · ${thaiDate(proposal.submittedAt)}`}
        actions={<Badge tone={status.tone}>{status.label}</Badge>}
      />

      <div className="flex flex-wrap items-start gap-4">
        <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-4">
          <ProposalFacts proposal={proposal} />

          <Card className="p-5">
            <h2 className="mb-2.5 text-16 font-semibold">ผลกระทบงบประมาณโดยประมาณ</h2>
            <StatRow>
              <StatTile label="พนักงานที่มีสิทธิ์" value={`${budget.eligible} คน`} note="ทำงานอยู่ทุกแผนก" />
              <StatTile
                label={input.budgetType === "per_claim" ? "วงเงินรวมต่อครั้ง" : "วงเงินรวมสูงสุดต่อปี"}
                value={`฿${(budget.total * perYear).toLocaleString("th-TH", { maximumFractionDigits: 0 })}`}
                note="ถ้าใช้เต็มทุกคน"
              />
            </StatRow>
          </Card>

          {proposal.status === "pending" ? (
            <DecisionClient proposalId={proposal.id} />
          ) : (
            <Card className="flex flex-col gap-1 p-5 text-13">
              <h2 className="text-16 font-semibold">การตัดสินใจ</h2>
              <p>
                {status.label}
                {proposal.appliedBenefitCode ? ` · สร้างสวัสดิการ ${proposal.appliedBenefitCode}` : ""}
                {proposal.decidedByName ? ` โดย ${proposal.decidedByName} · ${thaiDate(proposal.decidedAt)}` : ""}
              </p>
              {proposal.decisionNote ? <p className="rounded-[8px] bg-surface px-3 py-2">&ldquo;{proposal.decisionNote}&rdquo;</p> : null}
            </Card>
          )}
        </div>

        <aside className="flex min-w-0 flex-[1_1_320px] flex-col gap-2.5">
          <p className="text-12 font-semibold text-muted">พนักงานจะเห็นแบบนี้</p>
          <BenefitPreview
            imageUrl={imageUrl}
            label={`${proposal.appliedBenefitCode ?? "ใหม่"}${input.category ? ` · ${input.category}` : ""}`}
            name={input.name}
            description={input.description}
            chips={chips}
            maxClaims={input.maxClaims}
            amount={previewAmount}
          />
          <Card className="flex items-center gap-2.5 px-4 py-3.5">
            <Avatar name={proposal.proposerName} />
            <span className="text-13">
              <b className="font-semibold">{proposal.proposerName}</b>
              <span className="block text-muted">{[proposal.proposerPosition, proposal.proposerCode].filter(Boolean).join(" · ")}</span>
            </span>
          </Card>
        </aside>
      </div>
    </HrPage>
  );
}
