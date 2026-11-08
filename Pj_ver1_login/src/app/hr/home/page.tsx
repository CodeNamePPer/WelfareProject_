"use client";

import { useMemo, useState } from "react";
import { SummaryCards } from "../SummaryCards";
import { pendingRequests as initialRequests, type PendingRequest as Request } from "../sample/pending";

type RequestAction = "approve" | "reject" | "return";

function SearchIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></svg>;
}

function CalendarIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 11h18M8 15h.01M12 15h.01M16 15h.01M8 18h.01M12 18h.01" /></svg>;
}

/** วันนี้ตามเวลาไทย เช่น "8 พฤศจิกายน 2569" */
function todayLabel() {
  return new Date().toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Bangkok" });
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("th-TH").format(value);
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState("ทั้งหมด");
  const [position, setPosition] = useState("ทั้งหมด");
  const [benefit, setBenefit] = useState("ทั้งหมด");
  const [itemType, setItemType] = useState("ทั้งหมด");
  const [pendingRequests, setPendingRequests] = useState(initialRequests);
  const [decision, setDecision] = useState<{ request: Request; action: RequestAction } | null>(null);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState("");
  const [notice, setNotice] = useState("");

  const filteredRequests = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return pendingRequests.filter((request) => {
      const matchesQuery =
        !normalizedQuery ||
        `${request.id} ${request.name} ${request.department} ${request.benefit}`
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
  }, [benefit, department, itemType, pendingRequests, position, query]);

  function openDecision(request: Request, action: RequestAction) {
    setDecision({ request, action });
    setReason("");
    setReasonError("");
  }

  function closeDecision() {
    setDecision(null);
    setReason("");
    setReasonError("");
  }

  function confirmDecision(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!decision) return;

    if (decision.action !== "approve" && !reason.trim()) {
      setReasonError("กรุณาระบุเหตุผล");
      return;
    }

    setPendingRequests((current) => current.filter((request) => request.id !== decision.request.id));
    const actionLabel = decision.action === "approve" ? "อนุมัติ" : decision.action === "reject" ? "ปฏิเสธ" : "ส่งกลับให้แก้ไข";
    setNotice(`${actionLabel}คำขอของ ${decision.request.name} เรียบร้อยแล้ว`);
    closeDecision();
  }

  return (
    <div className="app-shell">
      <div className="app-main">
        <div className="page-content dashboard-content">
          <div className="dashboard-heading">
            <div>
              <h1>ภาพรวมวันนี้</h1>
              <p className="dashboard-date" suppressHydrationWarning><CalendarIcon /> {todayLabel()}</p>
            </div>
          </div>

          <SummaryCards active="home" pendingCount={pendingRequests.length} />

          <section className="approval-section" aria-labelledby="approval-title">
            <div className="approval-heading">
              <div className="approval-title-group">
                <h2 id="approval-title">รายการรออนุมัติ</h2>
                <span className="result-count">{filteredRequests.length} รายการ</span>
              </div>
              <p>ตรวจสอบเอกสารและจัดการคำขอสวัสดิการหรือคำขอแก้ไขข้อมูลของพนักงาน</p>
            </div>

            <div className="requests-panel">
              <div className="request-filters rejected-filters home-request-filters">
                <label className="request-search">
                  <span>ค้นหา</span>
                  <div className="filter-input search-input">
                    <SearchIcon />
                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="พิมพ์ชื่อ / รหัสพนักงาน..."
                      aria-label="ค้นหาชื่อหรือรหัสพนักงาน"
                    />
                  </div>
                </label>
                <label className="filter-control">
                  <span>แผนก:</span>
                  <select value={department} onChange={(event) => setDepartment(event.target.value)} aria-label="กรองตามแผนก">
                    <option>ทั้งหมด</option>
                    {Array.from(new Set(initialRequests.map((request) => request.department))).map((name) => (
                      <option key={name}>{name}</option>
                    ))}
                  </select>
                </label>
                <label className="filter-control">
                  <span>ตำแหน่ง:</span>
                  <select value={position} onChange={(event) => setPosition(event.target.value)} aria-label="กรองตามตำแหน่ง">
                    <option>ทั้งหมด</option>
                    {Array.from(new Set(initialRequests.map((request) => request.position))).map((role) => (
                      <option key={role}>{role}</option>
                    ))}
                  </select>
                </label>
                <label className="filter-control">
                  <span>รายการ:</span>
                  <select value={itemType} onChange={(event) => setItemType(event.target.value)} aria-label="กรองตามรายการ">
                    <option value="ทั้งหมด">ทั้งหมด</option>
                    <option value="benefit">สวัสดิการ</option>
                    <option value="edit">แก้ไขข้อมูล</option>
                  </select>
                </label>
                <label className="filter-control">
                  <span>ประเภทสวัสดิการ:</span>
                  <select value={benefit} onChange={(event) => setBenefit(event.target.value)} aria-label="กรองตามประเภทสวัสดิการ">
                    <option>ทั้งหมด</option>
                    {Array.from(new Set(initialRequests.filter((request) => request.itemType === "benefit").map((request) => request.benefit))).map((name) => (
                      <option key={name}>{name}</option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  className="reset-filters"
                  onClick={() => { setQuery(""); setDepartment("ทั้งหมด"); setPosition("ทั้งหมด"); setBenefit("ทั้งหมด"); setItemType("ทั้งหมด"); }}
                >
                  ล้างตัวกรอง
                </button>
              </div>

              <div className="requests-table-scroll request-action-scroll">
                <table className="requests-table request-action-table">
                  <thead>
                    <tr>
                      <th scope="col">รหัส / ชื่อ-นามสกุล</th>
                      <th scope="col">ตำแหน่ง / แผนก</th>
                      <th scope="col">รายการ</th>
                      <th scope="col">การใช้งานโควต้าปีนี้</th>
                      <th scope="col">ยอดเบิก</th>
                      <th scope="col">วันที่ยื่นคำขอ</th>
                      <th scope="col" aria-label="เอกสาร" />
                      <th scope="col">ดำเนินการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRequests.map((request) => {
                      const usagePercent = request.itemType === "benefit"
                        ? Math.min((request.used / request.limit) * 100, 100)
                        : 0;
                      return (
                        <tr key={request.id}>
                          <td className="home-employee-identity">
                            <strong>{request.id}</strong>
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
                          <td className="submitted-date">{request.submitted}</td>
                          <td>
                            <button type="button" className="document-button" aria-label={`ดูเอกสารคำขอของ ${request.name}`}>
                              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h8" /></svg>
                            </button>
                          </td>
                          <td>
                            <div className="request-actions">
                              <button type="button" className="request-action approve" onClick={() => openDecision(request, "approve")} aria-label={`อนุมัติคำขอ ${request.id}`}><span>อนุมัติ</span></button>
                              <button type="button" className="request-action reject" onClick={() => openDecision(request, "reject")} aria-label={`ปฏิเสธคำขอ ${request.id}`}><span>ปฏิเสธ</span></button>
                              <button type="button" className="request-action return" onClick={() => openDecision(request, "return")} aria-label={`ส่งกลับคำขอ ${request.id}`}><span>ส่งกลับ</span></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredRequests.length === 0 ? (
                      <tr><td className="empty-results" colSpan={8}>ไม่พบรายการที่ตรงกับการค้นหา</td></tr>
                    ) : null}
                  </tbody>
                </table>
              </div>

              <footer className="table-footer">
                <span>แสดง {filteredRequests.length} จาก {pendingRequests.length} รายการ</span>
                <div className="pagination">
                  <button type="button" disabled aria-label="หน้าก่อนหน้า">‹</button>
                  <button type="button" className="current-page" aria-current="page">1</button>
                  <button type="button" disabled aria-label="หน้าถัดไป">›</button>
                </div>
              </footer>
            </div>
          </section>
        </div>
      </div>
      {decision ? (
        <div
          className="decision-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeDecision();
          }}
        >
          <section className="decision-dialog" role="dialog" aria-modal="true" aria-labelledby="decision-title">
            <button type="button" className="decision-close" onClick={closeDecision} aria-label="ปิดหน้าต่าง">×</button>
            <div className={`decision-icon ${decision.action}`} aria-hidden="true">
              {decision.action === "approve" ? "✓" : decision.action === "reject" ? "!" : "↩"}
            </div>
            <h2 id="decision-title">
              {decision.action === "approve" ? "ยืนยันการอนุมัติ" : decision.action === "reject" ? "ยืนยันการปฏิเสธ" : "ส่งคำขอกลับเพื่อแก้ไข"}
            </h2>
            <p className="decision-description">
              คำขอ {decision.request.id} · {decision.request.name} · {decision.request.benefit}
            </p>
            <form onSubmit={confirmDecision}>
              {decision.action !== "approve" ? (
                <label className="decision-reason">
                  <span>{decision.action === "reject" ? "เหตุผลที่ปฏิเสธ" : "รายละเอียดที่ต้องแก้ไข"} <span className="reason-required">*</span></span>
                  <textarea
                    value={reason}
                    onChange={(event) => {
                      setReason(event.target.value);
                      if (event.target.value.trim()) setReasonError("");
                    }}
                    rows={4}
                    placeholder={decision.action === "reject" ? "ระบุเหตุผลในการปฏิเสธคำขอ..." : "ระบุข้อมูลหรือเอกสารที่ต้องแก้ไข..."}
                    aria-label={decision.action === "reject" ? "เหตุผลที่ปฏิเสธ" : "รายละเอียดที่ต้องแก้ไข"}
                    aria-invalid={Boolean(reasonError)}
                    aria-describedby={reasonError ? "decision-reason-error" : undefined}
                    required
                  />
                  {reasonError ? <small id="decision-reason-error" className="decision-error">{reasonError}</small> : null}
                </label>
              ) : (
                <p className="decision-confirm-copy">คำขอนี้จะถูกนำออกจากรายการรออนุมัติ</p>
              )}
              <div className="decision-actions">
                <button type="button" className="button button-secondary" onClick={closeDecision}>ยกเลิก</button>
                <button
                  type="submit"
                  className={`button ${decision.action === "approve" ? "decision-approve-button" : decision.action === "reject" ? "decision-reject-button" : "button-primary"}`}
                >
                  {decision.action === "approve" ? "ยืนยันอนุมัติ" : decision.action === "reject" ? "ยืนยันปฏิเสธ" : "ส่งกลับให้แก้ไข"}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
      {notice ? (
        <div className="toast" role="status">
          <span className="toast-check">✓</span>
          {notice}
          <button type="button" onClick={() => setNotice("")} aria-label="ปิดข้อความ">×</button>
        </div>
      ) : null}
    </div>
  );
}
