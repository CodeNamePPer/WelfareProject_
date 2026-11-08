'use client';

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type RequestStatus = "pending" | "approved" | "draft" | "rejected";
type StatusFilter = "all" | RequestStatus | "processing";

type WelfareRequest = {
  id: string;
  title: string;
  submittedAt: string;
  amount: number;
  status: RequestStatus;
  year: string;
  description: string;
};

const initialRequests: WelfareRequest[] = [
  {
    id: "WF-2569-014",
    title: "ค่ารักษาพยาบาล",
    submittedAt: "12 ก.พ. 2569",
    amount: 1800,
    status: "pending",
    year: "2569",
    description: "ค่าตรวจรักษาผู้ป่วยนอกและค่ายาตามใบเสร็จ",
  },
  {
    id: "WF-2569-011",
    title: "ค่าเดินทาง",
    submittedAt: "20 ม.ค. 2569",
    amount: 1200,
    status: "approved",
    year: "2569",
    description: "ค่าเดินทางเพื่อเข้าร่วมกิจกรรมขององค์กร",
  },
  {
    id: "WF-2569-006",
    title: "ค่ารักษาพยาบาล",
    submittedAt: "15 ม.ค. 2569",
    amount: 2500,
    status: "approved",
    year: "2569",
    description: "ค่ารักษาพยาบาลตามสิทธิ์สวัสดิการประจำปี",
  },
  {
    id: "DRAFT-003",
    title: "ค่าทำงานล่วงเวลา",
    submittedAt: "10 ม.ค. 2569",
    amount: 2000,
    status: "draft",
    year: "2569",
    description: "คำขอเบิกค่าทำงานล่วงเวลา",
  },
];

const statusLabels: Record<RequestStatus, string> = {
  pending: "รออนุมัติ",
  approved: "อนุมัติแล้ว",
  draft: "ฉบับร่าง",
  rejected: "ไม่อนุมัติ",
};

const statusStyles: Record<RequestStatus, string> = {
  pending: "bg-stone-100 text-stone-700",
  approved: "bg-status-approved-soft text-status-approved-ink",
  draft: "bg-amber-50 text-amber-700",
  rejected: "bg-status-rejected-soft text-status-rejected",
};

const tabs: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "ทั้งหมด" },
  { value: "pending", label: "รออนุมัติ" },
  { value: "approved", label: "อนุมัติแล้ว" },
  { value: "processing", label: "ดำเนินการ" },
  { value: "rejected", label: "ไม่อนุมัติ" },
];

const approvalSteps = [
  {
    title: "ส่งคำขอแล้ว",
    description: "สมชาย ใจดี",
    date: "12 ก.พ. 2569 · 09:15 น.",
    state: "เสร็จสิ้น",
    complete: true,
  },
  {
    title: "กำลังตรวจสอบคำขอ",
    description: "นวลนภา มาเยอะ · เป็นผู้ดูแล",
    date: "รอการพิจารณา · ตรวจสอบความถูกต้องของคำขอ",
    state: "กำลังดำเนินการ",
    complete: false,
  },
  {
    title: "ตรวจสอบเสร็จสิ้น",
    description: "นวลนภา มาเยอะ · เป็นผู้ดูแล",
    date: "ตรวจสอบสิทธิ์และเอกสารประกอบเสร็จสิ้น",
    state: "รอดำเนินการ",
    complete: false,
  },
  {
    title: "จ่ายเงินและปิดคำขอ",
    description: "ฝ่ายการเงิน",
    date: "โอนเงินเข้าบัญชีตามรอบการจ่าย",
    state: "รอดำเนินการ",
    complete: false,
  },
];

function formatAmount(amount: number) {
  return new Intl.NumberFormat("th-TH").format(amount);
}

