"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { PageHeader, ReadOnlyInput } from "@/features/hr/ui";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent, type MouseEvent } from "react";

type MaritalStatus = "โสด" | "สมรส" | "หย่าร้าง / หม้าย";

type EmployeeForm = {
  department: string;
  startDate: string;
  position: string;
  jobLevel: string;
  managerCode: string;
  prefix: string;
  maritalStatus: MaritalStatus;
  firstName: string;
  lastName: string;
  firstNameEn: string;
  lastNameEn: string;
  nickname: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  subdistrict: string;
  district: string;
  province: string;
  postalCode: string;
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

type FieldKey = keyof EmployeeForm;
type FieldErrors = Partial<Record<FieldKey, string>>;

type OrgOption = { id: string; name: string };
type OrgChoices = { departments: OrgOption[]; positions: OrgOption[]; jobLevels: OrgOption[]; managers: OrgOption[] };

const otherPrefix = "อื่น ๆ";
const prefixes = ["นาย", "นาง", "นางสาว", otherPrefix];
const maritalStatuses: MaritalStatus[] = ["โสด", "สมรส", "หย่าร้าง / หม้าย"];

const initialForm: EmployeeForm = {
  department: "",
  startDate: "",
  position: "",
  jobLevel: "",
  managerCode: "",
  prefix: "นาย",
  maritalStatus: "โสด",
  firstName: "",
  lastName: "",
  firstNameEn: "",
  lastNameEn: "",
  nickname: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  subdistrict: "",
  district: "",
  province: "",
  postalCode: "",
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

const steps = [
  { title: "ข้อมูลการทำงาน", description: "ใช้กำหนดสิทธิ์และวงเงินสวัสดิการ" },
  { title: "ข้อมูลส่วนตัว", description: "กรอกตามบัตรประชาชน" },
  { title: "ครอบครัว", description: "ใช้คำนวณสิทธิ์ที่เกี่ยวกับคู่สมรส บุตร และบิดามารดา" },
  { title: "ข้อมูลติดต่อ", description: "ใช้ติดต่อพนักงาน" },
  { title: "ตรวจสอบ", description: "ตรวจข้อมูลทั้งหมดก่อนบันทึก กดแก้ไขเพื่อกลับไปยังขั้นตอนนั้น" },
];

const reviewStep = steps.length - 1;
const draftKey = "employee-add-draft";
const cleanForm = JSON.stringify(initialForm);

function todayString() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function formatDate(value: string) {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" });
}

function joinName(first: string, last: string) {
  return `${first.trim()} ${last.trim()}`.trim();
}

function fullName(form: EmployeeForm) {
  const prefix = form.prefix === otherPrefix ? "" : form.prefix;
  return `${prefix}${joinName(form.firstName, form.lastName)}`;
}

function validateStep(step: number, form: EmployeeForm): FieldErrors {
  const errors: FieldErrors = {};

  if (step === 0) {
    if (!form.startDate) errors.startDate = "เลือกวันเริ่มงาน";
    if (!form.department) errors.department = "เลือกแผนก";
    if (!form.position) errors.position = "เลือกตำแหน่ง";
  }

  if (step === 1) {
    if (!form.firstName.trim()) errors.firstName = "กรอกชื่อ";
    if (!form.lastName.trim()) errors.lastName = "กรอกนามสกุล";
    if (!/^\d{13}$/.test(form.citizenId)) errors.citizenId = "กรอกเลขบัตรประชาชนให้ครบ 13 หลัก";
    if (!form.birthDate) errors.birthDate = "เลือกวันเกิด";
    else if (form.birthDate > todayString()) errors.birthDate = "วันเกิดต้องไม่เป็นวันในอนาคต";
    else if (form.startDate && form.birthDate >= form.startDate) errors.birthDate = "วันเกิดต้องอยู่ก่อนวันเริ่มงาน";
    if (!form.nationality.trim()) errors.nationality = "กรอกสัญชาติ";
  }

  if (step === 2) {
    if (!/^\d+$/.test(form.childrenCount.trim())) errors.childrenCount = "กรอกจำนวนบุตรเป็นจำนวนเต็มตั้งแต่ 0 ขึ้นไป";
  }

  if (step === 3) {
    const email = form.email.trim();
    if (!email) errors.email = "กรอกอีเมล";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "รูปแบบอีเมลไม่ถูกต้อง เช่น name@company.co.th";
    if (!form.currentAddress.trim()) errors.currentAddress = "กรอกที่อยู่";
    if (form.postalCode && !/^\d{5}$/.test(form.postalCode)) errors.postalCode = "รหัสไปรษณีย์ต้องเป็นตัวเลข 5 หลัก";
  }

  return errors;
}

// ขั้นตอนของแต่ละช่อง ใช้พาผู้ใช้กลับไปแก้เมื่อเซิร์ฟเวอร์ปฏิเสธข้อมูล เช่น อีเมลซ้ำ
function stepOfField(field: string) {
  if (["startDate", "department", "position", "jobLevel", "managerCode"].includes(field)) return 0;
  if (["maritalStatus", "childrenCount"].includes(field)) return 2;
  if (["email", "phone", "currentAddress", "postalCode"].includes(field)) return 3;
  return 1;
}

function optionName(options: OrgOption[], id: string) {
  return options.find((item) => item.id === id)?.name ?? "";
}

function getSummary(form: EmployeeForm, org: OrgChoices): [string, string][][] {
  return [
    [
      ["รหัสพนักงาน", "กำหนดอัตโนมัติเมื่อบันทึก"],
      ["วันเริ่มงาน", formatDate(form.startDate)],
      ["แผนก", optionName(org.departments, form.department)],
      ["ตำแหน่ง", optionName(org.positions, form.position)],
      ["ระดับ", optionName(org.jobLevels, form.jobLevel)],
      ["หัวหน้า", optionName(org.managers, form.managerCode)],
    ],
    [
      ["ชื่อ-นามสกุล", fullName(form)],
      ["ชื่อ (อังกฤษ)", joinName(form.firstNameEn, form.lastNameEn)],
      ["ชื่อเล่น", form.nickname],
      ["เพศ", form.gender],
      ["เลขบัตรประชาชน", form.citizenId],
      ["วันเกิด", formatDate(form.birthDate)],
      ["สัญชาติ", form.nationality],
      ["ศาสนา", form.religion],
    ],
    [
      ["สถานะสมรส", form.maritalStatus],
      ["จำนวนบุตร", form.childrenCount],
      ["บิดา", joinName(form.fatherFirstName, form.fatherLastName)],
      ["มารดา", joinName(form.motherFirstName, form.motherLastName)],
    ],
    [
      ["อีเมล", form.email],
      ["เบอร์โทรศัพท์", form.phone],
      ["ผู้ติดต่อฉุกเฉิน", form.emergencyContactName],
      ["เบอร์ฉุกเฉิน", form.emergencyContactPhone],
      ["ที่อยู่", [form.currentAddress, form.subdistrict, form.district, form.province, form.postalCode].map((part) => part.trim()).filter(Boolean).join(" ")],
    ],
  ];
}

export default function AddEmployeePage() {
  const router = useRouter();
  const [form, setForm] = useState(initialForm);
  const [step, setStep] = useState(0);
  const [furthestStep, setFurthestStep] = useState(0);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [focusRequest, setFocusRequest] = useState<{ target: "title" | "error" } | null>(null);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [restored, setRestored] = useState(false);
  const [today, setToday] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [org, setOrg] = useState<OrgChoices>({ departments: [], positions: [], jobLevels: [], managers: [] });
  const { departments, positions, jobLevels, managers } = org;
  const [optionsFailed, setOptionsFailed] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const stepTitleRef = useRef<HTMLHeadingElement>(null);

  const isDirty = JSON.stringify(form) !== cleanForm;

  // The draft lives in sessionStorage, which only exists in the browser, so it
  // is read after mount rather than during render.
  useEffect(() => {
    try {
      const draft = JSON.parse(sessionStorage.getItem(draftKey) ?? "null");
      if (draft?.form) {
        const furthest = Math.min(Math.max(Number(draft.furthestStep) || 0, 0), reviewStep);
        setForm({ ...initialForm, ...draft.form });
        setFurthestStep(furthest);
        setStep(Math.min(Math.max(Number(draft.step) || 0, 0), furthest));
        setRestored(true);
      }
    } catch {
      sessionStorage.removeItem(draftKey);
    }
    setToday(todayString());
    setDraftLoaded(true);
  }, []);

  // แผนกและตำแหน่งมาจากฐานข้อมูล ค่าจากฉบับร่างเก่าที่ไม่มีในรายการจะถูกล้างให้เลือกใหม่
  useEffect(() => {
    let active = true;
    fetch("/api/hr/employees")
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error("load failed"))))
      .then((options: OrgChoices) => {
        if (!active) return;
        if (options.departments.length === 0 || options.positions.length === 0) {
          setOptionsFailed(true);
          return;
        }
        setOrg(options);
        const keep = (list: OrgOption[], value: string) => (list.some((item) => item.id === value) ? value : "");
        setForm((current) => ({
          ...current,
          department: keep(options.departments, current.department),
          position: keep(options.positions, current.position),
          jobLevel: keep(options.jobLevels, current.jobLevel),
          managerCode: keep(options.managers, current.managerCode),
        }));
      })
      .catch(() => {
        if (active) setOptionsFailed(true);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!draftLoaded || isSaving) return;
    if (isDirty) sessionStorage.setItem(draftKey, JSON.stringify({ form, step, furthestStep }));
    else sessionStorage.removeItem(draftKey);
  }, [draftLoaded, isSaving, isDirty, form, step, furthestStep]);

  useEffect(() => {
    if (!focusRequest) return;
    if (focusRequest.target === "error") {
      formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
    } else {
      stepTitleRef.current?.focus();
    }
  }, [focusRequest]);

  function updateField<Key extends FieldKey>(key: Key, value: EmployeeForm[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
    setRestored(false);
    if (errors[key]) {
      setErrors((current) => {
        const next = { ...current };
        delete next[key];
        return next;
      });
    }
  }

  // Shows the first step in [from, to) that fails validation and reports
  // whether one was found.
  function showFirstInvalidStep(from: number, to: number) {
    for (let index = from; index < Math.min(to, reviewStep); index += 1) {
      const stepErrors = validateStep(index, form);
      if (Object.keys(stepErrors).length > 0) {
        setErrors(stepErrors);
        setStep(index);
        setFocusRequest({ target: "error" });
        return true;
      }
    }
    return false;
  }

  function goToStep(target: number) {
    if (target > step && showFirstInvalidStep(step, target)) return;
    setErrors({});
    setStep(target);
    setFurthestStep((current) => Math.max(current, target));
    setFocusRequest({ target: "title" });
  }

  async function saveEmployee() {
    if (showFirstInvalidStep(0, reviewStep)) return;
    setIsSaving(true);
    setSaveError("");

    try {
      const response = await fetch("/api/hr/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        setIsSaving(false);
        if (result.field && result.error) {
          setErrors({ [result.field]: result.error });
          setStep(stepOfField(result.field));
          setFocusRequest({ target: "error" });
        } else {
          setSaveError(result.error || "บันทึกพนักงานไม่สำเร็จ ข้อมูลยังไม่เข้าระบบ กรุณาลองอีกครั้ง");
        }
        return;
      }

      sessionStorage.removeItem(draftKey);
      sessionStorage.setItem("employee-notice", `เพิ่มพนักงาน ${result.name} (${result.code}) ลงระบบแล้ว`);
      router.push("/hr/employees");
    } catch {
      setIsSaving(false);
      setSaveError("เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ข้อมูลยังไม่เข้าระบบ กรุณาลองอีกครั้ง");
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving) return;
    if (step < reviewStep) goToStep(step + 1);
    else saveEmployee();
  }

  function handleCancel(event: MouseEvent<HTMLAnchorElement>) {
    if (isDirty && !window.confirm("ยกเลิกการเพิ่มพนักงาน? ข้อมูลที่กรอกไว้จะถูกลบ")) {
      event.preventDefault();
      return;
    }
    sessionStorage.removeItem(draftKey);
  }

  function startOver() {
    sessionStorage.removeItem(draftKey);
    setForm(initialForm);
    setErrors({});
    setStep(0);
    setFurthestStep(0);
    setRestored(false);
    setFocusRequest({ target: "title" });
  }

  function fieldClass(key: FieldKey, extra = "") {
    return `profile-field${errors[key] ? " is-invalid" : ""}${extra ? ` ${extra}` : ""}`;
  }

  function invalidProps(key: FieldKey, hintId?: string) {
    const describedBy = [errors[key] ? `employee-${key}-error` : "", hintId ?? ""].filter(Boolean).join(" ");
    return {
      "aria-invalid": errors[key] ? (true as const) : undefined,
      "aria-describedby": describedBy || undefined,
    };
  }

  function fieldError(key: FieldKey) {
    return errors[key]
      ? <small id={`employee-${key}-error`} className="profile-field-error" role="alert">{errors[key]}</small>
      : null;
  }

  const summary = getSummary(form, org);

  return (
    <div className="app-shell">
      <div className="app-main employee-add-main">
        <div className="page-content employee-add-content employee-add-page-content">
          {/* หัวหน้าแบบเดียวกับหน้า HR อื่น (ดีไซน์ H10) */}
          <div className="employee-add-header">
            <PageHeader
              crumbs={[{ label: "จัดการพนักงานและสิทธิ์", href: "/hr/employees" }, { label: "เพิ่มพนักงาน" }]}
              title="เพิ่มพนักงาน"
              description="กรอกข้อมูลพนักงานเพื่อกำหนดสิทธิ์และคำนวณสวัสดิการ"
            />
          </div>

          {restored && (
            <p className="employee-draft-notice" role="status">
              <span>กู้คืนข้อมูลที่กรอกค้างไว้ให้แล้ว</span>
              <button type="button" onClick={startOver}>เริ่มใหม่</button>
            </p>
          )}

          <form className="employee-profile-form" ref={formRef} onSubmit={handleSubmit} noValidate>
            <section className="employee-profile-card" aria-labelledby="employee-step-title">
              <ol className="employee-steps" aria-label="ขั้นตอนการเพิ่มพนักงาน">
                {steps.map((item, index) => {
                  const state = index === step ? "current" : index < furthestStep ? "done" : index === furthestStep ? "ready" : "upcoming";
                  return (
                    <li key={item.title} className={`employee-step is-${state}`}>
                      <button
                        type="button"
                        disabled={index > furthestStep}
                        aria-current={index === step ? "step" : undefined}
                        onClick={() => goToStep(index)}
                      >
                        <span className="employee-step-number">
                          <span className="employee-step-word">ขั้นที่ </span>{index + 1}
                          {state === "done" && (
                            <>
                              <Check aria-hidden="true" size={14} strokeWidth={2.5} />
                              <span className="sr-only">เสร็จแล้ว</span>
                            </>
                          )}
                        </span>
                        <strong>{item.title}</strong>
                      </button>
                    </li>
                  );
                })}
              </ol>

              <div className="employee-step-body">
                <h2 id="employee-step-title" ref={stepTitleRef} tabIndex={-1}>{steps[step].title}</h2>
                <p className="employee-step-description">{steps[step].description}</p>

                {step === 0 && (
                  <div className="employee-add-field-grid employee-add-work-grid">
                    {/* ช่องที่ระบบกำหนด: สีเทา มีแม่กุญแจ แก้ไขไม่ได้ */}
                    <ReadOnlyInput label="รหัสพนักงาน" value="กำหนดอัตโนมัติ" hint="ระบบจะสร้างรหัสเมื่อบันทึก" />
                    <label className={fieldClass("startDate")}>
                      <span>วันเริ่มงาน</span>
                      <input required type="date" value={form.startDate} onChange={(event) => updateField("startDate", event.target.value)} {...invalidProps("startDate")} />
                      {fieldError("startDate")}
                    </label>
                    <label className={fieldClass("department")}>
                      <span>แผนก</span>
                      <select required value={form.department} onChange={(event) => updateField("department", event.target.value)} {...invalidProps("department")}>
                        <option value="">เลือกแผนก</option>
                        {departments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                      </select>
                      {fieldError("department")}
                    </label>
                    <label className={fieldClass("position")}>
                      <span>ตำแหน่ง</span>
                      <select required value={form.position} onChange={(event) => updateField("position", event.target.value)} {...invalidProps("position")}>
                        <option value="">เลือกตำแหน่ง</option>
                        {positions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                      </select>
                      {fieldError("position")}
                    </label>
                    <label className="profile-field">
                      <span>ระดับ</span>
                      <select value={form.jobLevel} onChange={(event) => updateField("jobLevel", event.target.value)}>
                        <option value="">— ไม่ระบุ —</option>
                        {jobLevels.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                      </select>
                    </label>
                    <label className="profile-field">
                      <span>หัวหน้า</span>
                      <select value={form.managerCode} onChange={(event) => updateField("managerCode", event.target.value)}>
                        <option value="">— ไม่ระบุ —</option>
                        {managers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                      </select>
                    </label>
                    {optionsFailed && <p className="employee-save-error employee-add-field-wide" role="alert">โหลดรายการแผนกและตำแหน่งไม่สำเร็จ กรุณารีเฟรชหน้านี้</p>}
                  </div>
                )}

                {step === 1 && (
                  <div className="employee-add-field-grid">
                    <label className="profile-field">
                      <span>คำนำหน้า</span>
                      <select required value={form.prefix} onChange={(event) => updateField("prefix", event.target.value)}>
                        {prefixes.map((item) => <option key={item}>{item}</option>)}
                      </select>
                    </label>
                    <label className={fieldClass("firstName")}>
                      <span>ชื่อ</span>
                      <input required autoComplete="given-name" value={form.firstName} onChange={(event) => updateField("firstName", event.target.value)} {...invalidProps("firstName")} />
                      {fieldError("firstName")}
                    </label>
                    <label className={fieldClass("lastName")}>
                      <span>นามสกุล</span>
                      <input required autoComplete="family-name" value={form.lastName} onChange={(event) => updateField("lastName", event.target.value)} {...invalidProps("lastName")} />
                      {fieldError("lastName")}
                    </label>
                    <label className="profile-field">
                      <span>ชื่อ (อังกฤษ)</span>
                      <input autoComplete="off" value={form.firstNameEn} onChange={(event) => updateField("firstNameEn", event.target.value)} />
                    </label>
                    <label className="profile-field">
                      <span>นามสกุล (อังกฤษ)</span>
                      <input autoComplete="off" value={form.lastNameEn} onChange={(event) => updateField("lastNameEn", event.target.value)} />
                    </label>
                    <label className="profile-field">
                      <span>ชื่อเล่น</span>
                      <input autoComplete="off" value={form.nickname} onChange={(event) => updateField("nickname", event.target.value)} />
                    </label>
                    <label className="profile-field">
                      <span>เพศ</span>
                      <select required value={form.gender} onChange={(event) => updateField("gender", event.target.value)}>
                        <option>ชาย</option>
                        <option>หญิง</option>
                        <option>ไม่ระบุ</option>
                      </select>
                    </label>
                    <label className={fieldClass("nationality")}>
                      <span>สัญชาติ</span>
                      <input required value={form.nationality} onChange={(event) => updateField("nationality", event.target.value)} {...invalidProps("nationality")} />
                      {fieldError("nationality")}
                    </label>
                    <label className={fieldClass("citizenId")}>
                      <span>เลขบัตรประชาชน</span>
                      <input
                        required
                        inputMode="numeric"
                        maxLength={13}
                        autoComplete="off"
                        value={form.citizenId}
                        onChange={(event) => updateField("citizenId", event.target.value.replace(/\D/g, ""))}
                        {...invalidProps("citizenId", "employee-citizen-hint")}
                      />
                      {fieldError("citizenId")}
                      <small id="employee-citizen-hint">ตัวเลข 13 หลัก ไม่ต้องใส่ขีด</small>
                    </label>
                    <label className={fieldClass("birthDate")}>
                      <span>วันเกิด</span>
                      <input required type="date" autoComplete="bday" max={today || undefined} value={form.birthDate} onChange={(event) => updateField("birthDate", event.target.value)} {...invalidProps("birthDate")} />
                      {fieldError("birthDate")}
                    </label>
                    <label className="profile-field">
                      <span>ศาสนา</span>
                      <input value={form.religion} onChange={(event) => updateField("religion", event.target.value)} />
                    </label>
                  </div>
                )}

                {step === 2 && (
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
                    <label className={fieldClass("childrenCount")}>
                      <span>จำนวนบุตร (ที่เข้าเงื่อนไขเบิกสิทธิ์)</span>
                      <input
                        required
                        type="number"
                        inputMode="numeric"
                        min="0"
                        step="1"
                        value={form.childrenCount}
                        onChange={(event) => updateField("childrenCount", event.target.value)}
                        {...invalidProps("childrenCount")}
                      />
                      {fieldError("childrenCount")}
                    </label>
                    <label className="profile-field">
                      <span>ชื่อบิดา</span>
                      <input autoComplete="off" value={form.fatherFirstName} onChange={(event) => updateField("fatherFirstName", event.target.value)} />
                    </label>
                    <label className="profile-field">
                      <span>นามสกุลบิดา</span>
                      <input autoComplete="off" value={form.fatherLastName} onChange={(event) => updateField("fatherLastName", event.target.value)} />
                    </label>
                    <label className="profile-field">
                      <span>ชื่อมารดา</span>
                      <input autoComplete="off" value={form.motherFirstName} onChange={(event) => updateField("motherFirstName", event.target.value)} />
                    </label>
                    <label className="profile-field">
                      <span>นามสกุลมารดา</span>
                      <input autoComplete="off" value={form.motherLastName} onChange={(event) => updateField("motherLastName", event.target.value)} />
                    </label>
                  </div>
                )}

                {step === 3 && (
                  <div className="employee-add-field-grid">
                    <label className={fieldClass("email")}>
                      <span>อีเมล</span>
                      <input required type="email" autoComplete="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} {...invalidProps("email")} />
                      {fieldError("email")}
                    </label>
                    <label className="profile-field">
                      <span>เบอร์โทรศัพท์</span>
                      <input type="tel" inputMode="tel" autoComplete="tel" value={form.phone} onChange={(event) => updateField("phone", event.target.value)} />
                    </label>
                    <label className="profile-field">
                      <span>ผู้ติดต่อฉุกเฉิน</span>
                      <input autoComplete="off" value={form.emergencyContactName} onChange={(event) => updateField("emergencyContactName", event.target.value)} />
                    </label>
                    <label className="profile-field">
                      <span>เบอร์ฉุกเฉิน</span>
                      <input type="tel" inputMode="tel" autoComplete="off" value={form.emergencyContactPhone} onChange={(event) => updateField("emergencyContactPhone", event.target.value)} />
                    </label>
                    <label className={fieldClass("currentAddress", "employee-add-field-wide")}>
                      <span>ที่อยู่</span>
                      <textarea required autoComplete="street-address" rows={2} placeholder="บ้านเลขที่ ถนน ซอย" value={form.currentAddress} onChange={(event) => updateField("currentAddress", event.target.value)} {...invalidProps("currentAddress")} />
                      {fieldError("currentAddress")}
                    </label>
                    <label className="profile-field">
                      <span>ตำบล/แขวง</span>
                      <input autoComplete="off" value={form.subdistrict} onChange={(event) => updateField("subdistrict", event.target.value)} />
                    </label>
                    <label className="profile-field">
                      <span>อำเภอ/เขต</span>
                      <input autoComplete="off" value={form.district} onChange={(event) => updateField("district", event.target.value)} />
                    </label>
                    <label className="profile-field">
                      <span>จังหวัด</span>
                      <input autoComplete="off" value={form.province} onChange={(event) => updateField("province", event.target.value)} />
                    </label>
                    <label className={fieldClass("postalCode")}>
                      <span>รหัสไปรษณีย์</span>
                      <input inputMode="numeric" maxLength={5} autoComplete="postal-code" value={form.postalCode} onChange={(event) => updateField("postalCode", event.target.value.replace(/\D/g, ""))} {...invalidProps("postalCode")} />
                      {fieldError("postalCode")}
                    </label>
                  </div>
                )}

                {step === reviewStep && (
                  <div className="employee-review">
                    {summary.map((rows, index) => (
                      <section key={steps[index].title} className="employee-review-section">
                        <header>
                          <h3>{steps[index].title}</h3>
                          <button type="button" onClick={() => goToStep(index)} aria-label={`แก้ไข${steps[index].title}`}>แก้ไข</button>
                        </header>
                        <dl>
                          {rows.map(([label, value]) => (
                            <div key={label}>
                              <dt>{label}</dt>
                              <dd>{value || "–"}</dd>
                            </div>
                          ))}
                        </dl>
                      </section>
                    ))}
                  </div>
                )}

                {saveError && <p className="employee-save-error" role="alert">{saveError}</p>}
              </div>

              <footer className="employee-profile-footer">
                <p>
                  {step === reviewStep
                    ? `ขั้นที่ ${step + 1} จาก ${steps.length}`
                    : <><span aria-hidden="true">*</span> ข้อมูลที่จำเป็นต้องกรอก · ขั้นที่ {step + 1} จาก {steps.length}</>}
                </p>
                <div className="form-actions">
                  {step === 0
                    ? <Link href="/hr/employees" className="button button-secondary" onClick={handleCancel}>ยกเลิก</Link>
                    : <button type="button" className="button button-secondary" disabled={isSaving} onClick={() => goToStep(step - 1)}>ย้อนกลับ</button>}
                  <button type="submit" className="button button-primary" disabled={isSaving}>
                    {isSaving ? "กำลังบันทึก…" : step === reviewStep ? "บันทึกพนักงาน" : step === reviewStep - 1 ? "ตรวจสอบข้อมูล" : "ถัดไป"}
                  </button>
                </div>
              </footer>
            </section>
          </form>
        </div>
      </div>
    </div>
  );
}
