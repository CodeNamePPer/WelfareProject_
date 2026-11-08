"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/features/payroll/components/ui/Button";
import { CalendarPicker } from "@/features/payroll/components/ui/CalendarPicker";
import { ListPanel, PageStack, SummaryStrip } from "@/features/payroll/components/ui/Card";
import { EmptyState } from "@/features/payroll/components/ui/EmptyState";
import { Field, SearchInput, Select } from "@/features/payroll/components/ui/Field";
import { Modal } from "@/features/payroll/components/ui/Modal";
import { Pagination } from "@/features/payroll/components/ui/Pagination";
import { StatusBadge } from "@/features/payroll/components/ui/StatusBadge";
import { TableContainer, TdFull, THead, Th, Td, Tr } from "@/features/payroll/components/ui/Table";
import { useToast } from "@/features/payroll/components/ui/Toast";
import { ROUND_LABEL, STATUS_META, WELFARE_LABEL } from "@/features/payroll/lib/constants";
import { ALL, filterRequests, sumBy, WELFARE_FILTER_OPTIONS } from "@/features/payroll/lib/filters";
import { formatBaht, formatNumber, formatThaiDate, formatThaiMonthYear, parseISODate } from "@/features/payroll/lib/format";
import { MOCK_TODAY } from "@/features/payroll/lib/mock-data";
import {
  DEFAULT_PAY_SETTINGS,
  MAX_MONTH_OFFSET,
  monthOffsetLabel,
  resolvePayDate,
  roundSetting,
  validatePaySettings,
  type PaySettings,
} from "@/features/payroll/lib/pay-settings";
import { useHydrated, usePayrollStore } from "@/features/payroll/lib/payroll-store";
import { PaySettingsSkeleton } from "./PageSkeletons";
import { usePagination } from "@/features/payroll/lib/use-pagination";
import type { PaymentRequest, RoundNo } from "@/features/payroll/lib/types";

// ปฏิทินเริ่มจาก "เดือนที่ยื่นคำขอ" ตัวอย่าง = เดือนปัจจุบัน แล้วเลือกวันจ่ายในเดือนนั้นหรือเดือนถัดๆ ไป
const BASE = parseISODate(MOCK_TODAY);

const same = (a: PaySettings, b: PaySettings) => (Object.keys(a) as (keyof PaySettings)[]).every((k) => a[k] === b[k]);

/** "จ่ายวันที่ 10 ของเดือนถัดไป" */
function describeRound(s: PaySettings, round: RoundNo) {
  const { day, offset } = roundSetting(s, round);
  return offset >= 2 ? `จ่ายวันที่ ${day} ของ ${offset} เดือนถัดไป` : `จ่ายวันที่ ${day} ของ${monthOffsetLabel(offset)}`;
}

/** กำหนดจ่ายของคำขอนี้ ตามการตั้งค่าที่ส่งมา (ใช้เดือนที่ยื่นคำขอ + รอบ) */
function payDateFor(r: PaymentRequest, s: PaySettings) {
  const { year, month } = parseISODate(r.requestDate);
  return resolvePayDate(year, month, r.round, s);
}

/**
 * หน้า "ตั้งค่าการจ่ายเงิน" (หน้าตาตาม wireframe Payroll-6)
 *   บน    = แถบสรุปรายการรอจ่าย
 *   กลาง  = ตารางคำขอที่รอจ่าย (ไม่แสดงรอบ / กำหนดจ่าย — ดูได้ที่หน้าตั้งค่ารอบจ่าย / เลื่อนวันจ่าย)
 *   ล่าง  = แถบตั้งค่า: รอบที่ 1 / รอบที่ 2 (เลือกวันจ่ายจากปฏิทิน) แล้วกด "บันทึกการตั้งค่า"
 *           ปฏิทินเริ่มที่เดือนที่ยื่นคำขอ (ตัวอย่าง = เดือนปัจจุบัน) วันที่คลิก = "วันที่ X ของ N เดือนหลังเดือนที่ยื่น"
 *           จ่ายช้าได้สูงสุด 6 เดือนหลังเดือนที่ยื่น (MAX_MONTH_OFFSET)
 *
 * saved = ค่าที่บันทึกแล้ว (อ่านจากข้อมูลกลาง lib/payroll-store.ts จึงเห็นผลในหน้าตั้งค่ารอบจ่ายด้วย)
 * edit  = ค่าที่กำลังแก้ (null = ยังไม่ได้แก้) -> draft = edit ?? saved
 */
