"use client";

import { useState } from "react";
import { Button } from "@/features/payroll/components/ui/Button";
import { CalendarGrid, monthAt, type CalendarValue } from "@/features/payroll/components/ui/CalendarPicker";
import { ListPanel } from "@/features/payroll/components/ui/Card";
import { EmptyState } from "@/features/payroll/components/ui/EmptyState";
import { Checkbox, Field, SearchInput, Select } from "@/features/payroll/components/ui/Field";
import { Modal } from "@/features/payroll/components/ui/Modal";
import { Pagination } from "@/features/payroll/components/ui/Pagination";
import { StatusBadge } from "@/features/payroll/components/ui/StatusBadge";
import { TableContainer, TdFull, THead, Th, Td, Tr } from "@/features/payroll/components/ui/Table";
import { useToast } from "@/features/payroll/components/ui/Toast";
import { ROUND_LABEL, WELFARE_LABEL } from "@/features/payroll/lib/constants";
import { ALL, filterRequests, sumBy, WELFARE_FILTER_OPTIONS } from "@/features/payroll/lib/filters";
import { formatBaht, formatThaiDate, parseISODate } from "@/features/payroll/lib/format";
import { MOCK_TODAY } from "@/features/payroll/lib/mock-data";
import { MAX_MONTH_OFFSET } from "@/features/payroll/lib/pay-settings";
import { roundPayDate, usePayrollStore } from "@/features/payroll/lib/payroll-store";
import { usePagination } from "@/features/payroll/lib/use-pagination";
import type { PaymentRequest } from "@/features/payroll/lib/types";

// ปฏิทินเลื่อนวันจ่ายเริ่มที่เดือนปัจจุบัน
const BASE = parseISODate(MOCK_TODAY);
const WEEKDAY = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];
const pad = (n: number) => String(n).padStart(2, "0");

/** ค่าจากปฏิทิน (นับจากเดือนปัจจุบัน) -> วันที่ ISO */
function calendarToISO(v: CalendarValue) {
  const { year, month } = monthAt(BASE.year, BASE.month, v.offset);
  return `${year}-${pad(month)}-${pad(v.day)}`;
}

/** "2026-11-20" -> "ศ. 20 พ.ย. 2569" */
function withWeekday(iso: string) {
  const { year, month, day } = parseISODate(iso);
  return `${WEEKDAY[new Date(Date.UTC(year, month - 1, day)).getUTCDay()]} ${formatThaiDate(iso)}`;
}

/**
 * ตารางคำขอที่รอจ่าย พร้อมรอบ / กำหนดจ่าย และ "เลื่อนวันจ่าย" รายคำขอ (หน้าตั้งค่ารอบจ่าย / เลื่อนวันจ่าย)
 *   1) ติ๊กเลือกคำขอ  2) กด "เลื่อนวันจ่าย"  3) เลือกวันใหม่จากปฏิทิน  4) ยืนยัน
 *   รายการที่เลื่อนแล้ว: แสดงวันใหม่ + ป้าย "เลื่อนแล้ว" + วันเดิมขีดฆ่า + ปุ่ม "ยกเลิกการเลื่อน"
 *
 * กำหนดจ่ายตามรอบ + วันที่เลื่อน อ่าน/บันทึกที่ข้อมูลกลาง (lib/payroll-store.ts)
 * จึงเปลี่ยนตามหน้า "ตั้งค่าการจ่ายเงิน" และยังอยู่หลังรีเฟรช
 */
