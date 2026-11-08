'use client';

import Link from "next/link";
import { useEffect, useState } from "react";

type ChangeRequest = {
  id: string;
  field: string;
  submittedAt: string;
  status: "pending" | "approved" | "draft";
  latestUpdate: string;
};

const initialRequests: ChangeRequest[] = [
  {
    id: "PC-2569-008",
    field: "ที่อยู่ปัจจุบัน",
    submittedAt: "12 ก.พ. 2569 · 10:15 น.",
    status: "pending",
    latestUpdate: "ฝ่ายบุคคลกำลังตรวจสอบเอกสาร",
  },
  {
    id: "PC-2569-006",
    field: "ผู้ติดต่อฉุกเฉิน",
    submittedAt: "7 ก.พ. 2569 · 14:20 น.",
    status: "approved",
    latestUpdate: "บันทึกเมื่อ 8 ก.พ. 2569 · 09:42 น.",
  },
  {
    id: "PC-2569-009",
    field: "เบอร์โทรศัพท์",
    submittedAt: "13 ก.พ. 2569 · 09:10 น.",
    status: "draft",
    latestUpdate: "ยังไม่ได้ส่งข้อมูล · กรอกต่อ →",
  },
];

const statusLabels = {
  pending: "รอตรวจสอบ",
  approved: "อนุมัติและบันทึกแล้ว",
  draft: "ฉบับร่าง",
};

const statusStyles = {
  pending: "border border-amber-200 bg-amber-50 text-amber-800",
  approved: "border border-status-approved-soft bg-status-approved-soft text-status-approved-ink",
  draft: "border border-line bg-primary-50 text-ink-soft",
};

function ProfileField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-line bg-surface/80 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
      <dt className="text-11 font-medium uppercase tracking-[0.12em] text-muted">
        {label}
      </dt>
      <dd className="mt-1 text-12 font-medium leading-5 text-ink">
        {children}
      </dd>
    </div>
  );
}

