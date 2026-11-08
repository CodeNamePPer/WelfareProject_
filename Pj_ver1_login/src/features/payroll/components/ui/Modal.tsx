"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Icon } from "./Icon";

/**
 * หน้าต่างยืนยัน (Modal)
 * ใช้ <dialog> ของ browser: มีพื้นหลังทึบ, กด Esc ปิดได้, โฟกัสคีย์บอร์ดอยู่ในหน้าต่างให้อัตโนมัติ
 *
 * ใช้:
 *   <Modal open={isOpen} onClose={() => setOpen(false)} title="ยืนยัน" footer={<Button>ตกลง</Button>}>
 *     เนื้อหา
 *   </Modal>
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  // ซิงก์ค่า open (state ของ React) กับการเปิด/ปิด <dialog> จริงใน browser
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose} // ถูกเรียกเมื่อกด Esc
      onClick={(e) => e.target === ref.current && onClose()} // คลิกพื้นหลังเพื่อปิด
      className="m-auto w-[min(480px,calc(100vw-32px))] rounded-xl bg-white p-0 text-ink shadow-xl backdrop:bg-ink/40"
    >
      <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-4">
        <h2 className="text-14 font-semibold">{title}</h2>
        <button type="button" onClick={onClose} className="rounded-lg p-1 text-muted hover:bg-surface" aria-label="ปิด">
          <Icon name="x" className="size-5" />
        </button>
      </div>
      <div className="px-6 py-5 text-13">{children}</div>
      <div className="flex justify-end gap-2 border-t border-line bg-surface px-6 py-4">{footer}</div>
    </dialog>
  );
}
