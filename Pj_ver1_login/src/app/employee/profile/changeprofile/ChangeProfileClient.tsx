'use client';
import { Check, FileText, Upload } from "lucide-react";

import Link from "next/link";
import { useNavTransition } from "@/lib/useNavTransition";
import { useEffect, useRef, useState } from "react";
import type { MyProfile } from "@/lib/employee/profile";
import type { MyPendingEditRequest } from "@/lib/hr/editRequests";
import { PageHead, Sheet, inputClass, labelClass, pill } from "@/features/requester/ui";
import { cx } from "@/lib/cx";

const draftStorageKey = "profile-change-draft";

const changeOptions = [
  { value: "phone", label: "เบอร์โทรศัพท์", type: "tel", placeholder: "ระบุเบอร์โทรศัพท์ใหม่" },
  { value: "email", label: "อีเมล", type: "email", placeholder: "ระบุอีเมลใหม่" },
  { value: "name", label: "ชื่อ-นามสกุล", type: "text", placeholder: "ระบุชื่อ-นามสกุลใหม่" },
  { value: "address", label: "ที่อยู่ปัจจุบัน", type: "textarea", placeholder: "ระบุที่อยู่ปัจจุบัน" },
  // ผู้ติดต่อฉุกเฉินมี 2 ช่อง: ชื่อ (newValue) และเบอร์โทร (newPhone)
  { value: "emergency", label: "ผู้ติดต่อฉุกเฉิน", type: "emergency", placeholder: "ชื่อ-นามสกุลผู้ติดต่อฉุกเฉิน" },
] as const;

type ChangeField = (typeof changeOptions)[number]["value"];

