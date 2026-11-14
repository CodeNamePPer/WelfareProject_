'use client';

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Check, Paperclip } from "lucide-react";
import { useDetailParam } from "@/lib/useDetailParam";
import type { ClaimDbStatus } from "@/lib/claims/types";
import { baht } from "@/lib/claims/requester";
import { cx } from "@/lib/cx";
import { ClaimPill, EmptyNote, PageHead, Sheet, inputClass, pill } from "@/features/requester/ui";

export type RequestStatus = "pending" | "approved" | "draft" | "rejected" | "revision" | "processing" | "cancelled";
type StatusFilter = "all" | "todo" | "processing" | "done";

export type ApprovalStep = { title: string; description: string; date: string; state: string; complete: boolean; current: boolean };

export type WelfareRequest = {
  id: string;
  title: string;
  submittedAt: string;
  submittedTime: string;
  amount: number;
  status: RequestStatus;
  dbStatus: ClaimDbStatus;
  statusText: string;
  year: string;
  description: string;
  /** ยื่นเอง หรือ ยื่นแทนโดยใคร */
  kindLabel: string;
  /** บรรทัดรองใต้ชื่อสวัสดิการ: สิ่งที่ต้องรู้ตอนนี้ */
  hint: string;
  facts: { label: string; value: string }[];
  payNote: string | null;
  reserveNote: string | null;
  attachments: { id: string; name: string }[];
  steps: ApprovalStep[];
  lastStep: string;
  canEdit: boolean;
  canCancel: boolean;
};

// แท็บตามสิ่งที่ผู้ส่งคำขอต้องทำ ไม่ใช่ตามสถานะในฐานข้อมูล
const TAB_STATUSES: Record<Exclude<StatusFilter, "all">, RequestStatus[]> = {
  todo: ["draft", "revision"],
  processing: ["pending", "processing"],
  done: ["approved", "rejected", "cancelled"],
};

const tabs: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "คำขอของฉัน" },
  { value: "todo", label: "ต้องทำ" },
  { value: "processing", label: "กำลังดำเนินการ" },
  { value: "done", label: "เสร็จสิ้น" },
];

const LIST_COLS = "grid-cols-[150px_minmax(0,1.6fr)_minmax(0,1.2fr)_110px_130px_150px]";
const inTab = (request: WelfareRequest, tab: StatusFilter) => tab === "all" || TAB_STATUSES[tab].includes(request.status);

