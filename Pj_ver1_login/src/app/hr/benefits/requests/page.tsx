"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type RequestStatus = "รออนุมัติ" | "อนุมัติแล้ว" | "ปฏิเสธแล้ว" | "รอแก้ไข";

type BenefitRequest = {
  requestNumber: string;
  employeeId: string;
  employeeName: string;
  department: string;
  position: string;
  benefitType: string;
  amount: number;
  details: string;
  submittedAt: string;
  updatedAt: string;
  status: RequestStatus;
  statusNote: string;
  documents: string[];
};

const requests: BenefitRequest[] = [
  {
    requestNumber: "WF-2569-014",
    employeeId: "0124",
    employeeName: "นายสมชาย ใจดี",
    department: "IT",
    position: "Developer",
    benefitType: "ค่ารักษาพยาบาล",
    amount: 10000,
    details: "ขอเพิ่มสิทธิ์ค่ารักษาพยาบาลสำหรับปี 2569 พร้อมปรับวงเงินตามระดับตำแหน่ง",
    submittedAt: "04 พ.ย. 2569 09:14",
    updatedAt: "04 พ.ย. 2569 09:14",
    status: "รออนุมัติ",
    statusNote: "คำขอใหม่ รอผู้ดูแลตรวจสอบ",
    documents: ["ใบเสนอแผนประกันกลุ่ม", "ตารางวงเงินค่ารักษาพยาบาล"],
  },
  {
    requestNumber: "WF-2569-011",
    employeeId: "0352",
    employeeName: "น.ส.สมหญิง รักดี",
    department: "Marketing",
    position: "Marketing Officer",
    benefitType: "ค่าทันตกรรม",
    amount: 12000,
    details: "ขอปรับวงเงินทันตกรรมประจำปีจาก 3,000 บาท เป็น 12,000 บาทต่อคน",
    submittedAt: "03 พ.ย. 2569 16:42",
    updatedAt: "04 พ.ย. 2569 10:30",
    status: "รออนุมัติ",
    statusNote: "อยู่ระหว่างตรวจสอบงบประมาณประจำปี",
    documents: ["ใบเสนอราคาคลินิกคู่สัญญา", "ประมาณการผู้ใช้สิทธิ์"],
  },
  {
    requestNumber: "WF-2569-006",
    employeeId: "0411",
    employeeName: "นายมานะ มุ่งมั่น",
    department: "Sales",
    position: "Sales Executive",
    benefitType: "ค่ารักษาพยาบาล",
    amount: 15000,
    details: "ขอเพิ่มวงเงินผู้ป่วยนอกและขยายรายชื่อโรงพยาบาลคู่สัญญาในภาคตะวันออก",
    submittedAt: "02 พ.ย. 2569 11:08",
    updatedAt: "03 พ.ย. 2569 10:16",
    status: "อนุมัติแล้ว",
    statusNote: "อนุมัติวงเงินและรายชื่อโรงพยาบาลตามเอกสารแนบ",
    documents: ["รายละเอียดแผนความคุ้มครอง", "รายชื่อโรงพยาบาลคู่สัญญา"],
  },
  {
    requestNumber: "WF-2569-004",
    employeeId: "0278",
    employeeName: "น.ส.ปวีณา ตั้งใจ",
    department: "HR",
    position: "HR Officer",
    benefitType: "พัฒนาตัวเอง/เรียน",
    amount: 8000,
    details: "เสนอเพิ่มงบสนับสนุนหลักสูตรอบรมวิชาชีพที่เกี่ยวข้องกับตำแหน่งงาน",
    submittedAt: "01 พ.ย. 2569 14:36",
    updatedAt: "02 พ.ย. 2569 09:25",
    status: "รอแก้ไข",
    statusNote: "กรุณาแนบรายละเอียดหลักสูตรและเงื่อนไขการเบิกให้ครบถ้วน",
    documents: ["แบบเสนอปรับปรุงสวัสดิการ"],
  },
  {
    requestNumber: "WF-2569-002",
    employeeId: "0506",
    employeeName: "นายธนกร ก้าวหน้า",
    department: "Finance",
    position: "Accountant",
    benefitType: "ค่าอุปกรณ์ทำงาน",
    amount: 6000,
    details: "ขอเพิ่มสิทธิ์เบิกอุปกรณ์ทำงานสำหรับพนักงานที่ทำงานแบบ Hybrid",
    submittedAt: "31 ต.ค. 2569 10:02",
    updatedAt: "01 พ.ย. 2569 15:10",
    status: "ปฏิเสธแล้ว",
    statusNote: "งบประมาณปีปัจจุบันได้รับการจัดสรรเต็มจำนวนแล้ว",
    documents: ["รายการอุปกรณ์และราคา", "เหตุผลประกอบคำขอ"],
  },
];

