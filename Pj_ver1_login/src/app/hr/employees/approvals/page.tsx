"use client";

import Link from "next/link";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { EMPLOYEE_APPROVAL_COLUMNS, SkeletonCount, SkeletonTableRows } from "../../HrSkeletons";
import {
  applyEmployeeRequestStatuses,
  readEmployeeRequestStatuses,
  saveEmployeeRequestStatus,
  type EmployeeRequest,
  type RequestStatus,
} from "../requests/data";

type DecisionAction = "approve" | "reject" | "return";

type Decision = {
  request: EmployeeRequest;
  action: DecisionAction;
};

const decisionCopy: Record<
  DecisionAction,
  { title: string; confirm: string; status: RequestStatus; done: string; reasonLabel?: string; placeholder?: string }
> = {
  approve: {
    title: "ยืนยันการอนุมัติคำขอเพิ่มพนักงาน",
    confirm: "ยืนยันอนุมัติ",
    status: "อนุมัติแล้ว",
    done: "อนุมัติ",
  },
  reject: {
    title: "ยืนยันการปฏิเสธคำขอเพิ่มพนักงาน",
    confirm: "ยืนยันปฏิเสธ",
    status: "ปฏิเสธแล้ว",
    done: "ปฏิเสธ",
    reasonLabel: "เหตุผลที่ปฏิเสธ",
    placeholder: "ระบุเหตุผลในการปฏิเสธคำขอ...",
  },
  return: {
    title: "ส่งคำขอเพิ่มพนักงานกลับเพื่อแก้ไข",
    confirm: "ส่งกลับให้แก้ไข",
    status: "รอแก้ไข",
    done: "ส่งกลับให้แก้ไข",
    reasonLabel: "รายละเอียดที่ต้องแก้ไข",
    placeholder: "ระบุข้อมูลหรือเอกสารที่ต้องแก้ไข...",
  },
};

