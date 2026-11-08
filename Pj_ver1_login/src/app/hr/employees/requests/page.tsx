"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  applyEmployeeRequestStatuses,
  initialEmployeeRequests,
  readEmployeeRequestStatuses,
  type EmployeeRequest,
  type RequestStatus,
} from "./data";

const departments = [...new Set(initialEmployeeRequests.map((request) => request.department))];
const positions = [...new Set(initialEmployeeRequests.map((request) => request.position))];
const statuses: RequestStatus[] = ["รอตรวจสอบ", "รอแก้ไข", "อนุมัติแล้ว", "ปฏิเสธแล้ว"];
const pageSize = 5;

function SearchIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></svg>;
}

function DocumentIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h8" /></svg>;
}

export default function EmployeeRequestsPage() {
  const [requests, setRequests] = useState(initialEmployeeRequests);
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState("ทั้งหมด");
  const [position, setPosition] = useState("ทั้งหมด");
  const [status, setStatus] = useState("ทั้งหมด");
  const [page, setPage] = useState(1);
  const [selectedRequest, setSelectedRequest] = useState<EmployeeRequest | null>(null);
  const [notice, setNotice] = useState("");
  const [noticeIsError, setNoticeIsError] = useState(false);

  useEffect(() => {
    try {
      setRequests(applyEmployeeRequestStatuses(readEmployeeRequestStatuses()));
    } catch {
      setNoticeIsError(true);
      setNotice("ไม่สามารถโหลดสถานะคำขอเพิ่มพนักงานที่บันทึกไว้ได้");
    }
  }, []);

  const filteredRequests = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return requests.filter((request) =>
      (!normalizedQuery || [
        request.requestNumber,
        request.employeeName,
      ].some((value) => value.toLocaleLowerCase().includes(normalizedQuery))) &&
      (department === "ทั้งหมด" || request.department === department) &&
      (position === "ทั้งหมด" || request.position === position) &&
      (status === "ทั้งหมด" || request.status === status),
    );
  }, [department, position, query, requests, status]);

  const pageCount = Math.max(1, Math.ceil(filteredRequests.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageRequests = filteredRequests.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  function resetFilters() {
    setQuery("");
    setDepartment("ทั้งหมด");
    setPosition("ทั้งหมด");
    setStatus("ทั้งหมด");
    setPage(1);
  }

  return (
    <div className="app-shell">
      <div className="app-main employee-management-main">
        <div className="page-content person-requests-content">
          <nav className="breadcrumbs" aria-label="เส้นทางนำทาง">
            <Link href="/hr/employees">จัดการพนักงานและสิทธิ์</Link>
            <span className="breadcrumb-separator" aria-hidden="true">&gt;</span>
            <span aria-current="page">ติดตามคำขอเพิ่มพนักงาน</span>
          </nav>
          <div className="person-requests-heading">
            <h1>ติดตามคำขอเพิ่มพนักงาน</h1>
            <span className="result-count">{filteredRequests.length} รายการ</span>
            <Link href="/hr/employees" className="person-requests-back-button">
              <span aria-hidden="true">←</span> ย้อนกลับ
            </Link>
          </div>

          <section className="person-requests-panel" aria-label="รายการคำขอเพิ่มพนักงาน">
            <div className="person-request-filters">
              <label className="person-request-search">
                <span>ค้นหา</span>
                <div className="person-request-search-input">
                  <SearchIcon />
                  <input
                    value={query}
                    onChange={(event) => { setQuery(event.target.value); setPage(1); }}
                    placeholder="เลขที่คำขอ / ชื่อพนักงาน..."
                    aria-label="ค้นหาคำขอเพิ่มพนักงาน"
                  />
                </div>
              </label>
              <label>
                <span>แผนก:</span>
                <select value={department} onChange={(event) => { setDepartment(event.target.value); setPage(1); }} aria-label="กรองตามแผนก">
                  <option>ทั้งหมด</option>
                  {departments.map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
              <label>
                <span>ตำแหน่ง:</span>
                <select value={position} onChange={(event) => { setPosition(event.target.value); setPage(1); }} aria-label="กรองตามตำแหน่ง">
                  <option>ทั้งหมด</option>
                  {positions.map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
              <label>
                <span>สถานะ:</span>
                <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} aria-label="กรองตามสถานะ">
                  <option>ทั้งหมด</option>
                  {statuses.map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
              <button type="button" className="person-request-reset" onClick={resetFilters}>ล้างตัวกรอง</button>
            </div>

            <div className="person-requests-table-wrap">
              <table className="person-requests-table employee-requests-table">
                <thead>
                  <tr>
                    <th scope="col">เลขที่คำขอ</th>
                    <th scope="col">ชื่อพนักงานใหม่</th>
                    <th scope="col">แผนก</th>
                    <th scope="col">ตำแหน่ง</th>
                    <th scope="col">วันที่ยื่นคำขอ</th>
                    <th scope="col">เอกสาร</th>
                    <th scope="col">สถานะ</th>
                    <th scope="col" aria-label="รายละเอียด" />
                  </tr>
                </thead>
                <tbody>
                  {pageRequests.map((request) => (
                    <tr key={request.requestNumber}>
                      <td data-label="เลขที่คำขอ" className="person-request-number">{request.requestNumber}</td>
                      <td data-label="ชื่อพนักงานใหม่">{request.employeeName}</td>
                      <td data-label="แผนก">{request.department}</td>
                      <td data-label="ตำแหน่ง">{request.position}</td>
                      <td data-label="วันที่ยื่นคำขอ"><time>{request.submittedAt}</time></td>
                      <td data-label="เอกสาร">
                        <button type="button" className="person-request-documents" onClick={() => setSelectedRequest(request)} aria-label={`ดูเอกสาร ${request.requestNumber}`}>
                          <DocumentIcon /> {request.documents.length} รายการ
                        </button>
                      </td>
                      <td data-label="สถานะ"><span className={`person-request-status ${request.status === "รอแก้ไข" ? "revision" : request.status === "อนุมัติแล้ว" ? "approved" : request.status === "ปฏิเสธแล้ว" ? "rejected" : "pending"}`}>{request.status}</span></td>
                      <td data-label="รายละเอียด">
                        <button type="button" className="person-request-details" onClick={() => setSelectedRequest(request)}>ดูรายละเอียด</button>
                      </td>
                    </tr>
                  ))}
                  {!pageRequests.length ? <tr><td className="person-request-empty" colSpan={8}>ไม่พบคำขอที่ตรงกับตัวกรอง</td></tr> : null}
                </tbody>
              </table>
            </div>

            <footer className="person-requests-footer">
              <span>
                {filteredRequests.length === 0
                  ? "ไม่พบรายการ"
                  : `แสดง ${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, filteredRequests.length)} จาก ${filteredRequests.length} รายการ`}
              </span>
              <nav className="pagination" aria-label="เปลี่ยนหน้าคำขอ">
                <button type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} aria-label="หน้าก่อนหน้า">‹‹</button>
                {Array.from({ length: pageCount }, (_, index) => index + 1).map((pageNumber) => (
                  <button
                    type="button"
                    key={pageNumber}
                    className={pageNumber === currentPage ? "current-page" : ""}
                    aria-current={pageNumber === currentPage ? "page" : undefined}
                    onClick={() => setPage(pageNumber)}
                  >{pageNumber}</button>
                ))}
                <button type="button" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)} aria-label="หน้าถัดไป">››</button>
              </nav>
            </footer>
          </section>
        </div>
      </div>

      {selectedRequest ? (
        <div className="decision-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedRequest(null); }}>
          <section className="person-request-dialog" role="dialog" aria-modal="true" aria-labelledby="person-request-dialog-title">
            <button type="button" className="decision-close" onClick={() => setSelectedRequest(null)} aria-label="ปิดหน้าต่าง">×</button>
            <span className={`person-request-status ${selectedRequest.status === "รอแก้ไข" ? "revision" : selectedRequest.status === "อนุมัติแล้ว" ? "approved" : selectedRequest.status === "ปฏิเสธแล้ว" ? "rejected" : "pending"}`}>{selectedRequest.status}</span>
            <h2 id="person-request-dialog-title">รายละเอียดคำขอเพิ่มพนักงาน {selectedRequest.requestNumber}</h2>
            <dl className="person-request-detail-grid">
              <div><dt>ชื่อพนักงานใหม่</dt><dd>{selectedRequest.employeeName}</dd></div>
              <div><dt>แผนก</dt><dd>{selectedRequest.department}</dd></div>
              <div><dt>ตำแหน่ง</dt><dd>{selectedRequest.position}</dd></div>
              <div><dt>วันที่ยื่นคำขอ</dt><dd>{selectedRequest.submittedAt}</dd></div>
              <div><dt>อัปเดตล่าสุด</dt><dd>{selectedRequest.updatedAt}</dd></div>
              <div className="person-request-detail-wide"><dt>เอกสารแนบ</dt><dd>{selectedRequest.documents.join(" · ")}</dd></div>
              <div className="person-request-detail-wide"><dt>หมายเหตุสถานะ</dt><dd>{selectedRequest.statusNote}</dd></div>
            </dl>
            <div className="person-request-dialog-actions">
              <button type="button" className="button button-secondary" onClick={() => setSelectedRequest(null)}>ปิด</button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
