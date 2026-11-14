"use client";

import { useRouter } from "next/navigation";
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
import { claimAction } from "@/features/payroll/lib/actions";
import { PAGE_SIZE } from "@/features/payroll/lib/constants";
import { ALL, filterRequests, ROUND_OPTIONS, statusOptions, WELFARE_FILTER_OPTIONS } from "@/features/payroll/lib/filters";
import { formatBaht, formatThaiDate } from "@/features/payroll/lib/format";
import { usePagination } from "@/features/payroll/lib/use-pagination";
import { useEffectiveRequests, useHydrated } from "@/features/payroll/lib/payroll-store";
import { useDetailParam } from "@/lib/useDetailParam";
import { ApprovalRequestHeader, ApprovalsHeader } from "./PageHeaders";
import { ApprovalsSkeleton } from "./PageSkeletons";
import type { PaymentRequest } from "@/features/payroll/lib/types";
import { RequestDetailPanel } from "./RequestDetailPanel";

type Tab = "all" | "approved" | "pending" | "paid";

/**
 * ตารางรายการอนุมัติ / รอจ่าย
 *   - แท็บ ทั้งหมด / รอตรวจ / รอจ่าย / จ่ายแล้ว
 *   - กรองทันทีเมื่อพิมพ์/เลือก (ไม่มีปุ่มค้นหา ตาม wireframe)
 *   - คลิกแถว (หรือชื่อพนักงาน) -> เปิดหน้ารายละเอียด (?id=เลขคำขอ) พร้อม Breadcrumb
 *   - ในหน้ารายละเอียด: คำขอที่ "รอการเงินตรวจ" มีปุ่ม ปฏิเสธ / ส่งกลับ / อนุมัติ และคำขอที่ "รอจ่าย" มีปุ่ม ส่งกลับ / บันทึกจ่ายแล้ว
 */
