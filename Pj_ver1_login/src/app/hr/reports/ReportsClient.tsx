"use client";

import { useMemo, useState } from "react";
import { Download, RotateCcw } from "lucide-react";
import { downloadCsv } from "@/lib/csv";

export type ReportRequest = {
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

type StatusFilter = "ทั้งหมด" | ReportRequest["status"];
type PageItem = number | "start-ellipsis" | "end-ellipsis";

const statuses: ReportRequest["status"][] = ["อนุมัติแล้ว", "รอตรวจสอบ", "ปฏิเสธแล้ว"];
const pageSize = 10;

function formatCurrency(value: number) {
  return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 0 }).format(value);
}

function formatDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return "-";
  return new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeZone: "UTC" })
    .format(new Date(Date.UTC(year, month - 1, day)));
}

function getPageItems(current: number, total: number): PageItem[] {
  if (total <= 5) return Array.from({ length: total }, (_, index) => index + 1);
  if (current <= 3) return [1, 2, 3, 4, "end-ellipsis", total];
  if (current >= total - 2) return [1, "start-ellipsis", total - 3, total - 2, total - 1, total];
  return [1, "start-ellipsis", current - 1, current, current + 1, "end-ellipsis", total];
}

function csvText(value: string) {
  return /^[\t\r\n ]*[=+\-@]/.test(value) ? `'${value}` : value;
}

