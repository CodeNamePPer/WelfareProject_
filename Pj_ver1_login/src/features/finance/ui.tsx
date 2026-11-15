'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';

// ชิ้นส่วนที่หน้าการเงิน (ดีไซน์ F01–F09) ใช้ร่วมกัน · หน้าตาใช้ชุด HR (features/hr/ui) เพราะดีไซน์ C ใช้สเปกเดียวกัน

async function post(url: string, body: unknown): Promise<{ error: string | null; data: Record<string, unknown> }> {
  try {
    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (response.ok) return { error: null, data };
    return { error: typeof data.error === 'string' ? data.error : 'ดำเนินการไม่สำเร็จ กรุณาลองใหม่อีกครั้ง', data };
  } catch {
    return { error: 'เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง', data: {} };
  }
}

/** คำสั่งของการเงินที่ /api/payroll/actions */
export const financeAction = (body: Record<string, unknown>) => post('/api/payroll/actions', body);

/** อนุมัติจ่าย / ส่งกลับ HR ผ่าน API คำขอกลาง */
export const claimAction = (claimNo: string, body: { action: 'finance_approve' | 'finance_return'; note?: string }) =>
  post(`/api/claims/${encodeURIComponent(claimNo)}/actions`, body);

/** หน้าต่างยืนยันแบบดีไซน์ F07: กว้าง 520px มุม 8px เงา หัวข้อ 18px */
export function FinDialog({ open, title, onClose, children }: { open: boolean; title: ReactNode; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className="m-auto w-[520px] max-w-[92%] rounded-[8px] border border-line bg-white p-0 text-14 leading-[1.55] text-ink shadow-[0_8px_24px_-6px_rgba(15,23,42,.25)] backdrop:bg-[#0f172a]/30"
    >
      {open ? (
        <div className="flex flex-col gap-3.5 p-6">
          <h2 id={titleId} className="text-[18px] font-semibold">
            {title}
          </h2>
          {children}
        </div>
      ) : null}
    </dialog>
  );
}

/** ข้อความผิดพลาดใต้ฟอร์ม */
export function FormError({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="text-13 text-[#991B1B]">
      {children}
    </p>
  );
}
