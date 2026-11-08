"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { Icon } from "./Icon";

/*
 * ข้อความแจ้งผลมุมขวาล่าง (Toast) เช่น "บันทึกวันจ่ายเรียบร้อย"
 *
 * ทำงานด้วย React Context:
 *   1) <ToastProvider> ครอบทั้งแอป (อยู่ใน AppShell) เก็บรายการข้อความไว้
 *   2) คอมโพเนนต์ไหนก็ได้เรียก  const toast = useToast();  toast("ข้อความ")
 *   3) ข้อความหายเองใน 4 วินาที
 */

type Tone = "success" | "error";
interface ToastItem {
  id: number;
  message: string;
  tone: Tone;
}

const ToastContext = createContext<(message: string, tone?: Tone) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const show = useCallback((message: string, tone: Tone = "success") => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev, { id, message, tone }]);
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {/* aria-live: screen reader อ่านข้อความใหม่ให้อัตโนมัติ */}
      <div aria-live="polite" className="pointer-events-none fixed right-4 bottom-4 z-50 flex flex-col gap-2">
        {items.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex items-center gap-3 rounded-xl border border-line bg-white px-4 py-3 text-12 text-ink shadow-lg"
          >
            <span
              className={`grid size-6 place-items-center rounded-full text-white ${t.tone === "success" ? "bg-status-approved" : "bg-status-rejected"}`}
            >
              <Icon name={t.tone === "success" ? "check" : "x"} className="size-4" strokeWidth={2.5} />
            </span>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/** เรียกใช้ใน client component:  const toast = useToast(); toast("สำเร็จ") */
export function useToast() {
  return useContext(ToastContext);
}
