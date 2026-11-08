"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { HrEmployee, HrEmploymentStatus } from "@/lib/hr/employees";
import { formatThaiDate } from "@/lib/format";

const ALL = "ทั้งหมด";
const pageSize = 20;

const STATUS_OPTIONS: { value: HrEmploymentStatus; label: string }[] = [
  { value: "ACTIVE", label: "ทำงานอยู่" },
  { value: "RESIGNED", label: "ลาออก" },
  { value: "DECEASED", label: "เสียชีวิต" },
];

function SearchIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></svg>;
}

function PlusIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>;
}

function EditIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 5 5 5M4 20l4.5-1 10.8-10.8a2.1 2.1 0 0 0-3-3L5.5 16 4 20Z" /></svg>;
}

function HistoryIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12a9 9 0 1 0 2.6-6.4L3 8M3 3v5h5M12 7v5l3 2" /></svg>;
}

function uniqueSorted(values: (string | null)[]): string[] {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value)))).sort((a, b) => a.localeCompare(b, "th"));
}

/**
 * หน้าแก้ไข/ประวัติยังอ่านข้อมูลจาก sessionStorage ในรูปแบบเดิม (ยังไม่ได้เชื่อมฐานข้อมูล)
 * จึงแปลงเป็นรูปแบบนั้นก่อนเปิด – ไม่มีข้อมูลโควต้าจริง จึงส่ง 0
 */
function toViewingEmployee(employee: HrEmployee) {
  const level = employee.jobLevel ?? "";
  return {
    id: employee.code,
    name: employee.name,
    email: employee.email,
    department: employee.department ?? "",
    position: employee.position ?? "",
    tier: level === "ผู้จัดการ" || level === "ผู้บริหาร" ? "ผู้จัดการ" : "พนักงาน",
    used: 0,
    limit: 0,
  };
}

