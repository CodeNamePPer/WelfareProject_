import Link from "next/link";
import type { ReactNode } from "react";

export interface Crumb {
  label: string;
  href?: string; // ไม่มี href = หน้าปัจจุบัน
}

/** หัวหน้า: breadcrumb (Payroll / รอบจ่าย) + หัวข้อ H1 + คำอธิบาย + ปุ่มด้านขวา (ถ้ามี) */
export function PageHeader({ crumbs, title, description, actions }: { crumbs: Crumb[]; title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <nav aria-label="breadcrumb" className="mb-1 flex flex-wrap items-center gap-1 text-12 text-muted">
          {crumbs.map((c, i) => (
            <span key={c.label} className="flex items-center gap-1">
              {i > 0 && <span aria-hidden="true">/</span>}
              {c.href ? (
                <Link href={c.href} className="hover:text-primary-600 hover:underline">
                  {c.label}
                </Link>
              ) : (
                <span aria-current="page" className="text-ink">
                  {c.label}
                </span>
              )}
            </span>
          ))}
        </nav>
        <h1 className="text-22 font-semibold text-ink">{title}</h1>
        {description && <p className="mt-1 text-13 text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
