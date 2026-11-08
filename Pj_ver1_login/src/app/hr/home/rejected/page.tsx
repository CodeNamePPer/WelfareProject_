"use client";

import { useMemo, useState } from "react";
import { StatusTabs } from "../../StatusTabs";
import { rejectedRequests, employees, type RejectedRequest } from "../../sample/rejected";

const pageSize = 5;

function SearchIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></svg>;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("th-TH").format(value);
}

export default function RejectedRequestsPage() {
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState("ทั้งหมด");
  const [position, setPosition] = useState("ทั้งหมด");
  const [benefit, setBenefit] = useState("ทั้งหมด");
  const [itemType, setItemType] = useState("ทั้งหมด");
  const [page, setPage] = useState(1);

  const filteredRequests = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return rejectedRequests.filter((request) => {
      const matchesQuery =
        !normalizedQuery ||
        `${request.requestId} ${request.employeeId} ${request.name} ${request.department} ${request.benefit} ${request.reason}`
          .toLocaleLowerCase()
          .includes(normalizedQuery);
      return (
        matchesQuery &&
        (department === "ทั้งหมด" || request.department === department) &&
        (position === "ทั้งหมด" || request.position === position) &&
        (benefit === "ทั้งหมด" || (request.itemType === "benefit" && request.benefit === benefit)) &&
        (itemType === "ทั้งหมด" || request.itemType === itemType)
      );
    });
  }, [benefit, department, itemType, position, query]);

  const pageCount = Math.max(1, Math.ceil(filteredRequests.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageItems = filteredRequests.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  function resetFilters() {
    setQuery("");
    setDepartment("ทั้งหมด");
    setPosition("ทั้งหมด");
    setBenefit("ทั้งหมด");
    setItemType("ทั้งหมด");
    setPage(1);
  }

  return (
    <div className="app-shell">
      <div className="app-main">
        <div className="page-content dashboard-content">
          <header className="queue-heading">
            <h1>คำขอที่ปฏิเสธแล้ว</h1>
          </header>

          <StatusTabs active="rejected" />

          <section className="approval-section" aria-labelledby="rejected-title">
            <div className="approval-heading">
              <div className="approval-title-group">
                <h2 id="rejected-title">รายการปฏิเสธ</h2>
                <span className="result-count">{filteredRequests.length} รายการ</span>
              </div>
              <p>ตรวจสอบรายการสวัสดิการหรือคำขอแก้ไขข้อมูลที่ถูกปฏิเสธและเหตุผลประกอบ</p>
            </div>

            <div className="requests-panel">
              <div className="request-filters rejected-filters">
                <label className="request-search">
                  <span>ค้นหา</span>
                  <div className="filter-input search-input">
                    <SearchIcon />
                    <input
                      value={query}
                      onChange={(event) => { setQuery(event.target.value); setPage(1); }}
                      placeholder="พิมพ์ชื่อ / รหัสพนักงาน..."
                      aria-label="ค้นหาคำขอที่ถูกปฏิเสธ"
                    />
                  </div>
                </label>
                <label className="filter-control">
                  <span>กรองตาม:</span>
                  <select value={department} onChange={(event) => { setDepartment(event.target.value); setPage(1); }} aria-label="กรองตามแผนก">
                    <option>ทั้งหมด</option>
                    {employees.map((employee) => <option key={employee.department}>{employee.department}</option>)}
                  </select>
                </label>
                <label className="filter-control">
                  <span>ตำแหน่ง:</span>
                  <select value={position} onChange={(event) => { setPosition(event.target.value); setPage(1); }} aria-label="กรองตามตำแหน่ง">
                    <option>ทั้งหมด</option>
                    {employees.map((employee) => <option key={employee.position}>{employee.position}</option>)}
                  </select>
                </label>
                <label className="filter-control">
                  <span>รายการ:</span>
                  <select value={itemType} onChange={(event) => { setItemType(event.target.value); setPage(1); }} aria-label="กรองตามรายการ">
                    <option value="ทั้งหมด">ทั้งหมด</option>
                    <option value="benefit">สวัสดิการ</option>
                    <option value="edit">แก้ไขข้อมูล</option>
                  </select>
                </label>
                <label className="filter-control">
                  <span>ประเภทสวัสดิการ:</span>
                  <select value={benefit} onChange={(event) => { setBenefit(event.target.value); setPage(1); }} aria-label="กรองตามประเภทสวัสดิการ">
                    <option>ทั้งหมด</option>
                    {Array.from(new Set(rejectedRequests.filter((request) => request.itemType === "benefit").map((request) => request.benefit))).map((name) => <option key={name}>{name}</option>)}
                  </select>
                </label>
                <button type="button" className="reset-filters" onClick={resetFilters}>ล้างตัวกรอง</button>
              </div>

              <div className="requests-table-scroll">
                <table className="requests-table rejected-table request-identity-table rejected-identity-table">
                  <thead>
                    <tr>
                      <th scope="col">รหัส / ชื่อ-นามสกุล</th>
                      <th scope="col">ตำแหน่ง / แผนก</th>
                      <th scope="col">รายการ</th>
                      <th scope="col">การใช้งานโควต้าปีนี้</th>
                      <th scope="col">ยอดเบิก</th>
                      <th scope="col">เหตุผลที่ปฏิเสธ</th>
                      <th scope="col">วันที่ปฏิเสธ</th>
                      <th scope="col" aria-label="เอกสาร" />
                    </tr>
                  </thead>
                  <tbody>
                    {pageItems.map((request) => {
                      const usagePercent = request.itemType === "benefit"
                        ? Math.min((request.used / request.limit) * 100, 100)
                        : 0;
                      return (
                        <tr key={request.requestId}>
                          <td className="request-employee-identity">
                            <strong>{request.employeeId}</strong>
                            <span>{request.name}</span>
                          </td>
                          <td className="request-role-department">
                            <strong>{request.position}</strong>
                            <span>{request.department}</span>
                          </td>
                          <td>
                            <span className={`benefit-tag${request.itemType === "edit" ? " request-edit-tag" : ""}`}>
                              {request.itemType === "edit" ? "แก้ไขข้อมูล" : request.benefit}
                            </span>
                            {request.itemType === "edit" ? <small className="request-item-detail">{request.benefit}</small> : null}
                          </td>
                          <td>
                            {request.itemType === "benefit" ? (
                              <div className="quota-cell">
                                <span>{formatCurrency(request.used)} / {formatCurrency(request.limit)}</span>
                                <span className="quota-track"><span style={{ width: `${usagePercent}%` }} /></span>
                              </div>
                            ) : <span className="request-not-applicable">—</span>}
                          </td>
                          <td className="amount-cell">{request.itemType === "benefit" ? `${formatCurrency(request.amount)} บ.` : "—"}</td>
                          <td className="rejection-reason">{request.reason}</td>
                          <td className="submitted-date">{request.rejectedAt}</td>
                          <td>
                            <button type="button" className="document-button" aria-label={`ดูเอกสารคำขอ ${request.requestId}`}>
                              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h8" /></svg>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {pageItems.length === 0 ? (
                      <tr><td className="empty-results" colSpan={8}>ไม่พบรายการที่ตรงกับการค้นหา</td></tr>
                    ) : null}
                  </tbody>
                </table>
              </div>

              <footer className="table-footer">
                <span>
                  {filteredRequests.length === 0
                    ? "ไม่พบรายการ"
                    : `แสดง ${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, filteredRequests.length)} จาก ${filteredRequests.length} รายการ`}
                </span>
                <nav className="pagination" aria-label="เปลี่ยนหน้ารายการ">
                  <button type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} aria-label="หน้าก่อนหน้า">‹</button>
                  {Array.from({ length: pageCount }, (_, index) => index + 1).map((pageNumber) => (
                    <button
                      type="button"
                      key={pageNumber}
                      className={pageNumber === currentPage ? "current-page" : ""}
                      aria-current={pageNumber === currentPage ? "page" : undefined}
                      onClick={() => setPage(pageNumber)}
                    >
                      {pageNumber}
                    </button>
                  ))}
                  <button type="button" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)} aria-label="หน้าถัดไป">›</button>
                </nav>
              </footer>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
