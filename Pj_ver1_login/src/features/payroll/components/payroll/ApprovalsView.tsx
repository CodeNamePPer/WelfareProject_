"use client";

import { useState } from "react";
import { Button } from "@/features/payroll/components/ui/Button";
import { ListPanel } from "@/features/payroll/components/ui/Card";
import { EmptyState } from "@/features/payroll/components/ui/EmptyState";
import { Field, SearchInput, Select } from "@/features/payroll/components/ui/Field";
import { Modal } from "@/features/payroll/components/ui/Modal";
import { Pagination } from "@/features/payroll/components/ui/Pagination";
import { StatusBadge } from "@/features/payroll/components/ui/StatusBadge";
import { Tabs } from "@/features/payroll/components/ui/Tabs";
import { TableContainer, TdFull, THead, Th, Td, Tr } from "@/features/payroll/components/ui/Table";
import { useToast } from "@/features/payroll/components/ui/Toast";
import { PAGE_SIZE } from "@/features/payroll/lib/constants";
import { ALL, filterRequests, ROUND_OPTIONS, statusOptions, WELFARE_FILTER_OPTIONS } from "@/features/payroll/lib/filters";
import { formatBaht, formatThaiDate } from "@/features/payroll/lib/format";
import { usePagination } from "@/features/payroll/lib/use-pagination";
import { useEffectiveRequests, useHydrated } from "@/features/payroll/lib/payroll-store";
import { ApprovalsSkeleton } from "./PageSkeletons";
import type { PaymentRequest } from "@/features/payroll/lib/types";
import { RequestDetailPanel } from "./RequestDetailPanel";

type Tab = "all" | "pending" | "paid";

/**
 * ตารางรายการอนุมัติ / รอจ่าย
 *   - แท็บ ทั้งหมด / รอจ่าย / จ่ายแล้ว
 *   - กรองทันทีเมื่อพิมพ์/เลือก (ไม่มีปุ่มค้นหา ตาม wireframe)
 *   - คลิกแถว (หรือชื่อพนักงาน) -> เปิดแผงรายละเอียดด้านขวา (RequestDetailPanel)
 *   - ในแผง: คำขอที่ "รอจ่าย" มีปุ่ม ส่งกลับ (ต้องกรอกเหตุผล) / บันทึกจ่ายแล้ว (ยืนยันก่อน)
 */
