"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { HrEmployee, HrEmploymentStatus } from "@/lib/hr/employees";
import { formatThaiDate } from "@/lib/format";
import { DepartmentOptions, departmentTree, matchesDepartment } from "../departmentTree";

const ALL = "ทั้งหมด";
const PAGE_SIZE = 20;

const STATUS_OPTIONS: { value: HrEmploymentStatus; label: string }[] = [
  { value: "ACTIVE", label: "ทำงานอยู่" },
  { value: "RESIGNED", label: "ลาออก" },
  { value: "DECEASED", label: "เสียชีวิต" },
];

type Quality = typeof ALL | "complete" | "incomplete";

function SearchIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></svg>;
}

function ChevronIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg>;
}

/** ข้อมูลที่ยังขาดหรือเป็นค่าชั่วคราว ให้ HR เห็นเป็นงานที่ต้องแก้ */
function dataIssues(employee: HrEmployee): string[] {
  const issues: string[] = [];
  if (!employee.department) issues.push("ไม่ระบุแผนก");
  if (!employee.position) issues.push("ไม่ระบุตำแหน่ง");
  if (/\s-$/.test(employee.name)) issues.push("ไม่มีนามสกุล");
  if (employee.email.endsWith(".invalid")) issues.push("ไม่มีอีเมลจริง");
  return issues;
}

// ปุ่ม "แก้ไข / ประวัติ" เดิมเปิดหน้าที่บันทึกไว้ในเบราว์เซอร์เท่านั้น จึงเอาออกจนกว่าจะบันทึกลงฐานข้อมูลได้จริง
// ชื่อพนักงานลิงก์ไปหน้าโปรไฟล์ (อ่านอย่างเดียว) แทน

