"use client";

import Link from "next/link";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { SkeletonScreen } from "@/components/Skeleton";
import { EmployeeFormSkeleton } from "../../../HrSkeletons";

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

type EmployeeHistoryEntry = {
  id: string;
  changedAt: string;
  summary: string;
  actor?: string;
  changes?: { field: string; before: string; after: string }[];
};

type EditForm = {
  department: string;
  position: string;
  prefix: string;
  firstName: string;
  lastName: string;
  gender: string;
  nationality: string;
  religion: string;
  maritalStatus: string;
  childrenCount: string;
  currentAddress: string;
  phone: string;
};

const departments = ["IT", "Marketing", "Sales", "HR", "Finance"];
const positions = ["Developer", "ผู้จัดการ", "พนักงาน", "HR Officer", "Accountant"];
const prefixes = ["นาย", "นาง", "นางสาว", "น.ส.", "อื่น ๆ"];
const genders = ["ชาย", "หญิง", "ไม่ระบุ"];
const maritalStatuses = ["โสด", "สมรส", "หย่าร้าง / หม้าย"];

function isEmployee(value: unknown): value is Employee {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value && typeof value.id === "string" &&
    "name" in value && typeof value.name === "string" &&
    "email" in value && typeof value.email === "string" &&
    "department" in value && typeof value.department === "string" &&
    "position" in value && typeof value.position === "string" &&
    "tier" in value && (value.tier === "Admin" || value.tier === "ผู้จัดการ" || value.tier === "พนักงาน") &&
    "used" in value && typeof value.used === "number" &&
    "limit" in value && typeof value.limit === "number" &&
    (!("profile" in value) || (
      typeof value.profile === "object" &&
      value.profile !== null &&
      Object.values(value.profile).every((field) => typeof field === "string")
    ))
  );
}

function isEmployeeRecordMap(value: unknown): value is Record<string, Employee> {
  return (
    typeof value === "object" &&
    value !== null &&
    Object.entries(value).every(([id, employee]) => isEmployee(employee) && id === employee.id)
  );
}

function isHistoryEntry(value: unknown): value is EmployeeHistoryEntry {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value && typeof value.id === "string" &&
    "changedAt" in value && typeof value.changedAt === "string" &&
    "summary" in value && typeof value.summary === "string" &&
    (!("actor" in value) || typeof value.actor === "string") &&
    (!("changes" in value) || (
      Array.isArray(value.changes) &&
      value.changes.every((change) =>
        typeof change === "object" &&
        change !== null &&
        "field" in change && typeof change.field === "string" &&
        "before" in change && typeof change.before === "string" &&
        "after" in change && typeof change.after === "string"
      )
    ))
  );
}

function getNameParts(name: string) {
  const prefixMatch = /^(นาย|นางสาว|นาง|น\.ส\.|อื่น ๆ)\s*/.exec(name);
  const prefix = prefixMatch?.[1] ?? "นาย";
  const [firstName = "", ...lastNameParts] = name.slice(prefixMatch?.[0].length ?? 0).trim().split(/\s+/);
  return { prefix, firstName, lastName: lastNameParts.join(" ") };
}

function createEditForm(employee: Employee): EditForm {
  const savedProfile = employee.profile ?? {};
  const nameParts = getNameParts(employee.name);
  const getValue = (key: keyof EditForm, fallback: string) => savedProfile[key] ?? fallback;

  return {
    department: employee.department,
    position: employee.position,
    prefix: getValue("prefix", nameParts.prefix),
    firstName: getValue("firstName", nameParts.firstName),
    lastName: getValue("lastName", nameParts.lastName),
    gender: getValue("gender", "ไม่ระบุ"),
    nationality: getValue("nationality", "ไทย"),
    religion: getValue("religion", ""),
    maritalStatus: getValue("maritalStatus", "โสด"),
    childrenCount: getValue("childrenCount", "0"),
    currentAddress: getValue("currentAddress", ""),
    phone: getValue("phone", ""),
  };
}

