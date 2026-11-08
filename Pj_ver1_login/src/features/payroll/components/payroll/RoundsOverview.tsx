"use client";

import { ButtonLink } from "@/features/payroll/components/ui/Button";
import { Card, PageStack, StatCard } from "@/features/payroll/components/ui/Card";
import { ROUND_LABEL, ROUND_RANGE } from "@/features/payroll/lib/constants";
import { sumBy } from "@/features/payroll/lib/filters";
import { formatBaht, formatThaiDate } from "@/features/payroll/lib/format";
import { buildRounds } from "@/features/payroll/lib/rounds";
import { applyPayroll, useHydrated, usePayrollStore } from "@/features/payroll/lib/payroll-store";
import type { PaymentRequest } from "@/features/payroll/lib/types";
import { RescheduleList } from "./RescheduleList";
import { RoundsSkeleton } from "./RoundsSkeleton";
import { RoundsTable } from "./RoundsTable";

/**
 * เนื้อหาหน้า "ตั้งค่ารอบจ่าย / เลื่อนวันจ่าย"
 * คำนวณกำหนดจ่ายใน browser จากข้อมูลกลาง (usePayrollStore) จึงเปลี่ยนตามการตั้งค่าในหน้า "ตั้งค่าการจ่ายเงิน" ทันที
 *   - การ์ดรอบจ่ายถัดไป / ตารางรอบการจ่าย  ใช้วันตามการตั้งค่ารอบ
 *   - จำนวน/ยอดที่จ่ายในวันนั้น              รวมคำขอที่เลื่อนวันจ่ายมาด้วย
 */
export function RoundsOverview({ requests }: { requests: PaymentRequest[] }) {
  const store = usePayrollStore();
  const hydrated = useHydrated();

  // รอบจ่าย: ใช้วันตามการตั้งค่ารอบ (ไม่รวมการเลื่อนรายคำขอ)
  const rounds = buildRounds(applyPayroll(requests, { settings: store.settings, overrides: {} }));
  // คำขอที่รอจ่าย พร้อมวันจ่ายจริง (รวมที่เลื่อนแล้ว)
  const effective = applyPayroll(requests, store);
  const pending = requests.filter((r) => r.status === "pending");

  // รอบถัดไป = รอบที่ยังรอจ่ายและกำหนดจ่ายเร็วที่สุด (= วันจ่ายเงินปัจจุบัน)
  const next = rounds.filter((r) => r.status === "pending").sort((a, b) => (a.payDate < b.payDate ? -1 : 1))[0];
  const dueNext = next ? effective.filter((r) => r.status === "pending" && r.payDate === next.payDate) : [];

  // ยังไม่ได้อ่านค่าที่บันทึกไว้ใน browser: แสดง skeleton ไปก่อน (กันวันที่เริ่มต้นแว้บแล้วเปลี่ยน)
  if (!hydrated) return <RoundsSkeleton />;

  return (
    <PageStack>
      {/* แถวสรุป: การ์ดหลัก (วันจ่ายถัดไป + ปุ่มตั้งค่า) กว้าง 2 ส่วน, ข้อมูลรอง 1 ส่วน */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="flex flex-col gap-4 border-primary-100 bg-primary-50 p-5 sm:flex-row sm:items-end sm:justify-between md:col-span-2">
          <div className="flex flex-col gap-1">
            <p className="text-12 text-primary-700">รอบจ่ายถัดไป · วันจ่ายเงินปัจจุบัน</p>
            <p className="num text-22 font-semibold text-ink">{next ? formatThaiDate(next.payDate) : "ไม่มีรอบที่รอจ่าย"}</p>
            {next && (
              <p className="text-12 text-muted">
                {ROUND_LABEL[next.round]} · {ROUND_RANGE[next.round]} ·{" "}
                <span className="num text-ink">
                  {dueNext.length} รายการ {formatBaht(sumBy(dueNext, (r) => r.paidAmount), false)}
                </span>
              </p>
            )}
          </div>
          <ButtonLink href="/payroll/rounds/schedule" icon="calendar" className="self-start sm:self-auto">
            ตั้งค่าการจ่ายเงิน
          </ButtonLink>
        </Card>
        <StatCard label="รอบจ่ายทั้งหมด" value="2 รอบ" note="รอบที่ 1 (วันที่ 1–15) และรอบที่ 2 (วันที่ 16–สิ้นเดือน)" />
      </div>

      {/* คำขอที่รอจ่าย: ดูรอบ / กำหนดจ่าย และเลื่อนวันจ่ายรายคำขอ */}
      <RescheduleList requests={pending} />

      <RoundsTable rounds={rounds} />
    </PageStack>
  );
}
