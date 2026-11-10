"use client";

import Link from "next/link";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type MaritalStatus = "โสด" | "สมรส" | "หย่าร้าง / หม้าย";

type EmployeeForm = {
  department: string;
  startDate: string;
  position: string;
  prefix: string;
  maritalStatus: MaritalStatus;
  firstName: string;
  lastName: string;
  childrenCount: string;
  gender: string;
  nationality: string;
  currentAddress: string;
  citizenId: string;
  birthDate: string;
  religion: string;
  fatherFirstName: string;
  fatherLastName: string;
  motherFirstName: string;
  motherLastName: string;
  email: string;
  phone: string;
};

const departments = ["IT", "Marketing", "Sales", "HR", "Finance"];
const positions = ["Developer", "ผู้จัดการ", "พนักงาน", "HR Officer", "Accountant"];
const prefixes = ["นาย", "นาง", "นางสาว", "อื่น ๆ"];
const maritalStatuses: MaritalStatus[] = ["โสด", "สมรส", "หย่าร้าง / หม้าย"];

const initialForm: EmployeeForm = {
  department: "IT",
  startDate: "",
  position: "พนักงาน",
  prefix: "นาย",
  maritalStatus: "โสด",
  firstName: "",
  lastName: "",
  childrenCount: "0",
  gender: "ชาย",
  nationality: "ไทย",
  currentAddress: "",
  citizenId: "",
  birthDate: "",
  religion: "",
  fatherFirstName: "",
  fatherLastName: "",
  motherFirstName: "",
  motherLastName: "",
  email: "",
  phone: "",
};

