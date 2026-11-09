"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/features/payroll/components/ui/Button";
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
 * หน้ารายละเอียดคำขอ (เปิดเมื่อกดแถวในตาราง)
 *
 * ปุ่มท้ายหน้าขึ้นกับสถานะ: "รอการเงินตรวจ" = ปฏิเสธ / ส่งกลับ / อนุมัติ, "รอจ่าย" = ส่งกลับ / บันทึกจ่ายแล้ว
 * callback ทั้งหมดส่งมาจาก ApprovalsView ซึ่งเปิด Modal ยืนยันก่อนทำจริง
 */
export function RequestDetailPanel({
  request: r,
  onReturn,
  onReject,
  onApprove,
  onPaid,
}: {
  request: PaymentRequest;
  onReturn: () => void;
  onReject: () => void;
  onApprove: () => void;
  onPaid: () => void;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  // เปิดแผง/เปลี่ยนคน -> ย้ายโฟกัสมาที่ชื่อ ให้ screen reader และคีย์บอร์ดตามมาได้
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, [r.id]);

  return (
    <section aria-labelledby="request-panel-title" className="rounded-xl border border-line bg-white shadow-card">
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
        </header>

        <div className="grid gap-x-10 px-5 lg:grid-cols-2">
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
            <p className="my-4 rounded-lg bg-status-rejected/10 lg:col-span-2 px-3 py-2 text-12 text-status-rejected">เหตุผลที่ส่งกลับ: {r.returnReason}</p>
          )}
        </div>

        {(r.status === "approved" || r.status === "pending") && (
        <footer className="flex justify-end border-t border-line p-4">
          {r.status === "approved" && (
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="danger" onClick={onReject}>
                ปฏิเสธ
              </Button>
              <Button variant="ghost" icon="undo" onClick={onReturn}>
                ส่งกลับ
              </Button>
              <Button icon="check" onClick={onApprove}>
                อนุมัติ
              </Button>
            </div>
          )}
          {r.status === "pending" && (
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="danger" icon="undo" onClick={onReturn}>
                ส่งกลับ
              </Button>
              <Button icon="check" onClick={onPaid}>
                บันทึกจ่ายแล้ว
              </Button>
            </div>
          )}
        </footer>
        )}
    </section>
  );
}
