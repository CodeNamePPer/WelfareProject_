import { WelfarePage } from "@/features/welfare/WelfarePage";
import { auditEntries, claims, employees, importPreview, welfareItems } from "@/data/mock";

export default function AdminBenefitsPage() {
  return (
    <WelfarePage
      initialItems={welfareItems}
      importPreview={importPreview}
      claims={claims}
      employees={employees}
      history={auditEntries.filter((entry) => entry.action === "welfare" || entry.category === "import")}
    />
  );
}
