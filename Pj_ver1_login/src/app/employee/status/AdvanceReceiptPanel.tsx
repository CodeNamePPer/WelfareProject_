'use client';

import { useNavTransition } from "@/lib/useNavTransition";
import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { ALLOWED_ATTACHMENT_TYPES, MAX_ATTACHMENT_BYTES } from "@/lib/claims/forms";
import { cx } from "@/lib/cx";
import { Sheet, inputClass, labelClass, pill } from "@/features/requester/ui";

export type AdvanceInfo = {
  statusLabel: string;
  /** แถวสรุป เช่น ยอดล่วงหน้า กำหนดแนบ */
  facts: { label: string; value: string }[];
  /** ข้อความจาก HR เมื่อส่งกลับให้แนบใหม่ */
  returnNote: string | null;
  /** แนบใบเสร็จได้ตอนนี้ (โอนเงินแล้ว ยังไม่เกินกำหนด) */
  canSubmit: boolean;
  /** เหตุที่ยังแนบไม่ได้ */
  waitingNote: string | null;
  today: string;
};

const Required = () => <span className="text-danger"> *</span>;

/** เบิกล่วงหน้า: สถานะเงินล่วงหน้า และฟอร์มแนบใบเสร็จจริงหลังได้รับเงิน */
export function AdvanceReceiptPanel({ claimNo, advance }: { claimNo: string; advance: AdvanceInfo }) {
  const nav = useNavTransition();
  const [amount, setAmount] = useState("");
  const [receiptNo, setReceiptNo] = useState("");
  const [receiptDate, setReceiptDate] = useState("");
  const [issuerName, setIssuerName] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  function addFiles(selected: FileList | null) {
    const picked = Array.from(selected ?? []);
    const bad = picked.find((file) => !ALLOWED_ATTACHMENT_TYPES.includes(file.type) || file.size > MAX_ATTACHMENT_BYTES);
    setError(bad ? `ไฟล์ ${bad.name} ต้องเป็น PDF, JPG หรือ PNG และมีขนาดไม่เกิน 10 MB` : "");
    setFiles((current) => [...current, ...picked.filter((file) => file !== bad)]);
    if (fileInput.current) fileInput.current.value = "";
  }

  async function submit() {
    if (busy) return;
    if (!(Number(amount) > 0) || !receiptNo.trim() || !receiptDate || !issuerName.trim()) return setError("กรุณากรอกข้อมูลใบเสร็จให้ครบถ้วน");
    if (files.length === 0) return setError("กรุณาแนบใบเสร็จอย่างน้อย 1 ไฟล์");
    setBusy(true);
    setError("");
    try {
      const body = new FormData();
      body.set("amount", amount);
      body.set("receiptNo", receiptNo);
      body.set("receiptDate", receiptDate);
      body.set("issuerName", issuerName);
      files.forEach((file) => body.append("files", file));
      const response = await fetch(`/api/claims/${encodeURIComponent(claimNo)}/receipt`, { method: "POST", body });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) return setError(data.error ?? "ส่งใบเสร็จไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
      setFiles([]);
      nav.refresh();
    } catch {
      setError("เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet aria-labelledby="advance-title" className="flex flex-col gap-3.5 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="advance-title" className="text-16 font-semibold">
          เบิกล่วงหน้า
        </h2>
        <span className="text-13 text-ink-soft">{advance.statusLabel}</span>
      </div>
      <dl className="grid gap-x-4 gap-y-3.5 sm:grid-cols-2 lg:grid-cols-3">
        {advance.facts.map((fact) => (
          <div key={fact.label} className="min-w-0">
            <dt className="text-12 text-muted">{fact.label}</dt>
            <dd className="break-words">{fact.value}</dd>
          </div>
        ))}
      </dl>
      {advance.returnNote ? (
        <p className="rounded-lg border border-orange-300 bg-orange-50 px-3 py-2.5 text-13 text-orange-950">
          <b className="font-semibold">HR ส่งกลับ:</b> {advance.returnNote}
        </p>
      ) : null}
      {advance.waitingNote ? <p className="rounded-lg bg-surface px-3 py-2.5 text-13 text-ink-soft">{advance.waitingNote}</p> : null}

      {advance.canSubmit ? (
        <div className="flex flex-col gap-3.5 border-t border-line pt-3.5">
          <h3 className="text-14 font-semibold">แนบใบเสร็จจริง</h3>
          <div className="grid gap-3.5 sm:grid-cols-2">
            <div>
              <label htmlFor="adv-amount" className={labelClass}>
                ยอดตามใบเสร็จ (บาท)
                <Required />
              </label>
              <input id="adv-amount" type="number" inputMode="decimal" min={0} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className={cx(inputClass, "text-right tabular-nums")} />
            </div>
            <div>
              <label htmlFor="adv-issuer" className={labelClass}>
                ผู้ออกใบเสร็จ
                <Required />
              </label>
              <input id="adv-issuer" value={issuerName} onChange={(e) => setIssuerName(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label htmlFor="adv-receipt-no" className={labelClass}>
                เลขที่ใบเสร็จ
                <Required />
              </label>
              <input id="adv-receipt-no" value={receiptNo} onChange={(e) => setReceiptNo(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label htmlFor="adv-receipt-date" className={labelClass}>
                วันที่ในใบเสร็จ
                <Required />
              </label>
              <input id="adv-receipt-date" type="date" max={advance.today} value={receiptDate} onChange={(e) => setReceiptDate(e.target.value)} className={inputClass} />
            </div>
          </div>
          <label
            htmlFor="adv-files"
            className="flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border-[1.5px] border-dashed border-blue-300 bg-[#F8FAFF] p-4 text-13 text-primary-700 hover:bg-primary-50 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary-500"
          >
            <Upload className="size-5 text-primary-600" aria-hidden="true" />
            <span className="font-semibold">เลือกไฟล์ใบเสร็จ</span>
            <span className="text-12 text-muted">PDF, JPG, PNG ไม่เกิน 10 MB ต่อไฟล์</span>
            <input id="adv-files" ref={fileInput} type="file" multiple accept=".pdf,.jpg,.jpeg,.png" className="sr-only" onChange={(e) => addFiles(e.target.files)} />
          </label>
          {files.length > 0 ? (
            <ul className="flex flex-col gap-1.5 text-13">
              {files.map((file, index) => (
                <li key={`${file.name}-${index}`} className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2">
                  <span className="min-w-0 truncate">{file.name}</span>
                  <button type="button" className="shrink-0 text-primary-600 hover:underline" onClick={() => setFiles((current) => current.filter((_, i) => i !== index))}>
                    นำออก
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {error ? (
            <p role="alert" className="text-13 text-status-rejected">
              {error}
            </p>
          ) : null}
          <div>
            <button type="button" disabled={busy || nav.isPending} onClick={() => void submit()} className={pill.primary}>
              {busy || nav.isPending ? "กำลังส่ง..." : "ส่งใบเสร็จให้ HR ตรวจ"}
            </button>
          </div>
        </div>
      ) : null}
    </Sheet>
  );
}
