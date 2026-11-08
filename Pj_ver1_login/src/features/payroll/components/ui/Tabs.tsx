"use client";

/**
 * แท็บแบบปุ่มกลุ่ม (segmented) เช่น ทั้งหมด / รอจ่าย / จ่ายแล้ว
 * เป็น "controlled component": ค่าที่เลือกอยู่ (value) และการเปลี่ยน (onChange) ส่งมาจากหน้าแม่
 */
export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  label,
}: {
  tabs: { value: T; label: string; count?: number }[];
  value: T;
  onChange: (v: T) => void;
  label: string; // ชื่อกลุ่มแท็บสำหรับ screen reader
}) {
  return (
    <div role="tablist" aria-label={label} className="inline-flex max-w-full gap-1 overflow-x-auto rounded-lg bg-surface p-1 ring-1 ring-line">
      {tabs.map((t) => {
        const active = t.value === value;
        return (
          <button
            key={t.value}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(t.value)}
            className={`h-9 rounded-[6px] px-4 text-12 font-medium whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 ${
              active ? "bg-white text-primary-600 shadow-card ring-1 ring-line" : "text-muted hover:text-ink"
            }`}
          >
            {t.label}
            {t.count !== undefined && (
              <span className={`num ml-1.5 rounded-full px-1.5 text-[12px] ${active ? "bg-primary-100 text-primary-700" : "bg-line text-muted"}`}>
                {t.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