export function ApprovalsView({ initialRequests }: { initialRequests: PaymentRequest[] }) {
  const hydrated = useHydrated(); // false = ยังไม่ได้อ่านค่าที่บันทึกไว้ใน browser
  const toast = useToast();
  // เก็บใน state เพราะสถานะเปลี่ยนได้หลังส่งกลับ/บันทึกจ่าย (ตอนต่อ API จริง ให้ส่งไป server ก่อนอัปเดต)
  const [rawRequests, setRequests] = useState(initialRequests);
  // วันจ่ายตามการตั้งค่า / การเลื่อนรายคำขอ (ข้อมูลกลาง)
  const requests = useEffectiveRequests(rawRequests);
  const [tab, setTab] = useState<Tab>("pending");
  const [filter, setFilter] = useState({ q: "", round: ALL, welfare: ALL, status: ALL });

  // คำขอที่เปิดดูในแผงด้านขวา
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = activeId ? (requests.find((r) => r.id === activeId) ?? null) : null;
  // Modal ยืนยัน: "ส่งกลับ" (ต้องกรอกเหตุผล) และ "บันทึกจ่ายแล้ว"
  const [returnOpen, setReturnOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState("");
  const [payOpen, setPayOpen] = useState(false);

  // จอกว้าง (≥1280px) ตอนเปิดแผง: ซ่อนคอลัมน์ที่แผงแสดงอยู่แล้ว ให้ตารางไม่ล้น
  const hideWhenOpen = active ? "xl:hidden" : "";

  // กรอง 2 ชั้น: แท็บ -> ตัวกรองอื่นๆ
  const byTab = tab === "all" ? requests : requests.filter((r) => r.status === tab);
  const filtered = filterRequests(byTab, filter);
  const { pageItems, pagination, setPage } = usePagination(filtered);

  /** เปลี่ยนค่าตัวกรอง 1 ช่อง แล้วกลับไปหน้า 1 */
  function updateFilter(key: keyof typeof filter, value: string) {
    setFilter((f) => ({ ...f, [key]: value }));
    setPage(1);
  }

  function changeTab(t: Tab) {
    setTab(t);
    setPage(1);
  }

  /** เปิด/ปิดแผงรายละเอียดของคำขอนี้ */
  function toggleDetail(id: string) {
    setActiveId((cur) => (cur === id ? null : id));
  }

  function openReturn() {
    setReason("");
    setReasonError("");
    setReturnOpen(true);
  }

  /** ยืนยันส่งกลับ: ต้องมีเหตุผลอย่างน้อย 5 ตัวอักษร */
  function confirmReturn() {
    if (!active) return;
    if (reason.trim().length < 5) {
      setReasonError("กรุณาระบุเหตุผลอย่างน้อย 5 ตัวอักษร");
      return;
    }
    setRequests((prev) => prev.map((r) => (r.id === active.id ? { ...r, status: "returned", returnReason: reason.trim() } : r)));
    toast(`ส่งกลับคำขอ ${active.id} แล้ว`);
    setReturnOpen(false);
  }

  /** ยืนยันบันทึกจ่ายแล้ว */
  function confirmPaid() {
    if (!active) return;
    setRequests((prev) => prev.map((r) => (r.id === active.id ? { ...r, status: "paid" } : r)));
    toast(`บันทึกจ่ายแล้ว ${active.id}`);
    setPayOpen(false);
  }

  const count = (s: Tab) => (s === "all" ? requests.length : requests.filter((r) => r.status === s).length);

  // ยังไม่ได้อ่านการตั้งค่าที่บันทึกไว้: แสดง skeleton ก่อน (กันวันจ่ายเริ่มต้นแว้บแล้วเปลี่ยน)
  if (!hydrated) return <ApprovalsSkeleton />;

  return (
    // ตาราง + แผงรายละเอียด: จอกว้างวางคู่กัน (ตาราง | แผง 360px)
    <div className={active ? "xl:grid xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start xl:gap-6" : ""}>
      <ListPanel
        footer={<Pagination {...pagination} />}
        lead={
          <Tabs
            label="กรองตามสถานะ"
            value={tab}
            onChange={changeTab}
            tabs={[
              { value: "all", label: "ทั้งหมด", count: count("all") },
              { value: "pending", label: "รอจ่าย", count: count("pending") },
              { value: "paid", label: "จ่ายแล้ว", count: count("paid") },
            ]}
          />
        }
        toolbar={
          // เปิดแผงอยู่ = พื้นที่แคบลง: ช่องค้นหาเต็มแถว แล้วตัวเลือก 3 ช่องแถวถัดไป
          <div className={`grid gap-3 md:grid-cols-2 ${active ? "xl:grid-cols-3" : "xl:grid-cols-[2fr_1fr_1fr_1fr]"}`}>
            <Field label="ค้นหา" className={active ? "md:col-span-2 xl:col-span-3" : ""}>
              {(id) => <SearchInput id={id} placeholder="ค้นหาชื่อพนักงาน / เลขที่คำขอ" value={filter.q} onChange={(e) => updateFilter("q", e.target.value)} />}
            </Field>
            <Field label="รอบ">
              {(id) => <Select id={id} options={ROUND_OPTIONS} value={filter.round} onChange={(e) => updateFilter("round", e.target.value)} />}
            </Field>
            <Field label="ประเภทสวัสดิการ">
              {(id) => <Select id={id} options={WELFARE_FILTER_OPTIONS} value={filter.welfare} onChange={(e) => updateFilter("welfare", e.target.value)} />}
            </Field>
            <Field label="สถานะ">
              {(id) => <Select id={id} options={statusOptions(["pending", "paid", "returned"])} value={filter.status} onChange={(e) => updateFilter("status", e.target.value)} />}
            </Field>
          </div>
        }
      >
        <TableContainer bare>
          <THead>
            <Th className={hideWhenOpen}>ลำดับ</Th>
            <Th>เลขที่คำขอ</Th>
            <Th>ชื่อพนักงาน</Th>
            <Th className={hideWhenOpen}>แผนก / ฝ่าย</Th>
            <Th align="right">จำนวนเงิน</Th>
            <Th>วันที่จ่าย</Th>
            <Th>สถานะ</Th>
          </THead>
          <tbody>
            {pageItems.length === 0 ? (
              <TdFull colSpan={7}>
                <EmptyState />
              </TdFull>
            ) : (
              pageItems.map((r, i) => (
                <Tr key={r.id} active={r.id === activeId} onActivate={() => toggleDetail(r.id)}>
                  <Td className={`num text-muted ${hideWhenOpen}`}>{(pagination.page - 1) * PAGE_SIZE + i + 1}</Td>
                  <Td className="num">{r.id}</Td>
                  <Td>
                    {/* ปุ่มชื่อ: ให้เปิดรายละเอียดด้วยคีย์บอร์ดได้ (Tab แล้ว Enter) */}
                    <button
                      type="button"
                      onClick={() => toggleDetail(r.id)}
                      aria-expanded={r.id === activeId}
                      className={`-mx-1 rounded px-1 text-left font-medium underline-offset-4 hover:text-primary-600 hover:underline ${
                        r.id === activeId ? "text-primary-600" : "text-ink"
                      }`}
                    >
                      {r.employeeName}
                    </button>
                  </Td>
                  <Td className={hideWhenOpen}>{r.department}</Td>
                  <Td align="right" className="num font-medium">
                    {formatBaht(r.paidAmount)}
                  </Td>
                  <Td className="num">{formatThaiDate(r.payDate)}</Td>
                  <Td>
                    <StatusBadge status={r.status} />
                  </Td>
                </Tr>
              ))
            )}
          </tbody>
        </TableContainer>
      </ListPanel>

      {active && <RequestDetailPanel request={active} onClose={() => setActiveId(null)} onReturn={openReturn} onPaid={() => setPayOpen(true)} />}

      {/* Modal ส่งกลับ: บังคับกรอกเหตุผล */}
      <Modal
        open={returnOpen}
        onClose={() => setReturnOpen(false)}
        title="ส่งกลับคำขอ"
        footer={
          <>
            <Button variant="ghost" onClick={() => setReturnOpen(false)}>
              ยกเลิก
            </Button>
            <Button variant="danger" onClick={confirmReturn}>
              ส่งกลับ
            </Button>
          </>
        }
      >
        {active && (
          <div className="flex flex-col gap-4">
            <p className="text-12 text-muted">
              <span className="num">{active.id}</span> · {active.employeeName} · <span className="num">{formatBaht(active.paidAmount)}</span>
            </p>
            <Field label="เหตุผลที่ส่งกลับ *" error={reasonError}>
              {(id, describedBy) => (
                <textarea
                  id={id}
                  rows={4}
                  value={reason}
                  aria-invalid={!!reasonError || undefined}
                  aria-describedby={describedBy}
                  onChange={(e) => {
                    setReason(e.target.value);
                    setReasonError("");
                  }}
                  placeholder="เช่น ใบเสร็จไม่ชัดเจน กรุณาแนบใหม่"
                  className={`w-full rounded-lg border bg-white p-3 text-13 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/25 focus:outline-none ${
                    reasonError ? "border-status-rejected" : "border-line"
                  }`}
                />
              )}
            </Field>
          </div>
        )}
      </Modal>

      {/* Modal ยืนยันบันทึกจ่ายแล้ว */}
      <Modal
        open={payOpen}
        onClose={() => setPayOpen(false)}
        title="ยืนยันบันทึกการจ่าย"
        footer={
          <>
            <Button variant="ghost" onClick={() => setPayOpen(false)}>
              ยกเลิก
            </Button>
            <Button onClick={confirmPaid}>ยืนยัน</Button>
          </>
        }
      >
        {active && (
          <p>
            บันทึกว่าจ่ายเงินให้ <b>{active.employeeName}</b> (<span className="num">{active.id}</span>) แล้ว ยอด{" "}
            <b className="num">{formatBaht(active.paidAmount)}</b>
          </p>
        )}
      </Modal>
    </div>
  );
}
