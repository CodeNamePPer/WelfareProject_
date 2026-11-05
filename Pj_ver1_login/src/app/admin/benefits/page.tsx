import { redirect } from "next/navigation";
import { WelfarePage, type TabId } from "@/features/welfare/WelfarePage";
import { claims, employees, importPreview, welfareItems } from "@/data/mock";

const TABS: TabId[] = ["catalog", "claims", "import"];

// ?tab=import / ?tab=claims เปิดแท็บนั้นทันที (ใช้จากทางลัดหน้าแรก)
export default async function AdminBenefitsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  // ประวัติการแก้ไขสวัสดิการย้ายไปรวมที่หน้าประวัติของระบบแล้ว
  if (tab === "history") redirect("/admin/logs?tab=welfare");
  const initialTab = TABS.find((id) => id === tab);

  return (
    <WelfarePage
      initialItems={welfareItems}
      importPreview={importPreview}
      claims={claims}
      employees={employees}
      initialTab={initialTab}
    />
  );
}
