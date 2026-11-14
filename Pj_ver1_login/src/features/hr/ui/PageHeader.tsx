import type { ReactNode } from 'react';
import { Breadcrumb, type Crumb } from '@/components/ui/Breadcrumb';

// หัวหน้าของ HR: breadcrumb หัวข้อ 22px/600 คำอธิบาย และปุ่มด้านขวา
export function PageHeader({ crumbs, title, description, actions }: { crumbs?: Crumb[]; title: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {crumbs && crumbs.length > 0 ? <Breadcrumb items={crumbs} className="mb-1" /> : null}
        <h1 className="text-22 font-semibold text-ink">{title}</h1>
        {description ? <p className="mt-0.5 text-13 text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

/** คอลัมน์เนื้อหาของหน้า HR: ระยะห่างการ์ด 16px ตัวอักษร 14px line-height 1.55 */
export function HrPage({ children }: { children: ReactNode }) {
  return <div className="flex w-full min-w-0 flex-col gap-4 text-14 leading-[1.55] text-ink">{children}</div>;
}
