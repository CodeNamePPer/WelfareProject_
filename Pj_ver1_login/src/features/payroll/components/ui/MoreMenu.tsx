"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";

export interface MenuAction {
  label: string;
  href?: string; // ถ้ามี = ลิงก์ไปหน้าอื่น
  onSelect?: () => void; // ถ้าไม่มี href = เรียกฟังก์ชันนี้
  danger?: boolean;
}

const MENU_HEIGHT = 120; // ความสูงโดยประมาณ ใช้ตัดสินว่าจะเปิดลงหรือเปิดขึ้น

/**
 * ปุ่ม "…" เปิดเมนูย่อยของแต่ละแถวในตาราง
 * เมนูใช้ position: fixed คำนวณตำแหน่งจากปุ่ม เพื่อไม่ให้ถูกตัดโดยกรอบตารางที่เลื่อนแนวนอนได้
 * ถ้าปุ่มอยู่ใกล้ขอบล่างจอ เมนูจะเปิดขึ้นด้านบนแทน
 */
export function MoreMenu({ actions, label }: { actions: MenuAction[]; label: string }) {
  const [pos, setPos] = useState<{ top?: number; bottom?: number; right: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const open = pos !== null;

  function toggle() {
    if (open) return setPos(null);
    const r = btnRef.current!.getBoundingClientRect();
    const right = window.innerWidth - r.right;
    setPos(r.bottom + MENU_HEIGHT > window.innerHeight ? { bottom: window.innerHeight - r.top + 4, right } : { top: r.bottom + 4, right });
  }

  // คลิกนอกเมนู, กด Esc, เลื่อนหน้า หรือย่อขยายจอ -> ปิดเมนู
  useEffect(() => {
    if (!open) return;
    const close = () => setPos(null);
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!menuRef.current?.contains(t) && !btnRef.current?.contains(t)) close();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  const item = "block w-full px-4 py-2.5 text-left text-12 hover:bg-primary-50";
  return (
    <>
      <button
        ref={btnRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={toggle}
        className="grid size-9 place-items-center rounded-lg text-muted hover:bg-primary-50 hover:text-ink"
      >
        <Icon name="more" className="size-5" />
      </button>
      {pos && (
        <div
          ref={menuRef}
          role="menu"
          style={{ position: "fixed", top: pos.top, bottom: pos.bottom, right: pos.right }}
          className="z-40 w-48 overflow-hidden rounded-lg border border-line bg-white py-1 text-left shadow-lg"
        >
          {actions.map((a) =>
            a.href ? (
              <Link key={a.label} role="menuitem" href={a.href} className={`${item} text-ink`}>
                {a.label}
              </Link>
            ) : (
              <button
                key={a.label}
                role="menuitem"
                type="button"
                onClick={() => {
                  setPos(null);
                  a.onSelect?.();
                }}
                className={`${item} ${a.danger ? "text-status-rejected" : "text-ink"}`}
              >
                {a.label}
              </button>
            ),
          )}
        </div>
      )}
    </>
  );
}
