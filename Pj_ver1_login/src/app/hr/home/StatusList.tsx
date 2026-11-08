"use client";

import { useMemo, useState } from "react";
import type { HrEmployee } from "@/lib/hr/employees";
import { StatusTabs } from "../StatusTabs";

/** แถวคำขอที่ดำเนินการแล้ว (อนุมัติ / ปฏิเสธ / ส่งกลับ) ในรูปแบบเดียวกันทั้ง 3 หน้า */
export type StatusRow = {
  requestId: string;
  itemType: "benefit" | "edit";
  employeeCode: string;
  /** ชื่อสำรองเมื่อหาพนักงานรหัสนี้ในฐานข้อมูลไม่เจอ */
  fallbackName: string;
  benefit: string;
  amount: number;
  /** วันที่ดำเนินการ (ข้อความพร้อมแสดง) */
  date: string;
  /** เหตุผลที่ปฏิเสธ / สิ่งที่ต้องแก้ไข */
  note?: string;
};

type Kind = "approved" | "rejected" | "revision";

const COPY: Record<Kind, { title: string; dateLabel: string; noteLabel?: string; empty: string }> = {
  approved: { title: "คำขอที่อนุมัติแล้ว", dateLabel: "วันที่อนุมัติ", empty: "ยังไม่มีคำขอที่อนุมัติ" },
  rejected: { title: "คำขอที่ปฏิเสธแล้ว", dateLabel: "วันที่ปฏิเสธ", noteLabel: "เหตุผลที่ปฏิเสธ", empty: "ยังไม่มีคำขอที่ปฏิเสธ" },
  revision: { title: "คำขอที่รอพนักงานแก้ไข", dateLabel: "วันที่ส่งกลับ", noteLabel: "สิ่งที่ต้องแก้ไข", empty: "ไม่มีคำขอที่รอแก้ไข" },
};

const ALL = "ทั้งหมด";
const PAGE_SIZE = 20;
const baht = new Intl.NumberFormat("th-TH");

function SearchIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></svg>;
}

export function StatusList({ kind, rows, employees }: { kind: Kind; rows: StatusRow[]; employees: HrEmployee[] | null }) {
  const copy = COPY[kind];
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState(ALL);
  const [itemType, setItemType] = useState(ALL);
  const [page, setPage] = useState(1);

  const joined = useMemo(() => {
    const byCode = new Map((employees ?? []).map((employee) => [employee.code, employee]));
    return rows.map((row) => {
      const employee = byCode.get(row.employeeCode) ?? null;
      return { ...row, employee, name: employee?.name ?? row.fallbackName };
    });
  }, [employees, rows]);

  const departments = useMemo(
    () => Array.from(new Set(joined.map((row) => row.employee?.department).filter((name): name is string => Boolean(name)))).sort((a, b) => a.localeCompare(b, "th")),
    [joined],
  );

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return joined.filter((row) => {
      const matchesQuery =
        !normalizedQuery ||
        `${row.requestId} ${row.employeeCode} ${row.name} ${row.benefit} ${row.note ?? ""}`.toLocaleLowerCase().includes(normalizedQuery);
      return (
        matchesQuery &&
        (department === ALL || row.employee?.department === department) &&
        (itemType === ALL || row.itemType === itemType)
      );
    });
  }, [department, itemType, joined, query]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const filtersActive = query !== "" || department !== ALL || itemType !== ALL;
  const columnCount = copy.noteLabel ? 5 : 4;

  function resetFilters() {
    setQuery("");
    setDepartment(ALL);
    setItemType(ALL);
    setPage(1);
  }

  return (
    <div className="page-content queue-page">
      <header className="queue-heading">
        <h1>{copy.title}</h1>
      </header>

      <StatusTabs active={kind} />

      {employees === null ? (
        <p className="queue-alert" role="alert">โหลดข้อมูลพนักงานไม่สำเร็จ จึงแสดงชื่อจากคำขอแทน กรุณารีเฟรชหน้าอีกครั้ง</p>
      ) : null}

      <section className="queue-sheet" aria-label={copy.title}>
        <div className="queue-filters">
          <label className="queue-search">
            <span className="sr-only">ค้นหาคำขอ</span>
            <SearchIcon />
            <input
              value={query}
              onChange={(event) => { setQuery(event.target.value); setPage(1); }}
              placeholder="ค้นหาชื่อ รหัสพนักงาน หรือเลขที่คำขอ"
            />
          </label>
          <label className="queue-select">
            <span>แผนก</span>
            <select value={department} onChange={(event) => { setDepartment(event.target.value); setPage(1); }}>
              <option>{ALL}</option>
              {departments.map((name) => <option key={name}>{name}</option>)}
            </select>
          </label>
          <label className="queue-select">
            <span>ประเภทคำขอ</span>
            <select value={itemType} onChange={(event) => { setItemType(event.target.value); setPage(1); }}>
              <option value={ALL}>{ALL}</option>
              <option value="benefit">เบิกสวัสดิการ</option>
              <option value="edit">แก้ไขข้อมูล</option>
            </select>
          </label>
          {filtersActive ? (
            <button type="button" className="queue-link-button" onClick={resetFilters}>ล้างตัวกรอง</button>
          ) : null}
        </div>

        <div className="queue-table-scroll">
          <table className="queue-table">
            <thead>
              <tr>
                <th scope="col">พนักงาน</th>
                <th scope="col">คำขอ</th>
                <th scope="col" className="queue-num">ยอดเบิก</th>
                {copy.noteLabel ? <th scope="col">{copy.noteLabel}</th> : null}
                <th scope="col">{copy.dateLabel}</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row) => (
                <tr key={row.requestId}>
                  <td>
                    <span className="queue-name">{row.name}</span>
                    <span className="queue-meta">
                      {row.employeeCode}
                      {row.employee?.department ? ` · ${row.employee.department}` : ""}
                    </span>
                    {row.employee && row.employee.status !== "ACTIVE" ? (
                      <span className={`employment-status ${row.employee.status.toLowerCase()}`}>{row.employee.statusLabel}</span>
                    ) : null}
                  </td>
                  <td>
                    <span className="queue-item">{row.itemType === "edit" ? "แก้ไขข้อมูล" : row.benefit}</span>
                    <span className="queue-meta">{row.itemType === "edit" ? `${row.requestId} · ${row.benefit}` : `${row.requestId} · เบิกสวัสดิการ`}</span>
                  </td>
                  <td className="queue-num">
                    {row.itemType === "benefit" ? <span className="queue-amount">{baht.format(row.amount)} บาท</span> : <span className="queue-meta">ไม่มียอดเงิน</span>}
                  </td>
                  {copy.noteLabel ? <td className="queue-note">{row.note}</td> : null}
                  <td className="queue-date-cell">{row.date}</td>
                </tr>
              ))}
              {pageRows.length === 0 ? (
                <tr>
                  <td className="queue-empty" colSpan={columnCount}>{joined.length === 0 ? copy.empty : "ไม่พบคำขอที่ตรงกับตัวกรอง"}</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <footer className="queue-footer queue-footer-paged">
          <span>
            {filtered.length === 0
              ? "ไม่พบรายการ"
              : `แสดง ${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, filtered.length)} จาก ${filtered.length} รายการ`}
          </span>
          {pageCount > 1 ? (
            <nav className="queue-pager" aria-label="เปลี่ยนหน้ารายการ">
              <button type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>ก่อนหน้า</button>
              <span aria-live="polite">หน้า {currentPage} จาก {pageCount}</span>
              <button type="button" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}>ถัดไป</button>
            </nav>
          ) : null}
        </footer>
      </section>
    </div>
  );
}
