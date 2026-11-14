import type { ReactNode } from 'react';

// ตัวกรองทรงแคปซูล "แผนก ▾" ตามดีไซน์ (ใช้ select จริงเพื่อให้ใช้คีย์บอร์ดและมือถือได้ ซ่อนแค่หน้าตาเดิม)
// ค่าว่าง ('') = ทั้งหมด และแสดงเป็นชื่อตัวกรอง
export function FilterPill({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: ReactNode }) {
  return (
    <span className="relative inline-flex">
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 cursor-pointer appearance-none rounded-full border border-[#CBD5E1] bg-white pr-8 pl-4 text-13 text-ink-soft hover:bg-surface"
      >
        <option value="">{label}</option>
        {children}
      </select>
      <span aria-hidden="true" className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-11 text-ink-soft">
        ▾
      </span>
    </span>
  );
}
