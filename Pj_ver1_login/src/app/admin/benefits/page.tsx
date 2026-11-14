import { redirect } from "next/navigation";
import { WelfarePage, type TabId } from "@/features/welfare/WelfarePage";
import { getSession } from "@/lib/auth/get-session";
import { listClaims } from "@/lib/claims/service";
import { ADMIN_STATUSES, toAdminClaim } from "@/lib/claims/mappers";
import { fetchEmployees } from "@/lib/admin/dashboard";
import { getWelfareItems } from "@/lib/admin/welfare";
import { getAllProposals, getProposalOptions } from "@/lib/hr/proposals";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "จัดการสวัสดิการ" };

const TABS: TabId[] = ["catalog", "proposals", "claims"];

// ?tab=proposals / ?tab=claims เปิดแท็บนั้นทันที (ใช้จากทางลัดหน้าแรก)
// ?new=1 เปิดฟอร์มเพิ่มสวัสดิการใหม่ทันที (ทางลัด "เพิ่มสวัสดิการ" ในปุ่มลอย)
export default async function AdminBenefitsPage({ searchParams }: { searchParams: Promise<{ tab?: string; new?: string }> }) {
  const { tab, new: startNew } = await searchParams;
  // ประวัติการแก้ไขสวัสดิการย้ายไปรวมที่หน้าประวัติของระบบแล้ว
  if (tab === "history") redirect("/admin/logs?tab=welfare");
  const initialTab = TABS.find((id) => id === tab);
  const [session, items, employees, claims, proposals, proposalOptions] = await Promise.all([
    getSession(),
    getWelfareItems(),
    fetchEmployees(),
    listClaims({ statuses: ADMIN_STATUSES }),
    getAllProposals(),
    getProposalOptions(),
  ]);
  if (!items) {
    return <p className="text-13 text-status-rejected">โหลดรายการสวัสดิการไม่สำเร็จ กรุณาลองใหม่อีกครั้ง</p>;
  }

  return (
    <WelfarePage
      initialItems={items}
      initialProposals={proposals ?? []}
      proposalOptions={proposalOptions}
      currentUserCode={session?.sub ?? ""}
      claims={(claims ?? []).map(toAdminClaim)}
      employees={employees ?? []}
      initialTab={initialTab}
      startCreating={startNew === "1"}
    />
  );
}
