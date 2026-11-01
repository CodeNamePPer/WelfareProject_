import { LogTable } from '../logs/LogTable';
import { OutlineButton, Panel, PanelTitle } from './ui';
import type { AuditEntry } from '../../types';

interface ActivityLogPanelProps {
  className?: string;
  entries: AuditEntry[];
  onViewAll: () => void;
}

// "ประวัติการแก้ไข" – รายการล่าสุด ใช้ตารางเดียวกับหน้า Log
export function ActivityLogPanel({ className, entries, onViewAll }: ActivityLogPanelProps) {
  return (
    <Panel className={className} aria-labelledby="log-title">
      <div className="flex items-start justify-between gap-[14px]">
        <div className="flex flex-col gap-[4px]">
          <PanelTitle id="log-title">ประวัติการแก้ไข</PanelTitle>
          <p className="text-13 text-muted">{entries.length.toLocaleString('th-TH')} รายการล่าสุด</p>
        </div>
        <OutlineButton onClick={onViewAll}>ดูทั้งหมด</OutlineButton>
      </div>

      <LogTable entries={entries} emptyText="ยังไม่มีประวัติการแก้ไข" />
    </Panel>
  );
}
