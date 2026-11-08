"use client";

import { useState } from "react";
import { ListPanel } from "@/features/payroll/components/ui/Card";
import { EmptyState } from "@/features/payroll/components/ui/EmptyState";
import { Field, SearchInput, Select, TextInput } from "@/features/payroll/components/ui/Field";
import { MoreMenu } from "@/features/payroll/components/ui/MoreMenu";
import { Pagination } from "@/features/payroll/components/ui/Pagination";
import { StatusBadge } from "@/features/payroll/components/ui/StatusBadge";
import { TableContainer, TdFull, THead, Th, Td, Tr } from "@/features/payroll/components/ui/Table";
import { WELFARE_LABEL } from "@/features/payroll/lib/constants";
import { ALL, filterRequests, ROUND_OPTIONS, WELFARE_FILTER_OPTIONS } from "@/features/payroll/lib/filters";
import { formatBaht, formatThaiDate } from "@/features/payroll/lib/format";
import { usePagination } from "@/features/payroll/lib/use-pagination";
import type { PaymentRequest } from "@/features/payroll/lib/types";

/** ตารางประวัติการจ่าย: กรองทันทีเมื่อเปลี่ยนค่า (ไม่มีปุ่มค้นหา ตาม wireframe) */
export function HistoryView({ requests }: { requests: PaymentRequest[] }) {
  const [filter, setFilter] = useState({ q: "", round: ALL, welfare: ALL, payFrom: "", payTo: "" });
  const filtered = filterRequests(requests, filter);
  const { pageItems, pagination, setPage } = usePagination(filtered);

  function update(key: keyof typeof filter, value: string) {
    setFilter((f) => ({ ...f, [key]: value }));
    setPage(1);
  }

  return (
    <ListPanel
        footer={<Pagination {...pagination} />}
      title="รายการที่จ่ายแล้ว"
      toolbar={
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[2fr_1fr_1fr_1fr_1fr]">
          <Field label="ค้นหา" className="sm:col-span-2 xl:col-span-1">
            {(id) => <SearchInput id={id} placeholder="ค้นหาชื่อพนักงาน / เลขที่คำขอ" value={filter.q} onChange={(e) => update("q", e.target.value)} />}
          </Field>
          <Field label="รอบ">{(id) => <Select id={id} options={ROUND_OPTIONS} value={filter.round} onChange={(e) => update("round", e.target.value)} />}</Field>
          <Field label="ประเภท">{(id) => <Select id={id} options={WELFARE_FILTER_OPTIONS} value={filter.welfare} onChange={(e) => update("welfare", e.target.value)} />}</Field>
          <Field label="วันที่จ่าย ตั้งแต่">{(id) => <TextInput id={id} type="date" value={filter.payFrom} onChange={(e) => update("payFrom", e.target.value)} />}</Field>
          <Field label="ถึง">{(id) => <TextInput id={id} type="date" value={filter.payTo} min={filter.payFrom || undefined} onChange={(e) => update("payTo", e.target.value)} />}</Field>
        </div>
      }
    >
      <TableContainer bare>
        <THead>
          <Th>วันที่จ่าย</Th>
          <Th>เลขที่คำขอ</Th>
          <Th>ชื่อพนักงาน</Th>
          <Th>แผนก / ฝ่าย</Th>
          <Th>ประเภทการจ่าย</Th>
          <Th align="right">จำนวนเงิน</Th>
          <Th>สถานะ</Th>
          <Th align="right">เพิ่มเติม</Th>
        </THead>
        <tbody>
          {pageItems.length === 0 ? (
            <TdFull colSpan={8}>
              <EmptyState />
            </TdFull>
          ) : (
            pageItems.map((r) => (
              <Tr key={r.id}>
                <Td className="num">{formatThaiDate(r.payDate)}</Td>
                <Td className="num">{r.id}</Td>
                <Td className="font-medium">{r.employeeName}</Td>
                <Td>{r.department}</Td>
                <Td>{WELFARE_LABEL[r.welfare]}</Td>
                <Td align="right" className="num font-medium">
                  {formatBaht(r.paidAmount)}
                </Td>
                <Td>
                  <StatusBadge status={r.status} />
                </Td>
                <Td align="right">
                  <MoreMenu label={`ตัวเลือกของ ${r.id}`} actions={[{ label: "ดูรายละเอียด", href: `/payroll/history/details?q=${r.id}` }]} />
                </Td>
              </Tr>
            ))
          )}
        </tbody>
      </TableContainer>
    </ListPanel>
  );
}
