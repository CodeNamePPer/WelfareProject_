import type { ReactNode } from "react";
import { Breadcrumb, type Crumb } from "@/components/ui/Breadcrumb";

export type { Crumb };

/** หัวหน้า: breadcrumb (Payroll / รอบจ่าย) + หัวข้อ H1 + คำอธิบาย + ปุ่มด้านขวา (ถ้ามี) */
export function PageHeader({ crumbs, title, description, actions }: { crumbs: Crumb[]; title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <Breadcrumb items={crumbs} className="mb-1" />
        <h1 className="text-22 font-semibold text-ink">{title}</h1>
        {description && <p className="mt-1 text-13 text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
