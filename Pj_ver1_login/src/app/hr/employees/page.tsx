"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type Employee = {
  id: string;
  name: string;
  email: string;
  department: string;
  position: string;
  tier: "Admin" | "ผู้จัดการ" | "พนักงาน";
  used: number;
  limit: number;
  profile?: Record<string, string>;
};

const departments = ["IT", "Marketing", "Sales", "HR", "Finance"];
const positions = ["Developer", "ผู้จัดการ", "พนักงาน", "HR Officer", "Accountant"];
const tiers: Employee["tier"][] = ["Admin", "ผู้จัดการ", "พนักงาน"];
const examples = [
  { name: "นายสมชาย ใจดี", department: "IT", position: "Developer", tier: "Admin" as const, used: 7500, limit: 15000 },
  { name: "น.ส.สมหญิง รักดี", department: "Marketing", position: "ผู้จัดการ", tier: "ผู้จัดการ" as const, used: 12000, limit: 30000 },
  { name: "นายมานะ มุ่งมั่น", department: "Sales", position: "พนักงาน", tier: "พนักงาน" as const, used: 2000, limit: 10000 },
  { name: "น.ส.ปวีณา ตั้งใจ", department: "HR", position: "HR Officer", tier: "ผู้จัดการ" as const, used: 0, limit: 12000 },
  { name: "นายธนกร ก้าวหน้า", department: "Finance", position: "Accountant", tier: "พนักงาน" as const, used: 2400, limit: 12000 },
];

const initialEmployees: Employee[] = Array.from({ length: 150 }, (_, index) => {
  const example = examples[index % examples.length];
  const id = String(124 + index).padStart(4, "0");
  return {
    ...example,
    id,
    email: `employee${id}@company.co.th`,
  };
});

const pageSize = 3;

function SearchIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></svg>;
}

function PlusIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>;
}

function TrashIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M5 7l1 14h12l1-14M9 7V4h6v3" /></svg>;
}

function EditIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 5 5 5M4 20l4.5-1 10.8-10.8a2.1 2.1 0 0 0-3-3L5.5 16 4 20Z" /></svg>;
}

function HistoryIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12a9 9 0 1 0 2.6-6.4L3 8M3 3v5h5M12 7v5l3 2" /></svg>;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("th-TH").format(value);
}

function isEmployee(value: unknown): value is Employee {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "string" &&
    "name" in value &&
    typeof value.name === "string" &&
    "email" in value &&
    typeof value.email === "string" &&
    "department" in value &&
    typeof value.department === "string" &&
    "position" in value &&
    typeof value.position === "string" &&
    "tier" in value &&
    (value.tier === "Admin" || value.tier === "ผู้จัดการ" || value.tier === "พนักงาน") &&
    "used" in value &&
    typeof value.used === "number" &&
    "limit" in value &&
    typeof value.limit === "number" &&
    (!("profile" in value) || (
      typeof value.profile === "object" &&
      value.profile !== null &&
      Object.values(value.profile).every((field) => typeof field === "string")
    ))
  );
}

function isEmployeeOverrides(value: unknown): value is Record<string, Employee> {
  return (
    typeof value === "object" &&
    value !== null &&
    Object.entries(value).every(([id, employee]) => isEmployee(employee) && id === employee.id)
  );
}

