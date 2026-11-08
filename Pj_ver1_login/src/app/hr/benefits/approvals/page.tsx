"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  applyBenefitRequestStatuses,
  initialBenefitRequests,
  readBenefitRequestStatuses,
  saveBenefitRequestStatus,
  type BenefitRequest,
} from "../requests/data";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("th-TH").format(value);
}

export default function BenefitApprovalsPage() {
  const [requests, setRequests] = useState<BenefitRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<BenefitRequest | null>(null);
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

  function approveRequest() {
    if (!selectedRequest || selectedRequest.status !== "รออนุมัติ") return;

    try {
      const statuses = saveBenefitRequestStatus(selectedRequest.requestNumber, "อนุมัติแล้ว");
      setRequests(applyBenefitRequestStatuses(statuses));
      setNoticeIsError(false);
      setNotice(`อนุมัติคำขอ ${selectedRequest.requestNumber} เรียบร้อยแล้ว`);
      setSelectedRequest(null);
    } catch {
      setNoticeIsError(true);
      setNotice("ไม่สามารถบันทึกผลการอนุมัติได้ กรุณาลองอีกครั้ง");
    }
  }

  return (
    <div className="app-shell">
      <div className="app-main employee-management-main">
        <div className="page-content person-requests-content benefit-approval-content">
          <nav className="breadcrumbs" aria-label="เส้นทางนำทาง">
            <Link href="/hr/benefits">จัดการสวัสดิการ</Link>
            <span className="breadcrumb-separator" aria-hidden="true">&gt;</span>
            <span aria-current="page">อนุมัติคำขอเพิ่มสวัสดิการ</span>
          </nav>
          <div className="person-requests-heading">
            <h1>อนุมัติคำขอเพิ่มสวัสดิการ</h1>
            <span className="result-count">
              {isLoading ? "กำลังโหลดคำขอ..." : `${pendingRequests.length} รายการรออนุมัติ`}
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
                        <button
                          type="button"
                          className="button button-primary benefit-approval-action"
                          onClick={() => setSelectedRequest(request)}
                        >
                          อนุมัติ
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!isLoading && pendingRequests.length === 0 ? (
                    <tr><td className="person-request-empty" colSpan={7}>ไม่มีคำขอที่รออนุมัติ</td></tr>
                  ) : null}
                  {isLoading ? (
                    <tr><td className="person-request-empty" colSpan={7}>กำลังโหลดคำขอ...</td></tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>

      {selectedRequest ? (
        <div
          className="decision-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedRequest(null);
          }}
        >
          <section className="decision-dialog benefit-approval-dialog" role="dialog" aria-modal="true" aria-labelledby="benefit-approval-title">
            <button type="button" className="decision-close" onClick={() => setSelectedRequest(null)} aria-label="ปิดหน้าต่าง">×</button>
            <div className="decision-icon approve" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6" /></svg>
            </div>
            <h2 id="benefit-approval-title">ยืนยันการอนุมัติ</h2>
            <p className="decision-description">
              คำขอ {selectedRequest.requestNumber} · {selectedRequest.employeeName} · {selectedRequest.benefitType}
            </p>
            <dl className="person-request-detail-grid">
              <div><dt>วงเงินที่เสนอ</dt><dd>{formatCurrency(selectedRequest.amount)} บาท</dd></div>
              <div><dt>วันที่ยื่นคำขอ</dt><dd>{selectedRequest.submittedAt}</dd></div>
              <div className="person-request-detail-wide"><dt>รายละเอียดคำขอ</dt><dd>{selectedRequest.details}</dd></div>
              <div className="person-request-detail-wide"><dt>เอกสารแนบ</dt><dd>{selectedRequest.documents.join(" · ")}</dd></div>
            </dl>
            <div className="decision-actions">
              <button type="button" className="button button-secondary" onClick={() => setSelectedRequest(null)}>ยกเลิก</button>
              <button type="button" className="button decision-approve-button" onClick={approveRequest}>ยืนยันอนุมัติ</button>
            </div>
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