const benefitTypes = [...new Set(requests.map((request) => request.benefitType))];
const statuses: RequestStatus[] = ["รออนุมัติ", "รอแก้ไข", "อนุมัติแล้ว", "ปฏิเสธแล้ว"];
const pageSize = 5;

function SearchIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></svg>;
}

function DocumentIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h8" /></svg>;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("th-TH").format(value);
}

function statusClass(status: RequestStatus) {
  if (status === "รอแก้ไข") return "revision";
  if (status === "อนุมัติแล้ว") return "approved";
  if (status === "ปฏิเสธแล้ว") return "rejected";
  return "pending";
}

export default function BenefitRequestsPage() {
  const [query, setQuery] = useState("");
  const [benefitType, setBenefitType] = useState("ทั้งหมด");
  const [status, setStatus] = useState<RequestStatus | "ทั้งหมด">("รออนุมัติ");
  const [page, setPage] = useState(1);
  const [selectedRequest, setSelectedRequest] = useState<BenefitRequest | null>(null);

  const filteredRequests = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return requests.filter((request) =>
      (!normalizedQuery || [
        request.requestNumber,
        request.employeeId,
        request.employeeName,
        request.benefitType,
        request.details,
      ].some((value) => value.toLocaleLowerCase().includes(normalizedQuery))) &&
      (benefitType === "ทั้งหมด" || request.benefitType === benefitType) &&
      (status === "ทั้งหมด" || request.status === status),
    );
  }, [benefitType, query, status]);

  const pageCount = Math.max(1, Math.ceil(filteredRequests.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageRequests = filteredRequests.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  function resetFilters() {
    setQuery("");
    setBenefitType("ทั้งหมด");
    setStatus("ทั้งหมด");
    setPage(1);
  }

  return (
    <div className="app-shell">
      <div className="app-main employee-management-main">
        <div className="page-content person-requests-content benefit-requests-content">
          <nav className="breadcrumbs" aria-label="เส้นทางนำทาง">
            <Link href="/hr/benefits">จัดการสวัสดิการ</Link>
            <span className="breadcrumb-separator" aria-hidden="true">&gt;</span>
            <span aria-current="page">ติดตามคำขอเพิ่มสวัสดิการ</span>
          </nav>
          <div className="person-requests-heading">
            <h1>ติดตามคำขอเพิ่มสวัสดิการ</h1>
            <span className="result-count">{filteredRequests.length} รายการ</span>
            <Link href="/hr/benefits" className="person-requests-back-button">
              <span aria-hidden="true">←</span> ย้อนกลับ
            </Link>
          </div>

          <section className="person-requests-panel" aria-label="รายการคำขอเพิ่มสวัสดิการ">
            <div className="benefit-request-filters">
              <label className="person-request-search">
                <span>ค้นหา</span>
                <div className="person-request-search-input">
                  <SearchIcon />
                  <input
                    value={query}
                    onChange={(event) => { setQuery(event.target.value); setPage(1); }}
                    placeholder="เลขที่คำขอ / รหัสพนักงาน / รายละเอียด..."
                    aria-label="ค้นหาคำขอเพิ่มสวัสดิการ"
                  />
                </div>
              </label>
              <label>
                <span>ประเภทสวัสดิการ:</span>
                <select value={benefitType} onChange={(event) => { setBenefitType(event.target.value); setPage(1); }} aria-label="กรองตามประเภทสวัสดิการ">
                  <option>ทั้งหมด</option>
                  {benefitTypes.map((type) => <option key={type}>{type}</option>)}
                </select>
              </label>
              <label>
                <span>รายการ:</span>
                <select value={status} onChange={(event) => { setStatus(event.target.value as RequestStatus | "ทั้งหมด"); setPage(1); }} aria-label="กรองตามรายการ">
                  <option value="ทั้งหมด">ทั้งหมด</option>
                  {statuses.map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
              <button type="button" className="person-request-reset" onClick={resetFilters}>ล้างตัวกรอง</button>
            </div>

            <div className="person-requests-table-wrap">
              <table className="benefit-track-table">
                <thead>
                  <tr>
                    <th scope="col">เลขที่คำขอ</th>
                    <th scope="col">ประเภท</th>
                    <th scope="col">จำนวนเงิน (บาท)</th>
                    <th scope="col">รายละเอียด</th>
                    <th scope="col">ผู้ยื่นคำขอ</th>
                    <th scope="col">วันที่ยื่นคำขอ</th>
                    <th scope="col">เอกสาร</th>
                    <th scope="col">รายการ</th>
                    <th scope="col" aria-label="รายละเอียด" />
                  </tr>
                </thead>
                <tbody>
                  {pageRequests.map((request) => (
                    <tr key={request.requestNumber}>
                      <td data-label="เลขที่คำขอ" className="person-request-number">{request.requestNumber}</td>
                      <td data-label="ประเภท"><span className="benefit-tag">{request.benefitType}</span></td>
                      <td data-label="จำนวนเงิน (บาท)" className="benefit-request-amount">{formatCurrency(request.amount)}</td>
                      <td data-label="รายละเอียด">{request.details}</td>
                      <td data-label="ผู้ยื่นคำขอ">
                        <div className="person-request-cell-value">
                          <strong>{request.employeeName}</strong>
                          <span className="person-request-secondary">{request.employeeId} · {request.department} · {request.position}</span>
                        </div>
                      </td>
                      <td data-label="วันที่ยื่นคำขอ"><time>{request.submittedAt}</time></td>
                      <td data-label="เอกสาร">
                        <button type="button" className="person-request-documents" onClick={() => setSelectedRequest(request)} aria-label={`ดูเอกสาร ${request.requestNumber}`}>
                          <DocumentIcon /> {request.documents.length} รายการ
                        </button>
                      </td>
                      <td data-label="รายการ"><span className={`person-request-status ${statusClass(request.status)}`}>{request.status}</span></td>
                      <td data-label="รายละเอียด">
                        <button type="button" className="person-request-details" onClick={() => setSelectedRequest(request)}>ดูรายละเอียด</button>
                      </td>
                    </tr>
                  ))}
                  {!pageRequests.length ? <tr><td className="person-request-empty" colSpan={9}>ไม่พบคำขอที่ตรงกับตัวกรอง</td></tr> : null}
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
          <section className="person-request-dialog" role="dialog" aria-modal="true" aria-labelledby="benefit-request-dialog-title">
            <button type="button" className="decision-close" onClick={() => setSelectedRequest(null)} aria-label="ปิดหน้าต่าง">×</button>
            <span className={`person-request-status ${statusClass(selectedRequest.status)}`}>{selectedRequest.status}</span>
            <h2 id="benefit-request-dialog-title">รายละเอียดคำขอ {selectedRequest.requestNumber}</h2>
            <dl className="person-request-detail-grid">
              <div><dt>ประเภทสวัสดิการ</dt><dd>{selectedRequest.benefitType}</dd></div>
              <div><dt>วงเงินที่เสนอ</dt><dd>{formatCurrency(selectedRequest.amount)} บาท</dd></div>
              <div><dt>ผู้ยื่นคำขอ</dt><dd>{selectedRequest.employeeName} ({selectedRequest.employeeId})</dd></div>
              <div><dt>แผนก / ตำแหน่ง</dt><dd>{selectedRequest.department} / {selectedRequest.position}</dd></div>
              <div className="person-request-detail-wide"><dt>รายละเอียดคำขอ</dt><dd>{selectedRequest.details}</dd></div>
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
