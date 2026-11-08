"use client";

import { useState } from "react";
import { Button } from "@/features/payroll/components/ui/Button";
import { ListPanel } from "@/features/payroll/components/ui/Card";
import { EmptyState } from "@/features/payroll/components/ui/EmptyState";
import { Field, Select } from "@/features/payroll/components/ui/Field";
import { Pagination } from "@/features/payroll/components/ui/Pagination";
import { StatusBadge } from "@/features/payroll/components/ui/StatusBadge";
import { TableContainer, TdFull, THead, Th, Td, Tr } from "@/features/payroll/components/ui/Table";
import { ROUND_LABEL, ROUND_RANGE, WELFARE_LABEL } from "@/features/payroll/lib/constants";
import { ALL, statusOptions } from "@/features/payroll/lib/filters";
import { formatThaiDate, formatThaiMonthYear } from "@/features/payroll/lib/format";
import { usePagination } from "@/features/payroll/lib/use-pagination";
import type { PayRound } from "@/features/payroll/lib/types";

/** ตัวเลือก "เดือน / ปี" สร้างจากเดือนที่มีในข้อมูลจริง ค่าเป็น "2026-10" */
function monthOptions(rounds: PayRound[]) {
  const keys = [...new Set(rounds.map((r) => `${r.year}-${String(r.month).padStart(2, "0")}`))].sort().reverse();
  return [
    { value: ALL, label: "ทุกเดือน" },
    ...keys.map((k) => ({ value: k, label: formatThaiMonthYear(Number(k.slice(0, 4)), Number(k.slice(5))) })),
  ];
}

/**
 * ตาราง "รอบการจ่าย" พร้อมตัวกรอง
 * ตัวกรองมี 2 ชุด:
 *   draft   = ค่าที่ผู้ใช้กำลังเลือกใน dropdown
 *   applied = ค่าที่ใช้กรองจริง (อัปเดตเมื่อกดปุ่ม "ค้นหา") ตาม wireframe
 */
export function RoundsTable({ rounds }: { rounds: PayRound[] }) {
  const [draft, setDraft] = useState({ month: ALL, status: ALL });
  const [applied, setApplied] = useState(draft);

  const filtered = rounds.filter((r) => {
    const key = `${r.year}-${String(r.month).padStart(2, "0")}`;
    if (applied.month !== ALL && key !== applied.month) return false;
    if (applied.status !== ALL && r.status !== applied.status) return false;
    return true;
  });
  const { pageItems, pagination, setPage } = usePagination(filtered);

  function search() {
    setApplied(draft);
    setPage(1);
  }

  return (
    <ListPanel
        footer={<Pagination {...pagination} />}
      title="รอบการจ่าย"
      toolbar={
        // form ทำให้กด Enter แล้วค้นหาได้
        <form
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto] lg:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            search();
          }}
        >
          <Field label="เดือน / ปี">
            {(id) => <Select id={id} options={monthOptions(rounds)} value={draft.month} onChange={(e) => setDraft({ ...draft, month: e.target.value })} />}
          </Field>
          <Field label="สถานะ">
            {(id) => <Select id={id} options={statusOptions(["pending", "paid"], "ทั้งหมด")} value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })} />}
          </Field>
          <Button type="submit" icon="search" className="h-11 sm:col-span-2 lg:col-span-1 lg:w-36">
            ค้นหา
          </Button>
        </form>
      }
    >
        <TableContainer bare>
          <THead>
            <Th>รอบการจ่าย</Th>
            <Th>เดือน</Th>
            <Th>ช่วงวันที่</Th>
            <Th>กำหนดจ่าย</Th>
            <Th>ประเภท</Th>
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
                  <Td className="font-medium">{ROUND_LABEL[r.round]}</Td>
                  <Td>{formatThaiMonthYear(r.year, r.month)}</Td>
                  <Td>{ROUND_RANGE[r.round]}</Td>
                  <Td className="num">{formatThaiDate(r.payDate)}</Td>
                  <Td>{WELFARE_LABEL[r.welfare]}</Td>
                  <Td>
                    <StatusBadge status={r.status} />
                  </Td>
                </Tr>
              ))
            )}
          </tbody>
        </TableContainer>
    </ListPanel>
  );
}