export function EmployeesClient({ employees, initialQuery = "" }: { employees: HrEmployee[] | null; initialQuery?: string }) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [department, setDepartment] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const [quality, setQuality] = useState<Quality>(ALL);
  const [page, setPage] = useState(1);
  const [notice, setNotice] = useState("");

  // หน้าเพิ่ม/แก้ไขพนักงานยังบันทึกไว้ในเบราว์เซอร์เท่านั้น แจ้งตามจริงแทนการแสดงว่าบันทึกสำเร็จ
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const leftovers = ["new-employee", "employee-overrides", "deleted-employee-ids"].filter((key) => sessionStorage.getItem(key));
        leftovers.forEach((key) => sessionStorage.removeItem(key));
        const savedNotice = sessionStorage.getItem("employee-notice");
        sessionStorage.removeItem("employee-notice");
        if (leftovers.length > 0) {
          setNotice("การเพิ่มหรือแก้ไขพนักงานยังไม่ถูกบันทึกลงฐานข้อมูล รายชื่อนี้แสดงข้อมูลจริงจากระบบ");
        } else if (savedNotice) {
          setNotice(savedNotice);
        }
      } catch {
        // sessionStorage ใช้ไม่ได้ (เช่นโหมดส่วนตัว) ไม่กระทบรายชื่อจากฐานข้อมูล
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  // คนที่ข้อมูลครบขึ้นก่อน คนที่ข้อมูลไม่ครบรวมไว้ท้ายรายการ (ดูเฉพาะกลุ่มนี้ได้จากตัวกรอง "ข้อมูลไม่ครบ")
  const rows = useMemo(
    () =>
      (employees ?? [])
        .map((employee) => ({ ...employee, issues: dataIssues(employee) }))
        .sort((a, b) => Number(a.issues.length > 0) - Number(b.issues.length > 0) || a.code.localeCompare(b.code)),
    [employees],
  );
  const tree = useMemo(() => departmentTree(rows), [rows]);
  const incompleteCount = rows.filter((row) => row.issues.length > 0).length;

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return rows.filter((row) => {
      const matchesQuery =
        !normalizedQuery ||
        `${row.code} ${row.name} ${row.email}`.toLocaleLowerCase().includes(normalizedQuery);
      return (
        matchesQuery &&
        matchesDepartment(row, department, ALL) &&
        (status === ALL || row.status === status) &&
        (quality === ALL || (quality === "incomplete") === row.issues.length > 0)
      );
    });
  }, [department, quality, query, rows, status]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const filtersActive = query !== "" || department !== ALL || status !== ALL || quality !== ALL;

  function resetFilters() {
    setQuery("");
    setDepartment(ALL);
    setStatus(ALL);
    setQuality(ALL);
    setPage(1);
  }

  /** คลิกที่ใดก็ได้ในแถวเพื่อเปิดโปรไฟล์ ยกเว้นลิงก์ */
  function openRow(event: React.MouseEvent<HTMLTableRowElement>, code: string) {
    if ((event.target as HTMLElement).closest("a, button, input")) return;
    router.push(`/hr/employees/${encodeURIComponent(code)}`);
  }

  return (
    <div className="page-content queue-page">
      <header className="queue-heading queue-heading-actions">
        <div>
          <h1>รายชื่อพนักงาน</h1>
          <ul className="queue-summary">
            <li>ทั้งหมด {rows.length} คน</li>
            <li>ทำงานอยู่ {rows.filter((row) => row.status === "ACTIVE").length} คน</li>
            {incompleteCount > 0 ? (
              <li>
                <button type="button" className="queue-link-button queue-inline-link" onClick={() => { setQuality("incomplete"); setPage(1); }}>
                  ข้อมูลไม่ครบ {incompleteCount} คน
                </button>
              </li>
            ) : null}
          </ul>
        </div>
        <div className="queue-heading-buttons">
          <Link href="/hr/employees/requests" className="queue-secondary-link">ติดตามคำขอเพิ่มบุคคล</Link>
          <Link href="/hr/employees/add" className="queue-primary queue-primary-link">เพิ่มพนักงาน</Link>
        </div>
      </header>

      {employees === null ? (
        <p className="queue-alert" role="alert">
          โหลดรายชื่อพนักงานไม่สำเร็จ{" "}
          <button type="button" className="queue-link-button" onClick={() => window.location.reload()}>ลองโหลดใหม่</button>
        </p>
      ) : null}

      <section className="queue-sheet" aria-label="รายชื่อพนักงาน">
        <div className="queue-filters">
          <label className="queue-search">
            <span className="sr-only">ค้นหาพนักงาน</span>
            <SearchIcon />
            <input
              value={query}
              onChange={(event) => { setQuery(event.target.value); setPage(1); }}
              placeholder="ค้นหาชื่อ รหัส หรืออีเมล"
            />
          </label>
          <label className="queue-select">
            <span>ฝ่าย / แผนก</span>
            <select value={department} onChange={(event) => { setDepartment(event.target.value); setPage(1); }}>
              <option>{ALL}</option>
              <DepartmentOptions tree={tree} />
            </select>
          </label>
          <label className="queue-select">
            <span>สถานะ</span>
            <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
              <option>{ALL}</option>
              {STATUS_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
          <label className="queue-select">
            <span>ความครบของข้อมูล</span>
            <select value={quality} onChange={(event) => { setQuality(event.target.value as Quality); setPage(1); }}>
              <option value={ALL}>{ALL}</option>
              <option value="incomplete">ข้อมูลไม่ครบ ({incompleteCount})</option>
              <option value="complete">ข้อมูลครบ ({rows.length - incompleteCount})</option>
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
                <th scope="col">ฝ่าย / แผนก</th>
                <th scope="col">ตำแหน่ง</th>
                <th scope="col">หัวหน้า</th>
                <th scope="col">สถานะ</th>
                <th scope="col"><span className="sr-only">เปิดโปรไฟล์</span></th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row) => (
                <tr key={row.code} className="queue-link-row" onClick={(event) => openRow(event, row.code)}>
                  <td data-label="พนักงาน">
                    <Link className="queue-name queue-name-link" href={`/hr/employees/${encodeURIComponent(row.code)}`}>{row.name}</Link>
                    <span className="queue-meta">{row.code} · {row.email}</span>
                    {row.issues.length > 0 ? <span className="queue-blocker">ข้อมูลไม่ครบ: {row.issues.join(", ")}</span> : null}
                  </td>
                  <td data-label="ฝ่าย / แผนก">
                    {row.department ? (
                      <>
                        {row.parentDepartment ? <span className="queue-meta">{row.parentDepartment} ›</span> : null}
                        {row.department}
                      </>
                    ) : <span className="queue-meta">—</span>}
                  </td>
                  <td data-label="ตำแหน่ง">
                    {row.position ?? <span className="queue-meta">—</span>}
                    {row.jobLevel ? <span className="queue-meta">{row.jobLevel}</span> : null}
                  </td>
                  <td data-label="หัวหน้า">
                    {row.manager ? (
                      <>
                        {row.manager.name}
                        <span className="queue-meta">{row.manager.code}</span>
                      </>
                    ) : <span className="queue-meta">—</span>}
                  </td>
                  <td data-label="สถานะ">
                    <span className={`employment-status ${row.status.toLowerCase()}`}>{row.statusLabel}</span>
                    {row.statusDate ? <span className="queue-meta">ตั้งแต่ {formatThaiDate(row.statusDate)}</span> : null}
                  </td>
                  <td className="queue-open"><ChevronIcon /></td>
                </tr>
              ))}
              {employees !== null && pageRows.length === 0 ? (
                <tr>
                  <td className="queue-empty" colSpan={6}>{rows.length === 0 ? "ยังไม่มีข้อมูลพนักงานในระบบ" : "ไม่พบพนักงานที่ตรงกับตัวกรอง"}</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <footer className="queue-footer queue-footer-paged">
          <span>
            {filtered.length === 0
              ? "ไม่พบรายการ"
              : `แสดง ${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, filtered.length)} จาก ${filtered.length} คน`}
          </span>
          {pageCount > 1 ? (
            <nav className="queue-pager" aria-label="เปลี่ยนหน้ารายชื่อพนักงาน">
              <button type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>ก่อนหน้า</button>
              <span aria-live="polite">หน้า {currentPage} จาก {pageCount}</span>
              <button type="button" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}>ถัดไป</button>
            </nav>
          ) : null}
        </footer>
      </section>

      {notice ? (
        <div className="toast queue-toast" role="status">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice("")} aria-label="ปิดข้อความ">×</button>
        </div>
      ) : null}
    </div>
  );
}