export default function EditEmployeePage() {
  const router = useRouter();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [form, setForm] = useState<EditForm | null>(null);
  const [loadError, setLoadError] = useState("");
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const pathParts = window.location.pathname.split("/").filter(Boolean);
        const routeEmployeeId = decodeURIComponent(pathParts[1] ?? "");
        const selectedEmployee: unknown = JSON.parse(sessionStorage.getItem("viewing-employee") ?? "null");
        if (!isEmployee(selectedEmployee) || selectedEmployee.id !== routeEmployeeId) {
          setLoadError("ไม่พบข้อมูลพนักงาน กรุณากลับไปเลือกรายชื่อจากหน้าจัดการพนักงาน");
          return;
        }

        const savedOverrides = sessionStorage.getItem("employee-overrides");
        const parsedOverrides: unknown = savedOverrides ? JSON.parse(savedOverrides) : {};
        if (!isEmployeeRecordMap(parsedOverrides)) {
          setLoadError("ข้อมูลพนักงานที่แก้ไขไว้ไม่ถูกต้อง");
          return;
        }

        const currentEmployee = parsedOverrides[routeEmployeeId] ?? selectedEmployee;
        setEmployee(currentEmployee);
        setForm(createEditForm(currentEmployee));
      } catch {
        setLoadError("ไม่สามารถโหลดข้อมูลพนักงานได้");
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  function updateField<Key extends keyof EditForm>(key: Key, value: EditForm[Key]) {
    setForm((current) => current ? { ...current, [key]: value } : current);
  }

  function saveEmployee(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!employee || !form) return;

    const updatedProfile = { ...(employee.profile ?? {}), ...form };
    const fieldChanges = [
      { field: "แผนก", before: employee.department, after: form.department },
      { field: "ตำแหน่ง", before: employee.position, after: form.position },
      { field: "คำนำหน้า", before: employee.profile?.prefix ?? getNameParts(employee.name).prefix, after: form.prefix },
      { field: "ชื่อ", before: employee.profile?.firstName ?? getNameParts(employee.name).firstName, after: form.firstName.trim() },
      { field: "นามสกุล", before: employee.profile?.lastName ?? getNameParts(employee.name).lastName, after: form.lastName.trim() },
      { field: "เพศ", before: employee.profile?.gender ?? "ไม่ระบุ", after: form.gender },
      { field: "สัญชาติ", before: employee.profile?.nationality ?? "ไทย", after: form.nationality.trim() },
      { field: "ศาสนา", before: employee.profile?.religion ?? "", after: form.religion.trim() },
      { field: "สถานะสมรส", before: employee.profile?.maritalStatus ?? "โสด", after: form.maritalStatus },
      { field: "จำนวนบุตร", before: employee.profile?.childrenCount ?? "0", after: form.childrenCount },
      { field: "ที่อยู่ปัจจุบัน", before: employee.profile?.currentAddress ?? "", after: form.currentAddress.trim() },
      { field: "เบอร์โทรศัพท์", before: employee.profile?.phone ?? "", after: form.phone.trim() },
    ].filter((change) => change.before !== change.after);

    if (!fieldChanges.length) {
      router.push("/hr/employees");
      return;
    }

    const fullName = `${form.prefix}${form.firstName.trim()} ${form.lastName.trim()}`.trim();
    const updatedEmployee: Employee = {
      ...employee,
      name: fullName,
      department: form.department,
      position: form.position,
      profile: updatedProfile,
    };
    const historyEntry: EmployeeHistoryEntry = {
      id: `${Date.now()}`,
      changedAt: new Date().toISOString(),
      summary: `แก้ไข${fieldChanges.map((change) => change.field).join(", ")}`,
      actor: "ผู้ดูแลระบบ",
      changes: fieldChanges,
    };

    try {
      const savedOverrides = sessionStorage.getItem("employee-overrides");
      const parsedOverrides: unknown = savedOverrides ? JSON.parse(savedOverrides) : {};
      if (!isEmployeeRecordMap(parsedOverrides)) {
        throw new Error("ข้อมูลพนักงานที่แก้ไขไว้ไม่ถูกต้อง");
      }

      const historyKey = `employee-history-${employee.id}`;
      const savedHistory = sessionStorage.getItem(historyKey);
      const parsedHistory: unknown = savedHistory ? JSON.parse(savedHistory) : [];
      if (!Array.isArray(parsedHistory) || !parsedHistory.every(isHistoryEntry)) {
        throw new Error("ข้อมูลประวัติการแก้ไขไม่ถูกต้อง");
      }

      sessionStorage.setItem(
        "employee-overrides",
        JSON.stringify({ ...parsedOverrides, [updatedEmployee.id]: updatedEmployee }),
      );
      sessionStorage.setItem(historyKey, JSON.stringify([historyEntry, ...parsedHistory]));
      sessionStorage.setItem("employee-notice", `แก้ไขข้อมูลพนักงาน ${updatedEmployee.name} เรียบร้อยแล้ว`);
      router.push("/hr/employees");
    } catch {
      setSaveError("ไม่สามารถบันทึกข้อมูลหรือประวัติการแก้ไขได้ กรุณาลองใหม่อีกครั้ง");
    }
  }

  return (
    <div className="app-shell">
      <div className="app-main employee-add-main">
        <div className="page-content employee-add-content employee-edit-page-content">
          <Breadcrumb className="breadcrumbs" items={[{ label: "จัดการพนักงานและสิทธิ์", href: "/hr/employees" }, { label: "แก้ประวัติพนักงาน" }]} />
          <div className="employee-add-heading">
            <h1>แก้ประวัติพนักงาน</h1>
            <p>{employee ? `${employee.name} · รหัสพนักงาน ${employee.id}` : "ปรับปรุงข้อมูลส่วนตัวและข้อมูลการทำงาน"}</p>
          </div>

          {loadError ? (
            <div className="employee-history-load-error" role="alert">
              <p>{loadError}</p>
              <Link href="/hr/employees" className="button button-secondary">กลับหน้าจัดการพนักงาน</Link>
            </div>
          ) : form && employee ? (
            <form className="employee-profile-form" onSubmit={saveEmployee}>
              <section className="employee-profile-card" aria-labelledby="employee-edit-profile-title">
                <h2 id="employee-edit-profile-title">ข้อมูลส่วนตัวและข้อมูลการทำงาน</h2>
                <div className="employee-profile-grid employee-edit-profile-grid">
                  <section className="employee-profile-identity" aria-labelledby="employee-edit-identity-title">
                    <h3 id="employee-edit-identity-title">ข้อมูลระบุตัวตน</h3>
                    <div className="employee-identity-fields">
                      <label className="profile-field">
                        <span>รหัสพนักงาน</span>
                        <input value={employee.id} readOnly />
                      </label>
                      <label className="profile-field">
                        <span>แผนก</span>
                        <select required value={form.department} onChange={(event) => updateField("department", event.target.value)}>
                          {departments.map((item) => <option key={item}>{item}</option>)}
                        </select>
                      </label>
                      <label className="profile-field">
                        <span>ตำแหน่ง</span>
                        <select required value={form.position} onChange={(event) => updateField("position", event.target.value)}>
                          {positions.map((item) => <option key={item}>{item}</option>)}
                        </select>
                      </label>
                      <label className="profile-field">
                        <span>คำนำหน้า</span>
                        <select required value={form.prefix} onChange={(event) => updateField("prefix", event.target.value)}>
                          {prefixes.map((item) => <option key={item}>{item}</option>)}
                        </select>
                      </label>
                      <label className="profile-field">
                        <span>ชื่อ</span>
                        <input required value={form.firstName} onChange={(event) => updateField("firstName", event.target.value)} />
                      </label>
                      <label className="profile-field">
                        <span>นามสกุล</span>
                        <input required value={form.lastName} onChange={(event) => updateField("lastName", event.target.value)} />
                      </label>
                      <label className="profile-field">
                        <span>เพศ</span>
                        <select value={form.gender} onChange={(event) => updateField("gender", event.target.value)}>
                          {genders.map((item) => <option key={item}>{item}</option>)}
                        </select>
                      </label>
                      <label className="profile-field">
                        <span>สัญชาติ</span>
                        <input value={form.nationality} onChange={(event) => updateField("nationality", event.target.value)} />
                      </label>
                      <label className="profile-field employee-profile-wide">
                        <span>ศาสนา</span>
                        <input value={form.religion} onChange={(event) => updateField("religion", event.target.value)} />
                      </label>
                    </div>
                  </section>

                  <section className="employee-profile-benefits employee-edit-contact" aria-labelledby="employee-edit-contact-title">
                    <h3 id="employee-edit-contact-title">ข้อมูลครอบครัวและการติดต่อ</h3>
                    <fieldset className="profile-field profile-marital">
                      <legend>สถานะสมรส</legend>
                      <div className="marital-options">
                        {maritalStatuses.map((status) => (
                          <label className="marital-option" key={status}>
                            <input
                              type="radio"
                              name="maritalStatus"
                              value={status}
                              checked={form.maritalStatus === status}
                              onChange={() => updateField("maritalStatus", status)}
                            />
                            <span>{status}</span>
                          </label>
                        ))}
                      </div>
                    </fieldset>
                    <label className="profile-field">
                      <span>จำนวนบุตร (ที่เข้าเงื่อนไขเบิกสิทธิ์)</span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={form.childrenCount}
                        onChange={(event) => updateField("childrenCount", event.target.value)}
                      />
                    </label>
                    <label className="profile-field">
                      <span>ที่อยู่ปัจจุบัน</span>
                      <textarea rows={3} value={form.currentAddress} onChange={(event) => updateField("currentAddress", event.target.value)} />
                    </label>
                    <label className="profile-field">
                      <span>เบอร์โทรศัพท์</span>
                      <input type="tel" autoComplete="tel" value={form.phone} onChange={(event) => updateField("phone", event.target.value)} />
                    </label>
                  </section>
                </div>
                {saveError ? <p className="employee-edit-save-error" role="alert">{saveError}</p> : null}
                <footer className="employee-profile-footer">
                  <p>การแก้ไขจะถูกบันทึกไว้ในประวัติพนักงาน</p>
                  <div className="form-actions">
                    <Link href="/hr/employees" className="button button-secondary">ยกเลิก</Link>
                    <button type="submit" className="button button-primary">บันทึกการแก้ไข</button>
                  </div>
                </footer>
              </section>
            </form>
          ) : (
            <SkeletonScreen>
              <EmployeeFormSkeleton title="ข้อมูลส่วนตัวและข้อมูลการทำงาน" identityTitle="ข้อมูลระบุตัวตน" sideTitle="ข้อมูลครอบครัวและการติดต่อ" identityFields={9} sideFields={4} />
            </SkeletonScreen>
          )}
        </div>
      </div>
    </div>
  );
}
