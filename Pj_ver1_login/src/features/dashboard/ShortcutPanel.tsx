import { FileSpreadsheet, LayoutGrid, PackageSearch, UserRoundPlus } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Panel, PanelTitle } from './ui';

interface Shortcut {
  id: string;
  label: string;
  icon: LucideIcon;
}

const shortcuts: Shortcut[] = [
  { id: 'add-benefit', label: 'เพิ่มสวัสดิการ', icon: UserRoundPlus },
  { id: 'it-email', label: 'ตั้งค่าอีเมล IT', icon: UserRoundPlus },
  { id: 'report-issue', label: 'แจ้งปัญหาเว็บไซต์ (IT)', icon: PackageSearch },
  { id: 'import-claims', label: 'นำเข้าประวัติขอเบิก', icon: FileSpreadsheet },
];

// Figma 163:1247 – "ทางลัด" panel with a 2×2 grid of 215×93 tiles.
export function ShortcutPanel({ onSelect }: { onSelect: (label: string) => void }) {
  return (
    <Panel aria-labelledby="shortcut-title" className="min-h-[437px]">
      <div className="flex items-center gap-[10px]">
        <LayoutGrid className="size-[30px] shrink-0 text-primary-600" strokeWidth={1.75} aria-hidden="true" />
        <PanelTitle id="shortcut-title">ทางลัด</PanelTitle>
      </div>

      <div className="mt-[24px] grid max-w-[444px] grid-cols-1 gap-[14px] sm:grid-cols-2">
        {shortcuts.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(label)}
            className="group flex h-[93px] flex-col items-center justify-center gap-[8px] rounded-[6px] border border-line bg-white px-[16px] py-[10px] transition-colors hover:border-primary-500 hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 motion-reduce:transition-none"
          >
            <Icon className="size-[30px] shrink-0 text-ink group-hover:text-primary-700" strokeWidth={1.75} aria-hidden="true" />
            <span className="w-full truncate text-left text-[13px] font-medium text-ink group-hover:text-primary-700">
              {label}
            </span>
          </button>
        ))}
      </div>
    </Panel>
  );
}
