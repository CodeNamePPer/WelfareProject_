import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getHrBenefits } from "@/lib/hr/benefits";
import { getAllProposals } from "@/lib/hr/proposals";
import { getSession } from "@/lib/auth/get-session";
import { isHrHead } from "@/lib/hr/hrHead";
import { HrPage } from "@/features/hr/ui";
import { BenefitDetailView } from "@/features/welfare/BenefitDetailView";

export const dynamic = "force-dynamic";

type Params = Promise<{ code: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { code } = await params;
  return { title: `สวัสดิการ ${decodeURIComponent(code)}` };
}

export default async function BenefitDetailPage({ params }: { params: Params }) {
  const [{ code }, benefits, proposals, session] = await Promise.all([params, getHrBenefits(), getAllProposals(), getSession()]);
  const isHead = await isHrHead(session);

  if (benefits === null) {
    return (
      <HrPage>
        <p className="text-13 text-[#991B1B]" role="alert">
          โหลดรายการสวัสดิการไม่สำเร็จ กรุณารีเฟรชหน้าอีกครั้ง
        </p>
      </HrPage>
    );
  }

  const decodedCode = decodeURIComponent(code);
  const benefit = benefits.find((item) => item.code === decodedCode);
  if (!benefit) notFound();

  const openProposal = (proposals ?? []).find(
    (p) => p.benefitCode === benefit.code && (p.status === "draft" || p.status === "pending" || p.status === "needs_info"),
  );

  return (
    <HrPage>
      <BenefitDetailView
        benefit={benefit}
        backHref="/hr/benefits"
        editHref={`/hr/benefits/propose?edit=${encodeURIComponent(benefit.code)}`}
        openProposalNo={openProposal?.proposalNo ?? null}
        isHead={isHead}
        reviewHref={isHead && openProposal?.status === "pending" ? `/hr/proposals/${openProposal.id}` : undefined}
      />
    </HrPage>
  );
}
