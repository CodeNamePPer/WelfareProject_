import { notFound } from "next/navigation";
import { getHrBenefits } from "@/lib/hr/benefits";
import { signBenefitImages } from "@/lib/benefitImages";
import { getAllProposals } from "@/lib/hr/proposals";
import { getSession } from "@/lib/auth/get-session";
import { isHrHead } from "@/lib/hr/hrHead";
import { HrPage } from "@/features/hr/ui";
import { BenefitDetailView } from "@/features/welfare/BenefitDetailView";

// base: /hr หรือ /admin
export async function BenefitDetailScreen({ code, base }: { code: string; base: "/hr" | "/admin" }) {
  const session = await getSession();
  const [benefits, proposals] = await Promise.all([getHrBenefits(), getAllProposals(session?.sub)]);
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

  const images = await signBenefitImages([benefit.imagePath]);
  const imageUrl = benefit.imagePath ? (images.get(benefit.imagePath) ?? null) : null;

  const openProposal = (proposals ?? []).find(
    (p) => p.benefitCode === benefit.code && (p.status === "draft" || p.status === "pending" || p.status === "needs_info"),
  );

  return (
    <HrPage>
      <BenefitDetailView
        benefit={benefit}
        imageUrl={imageUrl}
        backHref={`${base}/benefits`}
        editHref={`${base}/benefits/propose?edit=${encodeURIComponent(benefit.code)}`}
        openProposalNo={openProposal?.proposalNo ?? null}
        isHead={isHead}
        reviewHref={isHead && openProposal?.status === "pending" ? `/hr/proposals/${openProposal.id}` : undefined}
      />
    </HrPage>
  );
}