export default function ReportsClient({ requests }: { requests: ReportRequest[] }) {
  const thisYear = new Date().getFullYear();
  const initialStartDate = `${thisYear}-01-01`;
  const initialEndDate = `${thisYear}-12-31`;
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("ทั้งหมด");
  const [benefit, setBenefit] = useState("ทั้งหมด");
  const [status, setStatus] = useState<StatusFilter>("ทั้งหมด");
  const [page, setPage] = useState(1);

  const benefitTypes = useMemo(() => [...new Set(requests.map((request) => request.benefit))].sort(), [requests]);
  const departments = useMemo(() => [...new Set(requests.map((request) => request.department))].sort(), [requests]);
  const normalizedSearch = search.trim().toLocaleLowerCase("th-TH");
  const filteredRequests = useMemo(() => requests.filter((request) => {
    const searchableText = [
      request.requestNumber,
      request.documentNumber,
      request.id,
      request.name,
      request.department,
      request.benefit,
    ].join(" ").toLocaleLowerCase("th-TH");

    return (!startDate || request.date >= startDate) &&
      (!endDate || request.date <= endDate) &&
      (!normalizedSearch || searchableText.includes(normalizedSearch)) &&
      (department === "ทั้งหมด" || request.department === department) &&
      (benefit === "ทั้งหมด" || request.benefit === benefit) &&
      (status === "ทั้งหมด" || request.status === status);
  }).sort((a, b) => b.date.localeCompare(a.date) || b.requestNumber.localeCompare(a.requestNumber)), [benefit, department, endDate, normalizedSearch, requests, startDate, status]);

  const summary = useMemo(() => filteredRequests.reduce((totals, request) => {
    if (request.status === "อนุมัติแล้ว") {
      totals.approved += 1;
      totals.approvedAmount += request.amount;
    } else if (request.status === "รอตรวจสอบ") {
      totals.pending += 1;
    } else {
      totals.rejected += 1;
    }
    return totals;
  }, { approved: 0, pending: 0, rejected: 0, approvedAmount: 0 }), [filteredRequests]);

  const categoryStats = useMemo(() => {
    const counts = new Map<string, number>();
    filteredRequests.forEach((request) => counts.set(request.benefit, (counts.get(request.benefit) ?? 0) + 1));
    const total = filteredRequests.length;
    return [...counts.entries()]
      .map(([name, count]) => ({ name, count, percent: total ? Math.round((count / total) * 100) : 0 }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "th"));
  }, [filteredRequests]);

  const pageCount = Math.max(1, Math.ceil(filteredRequests.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageRequests = filteredRequests.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const pageItems = getPageItems(currentPage, pageCount);
  const hasActiveFilters = Boolean(
    search || department !== "ทั้งหมด" || benefit !== "ทั้งหมด" || status !== "ทั้งหมด" ||
    startDate !== initialStartDate || endDate !== initialEndDate,
  );

  function changeFilter<T>(setter: (value: T) => void, value: T) {
    setter(value);
    setPage(1);
  }

  function clearFilters() {
    setSearch("");
    setStartDate(initialStartDate);
    setEndDate(initialEndDate);
    setDepartment("ทั้งหมด");
    setBenefit("ทั้งหมด");
    setStatus("ทั้งหมด");
    setPage(1);
  }

  function exportReport() {
    downloadCsv(
      `welfare-report-${startDate || "all"}-${endDate || "all"}.csv`,
      ["รหัสพนักงาน", "ชื่อ-นามสกุล", "แผนก", "สวัสดิการ", "เลขที่คำขอ", "เลขที่เอกสาร", "วันที่", "สถานะ", "ยอดเบิก (บาท)"],
      filteredRequests.map((request) => [
        csvText(request.id),
        csvText(request.name),
        csvText(request.department),
        csvText(request.benefit),
        csvText(request.requestNumber),
        csvText(request.documentNumber),
        request.date,
        request.status,
        request.amount,
      ]),
    );
  }

  return (
    <div className="page-content reports-content">
      <header className="reports-heading">
        <div>
          <h1>รายงานและสถิติ</h1>
          <p>ภาพรวมคำขอสวัสดิการ พร้อมค้นหา กรอง และส่งออกข้อมูลตามช่วงเวลาที่ต้องการ</p>
        </div>
        <button type="button" className="report-export-button" onClick={exportReport} disabled={!filteredRequests.length}>
          <Download aria-hidden="true" size={17} />
          <span>ส่งออก CSV</span>
        </button>
      </header>

      <section className="reports-filters" aria-label="ตัวกรองรายงาน">
        <label className="report-search-field">
          <span>ค้นหาข้อมูล</span>
          <input
            type="search"
            value={search}
            onChange={(event) => changeFilter(setSearch, event.target.value)}
            placeholder="ชื่อพนักงาน รหัส เลขที่คำขอ หรือสวัสดิการ"
            aria-label="ค้นหาชื่อพนักงาน รหัส เลขที่คำขอ เลขที่เอกสาร หรือสวัสดิการ"
          />
        </label>
        <label className="report-date-range">
          <span>ช่วงวันที่ยื่นคำขอ</span>
          <div className="report-date-inputs">
            <input type="date" value={startDate} max={endDate || undefined} onChange={(event) => changeFilter(setStartDate, event.target.value)} aria-label="วันที่เริ่มต้น" />
            <span aria-hidden="true">ถึง</span>
            <input type="date" value={endDate} min={startDate || undefined} onChange={(event) => changeFilter(setEndDate, event.target.value)} aria-label="วันที่สิ้นสุด" />
          </div>
        </label>
        <label className="report-filter-field">
          <span>แผนก</span>
          <select value={department} onChange={(event) => changeFilter(setDepartment, event.target.value)} aria-label="กรองตามแผนก">
            <option>ทั้งหมด</option>
            {departments.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <label className="report-filter-field">
          <span>ประเภทสวัสดิการ</span>
          <select value={benefit} onChange={(event) => changeFilter(setBenefit, event.target.value)} aria-label="กรองตามประเภทสวัสดิการ">
            <option>ทั้งหมด</option>
            {benefitTypes.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <label className="report-filter-field">
          <span>สถานะ</span>
          <select value={status} onChange={(event) => changeFilter(setStatus, event.target.value === "ทั้งหมด" ? "ทั้งหมด" : statuses.find((item) => item === event.target.value) ?? "ทั้งหมด")} aria-label="กรองตามสถานะ">
            <option>ทั้งหมด</option>
            {statuses.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <button type="button" className="report-reset-button" onClick={clearFilters} disabled={!hasActiveFilters}>
          <RotateCcw aria-hidden="true" size={15} />
          ล้างตัวกรอง
        </button>
      </section>

      <section className="report-metrics" aria-label="สรุปผลตามตัวกรอง">
        <div className="report-metric">
          <span>รายการทั้งหมด</span>
          <strong>{filteredRequests.length.toLocaleString("th-TH")}</strong>
        </div>
        <div className="report-metric">
          <span>อนุมัติแล้ว</span>
          <strong>{summary.approved.toLocaleString("th-TH")}</strong>
        </div>
        <div className="report-metric">
          <span>รอตรวจสอบ</span>
          <strong>{summary.pending.toLocaleString("th-TH")}</strong>
        </div>
        <div className="report-metric">
          <span>ปฏิเสธแล้ว</span>
          <strong>{summary.rejected.toLocaleString("th-TH")}</strong>
        </div>
        <div className="report-metric report-metric-amount">
          <span>ยอดอนุมัติ</span>
          <strong>{formatCurrency(summary.approvedAmount)} <small>บาท</small></strong>
        </div>
      </section>

      <section className="report-chart-card" aria-labelledby="report-chart-title">
        <div className="report-section-heading">
          <div>
            <h2 id="report-chart-title">สัดส่วนคำขอตามประเภทสวัสดิการ</h2>
            <p>คำนวณจาก {filteredRequests.length.toLocaleString("th-TH")} รายการที่ตรงกับตัวกรอง</p>
          </div>
        </div>
        {categoryStats.length ? (
          <div className="report-chart-grid">
            {categoryStats.map((item) => (
              <div className="report-chart-item" key={item.name}>
                <div className="report-chart-label">
                  <span>{item.name}</span>
                  <span>{item.count.toLocaleString("th-TH")} รายการ · {item.percent}%</span>
                </div>
                <div className="report-bar-track" role="progressbar" aria-label={`สัดส่วน ${item.name}`} aria-valuenow={item.percent} aria-valuemin={0} aria-valuemax={100}>
                  <span style={{ width: `${item.percent}%` }} />
                </div>
              </div>
            ))}
          </div>
        ) : <p className="report-chart-empty">ไม่มีข้อมูลในช่วงเวลาที่เลือก ลองปรับตัวกรองหรือช่วงวันที่</p>}
      </section>

      <section className="report-summary" aria-labelledby="report-summary-title">
        <div className="report-table-heading">
          <div>
            <h2 id="report-summary-title">รายการคำขอสวัสดิการ</h2>
            <p>แสดงรายการที่ตรงกับเงื่อนไขทั้งหมด เรียงตามวันที่ล่าสุด</p>
          </div>
          <span className="report-result-count">{filteredRequests.length.toLocaleString("th-TH")} รายการ</span>
        </div>
        <div className="report-table-card">
          <div className="report-table-wrap">
            <table className="report-table">
              <thead>
                <tr>
                  <th scope="col">พนักงาน</th>
                  <th scope="col">แผนก</th>
                  <th scope="col">สวัสดิการ</th>
                  <th scope="col">เลขที่คำขอ / เอกสาร</th>
                  <th scope="col">วันที่ยื่น</th>
                  <th scope="col">สถานะ</th>
                  <th scope="col">ยอดเบิก</th>
                </tr>
              </thead>
              <tbody>
                {pageRequests.map((request) => (
                  <tr key={request.requestNumber}>
                    <td data-label="พนักงาน" className="report-employee-cell">
                      <strong>{request.name}</strong>
                      <span>{request.id}</span>
                    </td>
                    <td data-label="แผนก">{request.department}</td>
                    <td data-label="สวัสดิการ">{request.benefit}</td>
                    <td data-label="เลขที่คำขอ / เอกสาร" className="report-reference-cell">
                      <strong>{request.requestNumber}</strong>
                      <span>เอกสาร {request.documentNumber}</span>
                    </td>
                    <td data-label="วันที่ยื่น"><time dateTime={request.date}>{formatDate(request.date)}</time></td>
                    <td data-label="สถานะ">
                      <span className={`report-status report-status-${request.status === "อนุมัติแล้ว" ? "approved" : request.status === "รอตรวจสอบ" ? "pending" : "rejected"}`}>
                        {request.status}
                      </span>
                    </td>
                    <td data-label="ยอดเบิก" className="report-amount">{formatCurrency(request.amount)} <span>บาท</span></td>
                  </tr>
                ))}
                {!pageRequests.length ? (
                  <tr><td className="report-empty" colSpan={7}>ไม่พบรายการที่ตรงกับตัวกรอง ลองปรับคำค้นหาหรือช่วงวันที่</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
        <footer className="report-pagination">
          <span>
            {filteredRequests.length
              ? `แสดง ${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, filteredRequests.length)} จาก ${filteredRequests.length.toLocaleString("th-TH")} รายการ`
              : "ไม่มีรายการให้แสดง"}
          </span>
          <nav className="pagination" aria-label="เปลี่ยนหน้ารายงาน">
            <button type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} aria-label="หน้าก่อนหน้า">‹</button>
            {pageItems.map((item) => typeof item === "number" ? (
              <button
                type="button"
                key={item}
                className={item === currentPage ? "current-page" : ""}
                aria-current={item === currentPage ? "page" : undefined}
                onClick={() => setPage(item)}
              >{item}</button>
            ) : <span className="report-page-ellipsis" key={item} aria-hidden="true">…</span>)}
            <button type="button" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)} aria-label="หน้าถัดไป">›</button>
          </nav>
        </footer>
      </section>
    </div>
  );
}
