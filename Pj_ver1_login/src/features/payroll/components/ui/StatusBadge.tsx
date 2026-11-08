import { STATUS_META } from "@/features/payroll/lib/constants";
import type { PaymentStatus } from "@/features/payroll/lib/types";

/**
 * ป้ายสถานะทรงแคปซูล: พื้นสีอ่อน + จุดสี + ข้อความสีเข้ม
 * มีข้อความกำกับเสมอ (Style Guide: ห้ามใช้สีอย่างเดียว)
 */
export function StatusBadge({ status }: { status: PaymentStatus }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={`inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-12 font-medium whitespace-nowrap ${meta.bg} ${meta.text}`}
    >
      <span className={`size-1.5 rounded-full ${meta.dot}`} aria-hidden="true" />
      {meta.label}
    </span>
  );
}