type RequestDraft = {
  field: ChangeField;
  newValue: string;
  newPhone?: string;
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

const thaiDateTime = (iso: string) => new Date(iso).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bangkok" });

export default function ChangeProfileClient({ profile, pending }: { profile: MyProfile; pending: MyPendingEditRequest | null }) {
  const nav = useNavTransition();
  const currentValues: Record<ChangeField, string> = {
    phone: profile.phone ?? "—",
    email: profile.email,
    name: profile.name,
    address: profile.address ?? "—",
    emergency: profile.emergencyContact ?? "—",
  };
  const [field, setField] = useState<ChangeField>("phone");
  const [newValue, setNewValue] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [reason, setReason] = useState("");
  const [evidence, setEvidence] = useState<File | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [notice, setNotice] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectedOption = changeOptions.find((option) => option.value === field)!;
  // อีเมลเป็นชื่อเข้าระบบ เปลี่ยนผ่านคำขอนี้ไม่ได้ ต้องให้ Admin เปลี่ยนในหน้าตั้งค่าผู้ใช้
  const emailSelected = field === "email";

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
        if (typeof draft.newPhone === "string") setNewPhone(draft.newPhone);
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
    const draft: RequestDraft = { field, newValue, newPhone, reason };
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

  async function submitRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending || emailSelected) return;
    if (!evidence) {
      setSubmitError("แนบหลักฐานประกอบคำขอ");
      return;
    }
    setSending(true);
    setSubmitError("");
    setNotice("");
    try {
      const body = new FormData();
      body.set("field", field);
      body.set("value", newValue);
      if (field === "emergency") body.set("value2", newPhone);
      body.set("reason", reason);
      body.set("evidence", evidence);
      const response = await fetch("/api/employee/edit-request", { method: "POST", body });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setSubmitError(result.error ?? "ส่งคำขอไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
        return;
      }
      try {
        window.localStorage.removeItem(draftStorageKey);
      } catch {
        // ส่งคำขอสำเร็จแล้ว ฉบับร่างที่ค้างไม่กระทบคำขอ
      }
      setSubmitted(true);
      nav.refresh();
    } catch {
      setSubmitError("เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ คำขอยังไม่ถูกส่ง กรุณาลองใหม่อีกครั้ง");
    } finally {
      setSending(false);
    }
  }

  const crumbs = [
    { label: "พนักงาน", href: "/employee/profile" },
    { label: "โปรไฟล์ของฉัน", href: "/employee/profile" },
    { label: "ยื่นคำขอเปลี่ยนข้อมูล" },
  ];

  return (
    <div className="mx-auto max-w-[1160px] group-data-[nav=collapsed]/shell:max-w-none px-1 pb-8 pt-2 text-13 text-ink">
      <div className="mx-auto grid max-w-[720px] gap-5">
        <PageHead
          crumbs={crumbs}
          title="ยื่นคำขอเปลี่ยนข้อมูล"
          description="ฝ่ายบุคคลจะตรวจสอบก่อนเปลี่ยนข้อมูลในโปรไฟล์ · ช่องที่มี * จำเป็นต้องกรอก"
        >
          <Link href="/employee/profile" className={pill.quiet}>
            กลับไปโปรไฟล์
          </Link>
        </PageHead>

        {submitted || pending ? (
          <Sheet aria-labelledby="submitted-title" className="p-6 sm:p-8">
            <div className="mx-auto max-w-xl text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-50 text-primary-700">
                <Check className="size-5 shrink-0" aria-hidden="true" />
              </span>
              <h2 id="submitted-title" className="mt-4 text-17 font-semibold text-ink">
                {submitted ? "ส่งคำขอให้ฝ่ายบุคคลแล้ว" : "มีคำขอที่รอฝ่ายบุคคลตรวจอยู่"}
              </h2>
              <p className="mt-2 text-13 leading-6 text-ink-soft">
                {submitted
                  ? `คำขอเปลี่ยน${selectedOption.label}อยู่ระหว่างรอฝ่ายบุคคลตรวจสอบ ข้อมูลในโปรไฟล์จะเปลี่ยนหลังอนุมัติ`
                  : `คำขอเปลี่ยน${pending!.labels.join(", ")} ส่งเมื่อ ${thaiDateTime(pending!.submittedAt)} ส่งคำขอใหม่ได้หลังฝ่ายบุคคลตรวจคำขอนี้แล้ว`}
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <Link href="/employee/profile" className={pill.primary}>
                  กลับไปโปรไฟล์
                </Link>
              </div>
            </div>
          </Sheet>
        ) : (
          <form onSubmit={submitRequest} className="grid gap-2">
            <Sheet aria-label="แบบฟอร์มคำขอเปลี่ยนข้อมูล" className="divide-y divide-line">
              <div className="grid gap-4 p-5">
                <h2 className="text-15 font-semibold text-ink">ข้อมูลที่ขอเปลี่ยน</h2>

                <div>
                  <label htmlFor="change-field" className={labelClass}>
                    เลือกข้อมูลที่ต้องการเปลี่ยน <span aria-hidden="true">*</span>
                  </label>
                  <select
                    id="change-field"
                    value={field}
                    onChange={(event) => {
                      setField(event.target.value as ChangeField);
                      setNewValue("");
                      setNewPhone("");
                    }}
                    className={inputClass}
                    required
                  >
                    {changeOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  <p className="mt-1.5 text-12 text-muted">
                    หนึ่งรายการต่อคำขอ หากต้องการเปลี่ยนหลายรายการ กรุณาส่งคำขอแยก
                  </p>
                  {emailSelected && (
                    <p role="note" className="mt-2 rounded-lg border border-line bg-surface px-3 py-2 text-13 leading-5 text-ink-soft">
                      อีเมลใช้เป็นชื่อเข้าระบบ จึงเปลี่ยนผ่านคำขอนี้ไม่ได้ กรุณาติดต่อผู้ดูแลระบบ (Admin) ให้เป็นผู้เปลี่ยน
                    </p>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p id="current-value-label" className={labelClass}>
                      ค่าเดิมในโปรไฟล์
                    </p>
                    {/* แสดงเป็นข้อความ ไม่ใช่ช่องกรอก เพื่อไม่ให้ดูเหมือนแก้ไขได้ */}
                    <div
                      aria-labelledby="current-value-label"
                      className="flex min-h-[42px] cursor-not-allowed items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-14 text-ink-soft"
                    >
                      <span className="min-w-0 break-words">{currentValues[field]}</span>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="new-value" className={labelClass}>
                      ค่าใหม่ที่ต้องการ <span aria-hidden="true">*</span>
                    </label>
                    {selectedOption.type === "emergency" ? (
                      <div className="grid gap-2">
                        <input
                          id="new-value"
                          type="text"
                          value={newValue}
                          onChange={(event) => setNewValue(event.target.value)}
                          placeholder={selectedOption.placeholder}
                          aria-label="ชื่อ-นามสกุลผู้ติดต่อฉุกเฉินใหม่"
                          className={inputClass}
                          required
                        />
                        <input
                          type="tel"
                          value={newPhone}
                          onChange={(event) => setNewPhone(event.target.value)}
                          placeholder="เบอร์โทรผู้ติดต่อฉุกเฉิน"
                          aria-label="เบอร์โทรผู้ติดต่อฉุกเฉินใหม่"
                          autoComplete="off"
                          className={inputClass}
                          required
                        />
                      </div>
                    ) : selectedOption.type === "textarea" ? (
                      <textarea
                        id="new-value"
                        value={newValue}
                        onChange={(event) => setNewValue(event.target.value)}
                        placeholder={selectedOption.placeholder}
                        rows={3}
                        className={cx(inputClass, "h-auto py-2.5")}
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
                        className={inputClass}
                        required
                      />
                    )}
                  </div>
                </div>

                <div>
                  <label htmlFor="change-reason" className={labelClass}>
                    เหตุผลในการขอเปลี่ยนข้อมูล <span aria-hidden="true">*</span>
                  </label>
                  <textarea
                    id="change-reason"
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    rows={3}
                    maxLength={500}
                    placeholder="อธิบายเหตุผลที่ต้องการเปลี่ยนข้อมูล"
                    className={cx(inputClass, "h-auto py-2.5")}
                    required
                  />
                  <p className="mt-1 text-right text-12 text-muted">{reason.length}/500</p>
                </div>
              </div>

              <div className="grid gap-3 p-5">
                <h2 id="evidence-title" className="text-15 font-semibold text-ink">
                  หลักฐานประกอบคำขอ <span aria-hidden="true">*</span>
                </h2>
                <label
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    chooseEvidence(event.dataTransfer.files[0]);
                  }}
                  className="flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-surface px-4 py-4 text-center transition hover:border-primary-500 hover:bg-primary-50/40 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary-600"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    // ไม่ใส่ required: ไฟล์ที่ลากมาวางไม่เข้า input นี้ (ซ่อนอยู่) เบราว์เซอร์จะบล็อกการส่งโดยมองไม่เห็นข้อความ
                    // submitRequest ตรวจ evidence เองและแสดงข้อความแทน
                    onChange={(event) => chooseEvidence(event.target.files?.[0])}
                    className="sr-only"
                    aria-label="เลือกไฟล์หลักฐาน"
                  />
                  <Upload className="size-4 shrink-0 text-ink-soft" aria-hidden="true" />
                  <span className="mt-1 text-13 font-medium text-ink">
                    {evidence ? "เลือกไฟล์ใหม่" : "ลากไฟล์มาที่นี่ หรือเลือกไฟล์"}
                  </span>
                  <span className="mt-1 text-12 text-muted">PDF, JPG, PNG · ไม่เกิน 10 MB · สูงสุด 1 ไฟล์</span>
                </label>

                {evidence && (
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2.5">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <FileText className="size-4 shrink-0 text-ink-soft" aria-hidden="true" />
                      <div className="min-w-0">
                        <p className="truncate text-13 font-medium text-ink">{evidence.name}</p>
                        <p className="text-12 text-muted">{formatFileSize(evidence.size)}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setEvidence(null);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      aria-label={`ลบไฟล์ ${evidence.name}`}
                      className="shrink-0 rounded px-2 py-1 text-12 text-ink-soft underline underline-offset-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
                    >
                      ลบ
                    </button>
                  </div>
                )}
              </div>

              <div className="grid gap-4 p-5">
                <label className="flex cursor-pointer items-start gap-2.5 text-13 leading-5 text-ink-soft">
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
                {submitError && (
                  <p role="alert" className="rounded-lg border border-line bg-white px-3 py-2 text-13 leading-5 text-status-rejected">
                    {submitError}
                  </p>
                )}
                {notice && (
                  <p role="status" aria-live="polite" className="rounded-lg border border-line bg-surface px-3 py-2 text-13 leading-5 text-ink-soft">
                    {notice}
                  </p>
                )}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Link href="/employee/profile" className={pill.quiet}>
                    ยกเลิก
                  </Link>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={saveDraft} className={pill.outline}>
                      บันทึกฉบับร่าง
                    </button>
                    <button type="submit" disabled={sending || emailSelected} className={pill.primary}>
                      {sending ? "กำลังส่ง..." : "ส่งคำขอให้ฝ่ายบุคคล"}
                    </button>
                  </div>
                </div>
              </div>
            </Sheet>

            <p className="px-1 text-12 text-muted">
              ผู้ยื่น {profile.name} · {profile.code} · {profile.department ?? "—"} · หลังส่งแล้วติดตามผลได้ที่หน้าโปรไฟล์
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
