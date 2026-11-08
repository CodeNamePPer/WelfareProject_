"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  applyEmployeeRequestStatuses,
  readEmployeeRequestStatuses,
  saveEmployeeRequestStatus,
  type EmployeeRequest,
} from "../requests/data";

export default function EmployeeApprovalsPage() {
  const [requests, setRequests] = useState<EmployeeRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<EmployeeRequest | null>(null);
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

  function approveRequest() {
    if (!selectedRequest || selectedRequest.status !== "รอตรวจสอบ") return;

    try {
      const statuses = saveEmployeeRequestStatus(selectedRequest.requestNumber, "อนุมัติแล้ว");
      setRequests(applyEmployeeRequestStatuses(statuses));
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
        <div className="page-content person-requests-content person-approval-content">
          <nav className="breadcrumbs" aria-label="เส้นทางนำทาง">
            <Link href="/hr/employees">จัดการพนักงานและสิทธิ์</Link>
            <span className="breadcrumb-separator" aria-hidden="true">&gt;</span>
            <span aria-current="page">อนุมัติคำขอเพิ่มพนักงาน</span>
          </nav>
          <div className="person-requests-heading">
            <h1>อนุมัติคำขอเพิ่มพนักงาน</h1>
            <span className="result-count">
              {isLoading ? "กำลังโหลดคำขอ..." : `${pendingRequests.length} รายการรออนุมัติ`}
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
                        <button
                          type="button"
                          className="button button-primary person-approval-action"
                          onClick={() => setSelectedRequest(request)}
                        >
                          ตรวจสอบและอนุมัติ
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!isLoading && pendingRequests.length === 0 ? (
                    <tr><td className="person-request-empty" colSpan={6}>ไม่มีคำขอที่รออนุมัติ</td></tr>
                  ) : null}
                  {isLoading ? (
                    <tr><td className="person-request-empty" colSpan={6}>กำลังโหลดคำขอ...</td></tr>
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
          <section className="decision-dialog person-approval-dialog" role="dialog" aria-modal="true" aria-labelledby="person-approval-title">
            <button type="button" className="decision-close" onClick={() => setSelectedRequest(null)} aria-label="ปิดหน้าต่าง">×</button>
            <div className="decision-icon approve" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6" /></svg>
            </div>
            <h2 id="person-approval-title">ยืนยันการอนุมัติคำขอเพิ่มพนักงาน</h2>
            <p className="decision-description">
              คำขอ {selectedRequest.requestNumber} · {selectedRequest.employeeName}
            </p>
            <dl className="person-request-detail-grid">
              <div><dt>ชื่อพนักงานใหม่</dt><dd>{selectedRequest.employeeName}</dd></div>
              <div><dt>แผนก</dt><dd>{selectedRequest.department}</dd></div>
              <div><dt>ตำแหน่ง</dt><dd>{selectedRequest.position}</dd></div>
              <div><dt>วันที่ยื่นคำขอ</dt><dd>{selectedRequest.submittedAt}</dd></div>
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
