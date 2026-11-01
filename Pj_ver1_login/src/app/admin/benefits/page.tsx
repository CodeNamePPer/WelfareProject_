import { WelfarePage, type TabId } from "@/features/welfare/WelfarePage";
import { auditEntries, claims, employees, importPreview, welfareItems } from "@/data/mock";

const TABS: TabId[] = ["catalog", "claims", "history", "import"];

// ?tab=import / ?tab=claims เปิดแท็บนั้นทันที (ใช้จากทางลัดหน้าแรก)
export default async function AdminBenefitsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const initialTab = TABS.find((id) => id === tab);

  return (
    <WelfarePage
      initialItems={welfareItems}
      importPreview={importPreview}
      claims={claims}
      employees={employees}
      history={auditEntries.filter((entry) => entry.action === "welfare" || entry.category === "import")}
      initialTab={initialTab}
    />
  );
}