export default function EmployeeApprovalsPage() {
  const [requests, setRequests] = useState<EmployeeRequest[]>([]);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState("");
  const [notice, setNotice] = useState("");
  const [noticeIsError, setNoticeIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      setRequests(applyEmployeeRequestStatuses(readEmployeeRequestStatuses()));
    } catch {
      setNoticeIsError(true);
      setNotice("ไม่สามารถโหลดสถานะคำขอเพิ่มพนักงานที่บันทึกไว้ได้");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const pendingRequests = useMemo(
    () => requests.filter((request) => request.status === "รอตรวจสอบ"),
    [requests],
  );

  function openDecision(request: EmployeeRequest, action: DecisionAction) {
    setDecision({ request, action });
    setReason("");
    setReasonError("");
  }

  function closeDecision() {
    setDecision(null);
    setReason("");
    setReasonError("");
  }

  function confirmDecision(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!decision || decision.request.status !== "รอตรวจสอบ") return;

    const copy = decisionCopy[decision.action];
    if (decision.action !== "approve" && !reason.trim()) {
      setReasonError(`กรุณาระบุ${copy.reasonLabel}`);
      return;
    }

    try {
      const statuses = saveEmployeeRequestStatus(
        decision.request.requestNumber,
        copy.status,
        decision.action === "approve" ? undefined : reason,
      );
      setRequests(applyEmployeeRequestStatuses(statuses));
      setNoticeIsError(false);
      setNotice(`${copy.done}คำขอ ${decision.request.requestNumber} เรียบร้อยแล้ว`);
      closeDecision();
    } catch {
      setNoticeIsError(true);
      setNotice("ไม่สามารถบันทึกผลการพิจารณาได้ กรุณาลองอีกครั้ง");
    }
  }

  const copy = decision ? decisionCopy[decision.action] : null;

  return (
    <div className="app-shell">
      <div className="app-main employee-management-main">
        <div className="page-content person-requests-content person-approval-content">
          <Breadcrumb className="breadcrumbs" items={[{ label: "จัดการพนักงานและสิทธิ์", href: "/hr/employees" }, { label: "อนุมัติคำขอเพิ่มพนักงาน" }]} />
          <div className="person-requests-heading">
            <h1>อนุมัติคำขอเพิ่มพนักงาน</h1>
            <span className="result-count">
              {isLoading ? <SkeletonCount label="กำลังโหลดคำขอ..." /> : `${pendingRequests.length} รายการรออนุมัติ`}
            </span>
            <Link href="/hr/employees" className="person-requests-back-button">
              <span aria-hidden="true">←</span> ย้อนกลับ
            </Link>
          </div>

          <section className="person-requests-panel" aria-label="คำขอเพิ่มพนักงานที่รออนุมัติ">
            <div className="person-requests-table-wrap">
              <table className="person-requests-table employee-approval-table">
                <thead>
                  <tr>
                    <th scope="col">เลขที่คำขอ</th>
                    <th scope="col">ชื่อพนักงานใหม่</th>
                    <th scope="col">แผนก</th>
                    <th scope="col">ตำแหน่ง</th>
                    <th scope="col">วันที่ยื่นคำขอ</th>
                    <th scope="col">ดำเนินการ</th>
                  </tr>
                </thead>
                <tbody>
                  {!isLoading && pendingRequests.map((request) => (
                    <tr key={request.requestNumber}>
                      <td data-label="เลขที่คำขอ" className="person-request-number">{request.requestNumber}</td>
                      <td data-label="ชื่อพนักงานใหม่">{request.employeeName}</td>
                      <td data-label="แผนก">{request.department}</td>
                      <td data-label="ตำแหน่ง">{request.position}</td>
                      <td data-label="วันที่ยื่นคำขอ"><time>{request.submittedAt}</time></td>
                      <td data-label="ดำเนินการ">
                        <div className="request-actions approval-request-actions">
                          <button type="button" className="request-action approve" onClick={() => openDecision(request, "approve")} aria-label={`อนุมัติคำขอ ${request.requestNumber}`}><span>อนุมัติ</span></button>
                          <button type="button" className="request-action reject" onClick={() => openDecision(request, "reject")} aria-label={`ปฏิเสธคำขอ ${request.requestNumber}`}><span>ปฏิเสธ</span></button>
                          <button type="button" className="request-action return" onClick={() => openDecision(request, "return")} aria-label={`ส่งกลับคำขอ ${request.requestNumber}`}><span>ส่งกลับ</span></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!isLoading && pendingRequests.length === 0 ? (
                    <tr><td className="person-request-empty" colSpan={6}>ไม่มีคำขอที่รออนุมัติ</td></tr>
                  ) : null}
                  {isLoading ? <SkeletonTableRows columns={EMPLOYEE_APPROVAL_COLUMNS} rows={5} rowClassName="animate-skeleton-in" /> : null}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>

      {decision && copy ? (
        <div
          className="decision-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeDecision();
          }}
        >
          <section className="decision-dialog person-approval-dialog" role="dialog" aria-modal="true" aria-labelledby="person-approval-title">
            <button type="button" className="decision-close" onClick={closeDecision} aria-label="ปิดหน้าต่าง">×</button>
            <div className={`decision-icon ${decision.action}`} aria-hidden="true">
              {decision.action === "approve" ? (
                <svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6" /></svg>
              ) : decision.action === "reject" ? "!" : "↩"}
            </div>
            <h2 id="person-approval-title">{copy.title}</h2>
            <p className="decision-description">
              คำขอ {decision.request.requestNumber} · {decision.request.employeeName}
            </p>
            <dl className="person-request-detail-grid">
              <div><dt>ชื่อพนักงานใหม่</dt><dd>{decision.request.employeeName}</dd></div>
              <div><dt>แผนก</dt><dd>{decision.request.department}</dd></div>
              <div><dt>ตำแหน่ง</dt><dd>{decision.request.position}</dd></div>
              <div><dt>วันที่ยื่นคำขอ</dt><dd>{decision.request.submittedAt}</dd></div>
              <div className="person-request-detail-wide"><dt>เอกสารแนบ</dt><dd>{decision.request.documents.join(" · ")}</dd></div>
            </dl>
            <form onSubmit={confirmDecision} noValidate>
              {copy.reasonLabel ? (
                <label className="decision-reason">
                  <span>{copy.reasonLabel} <span className="reason-required">*</span></span>
                  <textarea
                    value={reason}
                    onChange={(event) => {
                      setReason(event.target.value);
                      if (event.target.value.trim()) setReasonError("");
                    }}
                    rows={4}
                    placeholder={copy.placeholder}
                    aria-invalid={Boolean(reasonError)}
                    aria-describedby={reasonError ? "approval-reason-error" : undefined}
                    required
                  />
                  {reasonError ? <small id="approval-reason-error" className="decision-error">{reasonError}</small> : null}
                </label>
              ) : null}
              <div className="decision-actions">
                <button type="button" className="button button-secondary" onClick={closeDecision}>ยกเลิก</button>
                <button
                  type="submit"
                  className={`button ${decision.action === "approve" ? "decision-approve-button" : decision.action === "reject" ? "decision-reject-button" : "button-primary"}`}
                >
                  {copy.confirm}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {notice ? (
        <div className={`toast${noticeIsError ? " toast-error" : ""}`} role={noticeIsError ? "alert" : "status"}>
          <span className="toast-check">{noticeIsError ? "!" : "✓"}</span>
          {notice}
          <button type="button" onClick={() => setNotice("")} aria-label="ปิดข้อความ">×</button>
        </div>
      ) : null}
    </div>
  );
}