export default function EmployeesPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState(initialEmployees);
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState("ทั้งหมด");
  const [position, setPosition] = useState("ทั้งหมด");
  const [tier, setTier] = useState("ทั้งหมด");
  const [page, setPage] = useState(1);
  const [notice, setNotice] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const savedNotice = sessionStorage.getItem("employee-notice");
        if (savedNotice) {
          sessionStorage.removeItem("employee-notice");
          setNotice(savedNotice);
        }
      } catch {
        setNotice("ไม่สามารถโหลดข้อความแจ้งเตือนล่าสุดได้");
      }

    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      let savedEmployee: string | null;
      try {
        savedEmployee = sessionStorage.getItem("new-employee");
        if (!savedEmployee) return;
        sessionStorage.removeItem("new-employee");

        const employee: unknown = JSON.parse(savedEmployee);
        if (!isEmployee(employee)) {
          setNotice("ไม่สามารถโหลดข้อมูลพนักงานที่เพิ่งบันทึกได้");
          return;
        }

        setEmployees((current) => [employee, ...current]);
        setNotice(`เพิ่มข้อมูลพนักงาน ${employee.name} เรียบร้อยแล้ว`);
      } catch {
        setNotice("ไม่สามารถโหลดข้อมูลพนักงานที่เพิ่งบันทึกได้");
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const savedOverrides = sessionStorage.getItem("employee-overrides");
        if (!savedOverrides) return;
        const overrides: unknown = JSON.parse(savedOverrides);
        if (!isEmployeeOverrides(overrides)) {
          setNotice("ไม่สามารถโหลดข้อมูลพนักงานที่แก้ไขไว้ได้");
          return;
        }
        setEmployees((current) => current.map((employee) => overrides[employee.id] ?? employee));
      } catch {
        setNotice("ไม่สามารถโหลดข้อมูลพนักงานที่แก้ไขไว้ได้");
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const savedIds = sessionStorage.getItem("deleted-employee-ids");
        if (!savedIds) return;
        const ids: unknown = JSON.parse(savedIds);
        if (!Array.isArray(ids) || !ids.every((id): id is string => typeof id === "string")) {
          setNotice("ไม่สามารถโหลดรายการพนักงานที่ลบไว้ได้");
          return;
        }
        setEmployees((current) => current.filter((employee) => !ids.includes(employee.id)));
      } catch {
        setNotice("ไม่สามารถโหลดรายการพนักงานที่ลบไว้ได้");
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const filteredEmployees = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return employees.filter((employee) => {
      const matchesQuery =
        !normalizedQuery ||
        `${employee.id} ${employee.name} ${employee.email}`.toLocaleLowerCase().includes(normalizedQuery);
      return (
        matchesQuery &&
        (department === "ทั้งหมด" || employee.department === department) &&
        (position === "ทั้งหมด" || employee.position === position) &&
        (tier === "ทั้งหมด" || employee.tier === tier)
      );
    });
  }, [department, employees, position, query, tier]);

  const pageCount = Math.max(1, Math.ceil(filteredEmployees.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageEmployees = filteredEmployees.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  function resetFilters() {
    setQuery("");
    setDepartment("ทั้งหมด");
    setPosition("ทั้งหมด");
    setTier("ทั้งหมด");
    setPage(1);
  }

  function deleteEmployee() {
    if (!deleteTarget) return;

    setEmployees((current) => current.filter((employee) => employee.id !== deleteTarget.id));
    try {
      const savedIds = sessionStorage.getItem("deleted-employee-ids");
      const parsedIds: unknown = savedIds ? JSON.parse(savedIds) : [];
      if (!Array.isArray(parsedIds) || !parsedIds.every((id): id is string => typeof id === "string")) {
        throw new Error("รายการรหัสพนักงานที่ลบไว้ไม่ถูกต้อง");
      }
      sessionStorage.setItem(
        "deleted-employee-ids",
        JSON.stringify([...new Set([...parsedIds, deleteTarget.id])]),
      );
      setNotice(`ลบข้อมูลพนักงาน ${deleteTarget.name} เรียบร้อยแล้ว`);
    } catch {
      setNotice(`ลบพนักงาน ${deleteTarget.name} จากรายการนี้แล้ว แต่ไม่สามารถบันทึกสถานะการลบได้`);
    }
    setDeleteTarget(null);
  }

  function openEdit(employee: Employee) {
    try {
      sessionStorage.setItem("viewing-employee", JSON.stringify(employee));
      router.push(`/hr/employees/${encodeURIComponent(employee.id)}/edit`);
    } catch {
      setNotice("ไม่สามารถเปิดหน้าแก้ไขข้อมูลพนักงานได้");
    }
  }

  function openHistory(employee: Employee) {
    try {
      sessionStorage.setItem("viewing-employee", JSON.stringify(employee));
      router.push(`/hr/employees/${encodeURIComponent(employee.id)}/history`);
    } catch {
      setNotice("ไม่สามารถเปิดประวัติพนักงานได้");
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
                  <option>ทั้งหมด</option>
                  {departments.map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
              <label className="employee-management-select">
                <span>ตำแหน่ง:</span>
                <select value={position} onChange={(event) => { setPosition(event.target.value); setPage(1); }} aria-label="กรองพนักงานตามตำแหน่ง">
                  <option>ทั้งหมด</option>
                  {positions.map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
              <label className="employee-management-select">
                <span>สิทธิ์:</span>
                <select value={tier} onChange={(event) => { setTier(event.target.value); setPage(1); }} aria-label="กรองพนักงานตามสิทธิ์">
                  <option>ทั้งหมด</option>
                  {tiers.map((item) => <option key={item}>{item}</option>)}
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
                    <th scope="col">กลุ่มสิทธิ์ (Tier)</th>
                    <th scope="col">การใช้งานโควต้าปีนี้</th>
                    <th scope="col"><span className="sr-only">การดำเนินการ</span></th>
                  </tr>
                </thead>
                <tbody>
                  {pageEmployees.map((employee) => {
                    const usedPercent = Math.min((employee.used / employee.limit) * 100, 100);
                    return (
                      <tr key={employee.id}>
                        <td className="employee-management-id">{employee.id}</td>
                        <td className="employee-management-name">{employee.name}</td>
                        <td>{employee.department}</td>
                        <td>{employee.position}</td>
                        <td><span className={`tier-badge ${employee.tier === "Admin" ? "admin" : employee.tier === "ผู้จัดการ" ? "manager" : "staff"}`}>{employee.tier}</span></td>
                        <td>
                          <div className="employee-quota">
                            <span>{formatCurrency(employee.used)} / {formatCurrency(employee.limit)} บ.</span>
                            <span className="quota-track"><span style={{ width: `${usedPercent}%` }} /></span>
                          </div>
                        </td>
                        <td className="employee-management-actions">
                          <button
                            type="button"
                            className="employee-action-button employee-edit-button"
                            onClick={() => openEdit(employee)}
                            aria-label={`แก้ประวัติ ${employee.name}`}
                            title="แก้ประวัติ"
                          >
                            <EditIcon />
                            <span>แก้ประวัติ</span>
                          </button>
                          <button
                            type="button"
                            className="employee-action-button employee-history-button"
                            onClick={() => openHistory(employee)}
                            aria-label={`ดูประวัติ ${employee.name}`}
                            title="ดูประวัติ"
                          >
                            <HistoryIcon />
                            <span>ดูประวัติ</span>
                          </button>
                          <button
                            type="button"
                            className="employee-action-button employee-delete-button"
                            onClick={() => setDeleteTarget(employee)}
                            aria-label={`ลบพนักงาน ${employee.name}`}
                            title="ลบพนักงาน"
                          >
                            <TrashIcon />
                            <span>ลบ</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {pageEmployees.length === 0 ? (
                    <tr><td className="employee-management-empty" colSpan={7}>ไม่พบข้อมูลพนักงานที่ตรงกับตัวกรอง</td></tr>
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

      {deleteTarget ? (
        <div
          className="decision-backdrop"
          onMouseDown={(event) => { if (event.target === event.currentTarget) setDeleteTarget(null); }}
        >
          <section className="decision-dialog employee-delete-dialog" role="dialog" aria-modal="true" aria-labelledby="employee-delete-title">
            <button type="button" className="decision-close" onClick={() => setDeleteTarget(null)} aria-label="ปิดหน้าต่าง">×</button>
            <div className="decision-icon reject" aria-hidden="true"><TrashIcon /></div>
            <h2 id="employee-delete-title">ยืนยันการลบพนักงาน</h2>
            <p className="decision-description">
              ต้องการลบข้อมูลของ <strong>{deleteTarget.name}</strong> (รหัส {deleteTarget.id}) หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้
            </p>
            <div className="decision-actions">
              <button type="button" className="button button-secondary" onClick={() => setDeleteTarget(null)}>ยกเลิก</button>
              <button type="button" className="button employee-confirm-delete" onClick={deleteEmployee}>ยืนยันลบ</button>
            </div>
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