export function EmployeesClient({ employees }: { employees: HrEmployee[] | null }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState(ALL);
  const [position, setPosition] = useState(ALL);
  const [status, setStatus] = useState(ALL);
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

  const rows = useMemo(() => employees ?? [], [employees]);
  const departments = useMemo(() => uniqueSorted(rows.map((employee) => employee.department)), [rows]);
  const positions = useMemo(() => uniqueSorted(rows.map((employee) => employee.position)), [rows]);

  const filteredEmployees = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return rows.filter((employee) => {
      const matchesQuery =
        !normalizedQuery ||
        `${employee.code} ${employee.name} ${employee.email}`.toLocaleLowerCase().includes(normalizedQuery);
      return (
        matchesQuery &&
        (department === ALL || employee.department === department) &&
        (position === ALL || employee.position === position) &&
        (status === ALL || employee.status === status)
      );
    });
  }, [department, position, query, rows, status]);

  const pageCount = Math.max(1, Math.ceil(filteredEmployees.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageEmployees = filteredEmployees.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  function resetFilters() {
    setQuery("");
    setDepartment(ALL);
    setPosition(ALL);
    setStatus(ALL);
    setPage(1);
  }

  function open(employee: HrEmployee, view: "edit" | "history") {
    try {
      sessionStorage.setItem("viewing-employee", JSON.stringify(toViewingEmployee(employee)));
      router.push(`/hr/employees/${encodeURIComponent(employee.code)}/${view}`);
    } catch {
      setNotice(view === "edit" ? "ไม่สามารถเปิดหน้าแก้ไขข้อมูลพนักงานได้" : "ไม่สามารถเปิดประวัติพนักงานได้");
    }
  }

  return (
    <div className="app-shell">
      <div className="app-main employee-management-main">
        <div className="page-content employee-management-content">
          <div className="employee-management-heading">
            <h1>จัดการพนักงานและสิทธิ์สวัสดิการ</h1>
            <Link href="/hr/employees/requests" className="employee-track-requests-button">ติดตามคำขอเพิ่มบุคคล</Link>
          </div>
          <section className="employee-management-panel" aria-label="รายการพนักงาน">
            <div className="employee-management-filters">
              <label className="employee-search-field">
                <span>ค้นหาพนักงาน:</span>
                <div className="employee-management-input">
                  <SearchIcon />
                  <input
                    value={query}
                    onChange={(event) => { setQuery(event.target.value); setPage(1); }}
                    placeholder="พิมพ์ชื่อ, รหัส, หรืออีเมล..."
                    aria-label="ค้นหาชื่อ รหัส หรืออีเมลพนักงาน"
                  />
                </div>
              </label>
              <label className="employee-management-select">
                <span>แผนก:</span>
                <select value={department} onChange={(event) => { setDepartment(event.target.value); setPage(1); }} aria-label="กรองพนักงานตามแผนก">
                  <option>{ALL}</option>
                  {departments.map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
              <label className="employee-management-select">
                <span>ตำแหน่ง:</span>
                <select value={position} onChange={(event) => { setPosition(event.target.value); setPage(1); }} aria-label="กรองพนักงานตามตำแหน่ง">
                  <option>{ALL}</option>
                  {positions.map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
              <label className="employee-management-select">
                <span>สถานะ:</span>
                <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} aria-label="กรองพนักงานตามสถานะการทำงาน">
                  <option>{ALL}</option>
                  {STATUS_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </label>
              <Link href="/hr/employees/add" className="employee-add-button">
                <PlusIcon /> เพิ่มพนักงานรายบุคคล
              </Link>
            </div>

            <div className="employee-management-table-wrap">
              <table className="employee-management-table">
                <thead>
                  <tr>
                    <th scope="col">รหัส</th>
                    <th scope="col">ชื่อ-นามสกุล</th>
                    <th scope="col">แผนก</th>
                    <th scope="col">ตำแหน่ง</th>
                    <th scope="col">หัวหน้า</th>
                    <th scope="col">สถานะ</th>
                    <th scope="col"><span className="sr-only">การดำเนินการ</span></th>
                  </tr>
                </thead>
                <tbody>
                  {pageEmployees.map((employee) => (
                    <tr key={employee.code}>
                      <td className="employee-management-id">{employee.code}</td>
                      <td>
                        <span className="employee-management-name">{employee.name}</span>
                        <small className="employee-management-sub">{employee.email}</small>
                      </td>
                      <td>
                        {employee.department ?? <span className="employee-management-missing">ยังไม่ระบุ</span>}
                        {employee.parentDepartment ? <small className="employee-management-sub">{employee.parentDepartment}</small> : null}
                      </td>
                      <td>
                        {employee.position ?? <span className="employee-management-missing">ยังไม่ระบุ</span>}
                        {employee.jobLevel ? <small className="employee-management-sub">{employee.jobLevel}</small> : null}
                      </td>
                      <td>
                        {employee.manager ? (
                          <>
                            {employee.manager.name}
                            <small className="employee-management-sub">{employee.manager.code}</small>
                          </>
                        ) : <span className="employee-management-missing">—</span>}
                      </td>
                      <td>
                        <span className={`employment-status ${employee.status.toLowerCase()}`}>{employee.statusLabel}</span>
                        {employee.statusDate ? (
                          <small className="employee-management-sub">ตั้งแต่ {formatThaiDate(employee.statusDate)}</small>
                        ) : null}
                      </td>
                      <td className="employee-management-actions">
                        <button
                          type="button"
                          className="employee-action-button employee-edit-button"
                          onClick={() => open(employee, "edit")}
                          aria-label={`แก้ประวัติ ${employee.name}`}
                          title="แก้ประวัติ"
                        >
                          <EditIcon />
                          <span>แก้ประวัติ</span>
                        </button>
                        <button
                          type="button"
                          className="employee-action-button employee-history-button"
                          onClick={() => open(employee, "history")}
                          aria-label={`ดูประวัติ ${employee.name}`}
                          title="ดูประวัติ"
                        >
                          <HistoryIcon />
                          <span>ดูประวัติ</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {employees === null ? (
                    <tr><td className="employee-management-empty" colSpan={7}>โหลดรายชื่อพนักงานไม่สำเร็จ กรุณารีเฟรชหน้าอีกครั้ง</td></tr>
                  ) : pageEmployees.length === 0 ? (
                    <tr><td className="employee-management-empty" colSpan={7}>{rows.length === 0 ? "ยังไม่มีข้อมูลพนักงานในระบบ" : "ไม่พบข้อมูลพนักงานที่ตรงกับตัวกรอง"}</td></tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            <footer className="employee-management-footer">
              <span>
                {filteredEmployees.length === 0
                  ? "ไม่พบรายการ"
                  : `แสดงผล ${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, filteredEmployees.length)} จาก ${filteredEmployees.length} รายการ`}
              </span>
              <div className="employee-management-footer-actions">
                <button type="button" className="reset-filters" onClick={resetFilters}>ล้างตัวกรอง</button>
                <nav className="pagination" aria-label="เปลี่ยนหน้ารายชื่อพนักงาน">
                  <button type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} aria-label="หน้าก่อนหน้า">‹</button>
                  <span className="employee-page-indicator">{currentPage} / {pageCount}</span>
                  <button type="button" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)} aria-label="หน้าถัดไป">›</button>
                </nav>
              </div>
            </footer>
          </section>
        </div>
      </div>

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
