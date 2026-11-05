"use client";

import { useMemo, useState } from "react";

type ReportRequest = {
  id: string;
  requestNumber: string;
  documentNumber: string;
  name: string;
  department: string;
  benefit: string;
  amount: number;
  date: string;
  status: "อนุมัติแล้ว" | "รอตรวจสอบ" | "ปฏิเสธแล้ว";
};

const requests: ReportRequest[] = [
  { id: "0124", requestNumber: "REQ-2026-00124", documentNumber: "DOC-2026-00124", name: "นายสมชาย ใจดี", department: "IT", benefit: "ทันตกรรม", amount: 900, date: "2026-01-12", status: "อนุมัติแล้ว" },
  { id: "0352", requestNumber: "REQ-2026-00068", documentNumber: "DOC-2026-00068", name: "น.ส.สมหญิง รักดี", department: "Marketing", benefit: "ค่ารักษาพยาบาล", amount: 2000, date: "2026-02-18", status: "อนุมัติแล้ว" },
  { id: "0411", requestNumber: "REQ-2026-00119", documentNumber: "DOC-2026-00119", name: "นายมานะ มุ่งมั่น", department: "Sales", benefit: "พัฒนาตัวเอง", amount: 5000, date: "2026-03-04", status: "อนุมัติแล้ว" },
  { id: "0278", requestNumber: "REQ-2026-00071", documentNumber: "DOC-2026-00071", name: "น.ส.ปวีณา ตั้งใจ", department: "HR", benefit: "ตรวจสุขภาพประจำปี", amount: 3500, date: "2026-04-20", status: "อนุมัติแล้ว" },
  { id: "0506", requestNumber: "REQ-2026-00082", documentNumber: "DOC-2026-00082", name: "นายธนกร ก้าวหน้า", department: "Finance", benefit: "ค่ารักษาพยาบาล", amount: 1800, date: "2026-05-09", status: "อนุมัติแล้ว" },
  { id: "0310", requestNumber: "REQ-2026-00093", documentNumber: "DOC-2026-00093", name: "น.ส.กมลชนก สดใส", department: "IT", benefit: "ทันตกรรม", amount: 1200, date: "2026-06-11", status: "อนุมัติแล้ว" },
  { id: "0442", requestNumber: "REQ-2026-00102", documentNumber: "DOC-2026-00102", name: "นายวรพล ตั้งตรง", department: "Sales", benefit: "ค่ารักษาพยาบาล", amount: 4200, date: "2026-07-15", status: "อนุมัติแล้ว" },
  { id: "0189", requestNumber: "REQ-2026-00108", documentNumber: "DOC-2026-00108", name: "น.ส.ณัฐชา มีสุข", department: "Marketing", benefit: "พัฒนาตัวเอง", amount: 2800, date: "2026-08-03", status: "อนุมัติแล้ว" },
  { id: "0395", requestNumber: "REQ-2026-00113", documentNumber: "DOC-2026-00113", name: "นายเกรียงไกร มั่นคง", department: "Finance", benefit: "ตรวจสุขภาพประจำปี", amount: 3000, date: "2026-09-10", status: "รอตรวจสอบ" },
  { id: "0227", requestNumber: "REQ-2026-00117", documentNumber: "DOC-2026-00117", name: "น.ส.รัตนา แสงทอง", department: "HR", benefit: "ค่ารักษาพยาบาล", amount: 1500, date: "2026-10-12", status: "อนุมัติแล้ว" },
  { id: "0521", requestNumber: "REQ-2026-00121", documentNumber: "DOC-2026-00121", name: "นายชาญชัย พูนผล", department: "IT", benefit: "ทันตกรรม", amount: 700, date: "2026-11-02", status: "ปฏิเสธแล้ว" },
  { id: "0463", requestNumber: "REQ-2026-00128", documentNumber: "DOC-2026-00128", name: "น.ส.ปาริชาติ ใจเย็น", department: "Sales", benefit: "พัฒนาตัวเอง", amount: 2500, date: "2026-12-01", status: "อนุมัติแล้ว" },
];

const departments = ["IT", "Marketing", "Sales", "HR", "Finance"];
const statuses: ReportRequest["status"][] = ["อนุมัติแล้ว", "รอตรวจสอบ", "ปฏิเสธแล้ว"];
const pageSize = 3;

function formatCurrency(value: number) {
  return new Intl.NumberFormat("th-TH").format(value);
}

function formatDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeZone: "UTC" })
    .format(new Date(Date.UTC(year, month - 1, day)));
}

