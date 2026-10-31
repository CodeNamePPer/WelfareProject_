import { CircleAlert, ClipboardCheck } from 'lucide-react';
import { ItemCard, OutlineButton, Panel, PanelTitle } from './ui';
import type { LogGroup } from '../../types';

interface ActivityLogPanelProps {
  groups: LogGroup[];
  onViewAll: () => void;
}

// Figma 163:1223 – "ประวัติการแก้ไข" panel.
export function ActivityLogPanel({ groups, onViewAll }: ActivityLogPanelProps) {
  const visibleGroups = groups.filter((group) => group.entries.length > 0);

  return (
    <Panel aria-labelledby="log-title" className="min-h-[437px]">
      <div className="flex items-start justify-between gap-[14px]">
        <PanelTitle id="log-title">ประวัติการแก้ไข</PanelTitle>
        <OutlineButton onClick={onViewAll}>ดูทั้งหมด</OutlineButton>
      </div>

      {visibleGroups.length === 0 ? (
        <p className="rounded-[10px] border border-dashed border-line px-[16px] py-[32px] text-center text-[14px] text-muted">
          ยังไม่มีประวัติการแก้ไข
        </p>
      ) : (
        visibleGroups.map((group) => (
          <section key={group.label} aria-label={group.label} className="flex flex-col gap-[14px]">
            <h3 className="px-[24px] pt-[4px] text-[14px] font-semibold text-muted">{group.label}</h3>
            <ul className="flex flex-col gap-[12px] pt-[12px] pb-[8px] sm:px-[28px]">
              {group.entries.map((entry) => {
                const Icon = entry.kind === 'permission' ? ClipboardCheck : CircleAlert;
                return (
                  <li key={entry.id}>
                    <ItemCard>
                      <Icon className="size-[35px] shrink-0 text-primary-600" strokeWidth={1.5} aria-hidden="true" />
                      <div className="flex min-w-0 flex-1 flex-col gap-[4px]">
                        <div className="flex items-center justify-between gap-[12px]">
                          <p className="text-[16px] font-semibold text-ink">{entry.title}</p>
                          <time className="shrink-0 text-[14px] text-muted tabular-nums">{entry.time}</time>
                        </div>
                        <p className="text-[14px] text-muted">{entry.detail}</p>
                      </div>
                    </ItemCard>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}
    </Panel>
  );
}