export default function AddEmployeePage() {
  const router = useRouter();
  const [form, setForm] = useState(initialForm);

  function updateField<Key extends keyof EmployeeForm>(key: Key, value: EmployeeForm[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function saveEmployee(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextId = Number(sessionStorage.getItem("employee-next-id") ?? "274");
    const id = String(nextId).padStart(4, "0");
    const employee = {
      id,
      name: `${form.prefix}${form.firstName.trim()} ${form.lastName.trim()}`,
      email: form.email.trim(),
      department: form.department,
      position: form.position,
      tier: "พนักงาน",
      used: 0,
      limit: 15000,
      profile: Object.fromEntries(Object.entries(form).map(([key, value]) => [key, String(value)])),
    };

    sessionStorage.setItem("employee-next-id", String(nextId + 1));
    sessionStorage.setItem("new-employee", JSON.stringify(employee));
    router.push("/hr/employees");
  }

  return (
    <div className="app-shell">
      <div className="app-main employee-add-main">
        <div className="page-content employee-add-content employee-add-page-content">
          <Breadcrumb className="breadcrumbs" items={[{ label: "จัดการพนักงานและสิทธิ์", href: "/hr/employees" }, { label: "เพิ่มพนักงานรายบุคคล" }]} />
          <div className="employee-add-heading">
            <h1>เพิ่มพนักงานรายบุคคล</h1>
            <p>กรอกข้อมูลพนักงานเพื่อกำหนดสิทธิ์และคำนวณสวัสดิการ</p>
          </div>

          <form className="employee-profile-form" onSubmit={saveEmployee}>
            <section className="employee-profile-card employee-add-form-card" aria-labelledby="employee-profile-title">
              <header className="employee-add-card-heading">
                <h2 id="employee-profile-title">ข้อมูลพนักงาน</h2>
                <p>กรอกข้อมูลตามแต่ละหัวข้อ ช่องที่มี <span aria-hidden="true">*</span> จำเป็นต้องกรอก</p>
              </header>

              <section className="employee-add-section" aria-labelledby="employee-work-title">
                <h3 id="employee-work-title">ข้อมูลการทำงาน</h3>
                <div className="employee-add-field-grid employee-add-work-grid">
                  <label className="profile-field">
                    <span>รหัสพนักงาน</span>
                    <input value="กำหนดอัตโนมัติ" readOnly aria-describedby="employee-code-hint" />
                    <small id="employee-code-hint">ระบบจะสร้างรหัสเมื่อบันทึก</small>
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
                    <span>วันเริ่มงาน</span>
                    <input required type="date" value={form.startDate} onChange={(event) => updateField("startDate", event.target.value)} />
                  </label>
                </div>
              </section>

              <section className="employee-add-section" aria-labelledby="employee-identity-title">
                <h3 id="employee-identity-title">ข้อมูลส่วนตัว</h3>
                <div className="employee-add-field-grid">
                  <label className="profile-field">
                    <span>คำนำหน้า</span>
                    <select required value={form.prefix} onChange={(event) => updateField("prefix", event.target.value)}>
                      {prefixes.map((item) => <option key={item}>{item}</option>)}
                    </select>
                  </label>
                  <label className="profile-field">
                    <span>ชื่อ</span>
                    <input required autoComplete="given-name" value={form.firstName} onChange={(event) => updateField("firstName", event.target.value)} />
                  </label>
                  <label className="profile-field">
                    <span>นามสกุล</span>
                    <input required autoComplete="family-name" value={form.lastName} onChange={(event) => updateField("lastName", event.target.value)} />
                  </label>
                  <label className="profile-field">
                    <span>เพศ</span>
                    <select required value={form.gender} onChange={(event) => updateField("gender", event.target.value)}>
                      <option>ชาย</option>
                      <option>หญิง</option>
                      <option>ไม่ระบุ</option>
                    </select>
                  </label>
                  <label className="profile-field">
                    <span>สัญชาติ</span>
                    <input required value={form.nationality} onChange={(event) => updateField("nationality", event.target.value)} />
                  </label>
                  <label className="profile-field">
                    <span>เลขบัตรประชาชน</span>
                    <input
                      required
                      inputMode="numeric"
                      pattern="[0-9]{13}"
                      maxLength={13}
                      autoComplete="off"
                      aria-describedby="citizen-id-hint"
                      value={form.citizenId}
                      onChange={(event) => updateField("citizenId", event.target.value.replace(/\D/g, ""))}
                      title="กรอกเลขบัตรประชาชน 13 หลัก"
                    />
                    <small id="citizen-id-hint">กรอกตัวเลข 13 หลัก</small>
                  </label>
                  <label className="profile-field">
                    <span>วัน/เดือน/ปีเกิด</span>
                    <input required type="date" autoComplete="bday" value={form.birthDate} onChange={(event) => updateField("birthDate", event.target.value)} />
                  </label>
                  <label className="profile-field">
                    <span>ศาสนา</span>
                    <input required value={form.religion} onChange={(event) => updateField("religion", event.target.value)} />
                  </label>
                </div>
              </section>

              <section className="employee-add-section" aria-labelledby="employee-family-title">
                <h3 id="employee-family-title">ข้อมูลครอบครัว</h3>
                <div className="employee-add-field-grid">
                  <fieldset className="profile-field profile-marital employee-add-field-wide">
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
                      required
                      type="number"
                      min="0"
                      step="1"
                      value={form.childrenCount}
                      onChange={(event) => updateField("childrenCount", event.target.value)}
                    />
                  </label>
                  <label className="profile-field">
                    <span>ชื่อบิดา</span>
                    <input required autoComplete="off" value={form.fatherFirstName} onChange={(event) => updateField("fatherFirstName", event.target.value)} />
                  </label>
                  <label className="profile-field">
                    <span>นามสกุลบิดา</span>
                    <input required autoComplete="off" value={form.fatherLastName} onChange={(event) => updateField("fatherLastName", event.target.value)} />
                  </label>
                  <label className="profile-field">
                    <span>ชื่อมารดา</span>
                    <input required autoComplete="off" value={form.motherFirstName} onChange={(event) => updateField("motherFirstName", event.target.value)} />
                  </label>
                  <label className="profile-field">
                    <span>นามสกุลมารดา</span>
                    <input required autoComplete="off" value={form.motherLastName} onChange={(event) => updateField("motherLastName", event.target.value)} />
                  </label>
                </div>
              </section>

              <section className="employee-add-section" aria-labelledby="employee-contact-title">
                <h3 id="employee-contact-title">ข้อมูลติดต่อ</h3>
                <div className="employee-add-field-grid">
                  <label className="profile-field">
                    <span>อีเมล</span>
                    <input required type="email" autoComplete="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} />
                  </label>
                  <label className="profile-field">
                    <span>เบอร์โทรศัพท์</span>
                    <input type="tel" autoComplete="tel" inputMode="tel" value={form.phone} onChange={(event) => updateField("phone", event.target.value)} />
                  </label>
                  <label className="profile-field employee-add-field-wide">
                    <span>ที่อยู่ปัจจุบัน</span>
                    <textarea required autoComplete="street-address" rows={3} value={form.currentAddress} onChange={(event) => updateField("currentAddress", event.target.value)} />
                  </label>
                </div>
              </section>

              <footer className="employee-profile-footer">
                <div className="form-actions">
                  <Link href="/hr/employees" className="button button-secondary">ยกเลิก</Link>
                  <button type="submit" className="button button-primary">บันทึกพนักงาน</button>
                </div>
              </footer>
            </section>
          </form>
        </div>
      </div>
    </div>
  );
}