export default function ReportsPage() {
  const [startDate, setStartDate] = useState("2026-01-01");
  const [endDate, setEndDate] = useState("2026-12-31");
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("ทั้งหมด");
  const [benefit, setBenefit] = useState("ทั้งหมด");
  const [status, setStatus] = useState("ทั้งหมด");
  const [page, setPage] = useState(1);

  const benefitTypes = useMemo(() => [...new Set(requests.map((request) => request.benefit))], []);
  const normalizedSearch = search.trim().toLocaleLowerCase();
  const filteredRequests = useMemo(() => requests.filter((request) =>
    request.date >= startDate &&
    request.date <= endDate &&
    (!normalizedSearch || [request.requestNumber, request.documentNumber, request.id]
      .some((value) => value.toLocaleLowerCase().includes(normalizedSearch))) &&
    (department === "ทั้งหมด" || request.department === department) &&
    (benefit === "ทั้งหมด" || request.benefit === benefit) &&
    (status === "ทั้งหมด" || request.status === status),
  ), [benefit, department, endDate, normalizedSearch, startDate, status]);

  const categoryStats = useMemo(() => {
    const counts = new Map<string, number>();
    filteredRequests.forEach((request) => counts.set(request.benefit, (counts.get(request.benefit) ?? 0) + 1));
    const total = filteredRequests.length;
    return [...counts.entries()]
      .map(([name, count]) => ({ name, count, percent: total ? Math.round((count / total) * 100) : 0 }))
      .sort((a, b) => b.count - a.count);
  }, [filteredRequests]);

  const pageCount = Math.max(1, Math.ceil(filteredRequests.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageRequests = filteredRequests.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  function changeFilter<T>(setter: (value: T) => void, value: T) {
    setter(value);
    setPage(1);
  }

  return (
    <div className="app-shell">
      <div className="app-main reports-main">
        <div className="page-content reports-content">
          <h1>รายงานและสถิติ</h1>

          <section className="reports-filters" aria-label="ตัวกรองรายงาน">
            <label className="report-search-field">
              <span>ค้นหาเลขที่คำขอ / เลขที่เอกสาร / รหัส:</span>
              <input
                type="search"
                value={search}
                onChange={(event) => changeFilter(setSearch, event.target.value)}
                placeholder="พิมพ์เลขที่คำขอ เลขที่เอกสาร หรือรหัส"
                aria-label="ค้นหาจากเลขที่คำขอ เลขที่เอกสาร หรือรหัสพนักงาน"
              />
            </label>
            <label className="report-date-range">
              <span>ช่วงเวลา:</span>
              <div className="report-date-inputs">
                <input type="date" value={startDate} max={endDate} onChange={(event) => changeFilter(setStartDate, event.target.value)} aria-label="วันที่เริ่มต้น" />
                <span>ถึง:</span>
                <input type="date" value={endDate} min={startDate} onChange={(event) => changeFilter(setEndDate, event.target.value)} aria-label="วันที่สิ้นสุด" />
              </div>
            </label>
            <label className="report-filter-field">
              <span>แผนก:</span>
              <select value={department} onChange={(event) => changeFilter(setDepartment, event.target.value)} aria-label="กรองตามแผนก">
                <option>ทั้งหมด</option>
                {departments.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label className="report-filter-field">
              <span>ประเภทสวัสดิการ:</span>
              <select value={benefit} onChange={(event) => changeFilter(setBenefit, event.target.value)} aria-label="กรองตามประเภทสวัสดิการ">
                <option>ทั้งหมด</option>
                {benefitTypes.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label className="report-filter-field">
              <span>สถานะ:</span>
              <select value={status} onChange={(event) => changeFilter(setStatus, event.target.value)} aria-label="กรองตามสถานะ">
                <option>ทั้งหมด</option>
                {statuses.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
          </section>

          <section className="report-chart-card" aria-labelledby="report-chart-title">
            <h2 id="report-chart-title">สัดส่วนการใช้สวัสดิการแยกตามประเภท</h2>
            <p className="report-chart-legend"><span /> สัดส่วนการใช้งาน (%)</p>
            {categoryStats.length ? (
              <div className="report-chart-grid">
                {categoryStats.map((item) => (
                  <div className="report-chart-item" key={item.name}>
                    <span>{item.name} ({item.percent}%)</span>
                    <div className="report-bar-track" role="progressbar" aria-label={`สัดส่วน ${item.name}`} aria-valuenow={item.percent} aria-valuemin={0} aria-valuemax={100}>
                      <span style={{ width: `${item.percent}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="report-chart-empty">ไม่มีข้อมูลในช่วงเวลาที่เลือก</p>}
          </section>

          <section className="report-summary" aria-labelledby="report-summary-title">
            <h2 id="report-summary-title">สรุปยอด:</h2>
            <div className="report-table-card">
              <div className="report-table-wrap">
                <table className="report-table">
                  <thead>
                    <tr>
                      <th scope="col">รหัส</th>
                      <th scope="col">ชื่อ-นามสกุล</th>
                      <th scope="col">แผนก</th>
                      <th scope="col">รายการ</th>
                      <th scope="col">เลขที่คำขอ</th>
                      <th scope="col">เลขที่เอกสาร</th>
                      <th scope="col">วันที่</th>
                      <th scope="col">ยอดเบิก</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRequests.map((request) => (
                      <tr key={request.id}>
                        <td data-label="รหัส">{request.id}</td>
                        <td data-label="ชื่อ-นามสกุล" className="report-employee-name">{request.name}</td>
                        <td data-label="แผนก">{request.department}</td>
                        <td data-label="สวัสดิการ">{request.benefit}</td>
                        <td data-label="เลขที่คำขอ">{request.requestNumber}</td>
                        <td data-label="เลขที่เอกสาร">{request.documentNumber}</td>
                        <td data-label="วันที่"><time dateTime={request.date}>{formatDate(request.date)}</time></td>
                        <td data-label="ยอดเบิก" className="report-amount">{formatCurrency(request.amount)} บ.</td>
                      </tr>
                    ))}
                    {!pageRequests.length ? (
                      <tr><td className="report-empty" colSpan={8}>ไม่มีรายการตามตัวกรองที่เลือก</td></tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
            <footer className="report-pagination">
              <span>แสดง {filteredRequests.length ? `${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, filteredRequests.length)} จาก ` : ""}{filteredRequests.length} รายการ</span>
              <nav className="pagination" aria-label="เปลี่ยนหน้ารายงาน">
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
    </div>
  );
}
