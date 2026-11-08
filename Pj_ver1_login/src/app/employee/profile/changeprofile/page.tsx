'use client';
import { Check, FileText, Lock, Upload } from "lucide-react";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const draftStorageKey = "profile-change-draft";

const changeOptions = [
  { value: "phone", label: "เบอร์โทรศัพท์", type: "tel", placeholder: "ระบุเบอร์โทรศัพท์ใหม่" },
  { value: "email", label: "อีเมล", type: "email", placeholder: "ระบุอีเมลใหม่" },
  { value: "name", label: "ชื่อ-นามสกุล", type: "text", placeholder: "ระบุชื่อ-นามสกุลใหม่" },
  { value: "address", label: "ที่อยู่ปัจจุบัน", type: "textarea", placeholder: "ระบุที่อยู่ปัจจุบัน" },
] as const;

type ChangeField = (typeof changeOptions)[number]["value"];

const currentValues: Record<ChangeField, string> = {
  phone: "081-234-5678",
  email: "kamonchanok.j@example.com",
  name: "กมลชนก ใจดี",
  address: "88/24 ถนนลาดพร้าว แขวงจอมพล เขตจตุจักร กรุงเทพมหานคร 10900",
};

const inputClassName =
  "min-h-10 w-full rounded-md border border-line bg-white px-3 py-2 text-13 text-ink outline-none transition placeholder:text-muted focus:border-primary-500 focus:ring-2 focus:ring-primary-100";

type RequestDraft = {
  field: ChangeField;
  newValue: string;
  reason: string;
};

function isChangeField(value: unknown): value is ChangeField {
  return changeOptions.some((option) => option.value === value);
}

