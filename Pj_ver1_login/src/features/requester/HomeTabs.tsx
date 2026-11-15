'use client';

import { useState, type ReactNode } from "react";
import { cx } from "@/lib/cx";
import { HOME_TABS, type HomeTabId } from "./home-tabs";

/**
 * แถบแท็บใต้โปรไฟล์ในหน้าหลัก สลับเนื้อหาในหน้าเดิม ไม่เปลี่ยนหน้า
 * จำแท็บไว้ใน ?tab= เพื่อให้รีเฟรชหรือกดย้อนกลับจากหน้ารายละเอียดแล้วยังอยู่แท็บเดิม
 * แท็บที่ซ่อนยัง mount อยู่ สถานะข้างใน (เช่นแท็บย่อยของข้อมูลส่วนตัว) จึงไม่หาย
 */
export function HomeTabs({ initialTab, panels, badges = {} }: { initialTab: HomeTabId; panels: Record<HomeTabId, ReactNode>; badges?: Partial<Record<HomeTabId, number>> }) {
  const [tab, setTab] = useState<HomeTabId>(initialTab);

  function select(next: HomeTabId) {
    setTab(next);
    const url = new URL(window.location.href);
    if (next === "benefits") url.searchParams.delete("tab");
    else url.searchParams.set("tab", next);
    window.history.replaceState(window.history.state, "", url);
  }

  return (
    <>
      <div role="tablist" aria-label="ส่วนของหน้า" className="flex flex-wrap gap-1 border-t border-line px-4 text-14">
        {HOME_TABS.map((item) => {
          const selected = item.id === tab;
          const badge = badges[item.id] ?? 0;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={`home-tab-${item.id}`}
              aria-selected={selected}
              aria-controls={`home-panel-${item.id}`}
              onClick={() => select(item.id)}
              className={cx(
                "inline-flex items-center gap-1.5 border-b-2 px-2.5 py-3 transition-colors motion-reduce:transition-none",
                selected ? "border-primary-600 font-semibold text-ink" : "border-transparent text-muted hover:text-ink",
              )}
            >
              {item.label}
              {badge > 0 ? (
                <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-orange-100 px-1.5 text-12 font-semibold text-orange-800" aria-label={`ต้องแก้ไข ${badge} รายการ`}>
                  {badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {HOME_TABS.map((item) => (
        <div key={item.id} role="tabpanel" id={`home-panel-${item.id}`} aria-labelledby={`home-tab-${item.id}`} hidden={item.id !== tab} className="border-t border-line">
          {panels[item.id]}
        </div>
      ))}
    </>
  );
}