export function ApprovalsView({ initialRequests }: { initialRequests: PaymentRequest[] }) {
  const hydrated = useHydrated(); // false = ยังไม่ได้โหลดการตั้งค่าจากฐานข้อมูล
  const toast = useToast();
  const router = useRouter();
  // เก็บใน state เพื่ออัปเดตแถวทันทีหลัง server บันทึกสำเร็จ
  const [rawRequests, setRequests] = useState(initialRequests);
  // รับข้อมูลใหม่จาก server หลัง router.refresh() เช่น วันที่จ่ายจริงและผู้จ่าย
  const [prevInitial, setPrevInitial] = useState(initialRequests);
  if (initialRequests !== prevInitial) {
    setPrevInitial(initialRequests);
    setRequests(initialRequests);
  }
  // วันจ่ายตามการตั้งค่า / การเลื่อนรายคำขอ (ข้อมูลกลาง)
  const requests = useEffectiveRequests(rawRequests);
  const [tab, setTab] = useState<Tab>("approved");
  const [filter, setFilter] = useState({ q: "", round: ALL, welfare: ALL, status: ALL });

  // คำขอที่เปิดหน้ารายละเอียดอยู่ (?id=เลขคำขอ)
  const detail = useDetailParam("id");
  const active = detail.id ? (requests.find((r) => r.id === detail.id) ?? null) : null;
  // Modal ยืนยัน: "ส่งกลับ" (ต้องกรอกเหตุผล) และ "บันทึกจ่ายแล้ว"
  const [returnOpen, setReturnOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState("");
  const [reasonMode, setReasonMode] = useState<"return" | "reject">("return");
  const [payOpen, setPayOpen] = useState(false);
  const [transferRef, setTransferRef] = useState("");
  const [approveOpen, setApproveOpen] = useState(false);
  const [approveNote, setApproveNote] = useState("");
  const [modalError, setModalError] = useState("");
  const [saving, setSaving] = useState(false);

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

  function openReturn(mode: "return" | "reject" = "return") {
    setReasonMode(mode);
    setReason("");
    setReasonError("");
    setReturnOpen(true);
  }

  /** ยืนยันส่งกลับหรือปฏิเสธ: ต้องมีเหตุผลอย่างน้อย 5 ตัวอักษร */
  async function confirmReturn() {
    if (!active) return;
    if (reason.trim().length < 5) {
      setReasonError("กรุณาระบุเหตุผลอย่างน้อย 5 ตัวอักษร");
      return;
    }
    setSaving(true);
    const failure = await claimAction(active.id, { action: reasonMode === "reject" ? "finance_reject" : "finance_return", note: reason.trim() });
    setSaving(false);
    if (failure) {
      setReasonError(failure);
      return;
    }
    setRequests((prev) => prev.map((r) => (r.id === active.id ? { ...r, status: reasonMode === "reject" ? "rejected" : "returned", returnReason: reasonMode === "reject" ? undefined : reason.trim() } : r)));
    toast(`${reasonMode === "reject" ? "ปฏิเสธ" : "ส่งกลับ"}คำขอ ${active.id} แล้ว`);
    setReturnOpen(false);
    router.refresh();
  }

  function openApprove() {
    if (!active) return;
    setApproveNote("");
    setModalError("");
    setApproveOpen(true);
  }

  /** ยืนยันอนุมัติจ่ายตามยอดที่ HR อนุมัติ การเงินปรับยอดไม่ได้ (ถ้ายอดผิดให้ส่งกลับ HR) */
  async function confirmApprove() {
    if (!active) return;
    setSaving(true);
    const failure = await claimAction(active.id, { action: "finance_approve", note: approveNote.trim() });
    setSaving(false);
    if (failure) {
      setModalError(failure);
      return;
    }
    setRequests((prev) => prev.map((r) => (r.id === active.id ? { ...r, status: "pending" } : r)));
    toast(`อนุมัติคำขอ ${active.id} แล้ว`);
    setApproveOpen(false);
    router.refresh();
  }

  function openPay() {
    setTransferRef("");
    setModalError("");
    setPayOpen(true);
  }

  /** ยืนยันบันทึกจ่ายแล้ว */
  async function confirmPaid() {
    if (!active) return;
    if (!transferRef.trim()) {
      setModalError("กรุณาระบุเลขอ้างอิงการโอน");
      return;
    }
    setSaving(true);
    const failure = await claimAction(active.id, { action: "pay", transferRef: transferRef.trim() });
    setSaving(false);
    if (failure) {
      setModalError(failure);
      return;
    }
    setRequests((prev) => prev.map((r) => (r.id === active.id ? { ...r, status: "paid" } : r)));
    toast(`บันทึกจ่ายแล้ว ${active.id}`);
    setPayOpen(false);
    router.refresh();
  }

  const count = (s: Tab) => (s === "all" ? requests.length : requests.filter((r) => r.status === s).length);

  // ยังไม่ได้อ่านการตั้งค่าที่บันทึกไว้: แสดง skeleton ก่อน (กันวันจ่ายเริ่มต้นแว้บแล้วเปลี่ยน)
  if (!hydrated) return <ApprovalsSkeleton />;

  return (
    <div>
      {active ? (
        <>
          <ApprovalRequestHeader id={active.id} />
          <RequestDetailPanel request={active} onReturn={() => openReturn("return")} onReject={() => openReturn("reject")} onApprove={openApprove} onPaid={openPay} />
        </>
      ) : (
      <>
      <ApprovalsHeader />
      <ListPanel
        footer={<Pagination {...pagination} />}
        lead={
          <Tabs
            label="กรองตามสถานะ"
            value={tab}
            onChange={changeTab}
            tabs={[
              { value: "all", label: "ทั้งหมด", count: count("all") },
              { value: "approved", label: "รอตรวจ", count: count("approved") },
              { value: "pending", label: "รอจ่าย", count: count("pending") },
              { value: "paid", label: "จ่ายแล้ว", count: count("paid") },
            ]}
          />
        }
        toolbar={
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[2fr_1fr_1fr_1fr]">
            <Field label="ค้นหา">
              {(id) => <SearchInput id={id} placeholder="ค้นหาชื่อพนักงาน / เลขที่คำขอ" value={filter.q} onChange={(e) => updateFilter("q", e.target.value)} />}
            </Field>
            <Field label="รอบ">
              {(id) => <Select id={id} options={ROUND_OPTIONS} value={filter.round} onChange={(e) => updateFilter("round", e.target.value)} />}
            </Field>
            <Field label="ประเภทสวัสดิการ">
              {(id) => <Select id={id} options={WELFARE_FILTER_OPTIONS} value={filter.welfare} onChange={(e) => updateFilter("welfare", e.target.value)} />}
            </Field>
            <Field label="สถานะ">
              {(id) => <Select id={id} options={statusOptions(["approved", "pending", "paid", "returned", "rejected"])} value={filter.status} onChange={(e) => updateFilter("status", e.target.value)} />}
            </Field>
          </div>
        }
      >
        <TableContainer bare>
          <THead>
            <Th>ลำดับ</Th>
            <Th>เลขที่คำขอ</Th>
            <Th>ชื่อพนักงาน</Th>
            <Th>แผนก / ฝ่าย</Th>
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
                <Tr key={r.id} onActivate={() => detail.open(r.id)}>
                  <Td className="num text-muted">{(pagination.page - 1) * PAGE_SIZE + i + 1}</Td>
                  <Td className="num">{r.id}</Td>
                  <Td>
                    {/* ปุ่มชื่อ: ให้เปิดรายละเอียดด้วยคีย์บอร์ดได้ (Tab แล้ว Enter) */}
                    <button
                      type="button"
                      onClick={() => detail.open(r.id)}
                      className="-mx-1 rounded px-1 text-left font-medium text-ink underline-offset-4 hover:text-primary-600 hover:underline"
                    >
                      {r.employeeName}
                    </button>
                  </Td>
                  <Td>{r.department}</Td>
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
      </>
      )}

      {/* Modal ส่งกลับ: บังคับกรอกเหตุผล */}
      <Modal
        open={returnOpen}
        onClose={() => setReturnOpen(false)}
        title={reasonMode === "reject" ? "ปฏิเสธคำขอ" : "ส่งกลับคำขอ"}
        footer={
          <>
            <Button variant="ghost" onClick={() => setReturnOpen(false)}>
              ยกเลิก
            </Button>
            <Button variant="danger" disabled={saving} onClick={() => void confirmReturn()}>
              {reasonMode === "reject" ? "ปฏิเสธ" : "ส่งกลับ"}
            </Button>
          </>
        }
      >
        {active && (
          <div className="flex flex-col gap-4">
            <p className="text-12 text-muted">
              <span className="num">{active.id}</span> · {active.employeeName} · <span className="num">{formatBaht(active.paidAmount)}</span>
            </p>
            <Field label={reasonMode === "reject" ? "เหตุผลที่ปฏิเสธ *" : "เหตุผลที่ส่งกลับ *"} error={reasonError}>
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
            <Button disabled={saving} onClick={() => void confirmPaid()}>ยืนยัน</Button>
          </>
        }
      >
        {active && (
          <div className="flex flex-col gap-4">
            <p>
              บันทึกว่าจ่ายเงินให้ <b>{active.employeeName}</b> (<span className="num">{active.id}</span>) แล้ว ยอด{" "}
              <b className="num">{formatBaht(active.paidAmount)}</b>
            </p>
            <Field label="เลขอ้างอิงการโอน *" error={modalError}>
              {(id, describedBy) => (
                <input
                  id={id}
                  value={transferRef}
                  aria-describedby={describedBy}
                  onChange={(e) => {
                    setTransferRef(e.target.value);
                    setModalError("");
                  }}
                  className="h-10 w-full rounded-lg border border-line bg-white px-3 text-13 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/25 focus:outline-none"
                />
              )}
            </Field>
          </div>
        )}
      </Modal>

      {/* Modal อนุมัติ: ปรับยอดได้ ถ้าปรับต้องระบุเหตุผล */}
      <Modal
        open={approveOpen}
        onClose={() => setApproveOpen(false)}
        title="อนุมัติคำขอ"
        footer={
          <>
            <Button variant="ghost" onClick={() => setApproveOpen(false)}>
              ยกเลิก
            </Button>
            <Button disabled={saving} onClick={() => void confirmApprove()}>อนุมัติ</Button>
          </>
        }
      >
        {active && (
          <div className="flex flex-col gap-4">
            <p className="text-12 text-muted">
              <span className="num">{active.id}</span> · {active.employeeName} · ยอดเบิก <span className="num">{formatBaht(active.amount)}</span>
            </p>
            <div className="rounded-lg bg-surface px-3 py-2.5">
              <p className="text-12 text-muted">ยอดที่ HR อนุมัติ</p>
              <p className="num text-16 font-semibold">{formatBaht(active.paidAmount)}</p>
              <p className="text-12 text-muted">การเงินปรับยอดไม่ได้ ถ้ายอดไม่ถูกต้องให้ส่งกลับ HR</p>
            </div>
            <Field label="หมายเหตุ (ถ้ามี)" error={modalError}>
              {(id, describedBy) => (
                <textarea
                  id={id}
                  rows={3}
                  value={approveNote}
                  aria-describedby={describedBy}
                  onChange={(e) => {
                    setApproveNote(e.target.value);
                    setModalError("");
                  }}
                  className="w-full rounded-lg border border-line bg-white p-3 text-13 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/25 focus:outline-none"
                />
              )}
            </Field>
          </div>
        )}
      </Modal>
    </div>
  );
}
