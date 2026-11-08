"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/features/payroll/components/ui/Button";
import { Card } from "@/features/payroll/components/ui/Card";
import { EmptyState } from "@/features/payroll/components/ui/EmptyState";
import { Field, Select, TextInput } from "@/features/payroll/components/ui/Field";
import { Pagination } from "@/features/payroll/components/ui/Pagination";
import { ALL, filterRequests, ROUND_OPTIONS, WELFARE_FILTER_OPTIONS, type RequestFilter } from "@/features/payroll/lib/filters";
import { usePagination } from "@/features/payroll/lib/use-pagination";
import { useEffectiveRequests, useHydrated } from "@/features/payroll/lib/payroll-store";
import { PaymentDetailsSkeleton } from "./PageSkeletons";
import type { PaymentRequest } from "@/features/payroll/lib/types";
import { PaymentDetailCard } from "./PaymentDetailCard";

/**
 * หน้ารายละเอียด "ข้อมูลเพิ่มเติม" ใช้ร่วม 2 หน้า:
 *   mode="approvals" -> ตัวกรอง: รอบการจ่าย / สวัสดิการ / วันที่ขอ / ค้นหา   (Payroll-5)
 *   mode="history"   -> ตัวกรอง: ช่วงวันที่จ่าย / สวัสดิการ / ค้นหา          (Payroll-4)
 *
 * อ่าน ?q=REQ... จาก URL (มาจากเมนู "ดูรายละเอียด" ในตาราง) เพื่อค้นหาให้อัตโนมัติ
 * useSearchParams ต้องอยู่ใน <Suspense> (ดู page.tsx) เพราะเปิดใช้ cacheComponents
 */
export function PaymentDetailsView({ requests: rawRequests, mode }: { requests: PaymentRequest[]; mode: "approvals" | "history" }) {
  const hydrated = useHydrated(); // false = ยังไม่ได้อ่านค่าที่บันทึกไว้ใน browser
  const requests = useEffectiveRequests(rawRequests); // วันจ่ายตามการตั้งค่า / การเลื่อน
  const initialQ = useSearchParams().get("q") ?? "";
  const [draft, setDraft] = useState<RequestFilter>({ q: initialQ, round: ALL, welfare: ALL, requestDate: "", payFrom: "", payTo: "" });
  const [applied, setApplied] = useState(draft);

  const filtered = filterRequests(requests, applied);
  const { pageItems, pagination, setPage } = usePagination(filtered, 5);

  const set = (key: keyof RequestFilter) => (e: { target: { value: string } }) => setDraft((d) => ({ ...d, [key]: e.target.value }));

  // ยังไม่ได้อ่านการตั้งค่าที่บันทึกไว้: แสดง skeleton ก่อน (กันวันจ่ายเริ่มต้นแว้บแล้วเปลี่ยน)
  if (!hydrated) return <PaymentDetailsSkeleton />;

  return (
    <div className="flex flex-col gap-8">
      <Card className="p-4 md:p-5">
        <form
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_1.2fr_auto] xl:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            setApplied(draft);
            setPage(1);
          }}
        >
          {mode === "approvals" ? (
            <>
              <Field label="รอบการจ่าย">{(id) => <Select id={id} options={ROUND_OPTIONS} value={draft.round} onChange={set("round")} />}</Field>
              <Field label="สวัสดิการ">{(id) => <Select id={id} options={WELFARE_FILTER_OPTIONS} value={draft.welfare} onChange={set("welfare")} />}</Field>
              <Field label="วันที่ขอ">{(id) => <TextInput id={id} type="date" value={draft.requestDate} onChange={set("requestDate")} />}</Field>
            </>
          ) : (
            <>
              <Field label="วันที่จ่าย ตั้งแต่">{(id) => <TextInput id={id} type="date" value={draft.payFrom} onChange={set("payFrom")} />}</Field>
              <Field label="ถึง">{(id) => <TextInput id={id} type="date" value={draft.payTo} min={draft.payFrom || undefined} onChange={set("payTo")} />}</Field>
              <Field label="สวัสดิการ">{(id) => <Select id={id} options={WELFARE_FILTER_OPTIONS} value={draft.welfare} onChange={set("welfare")} />}</Field>
            </>
          )}
          <Field label="ค้นหาข้อมูล">{(id) => <TextInput id={id} placeholder="เลขคำขอ / ชื่อ" value={draft.q} onChange={set("q")} />}</Field>
          <Button type="submit" icon="search" className="h-11 sm:col-span-2 xl:col-span-1 xl:w-32">
            ค้นหา
          </Button>
        </form>
      </Card>

      {/* ผลลัพธ์ + แบ่งหน้า เป็นกลุ่มเดียวกัน (ห่างกัน 16px) แยกจากตัวกรองด้านบน (32px) */}
      <div className="flex flex-col">
      {pageItems.length === 0 ? (
        <Card>
          <EmptyState />
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {pageItems.map((r) => (
            <PaymentDetailCard key={r.id} request={r} />
          ))}
        </div>
      )}
      <Pagination {...pagination} />
      </div>
    </div>
  );
}