export default function StatusPage() {
  const [requests, setRequests] = useState(initialRequests);
  const [selectedId, setSelectedId] = useState(initialRequests[0].id);
  const [activeTab, setActiveTab] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [selectedYear, setSelectedYear] = useState("2569");
  const [showCancelConfirmation, setShowCancelConfirmation] = useState(false);

  const filteredRequests = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("th");

    return requests.filter((request) => {
      const matchesTab =
        activeTab === "all" ||
        (activeTab === "processing"
          ? request.status === "draft"
          : request.status === activeTab);
      const matchesSearch =
        !query ||
        `${request.id} ${request.title} ${request.description}`
          .toLocaleLowerCase("th")
          .includes(query);

      return matchesTab && matchesSearch && request.year === selectedYear;
    });
  }, [activeTab, requests, search, selectedYear]);

  const selectedRequest =
    filteredRequests.find((request) => request.id === selectedId) ??
    filteredRequests[0];

  useEffect(() => {
    if (!showCancelConfirmation) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setShowCancelConfirmation(false);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showCancelConfirmation]);

  function countForTab(tab: StatusFilter) {
    const requestsForYear = requests.filter(
      (request) => request.year === selectedYear,
    );
    if (tab === "all") return requestsForYear.length;
    if (tab === "processing") {
      return requestsForYear.filter((request) => request.status === "draft").length;
    }
    return requestsForYear.filter((request) => request.status === tab).length;
  }

  function cancelRequest() {
    if (!selectedRequest) return;
    setRequests((current) =>
      current.filter((request) => request.id !== selectedRequest.id),
    );
    setSelectedId("");
    setShowCancelConfirmation(false);
  }

  return (
    <div className="mx-auto max-w-[1500px] space-y-3 px-1 pb-8 text-13 text-ink">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-22 font-semibold">ติดตามคำขอสวัสดิการ</h1>
          <p className="mt-1 text-12 text-muted">
            ตรวจสอบรายการคำขอและดูขั้นตอนการอนุมัติของคุณ
          </p>
        </div>
        <Link
          href="/employee/withdraw"
          className='inline-flex min-h-10 items-center justify-center rounded-md bg-primary-600 px-4 py-2 text-13 font-medium text-white transition-colors hover:bg-primary-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600'
        >
          ยื่นคำขอใหม่
        </Link>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded border border-neutral-300 px-3 focus-within:border-neutral-500">
          <svg
            aria-hidden="true"
            className="h-4 w-4 shrink-0 text-muted"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <circle cx="10.8" cy="10.8" r="6.8" />
            <path d="m16 16 4 4" />
          </svg>
          <input
            aria-label="ค้นหาคำขอสวัสดิการ"
            className="w-full bg-transparent text-12 outline-none placeholder:text-muted"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="ค้นหาด้วยเลขที่คำขอ หรือชื่อสวัสดิการ"
            value={search}
          />
        </label>
        <select
          aria-label="เลือกปี"
          className="h-10 rounded border border-neutral-300 bg-white px-3 text-12"
          onChange={(event) => setSelectedYear(event.target.value)}
          value={selectedYear}
        >
          <option value="2569">ปี 2569</option>
          <option value="2568">ปี 2568</option>
        </select>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            aria-pressed={activeTab === tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`shrink-0 rounded border px-3 py-1.5 text-12 transition ${
              activeTab === tab.value
                ? "border-primary-600 bg-primary-600 text-white"
                : "border-line bg-white text-ink-soft hover:bg-surface"
            }`}
          >
            {tab.label} ({countForTab(tab.value)})
          </button>
        ))}
      </div>

      <section className="rounded border border-line bg-white p-3">
        <h2 className="mb-3 font-semibold">คำขอของฉัน</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left text-12">
            <thead>
              <tr className="bg-primary-50 text-ink-soft">
                <th className="px-3 py-2 font-medium">เลขที่คำขอ</th>
                <th className="px-3 py-2 font-medium">ประเภท / วันที่ยื่น</th>
                <th className="px-3 py-2 text-right font-medium">
                  จำนวนเงิน (บาท)
                </th>
                <th className="px-3 py-2 font-medium">สถานะ</th>
                <th className="px-3 py-2 font-medium">ขั้นตอนล่าสุด</th>
                <th className="px-3 py-2 text-right font-medium">การจัดการ</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.map((request) => (
                <tr
                  key={request.id}
                  onClick={() => {
                    setSelectedId(request.id);
                    setShowCancelConfirmation(false);
                  }}
                  className={`cursor-pointer border-b border-line transition hover:bg-surface ${
                    selectedRequest?.id === request.id ? "bg-surface" : ""
                  }`}
                >
                  <td className="px-3 py-3 font-semibold">{request.id}</td>
                  <td className="px-3 py-3">
                    <div>{request.title}</div>
                    <div className="mt-1 text-11 text-muted">
                      {request.submittedAt}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right font-semibold">
                    {formatAmount(request.amount)}
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`whitespace-nowrap rounded px-2 py-1 text-11 ${statusStyles[request.status]}`}
                    >
                      {statusLabels[request.status]}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-muted">
                    {request.status === "pending"
                      ? "รออนุมัติจากฝ่ายบุคคล"
                      : request.status === "approved"
                        ? "ดำเนินการจ่ายเงิน"
                        : "ยังไม่ได้ส่งคำขอ"}
                  </td>
                  <td className="px-3 py-3 text-right">
                    {request.status === "draft" ? (
                      <Link
                        href="/employee/withdraw"
                        onClick={(event) => event.stopPropagation()}
                        className="whitespace-nowrap rounded border border-neutral-400 px-2 py-1 hover:bg-primary-50"
                      >
                        แก้ไขฉบับร่าง
                      </Link>
                    ) : request.status === "pending" ? (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedId(request.id);
                          setShowCancelConfirmation(true);
                        }}
                        className="whitespace-nowrap rounded border border-neutral-400 px-2 py-1 hover:bg-primary-50"
                      >
                        ยกเลิกคำขอ
                      </button>
                    ) : (
                      <span className="whitespace-nowrap text-muted">
                        ยกเลิกไม่ได้
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {filteredRequests.length === 0 && (
                <tr>
                  <td
                    className="px-3 py-8 text-center text-muted"
                    colSpan={6}
                  >
                    ไม่พบรายการคำขอสวัสดิการ
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex justify-between pt-3 text-11 text-muted">
          <span>แสดง {filteredRequests.length} จาก {requests.length} รายการ</span>
          <span>หน้า 1 / 1</span>
        </div>
      </section>

      {selectedRequest && (
        <section className="rounded border border-line bg-white p-3">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-3">
            <div>
              <h2 className="font-semibold">
                รายละเอียดคำขอ {selectedRequest.id}
              </h2>
              <p className="mt-2 text-12 text-muted">
                {selectedRequest.title} · ยื่นเมื่อ {selectedRequest.submittedAt}{" "}
                เวลา 09:15 น.
              </p>
            </div>
            <span
              className={`rounded px-2 py-1 text-11 ${statusStyles[selectedRequest.status]}`}
            >
              {statusLabels[selectedRequest.status]}
            </span>
          </div>

          <div className="grid gap-5 pt-4 md:grid-cols-[minmax(190px,0.8fr)_2fr]">
            <div className="space-y-4 md:border-r md:border-line md:pr-5">
              <div>
                <p className="text-12 text-muted">จำนวนเงินที่ขอเบิก</p>
                <p className="mt-1 text-22 font-semibold">
                  {formatAmount(selectedRequest.amount)} บาท
                </p>
              </div>
              <div className="space-y-1 text-12">
                <p className="text-muted">พนักงาน</p>
                <p className="font-medium">คุณสมชาย ใจดี · EMP-1024</p>
              </div>
              <div className="space-y-1 text-12">
                <p className="text-muted">วันที่ใช้บริการ</p>
                <p className="font-medium">{selectedRequest.submittedAt}</p>
              </div>
              <div className="space-y-1 text-12">
                <p className="text-muted">รายละเอียดคำขอ</p>
                <p className="leading-5">{selectedRequest.description}</p>
                <p className="text-muted">คลินิกสุขใจ · ใบเสร็จเลขที่ S-1026-128</p>
              </div>
              <div className="border-t border-line pt-3 text-12">
                <p className="mb-2 font-medium">เอกสารแนบ 2 ไฟล์</p>
                <button type="button" className="block text-left text-ink-soft underline">
                  ใบเสร็จ_คลินิกสุขใจ.pdf · ดูไฟล์
                </button>
                <button type="button" className="mt-1 block text-left text-ink-soft underline">
                  ใบรับรองแพทย์.pdf · ดูไฟล์
                </button>
              </div>
            </div>

            <div>
              <h3 className="mb-3 font-semibold">ขั้นตอนการอนุมัติ</h3>
              <ol className="space-y-1">
                {approvalSteps.map((step, index) => (
                  <li key={step.title} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-11 ${
                          step.complete
                            ? "bg-neutral-200 text-ink-soft"
                            : index === 1
                              ? "bg-neutral-800 text-white"
                              : "bg-primary-50 text-muted"
                        }`}
                      >
                        {step.complete ? "✓" : index + 1}
                      </span>
                      {index < approvalSteps.length - 1 && (
                        <span className="my-1 min-h-5 w-px flex-1 bg-neutral-200" />
                      )}
                    </div>
                    <div className="flex min-w-0 flex-1 justify-between gap-3 pb-3">
                      <div>
                        <p className="font-medium">{step.title}</p>
                        <p className="mt-1 text-12 text-muted">
                          {step.description}
                        </p>
                        <p className="mt-1 text-11 text-muted">
                          {step.date}
                        </p>
                      </div>
                      <span className="shrink-0 pt-1 text-11 text-muted">
                        {step.state}
                      </span>
                    </div>
                  </li>
                ))}
              </ol>
              <p className="mt-1 text-11 text-muted">
                กรุณารอการดำเนินการตามขั้นตอน โดยปกติใช้เวลาประมาณ 3–5 วันทำการ
              </p>
            </div>
          </div>
        </section>
      )}

      {showCancelConfirmation && selectedRequest?.status === "pending" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setShowCancelConfirmation(false);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-request-title"
            className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl"
          >
            <h2 id="cancel-request-title" className="text-14 font-semibold">
              ยืนยันการยกเลิกคำขอ
            </h2>
            <p className="mt-2 text-13 text-ink-soft">
              ต้องการยกเลิกคำขอ {selectedRequest.id} ใช่หรือไม่?
              เมื่อยืนยันแล้ว คำขอนี้จะถูกนำออกจากรายการติดตาม
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                autoFocus
                onClick={() => setShowCancelConfirmation(false)}
                className="rounded border border-neutral-300 px-3 py-2 text-12 hover:bg-surface"
              >
                กลับ
              </button>
              <button
                type="button"
                onClick={cancelRequest}
                className="rounded bg-neutral-800 px-3 py-2 text-12 text-white hover:bg-neutral-700"
              >
                ยืนยันการยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
