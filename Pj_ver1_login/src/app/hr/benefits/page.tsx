import type { Metadata } from "next";
import { getHrBenefits } from "@/lib/hr/benefits";
import { getOpenProposals } from "@/lib/hr/proposals";
import { getSession } from "@/lib/auth/get-session";
import { isHrHead } from "@/lib/hr/hrHead";
import { HrPage } from "@/features/hr/ui";
import { BenefitsClient } from "./BenefitsClient";
import { toBenefitRows } from "./rows";

export const metadata: Metadata = { title: "จัดการสวัสดิการ" };

// ข้อมูลชุดเดียวกับ /admin/benefits และหน้าสิทธิ์ของพนักงาน
export const dynamic = "force-dynamic";

// H03 จัดการสวัสดิการ: HR แก้ตรงไม่ได้ ต้องเสนอผ่านหัวหน้า HR · หัวหน้า HR สร้าง แก้ไข ปิดได้ทันที
export default async function BenefitsPage() {
  const session = await getSession();
  const [benefits, proposals] = await Promise.all([getHrBenefits(), getOpenProposals(session?.sub)]);
  const isHead = await isHrHead(session);
  if (!benefits) return <p className="text-13 text-status-rejected-ink">โหลดรายการสวัสดิการไม่สำเร็จ กรุณารีเฟรชหน้าอีกครั้ง</p>;

  const rows = await toBenefitRows(benefits);

  return (
    <HrPage>
      <BenefitsClient rows={rows} proposals={proposals} isHead={isHead} />
    </HrPage>
  );
}