export function RescheduleList({ requests }: { requests: PaymentRequest[] }) {
  const toast = useToast();
  const store = usePayrollStore();
  const overrides = store.overrides;
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(false);
  const [newDate, setNewDate] = useState<CalendarValue | null>(null);
  const [error, setError] = useState("");

  // ตัวกรอง: กรองทันทีเมื่อพิมพ์/เลือก
  const [filter, setFilter] = useState({ q: "", welfare: ALL });
  const filtered = filterRequests(requests, filter);
  const { pageItems, pagination, setPage } = usePagination(filtered);

  const allOnPageSelected = pageItems.length > 0 && pageItems.every((r) => selected.has(r.id));
  const selectedRows = requests.filter((r) => selected.has(r.id));

  function update(key: keyof typeof filter, value: string) {
    setFilter((f) => ({ ...f, [key]: value }));
    setPage(1);
  }
  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleAllOnPage() {
    setSelected((prev) => {
      const next = new Set(prev);
      pageItems.forEach((r) => (allOnPageSelected ? next.delete(r.id) : next.add(r.id)));
      return next;
    });
  }

  function openReschedule() {
    setNewDate(null);
    setError("");
    setOpen(true);
  }

  /** ยืนยันเลื่อนวันจ่าย: บันทึกวันใหม่ให้ทุกคำขอที่เลือก */
  function confirmReschedule() {
    if (!newDate) {
      setError("กรุณาเลือกวันจ่ายใหม่จากปฏิทิน");
      return;
    }
    const iso = calendarToISO(newDate);
    store.reschedule(selected, iso);
    toast(`เลื่อนวันจ่าย ${selected.size} รายการ เป็น ${formatThaiDate(iso)} แล้ว`);
    setSelected(new Set());
    setOpen(false);
  }

  /** ยกเลิกการเลื่อนของคำขอ 1 รายการ (กลับไปใช้กำหนดจ่ายตามรอบ) */
  function undoReschedule(id: string) {
    store.undoReschedule(id);
    toast(`ยกเลิกการเลื่อนวันจ่าย ${id} แล้ว`);
  }

  return (
    <>
      <ListPanel
        title="เลื่อนวันจ่ายรายคำขอ"
        footer={<Pagination {...pagination} />}
        toolbar={
          <>
            <div className="grid gap-3 md:grid-cols-[2fr_1fr]">
              <Field label="ค้นหาชื่อ / รหัสพนักงาน">
                {(id) => <SearchInput id={id} placeholder="พิมพ์ชื่อหรือรหัสพนักงาน" value={filter.q} onChange={(e) => update("q", e.target.value)} />}
              </Field>
              <Field label="ประเภทสวัสดิการ">
                {(id) => <Select id={id} options={WELFARE_FILTER_OPTIONS} value={filter.welfare} onChange={(e) => update("welfare", e.target.value)} />}
              </Field>
            </div>
            {/* แถบคำสั่งเมื่อติ๊กเลือก */}
            {selected.size > 0 ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-primary-50 px-4 py-2">
                <p className="text-12 text-primary-700">
                  เลือก <b className="num">{selected.size}</b> รายการ · ยอดรวม <b className="num">{formatBaht(sumBy(selectedRows, (r) => r.paidAmount))}</b>
                </p>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
                    ล้างที่เลือก
                  </Button>
                  <Button size="sm" icon="calendar" onClick={openReschedule}>
                    เลื่อนวันจ่าย
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-12 text-muted">ติ๊กเลือกคำขอที่ต้องการ แล้วกด “เลื่อนวันจ่าย”</p>
            )}
          </>
        }
      >
        <TableContainer bare>
          <THead>
            <Th className="w-12">
              <Checkbox checked={allOnPageSelected} onChange={toggleAllOnPage} aria-label="เลือกทุกรายการในหน้านี้" />
            </Th>
            <Th>เลขที่คำขอ</Th>
            <Th>ชื่อพนักงาน</Th>
            <Th>สวัสดิการ</Th>
            <Th align="right">ยอดเบิก</Th>
            <Th>รอบ</Th>
            <Th>กำหนดจ่าย</Th>
            <Th>สถานะ</Th>
          </THead>
          <tbody>
            {pageItems.length === 0 ? (
              <TdFull colSpan={8}>
                <EmptyState />
              </TdFull>
            ) : (
              pageItems.map((r) => {
                const override = overrides[r.id];
                const ruleDate = roundPayDate(r, store.settings); // กำหนดจ่ายตามการตั้งค่ารอบ
                return (
                  <Tr key={r.id} selected={selected.has(r.id)}>
                    <Td>
                      <Checkbox checked={selected.has(r.id)} onChange={() => toggle(r.id)} aria-label={`เลือก ${r.id}`} />
                    </Td>
                    <Td className="num">{r.id}</Td>
                    <Td>
                      <p className="font-medium">{r.employeeName}</p>
                      <p className="num text-[12px] text-muted">{r.employeeId}</p>
                    </Td>
                    <Td>{WELFARE_LABEL[r.welfare]}</Td>
                    <Td align="right" className="num font-medium">
                      {formatBaht(r.amount)}
                    </Td>
                    <Td>{ROUND_LABEL[r.round]}</Td>
                    <Td className="num">
                      {override ? (
                        <>
                          <span className="flex items-center gap-1.5 font-semibold text-ink">
                            {formatThaiDate(override)}
                            <span className="rounded-full bg-primary-100 px-2 text-[11px] font-medium text-primary-700">เลื่อนแล้ว</span>
                          </span>
                          <span className="flex items-center gap-2 text-[12px] text-muted">
                            <s>{formatThaiDate(ruleDate)}</s>
                            <button type="button" onClick={() => undoReschedule(r.id)} className="text-primary-600 hover:underline">
                              ยกเลิกการเลื่อน
                            </button>
                          </span>
                        </>
                      ) : (
                        formatThaiDate(ruleDate)
                      )}
                    </Td>
                    <Td>
                      <StatusBadge status={r.status} />
                    </Td>
                  </Tr>
                );
              })
            )}
          </tbody>
        </TableContainer>
      </ListPanel>

      {/* เลือกวันจ่ายใหม่จากปฏิทิน (ตั้งแต่วันนี้ ถึงอีก 6 เดือน) */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="เลื่อนวันจ่าย"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              ยกเลิก
            </Button>
            <Button onClick={confirmReschedule} icon="check">
              ยืนยันวันจ่าย
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <p className="text-12 text-muted">
            เลื่อนวันจ่าย <b className="num text-ink">{selected.size}</b> รายการ · ยอดรวม <b className="num text-ink">{formatBaht(sumBy(selectedRows, (r) => r.paidAmount))}</b>
          </p>
          <div className="mx-auto w-full max-w-[320px]">
            {open && (
              <CalendarGrid
                baseYear={BASE.year}
                baseMonth={BASE.month}
                minOffset={0}
                maxOffset={MAX_MONTH_OFFSET}
                value={newDate}
                isDisabled={(v) => calendarToISO(v) < MOCK_TODAY} // วันที่ผ่านมาแล้วเลือกไม่ได้
                onPick={(v) => {
                  setNewDate(v);
                  setError("");
                }}
              />
            )}
          </div>
          <p className={`rounded-lg px-3 py-2 text-12 ${error ? "bg-status-rejected/10 text-status-rejected" : "bg-surface text-ink"}`} role={error ? "alert" : undefined}>
            {error ||
              (newDate ? (
                <>
                  วันจ่ายใหม่: <b className="num">{withWeekday(calendarToISO(newDate))}</b>
                </>
              ) : (
                "เลือกวันจ่ายใหม่จากปฏิทิน"
              ))}
          </p>
        </div>
      </Modal>
    </>
  );
}