export function PaySettingsView({ requests }: { requests: PaymentRequest[] }) {
  const hydrated = useHydrated(); // false = ยังไม่ได้อ่านค่าที่บันทึกไว้ใน browser
  const toast = useToast();
  const store = usePayrollStore();
  const saved = store.settings;
  const [edit, setEdit] = useState<PaySettings | null>(null);
  const draft = edit ?? saved;
  const [confirmOpen, setConfirmOpen] = useState(false);
  const dirty = !same(draft, saved);
  const isDefault = same(draft, DEFAULT_PAY_SETTINGS);
  const errors = validatePaySettings(draft); // วันจ่ายต้องอยู่หลังวันปิดรอบ
  const hasError = Boolean(errors.round1 || errors.round2);
  /** แก้ค่าของรอบใดรอบหนึ่ง */
  const setRound = (round: RoundNo, v: { day: number; offset: number }) =>
    setEdit({ ...draft, [`round${round}PayDay`]: v.day, [`round${round}MonthOffset`]: v.offset });

  // ตัวกรอง (draft = กำลังพิมพ์, applied = ใช้จริงเมื่อกด "ค้นหา")
  const [filterDraft, setFilterDraft] = useState({ q: "", welfare: ALL });
  const [filterApplied, setFilterApplied] = useState(filterDraft);

  const filtered = filterRequests(requests, filterApplied);
  const { pageItems, pagination, setPage } = usePagination(filtered);

  // จำนวนคำขอที่กำหนดจ่ายจะเปลี่ยน ถ้าบันทึกค่าที่กำลังแก้ (ไม่นับรายการที่เลื่อนวันจ่ายไว้แล้ว)
  const changedCount = requests.filter((r) => !store.overrides[r.id] && payDateFor(r, draft) !== payDateFor(r, saved)).length;

  function confirmSave() {
    store.saveSettings(draft);
    setEdit(null);
    setConfirmOpen(false);
    toast("บันทึกการตั้งค่าการจ่ายเงินแล้ว");
  }

  // ยังไม่ได้อ่านการตั้งค่าที่บันทึกไว้: แสดง skeleton ก่อน (กันวันจ่ายเริ่มต้นแว้บแล้วเปลี่ยน)
  if (!hydrated) return <PaySettingsSkeleton />;

  return (
    <PageStack>
      <SummaryStrip
        items={[
          { label: "สรุปรายการรอจ่าย", value: `${formatNumber(requests.length)} รายการ` },
          { label: "ยอดรวมสวัสดิการ", value: formatBaht(sumBy(requests, (r) => r.paidAmount), false) },
          { label: "สถานะการจ่าย", value: STATUS_META.pending.label, tone: "text-status-pending-ink" },
        ]}
      />

      <ListPanel
        title="รายการสวัสดิการที่รอจ่าย"
        footer={<Pagination {...pagination} />}
        toolbar={
          <form
            className="grid gap-3 md:grid-cols-[2fr_1fr_auto] md:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              setFilterApplied(filterDraft);
              setPage(1);
            }}
          >
            <Field label="ค้นหาชื่อ / รหัสพนักงาน">
              {(id) => <SearchInput id={id} placeholder="พิมพ์ชื่อหรือรหัสพนักงาน" value={filterDraft.q} onChange={(e) => setFilterDraft({ ...filterDraft, q: e.target.value })} />}
            </Field>
            <Field label="ประเภทสวัสดิการ">
              {(id) => <Select id={id} options={WELFARE_FILTER_OPTIONS} value={filterDraft.welfare} onChange={(e) => setFilterDraft({ ...filterDraft, welfare: e.target.value })} />}
            </Field>
            <Button type="submit" icon="search" className="h-11 md:w-36">
              ค้นหา
            </Button>
          </form>
        }
      >
        <TableContainer bare>
          <THead>
            <Th>เลขที่คำขอ</Th>
            <Th>ชื่อพนักงาน</Th>
            <Th>สวัสดิการ</Th>
            <Th>วันที่ขอ</Th>
            <Th align="right">ยอดเบิก</Th>
            <Th>สถานะ</Th>
          </THead>
          <tbody>
            {pageItems.length === 0 ? (
              <TdFull colSpan={6}>
                <EmptyState />
              </TdFull>
            ) : (
              pageItems.map((r) => (
                <Tr key={r.id}>
                  <Td className="num">{r.id}</Td>
                  <Td>
                    <p className="font-medium">{r.employeeName}</p>
                    <p className="num text-[12px] text-muted">{r.employeeId}</p>
                  </Td>
                  <Td>{WELFARE_LABEL[r.welfare]}</Td>
                  <Td className="num">{formatThaiDate(r.requestDate)}</Td>
                  <Td align="right" className="num font-medium">
                    {formatBaht(r.amount)}
                  </Td>
                  <Td>
                    <StatusBadge status={r.status} />
                  </Td>
                </Tr>
              ))
            )}
          </tbody>
        </TableContainer>
      </ListPanel>

      {/*
        แถบตั้งค่าการจ่ายเงิน: บนจอ 768px ขึ้นไปติดขอบล่างจอ (sticky)
        (บนมือถือไม่ติด เพราะจะบังเนื้อหาเกินไป)  ใช้เงาบางตาม Style Guide ข้อ 3
      */}
      <section aria-label="ตั้งค่าการจ่ายเงิน" className="z-10 rounded-xl border border-primary-500/40 bg-white p-4 shadow-card md:sticky md:bottom-4 md:p-5">
        {/* แถวบน: หัวข้อ + สถานะ | ปุ่มบันทึก   แถวล่าง: รอบที่ 1 | รอบที่ 2 */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <h2 className="text-14 font-semibold">ตั้งค่าการจ่ายเงิน</h2>
              <p className={`text-12 ${dirty ? "text-status-pending-ink" : "text-muted"}`}>
                {dirty ? (
                  <>
                    ยังไม่บันทึก · กำหนดจ่ายจะเปลี่ยน <b className="num">{changedCount}</b> รายการ{" "}
                    <button type="button" onClick={() => setEdit(null)} className="text-primary-600 underline-offset-2 hover:underline">
                      ยกเลิก
                    </button>
                  </>
                ) : (
                  <>
                    ดูรอบและกำหนดจ่ายของแต่ละคำขอ ได้ที่หน้า{" "}
                    <Link href="/payroll/rounds" className="text-primary-600 underline-offset-2 hover:underline">
                      ตั้งค่ารอบจ่าย / เลื่อนวันจ่าย
                    </Link>
                  </>
                )}
                {!isDefault && (
                  <>
                    {" · "}
                    <button type="button" onClick={() => setEdit(DEFAULT_PAY_SETTINGS)} className="text-primary-600 underline-offset-2 hover:underline">
                      คืนค่าเริ่มต้น
                    </button>
                  </>
                )}
              </p>
            </div>

            <Button onClick={() => setConfirmOpen(true)} disabled={!dirty || hasError} icon="check" className="w-full sm:w-auto">
              บันทึกการตั้งค่า
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {([1, 2] as RoundNo[]).map((round) => {
              const { day, offset } = roundSetting(draft, round);
              const error = round === 1 ? errors.round1 : errors.round2;
              return (
                <fieldset key={round} className="flex min-w-0 flex-col gap-1.5">
                  <legend className="mb-1.5 text-12 font-medium text-muted">
                    {ROUND_LABEL[round]} จ่าย <span className="font-normal">(คำขอที่ยื่น {formatThaiMonthYear(BASE.year, BASE.month)})</span>
                  </legend>
                  <CalendarPicker
                    label={`${ROUND_LABEL[round]} จ่าย`}
                    baseYear={BASE.year}
                    baseMonth={BASE.month}
                    minOffset={round === 1 ? 0 : 1}
                    maxOffset={MAX_MONTH_OFFSET}
                    value={{ offset, day }}
                    error={error}
                    // วันก่อนปิดรอบเลือกไม่ได้: รอบที่ 1 ปิดวันที่ 15, รอบที่ 2 ปิดสิ้นเดือน
                    isDisabled={(v) => validatePaySettings({ ...draft, [`round${round}PayDay`]: v.day, [`round${round}MonthOffset`]: v.offset })[`round${round}`] !== undefined}
                    onChange={(v) => setRound(round, v)}
                  />
                  <p className="text-[12px] text-muted">= {describeRound(draft, round).replace("จ่าย", "")}</p>
                  {error && (
                    <p role="alert" className="text-12 text-status-rejected">
                      {error}
                    </p>
                  )}
                </fieldset>
              );
            })}
          </div>
        </div>
      </section>

      {/* ยืนยันก่อนบันทึก เพราะมีผลกับกำหนดจ่ายของทุกรายการที่ยังรอจ่าย */}
      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="ยืนยันการตั้งค่าการจ่ายเงิน"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              ยกเลิก
            </Button>
            <Button onClick={confirmSave}>บันทึก</Button>
          </>
        }
      >
        <dl className="flex flex-col gap-2 text-12">
          <div className="flex justify-between gap-4">
            <dt className="text-muted">{ROUND_LABEL[1]}</dt>
            <dd className="font-medium">{describeRound(draft, 1)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">{ROUND_LABEL[2]}</dt>
            <dd className="font-medium">{describeRound(draft, 2)}</dd>
          </div>
        </dl>
        <p className="mt-4 text-12 text-muted">
          กำหนดจ่ายของคำขอที่รอจ่ายจะเปลี่ยน <b className="num text-ink">{changedCount}</b> รายการ
        </p>
      </Modal>
    </PageStack>
  );
}
