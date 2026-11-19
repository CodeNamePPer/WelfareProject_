import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getHrBenefits } from "@/lib/hr/benefits";
import { getOpenProposals } from "@/lib/hr/proposals";
import { getSession } from "@/lib/auth/get-session";
import { ButtonLink, HrPage } from "@/features/hr/ui";
import { BenefitsClient } from "@/app/hr/benefits/BenefitsClient";
import { toBenefitRows } from "@/app/hr/benefits/rows";

export const metadata: Metadata = { title: "จัดการสวัสดิการ" };

// อ่านข้อมูลล่าสุดทุกครั้งที่เปิดหน้า
export const dynamic = "force-dynamic";

type Search = Promise<{ tab?: string; new?: string; item?: string; proposal?: string; claim?: string }>;

// จัดการสวัสดิการของ Admin ในดีไซน์ C เดียวกับ HR (H03) · Admin เสนอผ่านหัวหน้า HR เหมือน HR
// ลิงก์เดิมแบบ ?tab= / ?new=1 / ?item= / ?proposal= / ?claim= ยังใช้ได้ (ส่งต่อไปหน้าใหม่)
export default async function AdminBenefitsPage({ searchParams }: { searchParams: Search }) {
  const params = await searchParams;
  if (params.tab === "history") redirect("/admin/logs?tab=welfare");
  if (params.tab === "claims" || params.claim) redirect(params.claim ? `/admin/benefits/claims?claim=${encodeURIComponent(params.claim)}` : "/admin/benefits/claims");
  if (params.new === "1") redirect("/admin/benefits/propose");
  if (params.item) redirect(`/admin/benefits/${encodeURIComponent(params.item)}`);
  if (params.proposal) redirect(`/admin/benefits/proposals/${encodeURIComponent(params.proposal)}`);

  const [benefits, proposals] = await Promise.all([getHrBenefits(), getOpenProposals((await getSession())?.sub)]);
  if (!benefits) return <p className="text-13 text-status-rejected-ink">โหลดรายการสวัสดิการไม่สำเร็จ กรุณารีเฟรชหน้าอีกครั้ง</p>;

  return (
    <HrPage>
      <BenefitsClient
        rows={await toBenefitRows(benefits)}
        proposals={proposals}
        isHead={false}
        base="/admin"
        extraActions={
          <ButtonLink variant="quiet" className="!px-4" href="/admin/benefits/claims">
            คำขอเบิกทั้งหมด
          </ButtonLink>
        }
      />
    </HrPage>
  );
}