export default function ProfilePage() {
  const [requests, setRequests] = useState(initialRequests);
  const [cancelRequestId, setCancelRequestId] = useState<string | null>(null);
  const requestToCancel = requests.find((request) => request.id === cancelRequestId);

  useEffect(() => {
    if (!cancelRequestId) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setCancelRequestId(null);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cancelRequestId]);

  function cancelRequest() {
    if (!cancelRequestId) return;

    setRequests((current) =>
      current.filter((request) => request.id !== cancelRequestId),
    );
    setCancelRequestId(null);
  }

  return (
    <div className="mx-auto max-w-[1500px] px-1 pb-10 pt-2 text-13 text-ink">
      <div className="rounded-[28px] border border-line bg-gradient-to-br from-slate-50 via-white to-sky-50/80 p-4 shadow-[0_24px_60px_rgba(15,23,42,0.06)]">
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-4">
          <div>
            <div className="mb-1 text-11 font-medium uppercase tracking-[0.14em] text-muted">
              พนักงาน / โปรไฟล์ของฉัน
            </div>
            <h1 className="text-22 font-semibold tracking-[-0.04em] text-ink">
              โปรไฟล์ของฉัน
            </h1>
            <p className="mt-1 text-12 text-ink-soft">
              ตรวจสอบข้อมูลส่วนตัวและติดตามคำขอเปลี่ยนแปลงข้อมูลของคุณ
            </p>
          </div>

          <Link
            href="/employee/profile/changeprofile"
            className="inline-flex items-center justify-center rounded-xl bg-primary-600 px-4 py-2.5 text-12 font-medium text-white transition hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
          >
            ยื่นคำขอเปลี่ยนข้อมูล
          </Link>
        </header>

        <aside className="mt-4 flex items-start gap-3 rounded-2xl border border-primary-100 bg-primary-50/80 p-3.5">
          <span className="mt-0.5 rounded-full bg-white p-1.5 text-primary-600 shadow-sm" aria-hidden="true">
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <rect x="5" y="10" width="14" height="11" rx="2" />
              <path d="M8 10V7a4 4 0 0 1 8 0v3" />
            </svg>
          </span>
          <div>
            <h2 className="text-12 font-semibold text-ink">
              ฝ่ายบุคคลเท่านั้นที่แก้ไขข้อมูลจริงได้
            </h2>
            <p className="mt-1 text-11 leading-5 text-ink-soft">
              คุณสามารถดูข้อมูลและยื่นคำขอเปลี่ยนข้อมูลได้
              แต่ไม่สามารถแก้ไขข้อมูลในโปรไฟล์ได้โดยตรง
            </p>
          </div>
        </aside>

        <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(260px,0.92fr)]">
          <section className="rounded-[24px] border border-line bg-white p-5 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-14 font-semibold text-ink">ข้อมูลส่วนตัว</h2>
              <span className="rounded-full border border-line bg-surface px-2.5 py-1 text-10 font-medium uppercase tracking-[0.12em] text-ink-soft">
                Active
              </span>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
              <div className="flex items-center gap-3">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-600 to-indigo-600 text-14 font-semibold text-white shadow-lg shadow-sky-200">
                  กจ
                </span>
                <div>
                  <p className="text-14 font-semibold text-ink">กมลชนก ใจดี</p>
                  <p className="mt-1 text-11 text-muted">
                    EMP-1024 · ฝ่ายการตลาด
                  </p>
                </div>
              </div>

              <span className="rounded-full border border-line bg-surface px-2.5 py-1.5 text-10 font-medium text-ink-soft">
                ดูข้อมูลเท่านั้น
              </span>
            </div>

            <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <ProfileField label="วันเกิด">15 พฤษภาคม 2535</ProfileField>
              <ProfileField label="ตำแหน่ง">เจ้าหน้าที่การตลาด</ProfileField>
              <ProfileField label="วันที่เริ่มงาน">1 มีนาคม 2565</ProfileField>
              <ProfileField label="หน่วยงาน">ฝ่ายการตลาด</ProfileField>
              <ProfileField label="สถานภาพสมรส">โสด</ProfileField>
              <ProfileField label="ชื่อบิดา">สมหมาย ใจดี</ProfileField>
              <ProfileField label="ชื่อมารดา">สมศรี ใจดี</ProfileField>
              <ProfileField label="สัญชาติ">ไทย</ProfileField>
              <ProfileField label="เพศ">หญิง</ProfileField>
              <ProfileField label="ศาสนา">พุทธ</ProfileField>
              <ProfileField label="อีเมล">kamonchanok.j@example.com</ProfileField>
              <ProfileField label="เบอร์โทรศัพท์">081-234-5678</ProfileField>
              <div className="sm:col-span-2">
                <ProfileField label="ที่อยู่ปัจจุบัน">
                  88/24 ถนนลาดพร้าว แขวงจอมพล เขตจตุจักร กรุงเทพมหานคร 10900
                </ProfileField>
              </div>
              <div className="sm:col-span-2">
                <ProfileField label="ผู้ติดต่อฉุกเฉิน">
                  กิตติ ใจดี (พี่ชาย) · 082-345-6789
                </ProfileField>
              </div>
            </dl>
          </section>

          <div className="grid content-start gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <section className="rounded-[24px] border border-line bg-white p-4 shadow-[0_8px_18px_rgba(15,23,42,0.03)]">
              <h2 className="text-14 font-semibold text-ink">การแก้ไขล่าสุด</h2>
              <dl className="mt-3 space-y-3">
                <ProfileField label="วันที่และเวลา">
                  8 มิ.ย. 2569 · 09:42 น.
                </ProfileField>
                <ProfileField label="ผู้แก้ไขข้อมูล">
                  ศิริพร วัฒนกุล
                </ProfileField>
              </dl>
              <div className="mt-3 border-t border-line pt-3">
                <span className="rounded-full border border-line bg-surface px-2.5 py-1 text-10 font-medium uppercase tracking-[0.12em] text-ink-soft">
                  เจ้าหน้าที่บุคคล (HR)
                </span>
              </div>
              <p className="mt-3 text-11 leading-5 text-muted">
                บันทึกข้อมูลผู้ติดต่อฉุกเฉินตามคำขอ PC-2569-006
              </p>
            </section>

            <section className="rounded-[24px] border border-line bg-white p-4 shadow-[0_8px_18px_rgba(15,23,42,0.03)]">
              <h2 className="text-14 font-semibold text-ink">เมื่อข้อมูลไม่ถูกต้อง</h2>
              <p className="mt-3 text-12 leading-6 text-ink-soft">
                ยื่นคำขอพร้อมเหตุผลและหลักฐานให้ฝ่ายบุคคลตรวจสอบ
                เมื่อข้อมูลได้รับการตรวจสอบและอนุมัติแล้ว ระบบจะอัปเดตให้
              </p>
              <a
                href="mailto:hr@example.com"
                className="mt-3 inline-block text-11 font-medium text-primary-600 underline-offset-4 transition hover:text-primary-700 hover:underline"
              >
                ติดต่อเพิ่มเติมกับฝ่ายทรัพยากรบุคคล
              </a>
            </section>
          </div>
        </div>

        <section className="mt-5 rounded-[24px] border border-line bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-14 font-semibold text-ink">คำขอเปลี่ยนข้อมูลของฉัน</h2>
            <span className="text-11 text-muted">
              {requests.length} รายการ · รอตรวจสอบ {requests.filter((request) => request.status === "pending").length} ·
              อนุมัติแล้ว {requests.filter((request) => request.status === "approved").length}
            </span>
          </div>

          <div className="mt-3 overflow-hidden rounded-2xl border border-line">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] border-collapse text-left text-12">
                <thead>
                  <tr className="bg-primary-50 text-ink-soft">
                    <th className="px-3 py-2.5 font-medium">เลขที่คำขอ</th>
                    <th className="px-3 py-2.5 font-medium">ข้อมูลที่เปลี่ยน / วันที่ยื่นคำขอ</th>
                    <th className="px-3 py-2.5 font-medium">สถานะ</th>
                    <th className="px-3 py-2.5 font-medium">ความคืบหน้าล่าสุด</th>
                    <th className="px-3 py-2.5 text-right font-medium">การจัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((request, index) => (
                    <tr
                      key={request.id}
                      className={index % 2 === 0 ? "bg-white" : "bg-surface/60"}
                    >
                      <td className="px-3 py-3 font-semibold text-ink">{request.id}</td>
                      <td className="px-3 py-3">
                        <p className="font-medium text-ink">{request.field}</p>
                        <p className="mt-1 text-11 text-muted">{request.submittedAt}</p>
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`whitespace-nowrap rounded-full px-2.5 py-1 text-11 font-medium ${statusStyles[request.status]}`}
                        >
                          {statusLabels[request.status]}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-ink-soft">{request.latestUpdate}</td>
                      <td className="px-3 py-3 text-right">
                        {request.status === "pending" ? (
                          <button
                            type="button"
                            onClick={() => setCancelRequestId(request.id)}
                            className="whitespace-nowrap rounded-lg border border-line bg-white px-2.5 py-1.5 text-11 font-medium text-ink-soft transition hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                          >
                            ยกเลิกคำขอ
                          </button>
                        ) : request.status === "draft" ? (
                          <Link
                            href="/employee/profile/changeprofile"
                            className="whitespace-nowrap rounded-lg border border-line bg-white px-2.5 py-1.5 text-11 font-medium text-ink-soft transition hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                          >
                            แก้ไขฉบับร่าง
                          </Link>
                        ) : (
                          <span className="text-11 text-muted">ยกเลิกไม่ได้</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {requests.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-3 py-8 text-center text-muted">
                        ไม่มีคำขอเปลี่ยนข้อมูล
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>

      {requestToCancel && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-primary-600/40 p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) setCancelRequestId(null);
          }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="cancel-request-title"
            aria-describedby="cancel-request-description"
            className="w-full max-w-md rounded-2xl border border-line bg-white p-5 shadow-[0_26px_70px_rgba(15,23,42,0.18)]"
          >
            <h2 id="cancel-request-title" className="text-14 font-semibold text-ink">
              ยืนยันการยกเลิกคำขอ
            </h2>
            <p id="cancel-request-description" className="mt-2 text-13 leading-6 text-ink-soft">
              ต้องการยกเลิกคำขอ {requestToCancel.id} ({requestToCancel.field})
              ใช่หรือไม่? เมื่อยืนยันแล้ว คำขอนี้จะถูกนำออกจากรายการ
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                autoFocus
                onClick={() => setCancelRequestId(null)}
                className="rounded-lg border border-line bg-white px-3 py-2 text-12 font-medium text-ink-soft transition hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
              >
                กลับ
              </button>
              <button
                type="button"
                onClick={cancelRequest}
                className="rounded-lg bg-primary-600 px-3 py-2 text-12 font-medium text-white transition hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
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