function formatFileSize(bytes: number) {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ChangeProfilePage() {
  const [field, setField] = useState<ChangeField>("phone");
  const [newValue, setNewValue] = useState("");
  const [reason, setReason] = useState("");
  const [evidence, setEvidence] = useState<File | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [notice, setNotice] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectedOption = changeOptions.find((option) => option.value === field)!;

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      try {
        const savedDraft = window.localStorage.getItem(draftStorageKey);
        if (!savedDraft) return;

        const parsed: unknown = JSON.parse(savedDraft);
        if (typeof parsed !== "object" || parsed === null) return;

        const draft = parsed as Partial<RequestDraft>;
        if (isChangeField(draft.field)) setField(draft.field);
        if (typeof draft.newValue === "string") setNewValue(draft.newValue);
        if (typeof draft.reason === "string") setReason(draft.reason);
      } catch {
        setNotice("เปิดฉบับร่างที่บันทึกไว้ไม่สำเร็จ คุณสามารถกรอกคำขอใหม่ได้");
      }
    }, 0);

    return () => window.clearTimeout(timerId);
  }, []);

  function chooseEvidence(file: File | undefined) {
    setNotice("");
    if (!file) return;

    const extensionIsAllowed = /\.(pdf|jpe?g|png)$/i.test(file.name);
    const fileIsTooLarge = file.size > 10 * 1024 * 1024;
    if (!extensionIsAllowed) {
      setEvidence(null);
      setNotice("ไฟล์ไม่รองรับ กรุณาเลือก PDF, JPG หรือ PNG");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    if (fileIsTooLarge) {
      setEvidence(null);
      setNotice("ไฟล์มีขนาดเกิน 10 MB กรุณาเลือกไฟล์ที่มีขนาดเล็กกว่า");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setEvidence(file);
  }

  function saveDraft() {
    const draft: RequestDraft = { field, newValue, reason };
    try {
      window.localStorage.setItem(draftStorageKey, JSON.stringify(draft));
      setNotice(
        evidence
          ? "บันทึกฉบับร่างแล้ว ไฟล์แนบจะต้องเลือกใหม่เมื่อกลับมากรอกต่อ"
          : "บันทึกฉบับร่างแล้ว คุณกลับมากรอกต่อได้ภายหลัง",
      );
    } catch {
      setNotice("บันทึกฉบับร่างไม่สำเร็จ กรุณาตรวจสอบพื้นที่จัดเก็บในเบราว์เซอร์");
    }
  }

  function submitRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      window.localStorage.removeItem(draftStorageKey);
    } catch {
      setNotice("ส่งคำขอไม่ได้ เนื่องจากไม่สามารถล้างฉบับร่างเดิมได้ กรุณาลองอีกครั้ง");
      return;
    }
    setSubmitted(true);
    setNotice("");
  }

  return (
    <div className="mx-auto max-w-[1160px] px-1 pb-8 pt-2 text-13 text-ink">
      <nav aria-label="เส้นทางนำทาง" className="mb-3 text-12 text-muted">
        <Link href="/employee/profile" className="underline-offset-4 hover:text-ink hover:underline">
          พนักงาน
        </Link>
        <span className="mx-2" aria-hidden="true">/</span>
        <Link href="/employee/profile" className="underline-offset-4 hover:text-ink hover:underline">
          โปรไฟล์ของฉัน
        </Link>
        <span className="mx-2" aria-hidden="true">/</span>
        <span aria-current="page">ยื่นคำขอเปลี่ยนข้อมูล</span>
      </nav>

      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-22 font-semibold tracking-tight text-ink">
            ยื่นคำขอเปลี่ยนข้อมูล
          </h1>
          <p className="mt-1 text-12 text-ink-soft">
            กรอกข้อมูลที่ต้องการเปลี่ยนและแนบหลักฐาน · ช่องที่มี * จำเป็นต้องกรอก
          </p>
        </div>
        <Link
          href="/employee/profile"
          className="inline-flex min-h-9 items-center rounded-md border border-line bg-white px-3 text-12 font-medium text-ink-soft transition hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
        >
          กลับไปโปรไฟล์
        </Link>
      </header>

      <aside className="mb-4 flex items-start gap-3 rounded-md border border-line bg-surface px-4 py-3">
        <Lock className="size-4 shrink-0 mt-0.5 text-ink-soft" aria-hidden="true" />
        <div>
          <h2 className="text-12 font-semibold text-ink">
            ฝ่ายบุคคลเท่านั้นที่แก้ไขข้อมูลจริงได้
          </h2>
          <p className="mt-1 text-11 leading-5 text-ink-soft">
            การส่งคำขอนี้ไม่เปลี่ยนข้อมูลของคุณโดยอัตโนมัติ ข้อมูลจะเปลี่ยนหลังจากฝ่ายบุคคลตรวจสอบและอนุมัติเท่านั้น
          </p>
        </div>
      </aside>

      <ol aria-label="ขั้นตอนการยื่นคำขอ" className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 border-y border-line py-3 text-12">
        <li aria-current="step" className="flex items-center gap-2 font-semibold text-ink">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-600 text-10 text-white">1</span>
          กรอกข้อมูลและแนบหลักฐาน
        </li>
        <li className="text-muted" aria-hidden="true">→</li>
        <li className="flex items-center gap-2 text-muted">
          <span className="flex h-5 w-5 items-center justify-center rounded-full border border-line text-10">2</span>
          รอฝ่ายบุคคลตรวจสอบ
        </li>
        <li className="text-muted" aria-hidden="true">→</li>
        <li className="flex items-center gap-2 text-muted">
          <span className="flex h-5 w-5 items-center justify-center rounded-full border border-line text-10">3</span>
          ติดตามผลในโปรไฟล์
        </li>
      </ol>

      {submitted ? (
        <section
          aria-labelledby="submitted-title"
          className="rounded-lg border border-line bg-white p-6 sm:p-8"
        >
          <div className="mx-auto max-w-xl text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-50 text-primary-700">
              <Check className="size-4 shrink-0 text-18" aria-hidden="true" />
            </span>
            <h2 id="submitted-title" className="mt-4 text-17 font-semibold text-ink">
              ตรวจสอบข้อมูลเรียบร้อย
            </h2>
            <p className="mt-2 text-13 leading-6 text-ink-soft">
              คำขอเปลี่ยน{selectedOption.label}พร้อมสำหรับส่งให้ฝ่ายบุคคลตรวจสอบ
            </p>
            <p className="mt-4 rounded-md bg-surface px-4 py-3 text-12 leading-5 text-ink-soft">
              หน้าจอตัวอย่างนี้ยังไม่ได้เชื่อมต่อระบบส่งคำขอจริง ข้อมูลจึงยังไม่ถูกส่งไปยังฝ่ายบุคคล
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={() => setSubmitted(false)}
                className="min-h-10 rounded-md border border-line bg-white px-4 text-13 font-medium text-ink-soft transition hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
              >
                กลับไปแก้ไข
              </button>
              <Link
                href="/employee/profile"
                className="inline-flex min-h-10 items-center rounded-md bg-primary-600 px-4 text-13 font-medium text-white transition hover:bg-primary-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
              >
                กลับไปโปรไฟล์
              </Link>
            </div>
          </div>
        </section>
      ) : (
        <form onSubmit={submitRequest} className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.8fr)_minmax(250px,0.8fr)]">
          <div className="grid min-w-0 gap-4">
            <section aria-labelledby="requester-title" className="rounded-md border border-line bg-white p-4">
              <h2 id="requester-title" className="text-13 font-semibold text-ink">
                ข้อมูลผู้ยื่นคำขอ
              </h2>
              <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <dt className="text-11 text-muted">ชื่อ-นามสกุล</dt>
                  <dd className="mt-1 text-12 font-medium text-ink">กมลชนก ใจดี</dd>
                </div>
                <div>
                  <dt className="text-11 text-muted">รหัสพนักงาน</dt>
                  <dd className="mt-1 text-12 font-medium text-ink">EMP-1024</dd>
                </div>
                <div>
                  <dt className="text-11 text-muted">หน่วยงาน</dt>
                  <dd className="mt-1 text-12 font-medium text-ink">ฝ่ายการตลาด</dd>
                </div>
              </dl>
              <p className="mt-3 border-t border-slate-100 pt-3 text-11 text-ink-soft">
                อีเมล kamonchanok.j@example.com · โทร. 081-234-5678
              </p>
              <p className="mt-2 text-10 text-muted">
                ข้อมูลผู้ยื่นคำขอมาจากระบบ ไม่สามารถแก้ไขจากแบบฟอร์มนี้ได้
              </p>
            </section>

            <section aria-labelledby="change-details-title" className="rounded-md border border-line bg-white p-4">
              <h2 id="change-details-title" className="text-13 font-semibold text-ink">
                ข้อมูลที่ขอเปลี่ยน
              </h2>

              <div className="mt-3">
                <label htmlFor="change-field" className="mb-1.5 block text-12 font-medium text-ink">
                  เลือกข้อมูลที่ต้องการเปลี่ยน <span aria-hidden="true">*</span>
                </label>
                <select
                  id="change-field"
                  value={field}
                  onChange={(event) => {
                    setField(event.target.value as ChangeField);
                    setNewValue("");
                  }}
                  className={inputClassName}
                  required
                >
                  {changeOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <p className="mt-1.5 text-10 leading-4 text-muted">
                  เลือกได้หนึ่งรายการต่อคำขอ หากต้องการเปลี่ยนหลายรายการ กรุณาส่งคำขอแยก
                </p>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="current-value" className="mb-1.5 block text-12 font-medium text-ink-soft">
                    ค่าเดิมในโปรไฟล์
                  </label>
                  <input
                    id="current-value"
                    value={currentValues[field]}
                    readOnly
                    className={`${inputClassName} bg-surface text-muted`}
                  />
                </div>
                <div>
                  <label htmlFor="new-value" className="mb-1.5 block text-12 font-medium text-ink">
                    ค่าใหม่ที่ต้องการ <span aria-hidden="true">*</span>
                  </label>
                  {selectedOption.type === "textarea" ? (
                    <textarea
                      id="new-value"
                      value={newValue}
                      onChange={(event) => setNewValue(event.target.value)}
                      placeholder={selectedOption.placeholder}
                      rows={3}
                      className={inputClassName}
                      required
                    />
                  ) : (
                    <input
                      id="new-value"
                      type={selectedOption.type}
                      value={newValue}
                      onChange={(event) => setNewValue(event.target.value)}
                      placeholder={selectedOption.placeholder}
                      autoComplete={field === "phone" ? "tel" : field === "email" ? "email" : "name"}
                      className={inputClassName}
                      required
                    />
                  )}
                </div>
              </div>
              <p className="mt-1.5 text-10 text-muted">
                ข้อมูลใหม่จะถูกบันทึกหลังจากฝ่ายบุคคลตรวจสอบและอนุมัติแล้วเท่านั้น
              </p>

              <div className="mt-3">
                <label htmlFor="change-reason" className="mb-1.5 block text-12 font-medium text-ink">
                  เหตุผลในการขอเปลี่ยนข้อมูล <span aria-hidden="true">*</span>
                </label>
                <textarea
                  id="change-reason"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="อธิบายเหตุผลที่ต้องการเปลี่ยนข้อมูล"
                  className={inputClassName}
                  required
                />
                <p className="mt-1 text-right text-10 text-muted">{reason.length}/500</p>
              </div>
            </section>

            <section aria-labelledby="evidence-title" className="rounded-md border border-line bg-white p-4">
              <h2 id="evidence-title" className="text-13 font-semibold text-ink">
                หลักฐานประกอบคำขอ <span aria-hidden="true">*</span>
              </h2>
              <label
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  chooseEvidence(event.dataTransfer.files[0]);
                }}
                className="mt-3 flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-line bg-surface px-4 py-4 text-center transition hover:border-primary-500 hover:bg-primary-50/40 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary-600"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  required
                  onChange={(event) => chooseEvidence(event.target.files?.[0])}
                  className="sr-only"
                  aria-label="เลือกไฟล์หลักฐาน"
                />
                <Upload className="size-4 shrink-0 text-14 text-ink-soft" aria-hidden="true" />
                <span className="mt-1 text-12 font-medium text-ink">
                  {evidence ? "เลือกไฟล์ใหม่" : "ลากไฟล์มาที่นี่ หรือเลือกไฟล์"}
                </span>
                <span className="mt-1 text-10 text-muted">PDF, JPG, PNG · ไม่เกิน 10 MB · สูงสุด 1 ไฟล์</span>
              </label>

              {evidence && (
                <div className="mt-3 flex items-center justify-between gap-3 rounded-md border border-line px-3 py-2.5">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <FileText className="size-4 shrink-0 text-ink-soft" aria-hidden="true" />
                    <div className="min-w-0">
                      <p className="truncate text-12 font-medium text-ink">{evidence.name}</p>
                      <p className="text-10 text-muted">{formatFileSize(evidence.size)}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEvidence(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    aria-label={`ลบไฟล์ ${evidence.name}`}
                    className="shrink-0 rounded px-2 py-1 text-11 text-ink-soft underline underline-offset-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
                  >
                    ลบ
                  </button>
                </div>
              )}
            </section>

            <div>
              <label className="flex cursor-pointer items-start gap-2.5 text-12 leading-5 text-ink-soft">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(event) => setAgreed(event.target.checked)}
                  required
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-line accent-primary-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
                />
                <span>
                  ฉันรับรองว่าข้อมูลและหลักฐานเป็นความจริง และยินยอมให้บริษัทตรวจสอบข้อมูลเพื่อดำเนินการตามคำขอ <span aria-hidden="true">*</span>
                </span>
              </label>
              {notice && (
                <p role="status" aria-live="polite" className="mt-3 rounded-md border border-line bg-surface px-3 py-2 text-12 leading-5 text-ink-soft">
                  {notice}
                </p>
              )}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
                <Link
                  href="/employee/profile"
                  className="inline-flex min-h-10 items-center rounded-md border border-line bg-white px-4 text-12 font-medium text-ink-soft transition hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
                >
                  ยกเลิก
                </Link>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={saveDraft}
                    className="min-h-10 rounded-md border border-line bg-white px-4 text-12 font-medium text-ink-soft transition hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
                  >
                    บันทึกฉบับร่าง
                  </button>
                  <button
                    type="submit"
                    className="min-h-10 rounded-md bg-primary-600 px-4 text-12 font-medium text-white transition hover:bg-primary-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
                  >
                    ส่งคำขอให้บุคคล
                  </button>
                </div>
              </div>
            </div>
          </div>

          <aside className="grid content-start gap-4">
            <section aria-labelledby="review-title" className="rounded-md border border-line bg-white p-4">
              <h2 id="review-title" className="text-13 font-semibold text-ink">ตรวจสอบก่อนส่ง</h2>
              <dl className="mt-3 space-y-3">
                <div>
                  <dt className="text-10 text-muted">เลขที่คำขอ</dt>
                  <dd className="mt-1 text-12 font-medium text-ink">PC-2569-009</dd>
                </div>
                <div>
                  <dt className="text-10 text-muted">ข้อมูลที่ขอเปลี่ยน</dt>
                  <dd className="mt-1 text-12 font-medium text-ink">{selectedOption.label}</dd>
                </div>
                <div>
                  <dt className="text-10 text-muted">ค่าเดิมในโปรไฟล์</dt>
                  <dd className="mt-1 break-words text-12 font-medium text-ink">{currentValues[field]}</dd>
                </div>
                <div>
                  <dt className="text-10 text-muted">ค่าที่ขอเปลี่ยน</dt>
                  <dd className="mt-1 break-words text-12 font-medium text-ink">{newValue || "ยังไม่ได้ระบุ"}</dd>
                </div>
                <div className="border-t border-line pt-3">
                  <dt className="text-10 text-muted">หลักฐานที่แนบ</dt>
                  <dd className="mt-1 text-12 font-medium text-ink">{evidence ? "1 ไฟล์" : "ยังไม่ได้แนบ"}</dd>
                </div>
                <div>
                  <dt className="text-10 text-muted">ส่งถึง</dt>
                  <dd className="mt-1 text-12 font-medium text-ink">ฝ่ายบุคคล (HR)</dd>
                </div>
              </dl>
              <p className="mt-3 border-t border-slate-100 pt-3 text-10 leading-5 text-muted">
                การส่งคำขอไม่ได้เปลี่ยนข้อมูลทันที ข้อมูลจะเปลี่ยนหลังผ่านการตรวจสอบและอนุมัติ
              </p>
            </section>

            <section aria-labelledby="process-title" className="rounded-md border border-line bg-white p-4">
              <h2 id="process-title" className="text-13 font-semibold text-ink">หลังส่งคำขอ</h2>
              <ol className="mt-3 divide-y divide-slate-200">
                <li className="flex gap-2.5 py-3 first:pt-0">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-sm bg-primary-50 text-10 font-medium text-ink-soft">1</span>
                  <div>
                    <h3 className="text-12 font-medium text-ink">ฝ่ายบุคคลตรวจสอบ</h3>
                    <p className="mt-1 text-10 leading-4 text-muted">ตรวจสอบข้อมูลและหลักฐานประกอบคำขอ</p>
                  </div>
                </li>
                <li className="flex gap-2.5 py-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-sm bg-primary-50 text-10 font-medium text-ink-soft">2</span>
                  <div>
                    <h3 className="text-12 font-medium text-ink">อนุมัติและบันทึกข้อมูล</h3>
                    <p className="mt-1 text-10 leading-4 text-muted">ข้อมูลใหม่จะแสดงในโปรไฟล์หลังอนุมัติ</p>
                  </div>
                </li>
                <li className="flex gap-2.5 py-3 last:pb-0">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-sm bg-primary-50 text-10 font-medium text-ink-soft">3</span>
                  <div>
                    <h3 className="text-12 font-medium text-ink">ตรวจสอบผลในโปรไฟล์</h3>
                    <p className="mt-1 text-10 leading-4 text-muted">ดูสถานะและผลการเปลี่ยนข้อมูลได้ที่หน้าโปรไฟล์</p>
                  </div>
                </li>
              </ol>
              <p className="mt-3 border-t border-slate-100 pt-3 text-10 leading-5 text-muted">
                หากมีข้อสงสัย โปรดติดต่อฝ่ายบุคคลของคุณ
              </p>
            </section>
          </aside>
        </form>
      )}
    </div>
  );
}