export default function StatusClient({ initialRequests }: { initialRequests: WelfareRequest[] }) {
  const router = useRouter();
  const [requests, setRequests] = useState(initialRequests);
  const [selectedId, setSelectedId] = useState(initialRequests[0]?.id ?? "");
  const [cancelError, setCancelError] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const currentYear = String(new Date().getFullYear() + 543);
  const years = useMemo(() => [...new Set([currentYear, ...initialRequests.map((request) => request.year)])].sort().reverse(), [currentYear, initialRequests]);
  const [activeTab, setActiveTab] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [showCancelConfirmation, setShowCancelConfirmation] = useState(false);

  const requestsForYear = useMemo(() => requests.filter((request) => request.year === selectedYear), [requests, selectedYear]);
  const filteredRequests = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("th");
    return requestsForYear.filter(
      (request) => inTab(request, activeTab) && (!query || `${request.id} ${request.title} ${request.description}`.toLocaleLowerCase("th").includes(query)),
    );
  }, [activeTab, requestsForYear, search]);

  // ?id=เลขคำขอ คือเปิดหน้ารายละเอียด ส่วน selectedId ใช้กับปุ่มยกเลิกในหน้ารายละเอียด
  const detail = useDetailParam("id");
  const detailRequest = requests.find((request) => request.id === detail.id);
  const selectedRequest = detailRequest ?? requests.find((request) => request.id === selectedId);

  useEffect(() => {
    if (!showCancelConfirmation) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setShowCancelConfirmation(false);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showCancelConfirmation]);

  async function cancelRequest() {
    if (!selectedRequest || cancelling) return;
    setCancelling(true);
    setCancelError("");
    try {
      const response = await fetch(`/api/claims/${encodeURIComponent(selectedRequest.id)}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      if (!response.ok) {
        const data = await response.json();
        setCancelError(data.error ?? "ยกเลิกคำขอไม่สำเร็จ");
        return;
      }
      setRequests((current) =>
        current.map((request) =>
          request.id === selectedRequest.id
            ? { ...request, status: "cancelled", dbStatus: "cancelled", statusText: "ยกเลิกแล้ว", lastStep: "ยกเลิกแล้ว", hint: "ยกเลิกแล้ว คืนวงเงินให้แล้ว", payNote: null, reserveNote: null, canEdit: false, canCancel: false }
            : request,
        ),
      );
      setShowCancelConfirmation(false);
      router.refresh();
    } catch {
      setCancelError("เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setCancelling(false);
    }
  }

  return (
    <>
      {!detailRequest && (
        <>
          <PageHead title="ติดตามสถานะ" description={`ปี ${selectedYear} · คำขอทั้งหมด ${requestsForYear.length} รายการ`}>
            <Link href="/employee/withdraw" className={pill.primary}>
              ยื่นคำขอใหม่
            </Link>
          </PageHead>

          <Sheet>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5">
              <div role="group" aria-label="กรองสถานะ" className="flex flex-wrap">
                {tabs.map((tab) => {
                  const active = activeTab === tab.value;
                  return (
                    <button
                      key={tab.value}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setActiveTab(tab.value)}
                      className={cx(
                        "mr-[18px] border-b-2 px-1 py-3 text-14 transition-colors motion-reduce:transition-none",
                        active ? "border-primary-600 font-semibold text-ink" : "border-transparent text-muted hover:text-ink",
                      )}
                    >
                      {tab.label} ({requestsForYear.filter((request) => inTab(request, tab.value)).length})
                    </button>
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-2 py-2">
                <input
                  type="search"
                  aria-label="ค้นหาคำขอสวัสดิการ"
                  className={cx(inputClass, "!h-9 !w-60 max-w-full")}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="ค้นหาเลขคำขอหรือสวัสดิการ"
                  value={search}
                />
                <select
                  aria-label="เลือกปี"
                  className="h-9 rounded-full border border-slate-300 bg-white px-4 text-13 text-ink-soft"
                  onChange={(event) => setSelectedYear(event.target.value)}
                  value={selectedYear}
                >
                  {years.map((year) => (
                    <option key={year} value={year}>
                      ปี {year}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* ไม่มีแถวก็ไม่แสดงหัวตาราง จะได้ไม่มีแถบเลื่อนเปล่า ๆ บนจอแคบ */}
            <div className={cx("overflow-x-auto", filteredRequests.length === 0 && "hidden")}>
              <div className="min-w-[880px]">
                <div className={`grid ${LIST_COLS} items-center gap-3 bg-surface px-5 py-2.5 text-12 font-medium text-muted`}>
                  <span>เลขคำขอ</span>
                  <span>สวัสดิการ</span>
                  <span>ประเภท</span>
                  <span className="text-right">
                    จำนวนเงิน
                  </span>
                  <span>วันที่ยื่น</span>
                  <span>สถานะ</span>
                </div>
                {filteredRequests.map((request) => (
                  <button
                    key={request.id}
                    type="button"
                   
                    onClick={() => {
                      setShowCancelConfirmation(false);
                      detail.open(request.id);
                    }}
                    className={`grid w-full ${LIST_COLS} items-center gap-3 border-t border-slate-100 px-5 py-3.5 text-left transition-colors hover:bg-surface focus-visible:bg-surface focus-visible:outline-none motion-reduce:transition-none`}
                  >
                    <span className="font-medium tabular-nums">
                      {request.id}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{request.title}</span>
                      <span className="block truncate text-12 text-muted">{request.hint}</span>
                    </span>
                    <span className="text-13 text-ink-soft">
                      {request.kindLabel}
                    </span>
                    <span className="text-right font-medium tabular-nums">
                      {baht(request.amount)}
                    </span>
                    <span className="text-13 text-muted">
                      {request.submittedAt}
                    </span>
                    <span>
                      <ClaimPill status={request.dbStatus} />
                    </span>
                  </button>
                ))}
              </div>
            </div>
            {filteredRequests.length === 0 ? <EmptyNote>{requestsForYear.length === 0 ? "ยังไม่มีคำขอในปีนี้" : "ไม่พบคำขอที่ตรงกับตัวกรอง"}</EmptyNote> : null}
          </Sheet>
        </>
      )}

      {detailRequest && selectedRequest && (
        <>
          <PageHead
            crumbs={[{ label: "ติดตามสถานะ", href: "/employee/status" }, { label: selectedRequest.id }]}
            title={selectedRequest.id}
            description={`${selectedRequest.title} · ${selectedRequest.kindLabel} · ยื่น ${selectedRequest.submittedTime}`}
          >
            <ClaimPill status={selectedRequest.dbStatus} />
            {selectedRequest.canEdit ? (
              <Link href={`/employee/withdraw?claim=${encodeURIComponent(selectedRequest.id)}`} className={pill.primary}>
                {selectedRequest.status === "draft" ? "แก้ไขฉบับร่าง" : "แก้ไขและยื่นใหม่"}
              </Link>
            ) : null}
            {selectedRequest.canCancel ? (
              <button
                type="button"
                onClick={() => {
                  setSelectedId(selectedRequest.id);
                  setShowCancelConfirmation(true);
                }}
                className={pill.quiet}
              >
                ยกเลิกคำขอ
              </button>
            ) : null}
          </PageHead>

          <Sheet className="px-6 py-5">
            <div className="overflow-x-auto">
              <ol aria-label="ความคืบหน้า" className="flex min-w-[560px] items-start">
                {selectedRequest.steps.slice(0, 4).map((step, index) => (
                  <li key={step.title} className="flex flex-1 items-start last:flex-none">
                    <div className="flex min-w-[120px] flex-col items-center gap-1 text-center">
                      <span
                        className={cx(
                          "flex size-7 items-center justify-center rounded-full text-12 font-semibold",
                          step.complete ? "bg-status-approved text-white" : step.current ? "border-2 border-status-pending bg-white text-status-pending" : "border border-slate-300 bg-white text-muted",
                        )}
                      >
                        {step.complete ? <Check className="size-3.5" strokeWidth={3} aria-hidden="true" /> : index + 1}
                      </span>
                      <span className={cx("text-13", step.complete || step.current ? "font-semibold text-ink" : "text-muted")}>{step.title}</span>
                      <span className="text-11 text-muted">{step.state}</span>
                    </div>
                    {index < 3 ? <div aria-hidden="true" className={cx("mx-2 mt-[13px] h-0.5 flex-1", step.complete ? "bg-status-approved" : "bg-line")} /> : null}
                  </li>
                ))}
              </ol>
            </div>
            {selectedRequest.payNote || selectedRequest.reserveNote ? (
              <div className="mt-4 flex flex-wrap gap-3 text-13">
                {selectedRequest.payNote ? (
                  <p className="flex-[1_1_280px] rounded-lg bg-primary-50 px-3 py-2.5 text-blue-900">
                    <b className="font-semibold">{selectedRequest.payNote}</b> ถ้า HR และการเงินอนุมัติทันรอบ ไม่ทันจะเลื่อนไปรอบถัดไป
                  </p>
                ) : null}
                {selectedRequest.reserveNote ? <p className="flex-[1_1_220px] rounded-lg bg-surface px-3 py-2.5 text-ink-soft">{selectedRequest.reserveNote}</p> : null}
              </div>
            ) : null}
          </Sheet>

          <div className="flex flex-wrap items-start gap-4">
            <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-4">
              <Sheet className="p-5">
                <h2 className="mb-3 text-16 font-semibold">รายละเอียดคำขอ</h2>
                <dl className="grid gap-x-4 gap-y-3.5 sm:grid-cols-2 lg:grid-cols-3">
                  {selectedRequest.facts.map((fact) => (
                    <div key={fact.label} className="min-w-0">
                      <dt className="text-12 text-muted">{fact.label}</dt>
                      <dd className="break-words">{fact.value}</dd>
                    </div>
                  ))}
                </dl>
              </Sheet>

              <Sheet className="p-5">
                <h2 className="mb-3 text-16 font-semibold">เอกสารแนบ</h2>
                {selectedRequest.attachments.length === 0 ? (
                  <p className="text-13 text-muted">ยังไม่มีเอกสารแนบ</p>
                ) : (
                  <ul className="flex flex-wrap gap-2">
                    {selectedRequest.attachments.map((file) => (
                      <li key={file.id}>
                        <a
                          href={`/api/claims/attachments/${file.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-white px-3.5 text-13 text-ink no-underline hover:border-primary-600 hover:bg-primary-50 hover:text-primary-700"
                        >
                          <Paperclip className="size-3.5" aria-hidden="true" />
                          {file.name}
                          <span className="sr-only"> (เปิดในแท็บใหม่)</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </Sheet>
            </div>

            <Sheet className="flex-[1_1_300px] px-[18px] py-4">
              <h2 className="text-15 font-semibold">ความคืบหน้า</h2>
              <p className="mb-3.5 text-12 text-muted">{selectedRequest.lastStep}</p>
              <ol aria-label="ความคืบหน้าคำขอ">
                {selectedRequest.steps.map((step, index) => {
                  const last = index === selectedRequest.steps.length - 1;
                  return (
                    <li key={step.title} aria-current={step.current ? "step" : undefined} className="flex gap-3">
                      <span className="flex flex-col items-center">
                        <span
                          className={cx(
                            "flex size-6 shrink-0 items-center justify-center rounded-full",
                            step.complete ? "bg-status-approved text-white" : step.current ? "border-[3px] border-status-pending bg-white ring-4 ring-status-pending-soft" : "border-2 border-slate-300 bg-white",
                          )}
                        >
                          {step.complete ? <Check className="size-3.5" strokeWidth={3} aria-hidden="true" /> : null}
                        </span>
                        {!last ? <span aria-hidden="true" className={cx("my-1 min-h-7 w-0.5 flex-1", step.complete ? "bg-status-approved" : "bg-line")} /> : null}
                      </span>
                      <span className={cx("min-w-0 flex-1", step.current ? "-mt-1.5 mb-2.5 rounded-lg bg-amber-50 px-2.5 py-2" : last ? "" : "pb-3.5")}>
                        <span className="sr-only">{step.state}: </span>
                        <span className={cx("block text-14 font-semibold", step.complete || step.current ? "text-ink" : "text-muted")}>
                          {step.title}
                          {step.current ? <span className="ml-1.5 rounded-full bg-status-pending-soft px-2 text-11 font-semibold text-status-pending-ink">ขั้นตอนปัจจุบัน</span> : null}
                        </span>
                        {step.description ? <span className={cx("block text-13", step.complete || step.current ? "text-ink-soft" : "text-muted")}>{step.description}</span> : null}
                        {step.date ? <span className="block text-12 text-muted">{step.date}</span> : null}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </Sheet>
          </div>
        </>
      )}

      {showCancelConfirmation && selectedRequest?.canCancel && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setShowCancelConfirmation(false);
            }
          }}
        >
          <div role="dialog" aria-modal="true" aria-labelledby="cancel-request-title" className="w-full max-w-md rounded-lg bg-white p-5 shadow-popover">
            <h2 id="cancel-request-title" className="text-16 font-semibold">
              ยืนยันการยกเลิกคำขอ
            </h2>
            <p className="mt-2 text-13 text-ink-soft">
              ต้องการยกเลิกคำขอ {selectedRequest.id} ใช่หรือไม่? เมื่อยืนยันแล้ว คำขอนี้จะเปลี่ยนเป็นสถานะยกเลิก และคืนวงเงินที่กันไว้
            </p>
            {cancelError ? (
              <p role="alert" className="mt-2 text-12 text-status-rejected">
                {cancelError}
              </p>
            ) : null}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" autoFocus onClick={() => setShowCancelConfirmation(false)} className={pill.quiet}>
                กลับ
              </button>
              <button type="button" disabled={cancelling} onClick={() => void cancelRequest()} className={cx(pill.primary, "bg-danger hover:bg-danger/90")}>
                ยืนยันการยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
