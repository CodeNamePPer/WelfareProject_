"use client";

import Link from "next/link";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { BENEFIT_APPROVAL_COLUMNS, SkeletonCount, SkeletonTableRows } from "../../HrSkeletons";
import {
  applyBenefitRequestStatuses,
  readBenefitRequestStatuses,
  saveBenefitRequestStatus,
  type BenefitRequest,
  type RequestStatus,
} from "../requests/data";

type DecisionAction = "approve" | "reject" | "return";

type Decision = {
  request: BenefitRequest;
  action: DecisionAction;
};

const decisionCopy: Record<
  DecisionAction,
  { title: string; confirm: string; status: RequestStatus; done: string; reasonLabel?: string; placeholder?: string }
> = {
  approve: {
    title: "ยืนยันการอนุมัติ",
    confirm: "ยืนยันอนุมัติ",
    status: "อนุมัติแล้ว",
    done: "อนุมัติ",
  },
  reject: {
    title: "ยืนยันการปฏิเสธ",
    confirm: "ยืนยันปฏิเสธ",
    status: "ปฏิเสธแล้ว",
    done: "ปฏิเสธ",
    reasonLabel: "เหตุผลที่ปฏิเสธ",
    placeholder: "ระบุเหตุผลในการปฏิเสธคำขอ...",
  },
  return: {
    title: "ส่งคำขอกลับเพื่อแก้ไข",
    confirm: "ส่งกลับให้แก้ไข",
    status: "รอแก้ไข",
    done: "ส่งกลับให้แก้ไข",
    reasonLabel: "รายละเอียดที่ต้องแก้ไข",
    placeholder: "ระบุข้อมูลหรือเอกสารที่ต้องแก้ไข...",
  },
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("th-TH").format(value);
}

export default function BenefitApprovalsPage() {
  const [requests, setRequests] = useState<BenefitRequest[]>([]);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState("");
  const [notice, setNotice] = useState("");
  const [noticeIsError, setNoticeIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      setRequests(applyBenefitRequestStatuses(readBenefitRequestStatuses()));
    } catch {
      setNoticeIsError(true);
      setNotice("ไม่สามารถโหลดสถานะคำขอสวัสดิการที่บันทึกไว้ได้");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const pendingRequests = useMemo(
    () => requests.filter((request) => request.status === "รออนุมัติ"),
    [requests],
  );

  function openDecision(request: BenefitRequest, action: DecisionAction) {
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
    if (!decision || decision.request.status !== "รออนุมัติ") return;

    const copy = decisionCopy[decision.action];
    if (decision.action !== "approve" && !reason.trim()) {
      setReasonError(`กรุณาระบุ${copy.reasonLabel}`);
      return;
    }

    try {
      const statuses = saveBenefitRequestStatus(
        decision.request.requestNumber,
        copy.status,
        decision.action === "approve" ? undefined : reason,
      );
      setRequests(applyBenefitRequestStatuses(statuses));
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
        <div className="page-content person-requests-content benefit-approval-content">
          <Breadcrumb className="breadcrumbs" items={[{ label: "จัดการสวัสดิการ", href: "/hr/benefits" }, { label: "อนุมัติคำขอเพิ่มสวัสดิการ" }]} />
          <div className="person-requests-heading">
            <h1>อนุมัติคำขอเพิ่มสวัสดิการ</h1>
            <span className="result-count">
              {isLoading ? <SkeletonCount label="กำลังโหลดคำขอ..." /> : `${pendingRequests.length} รายการรออนุมัติ`}
            </span>
            <Link href="/hr/benefits" className="person-requests-back-button">
              <span aria-hidden="true">←</span> ย้อนกลับ
            </Link>
          </div>

          <section className="person-requests-panel" aria-label="คำขอเพิ่มสวัสดิการที่รออนุมัติ">
            <div className="person-requests-table-wrap">
              <table className="person-requests-table benefit-track-table benefit-approval-table">
                <thead>
                  <tr>
                    <th scope="col">เลขที่คำขอ</th>
                    <th scope="col">ประเภทสวัสดิการ</th>
                    <th scope="col">วงเงินที่เสนอ</th>
                    <th scope="col">รายละเอียด</th>
                    <th scope="col">ผู้ยื่นคำขอ</th>
                    <th scope="col">วันที่ยื่นคำขอ</th>
                    <th scope="col">ดำเนินการ</th>
                  </tr>
                </thead>
                <tbody>
                  {!isLoading && pendingRequests.map((request) => (
                    <tr key={request.requestNumber}>
                      <td data-label="เลขที่คำขอ" className="person-request-number">{request.requestNumber}</td>
                      <td data-label="ประเภทสวัสดิการ">{request.benefitType}</td>
                      <td data-label="วงเงินที่เสนอ">{formatCurrency(request.amount)} บาท</td>
                      <td data-label="รายละเอียด">{request.details}</td>
                      <td data-label="ผู้ยื่นคำขอ">
                        <div className="person-request-cell-value">
                          <strong>{request.employeeName}</strong>
                          <span className="person-request-secondary">{request.employeeId} · {request.department} · {request.position}</span>
                        </div>
                      </td>
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
                    <tr><td className="person-request-empty" colSpan={7}>ไม่มีคำขอที่รออนุมัติ</td></tr>
                  ) : null}
                  {isLoading ? <SkeletonTableRows columns={BENEFIT_APPROVAL_COLUMNS} rows={5} rowClassName="animate-skeleton-in" /> : null}
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
          <section className="decision-dialog benefit-approval-dialog" role="dialog" aria-modal="true" aria-labelledby="benefit-approval-title">
            <button type="button" className="decision-close" onClick={closeDecision} aria-label="ปิดหน้าต่าง">×</button>
            <div className={`decision-icon ${decision.action}`} aria-hidden="true">
              {decision.action === "approve" ? (
                <svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6" /></svg>
              ) : decision.action === "reject" ? "!" : "↩"}
            </div>
            <h2 id="benefit-approval-title">{copy.title}</h2>
            <p className="decision-description">
              คำขอ {decision.request.requestNumber} · {decision.request.employeeName} · {decision.request.benefitType}
            </p>
            <dl className="person-request-detail-grid">
              <div><dt>วงเงินที่เสนอ</dt><dd>{formatCurrency(decision.request.amount)} บาท</dd></div>
              <div><dt>วันที่ยื่นคำขอ</dt><dd>{decision.request.submittedAt}</dd></div>
              <div className="person-request-detail-wide"><dt>รายละเอียดคำขอ</dt><dd>{decision.request.details}</dd></div>
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
                    aria-describedby={reasonError ? "benefit-reason-error" : undefined}
                    required
                  />
                  {reasonError ? <small id="benefit-reason-error" className="decision-error">{reasonError}</small> : null}
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
