"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { Button } from "@/features/payroll/components/ui/Button";
import { Icon } from "@/features/payroll/components/ui/Icon";
import { StatusBadge } from "@/features/payroll/components/ui/StatusBadge";
import { WELFARE_LABEL } from "@/features/payroll/lib/constants";
import type { PaymentRequest } from "@/features/payroll/lib/types";
import { detailSections } from "./PaymentDetailCard";

/** ตัวอักษรแรกของชื่อจริง (ข้ามคำนำหน้า นาย/นาง/นางสาว) ใช้ในวงกลมรูปโปรไฟล์ */
function initialOf(fullName: string) {
  const parts = fullName.split(" ").filter(Boolean);
  return (parts[1] ?? parts[0] ?? "?").slice(0, 1);
}

/** แถว "ชื่อ ........ ค่า" (ชื่อชิดซ้ายสีเทา ค่าชิดขวาตัวหนา) */
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <dt className="shrink-0 text-muted">{label}</dt>
      <dd className="num min-w-0 text-right font-medium break-words text-ink">{value}</dd>
    </div>
  );
}

/**
 * แผงรายละเอียดคำขอด้านขวา (เปิดเมื่อกดชื่อพนักงานในตาราง)
 *   จอ ≥ 1280px : วางติดข้างตาราง (sticky เลื่อนตามจอ)
 *   จอเล็กกว่า   : เลื่อนออกมาจากขอบขวา มีพื้นหลังทึบ กดพื้นหลังหรือ Esc เพื่อปิด
 *
 * ปุ่ม "ส่งกลับ" / "บันทึกจ่ายแล้ว" ท้ายแผง แสดงเฉพาะคำขอที่สถานะ "รอจ่าย"
 * onReturn / onPaid ส่งมาจาก ApprovalsView ซึ่งเปิด Modal ยืนยันก่อนทำจริง
 */
export function RequestDetailPanel({
  request: r,
  onClose,
  onReturn,
  onPaid,
}: {
  request: PaymentRequest;
  onClose: () => void;
  onReturn: () => void;
  onPaid: () => void;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  // เปิดแผง/เปลี่ยนคน -> ย้ายโฟกัสมาที่ชื่อ ให้ screen reader และคีย์บอร์ดตามมาได้
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, [r.id]);

  // กด Esc ปิดแผง
  useEffect(() => {
    // ถ้ามี Modal ยืนยันเปิดอยู่ ให้ Esc ปิด Modal ก่อน ไม่ปิดแผง
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !document.querySelector("dialog[open]") && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const detailHref = `/payroll/${r.status === "paid" ? "history" : "approvals"}/details?q=${r.id}`;

  return (
    <>
      {/* พื้นหลังทึบ (เฉพาะตอนเป็นแผงลอยบนจอเล็ก) */}
      <div className="fixed inset-0 z-30 bg-ink/30 xl:hidden" onClick={onClose} aria-hidden="true" />

      <aside
        aria-labelledby="request-panel-title"
        className="fixed inset-y-0 right-0 z-40 flex w-[min(400px,100vw)] flex-col border-l border-line bg-white
          xl:sticky xl:top-6 xl:z-auto xl:max-h-[calc(100vh-176px)] xl:w-auto xl:rounded-xl xl:border xl:shadow-card"
      >
        {/* หัวแผง: รูป / ชื่อ / เลขคำขอ · รหัสพนักงาน / สถานะ */}
        <header className="flex items-start gap-3 border-b border-line p-5">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-primary-50 text-13 font-semibold text-primary-700 ring-1 ring-primary-100">
            {initialOf(r.employeeName)}
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="request-panel-title" ref={headingRef} tabIndex={-1} className="text-13 font-semibold text-ink focus:outline-none">
              {r.employeeName}
            </h2>
            <p className="num text-12 text-muted">
              {r.id} · {r.employeeId}
            </p>
            <div className="mt-2">
              <StatusBadge status={r.status} />
            </div>
          </div>
          <button type="button" onClick={onClose} className="-mt-1 -mr-1 rounded-lg p-1.5 text-muted hover:bg-surface hover:text-ink" aria-label="ปิดรายละเอียด">
            <Icon name="x" className="size-5" />
          </button>
        </header>

        {/* เนื้อหา: เลื่อนได้ในแผง */}
        <div className="flex-1 overflow-y-auto px-5">
          <section className="border-b border-line py-4">
            <h3 className="mb-1 text-12 font-semibold text-ink">ข้อมูลผู้ขอ</h3>
            <dl className="text-12">
              <Row label="แผนก / ฝ่าย" value={r.department} />
              <Row label="สวัสดิการ" value={WELFARE_LABEL[r.welfare]} />
            </dl>
          </section>

          {detailSections(r).map((sec) => (
            <section key={sec.title} className="border-b border-line py-4 last:border-b-0">
              <h3 className="mb-1 text-12 font-semibold text-ink">{sec.title}</h3>
              <dl className="text-12">
                {sec.rows.map(([label, value]) => (
                  <Row key={label} label={label} value={value} />
                ))}
              </dl>
            </section>
          ))}

          {r.returnReason && (
            <p className="mb-4 rounded-lg bg-status-rejected/10 px-3 py-2 text-12 text-status-rejected">เหตุผลที่ส่งกลับ: {r.returnReason}</p>
          )}
        </div>

        {/* ท้ายแผง: คำสั่ง (เฉพาะรอจ่าย) + ลิงก์ไปหน้ารายละเอียดเต็ม */}
        <footer className="flex flex-col gap-2 border-t border-line p-4">
          {r.status === "pending" && (
            <div className="grid grid-cols-2 gap-2">
              <Button variant="danger" icon="undo" onClick={onReturn}>
                ส่งกลับ
              </Button>
              <Button icon="check" onClick={onPaid}>
                บันทึกจ่ายแล้ว
              </Button>
            </div>
          )}
          <Link href={detailHref} className="block py-1 text-center text-12 text-primary-600 hover:underline">
            เปิดหน้ารายละเอียดเต็ม
          </Link>
        </footer>
      </aside>
    </>
  );
}
