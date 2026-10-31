import type { ReactNode } from 'react';

// Page title block shared by the Admin pages – Figma "Page header" (22px semibold + 13px muted).
export function PageHeader({ title, description, action }: { title: string; description?: ReactNode; action?: ReactNode }) {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-col gap-[4px]">
        <h1 className="text-[22px] font-semibold text-ink">{title}</h1>
        {description ? <p className="text-[13px] text-muted">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}
