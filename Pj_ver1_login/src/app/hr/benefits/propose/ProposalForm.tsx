'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState, type ChangeEvent } from 'react';
import { ImageIcon } from 'lucide-react';
import { cx } from '@/lib/cx';
import { useToast } from '@/components/ui/Toast';
import type { BudgetType, ProposalInput } from '@/lib/hr/proposals';
import { Avatar, BenefitPreview, Button, Card, Input, PageHeader, Select, Textarea, fieldClass, labelClass } from '@/features/hr/ui';

export type Level = { id: string; code: string; name: string };

const STEPS = ['ข้อมูลพื้นฐาน', 'วงเงินและเงื่อนไข', 'เอกสารที่ต้องแนบ', 'ตรวจทานและส่ง'];
const BUDGETS: { id: BudgetType; label: string; per: string }[] = [
  { id: 'yearly', label: 'รายปี', per: 'ต่อปี' },
  { id: 'monthly', label: 'รายเดือน', per: 'ต่อเดือน' },
  { id: 'per_claim', label: 'ต่อครั้ง', per: 'ต่อครั้ง' },
];
const DEFAULT_DOCS = ['ใบเสร็จรับเงิน'];
const money = (value: number) => value.toLocaleString('th-TH', { maximumFractionDigits: 2 });
const toNumber = (text: string) => (text.trim() === '' ? Number.NaN : Number(text.replace(/,/g, '')));
const thaiDate = (iso: string) => (iso ? new Date(`${iso}T00:00:00+07:00`).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

type Errors = Record<string, string>;

/** ฟอร์มเสนอสวัสดิการใหม่ 4 ขั้น + พรีวิว (ดีไซน์ H04) · direct = หัวหน้า HR สร้างเองทันที */
export function ProposalForm({
  mode,
  levels,
  categories,
  headName,
  initial,
}: {
  mode: 'propose' | 'direct';
  levels: Level[];
  categories: string[];
  headName: string | null;
  initial?: { id: string; input: ProposalInput; imageUrl: string | null };
}) {
  const router = useRouter();
  const { notify } = useToast();
  const start = initial?.input;
  const [step, setStep] = useState(0);
  const [name, setName] = useState(start?.name ?? '');
  const [category, setCategory] = useState(start?.category ?? '');
  const [description, setDescription] = useState(start?.description ?? '');
  const [detail, setDetail] = useState(start?.detail ?? '');
  const [imagePath, setImagePath] = useState<string | null>(start?.imagePath ?? null);
  const [imageUrl, setImageUrl] = useState<string | null>(initial?.imageUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [budgetType, setBudgetType] = useState<BudgetType>(start?.budgetType ?? 'yearly');
  const [amounts, setAmounts] = useState<Record<string, string>>(() =>
    Object.fromEntries(levels.map((level) => [level.id, String(start?.limits.find((limit) => limit.levelId === level.id)?.amount ?? '')])),
  );
  const [maxClaims, setMaxClaims] = useState(start?.maxClaims ? String(start.maxClaims) : '');
  const [effectiveFrom, setEffectiveFrom] = useState(start?.effectiveFrom ?? '');
  const [allowFamily, setAllowFamily] = useState(start?.allowFamily ?? false);
  const [allowInsurance, setAllowInsurance] = useState(start?.allowInsurance ?? false);
  const [allowAdvance, setAllowAdvance] = useState(start?.allowAdvance ?? false);
  const [documents, setDocuments] = useState<string[]>(start?.documents.length ? start.documents : DEFAULT_DOCS);
  const [newDoc, setNewDoc] = useState('');
  const [removed, setRemoved] = useState<{ name: string; index: number } | null>(null);
  const [reason, setReason] = useState(start?.reason ?? '');
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState<'draft' | 'submit' | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const limits = levels.map((level) => ({ levelId: level.id, amount: toNumber(amounts[level.id] ?? '') })).filter((limit) => !Number.isNaN(limit.amount));
  const filled = limits.filter((limit) => limit.amount > 0).map((limit) => limit.amount);
  // พรีวิวแสดงวงเงินของระดับที่ 3 ถ้ามี (ตามดีไซน์ "ระดับ L3") ไม่งั้นระดับสูงสุดที่กรอก
  const previewLevel = levels[2] ?? levels[levels.length - 1];
  const previewAmount = previewLevel && !Number.isNaN(toNumber(amounts[previewLevel.id] ?? '')) ? toNumber(amounts[previewLevel.id]) : filled.length ? Math.max(...filled) : null;
  const per = BUDGETS.find((item) => item.id === budgetType)?.per ?? '';
  const chips = [allowFamily ? 'เบิกให้ครอบครัวได้' : null, allowInsurance ? 'เบิกส่วนเกินประกันได้' : null, allowAdvance ? 'เบิกล่วงหน้าได้' : null].filter((chip): chip is string => chip !== null);
  const limitText = filled.length === 0 ? '—' : Math.min(...filled) === Math.max(...filled) ? `฿${money(filled[0])} ${per}` : `฿${money(Math.min(...filled))}–${money(Math.max(...filled))} ${per} ตามระดับ`;

  const input = (): ProposalInput => ({
    name,
    category,
    description,
    detail,
    imagePath,
    budgetType,
    limits,
    maxClaims: maxClaims.trim() ? Number(maxClaims) : null,
    effectiveFrom,
    allowFamily,
    allowInsurance,
    allowAdvance,
    documents,
    reason,
  });

  /** ตรวจทีละขั้นก่อนไปขั้นถัดไป (เซิร์ฟเวอร์ตรวจซ้ำอีกครั้งตอนส่ง) */
  function check(upTo: number): Errors {
    const found: Errors = {};
    if (upTo >= 0) {
      if (!name.trim()) found.name = 'กรอกชื่อสวัสดิการ';
      if (!category.trim()) found.category = 'เลือกหมวด';
      if (!description.trim()) found.description = 'กรอกคำอธิบายสั้นบนการ์ด';
      else if (description.length > 80) found.description = 'ไม่เกิน 80 ตัวอักษร';
      if (!imagePath) found.image = 'อัปโหลดรูปประกอบ';
    }
    if (upTo >= 1) {
      if (levels.some((level) => (amounts[level.id] ?? '').trim() && Number.isNaN(toNumber(amounts[level.id])))) found.limits = 'วงเงินต้องเป็นตัวเลข';
      else if (filled.length === 0) found.limits = 'กรอกวงเงินอย่างน้อย 1 ระดับ';
      if (maxClaims.trim() && !(Number.isInteger(Number(maxClaims)) && Number(maxClaims) >= 1)) found.maxClaims = 'จำนวนเต็มตั้งแต่ 1';
      if (!effectiveFrom) found.effectiveFrom = 'เลือกวันที่มีผล';
    }
    if (upTo >= 2 && documents.length === 0) found.documents = 'เพิ่มเอกสารอย่างน้อย 1 รายการ';
    if (upTo >= 3 && !reason.trim()) found.reason = mode === 'direct' ? 'ระบุเหตุผลที่สร้าง' : 'ระบุเหตุผลที่เสนอ';
    return found;
  }

  const firstStepWithError = (found: Errors) =>
    found.name || found.category || found.description || found.image ? 0 : found.limits || found.maxClaims || found.effectiveFrom ? 1 : found.documents ? 2 : 3;

  function next() {
    const found = check(step);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    if (step < STEPS.length - 1) setStep(step + 1);
    else void save('submit');
  }

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setErrors((current) => ({ ...current, image: '' }));
    try {
      const form = new FormData();
      form.append('file', file);
      const response = await fetch('/api/hr/proposals/image', { method: 'POST', body: form });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setErrors((current) => ({ ...current, image: body.error ?? 'อัปโหลดรูปไม่สำเร็จ' }));
        return;
      }
      setImagePath(body.path);
      setImageUrl(body.url ?? URL.createObjectURL(file));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function save(kind: 'draft' | 'submit') {
    if (busy) return;
    if (kind === 'submit') {
      const found = check(3);
      setErrors(found);
      if (Object.keys(found).length > 0) return setStep(firstStepWithError(found));
    } else if (!name.trim()) {
      setErrors({ name: 'กรอกชื่อสวัสดิการก่อนบันทึกร่าง' });
      return setStep(0);
    }
    setBusy(kind);
    try {
      const response = initial
        ? await fetch(`/api/hr/proposals/${initial.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'revise', input: input(), submit: kind === 'submit', message: reason }),
          })
        : await fetch('/api/hr/proposals', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ input: input(), submit: kind === 'submit' }),
          });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        const field = typeof body.field === 'string' ? body.field : 'form';
        setErrors({ [field]: body.error ?? 'บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง' });
        if (field !== 'form') setStep(firstStepWithError({ [field]: 'x' }));
        return;
      }
      notify(mode === 'direct' ? `สร้างสวัสดิการ ${body.benefitCode} แล้ว` : kind === 'draft' ? 'บันทึกฉบับร่างแล้ว' : 'ส่งข้อเสนอให้หัวหน้า HR แล้ว');
      router.push('/hr/benefits');
      router.refresh();
    } catch {
      setErrors({ form: 'เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง' });
    } finally {
      setBusy(null);
    }
  }

  function addDoc() {
    const value = newDoc.trim();
    if (!value || documents.includes(value)) return;
    setDocuments([...documents, value]);
    setNewDoc('');
    setErrors((current) => ({ ...current, documents: '' }));
  }

  function removeDoc(index: number) {
    setRemoved({ name: documents[index], index });
    setDocuments(documents.filter((_, i) => i !== index));
  }

  function undoRemove() {
    if (!removed) return;
    const copy = [...documents];
    copy.splice(removed.index, 0, removed.name);
    setDocuments(copy);
    setRemoved(null);
  }

  const title = mode === 'direct' ? 'สร้างสวัสดิการใหม่' : initial ? 'แก้ฉบับร่างข้อเสนอ' : 'เสนอสวัสดิการใหม่';
  const lastLabel = mode === 'direct' ? 'สร้างและเปิดใช้' : 'ส่งให้หัวหน้า HR';

  return (
    <>
      <PageHeader
        crumbs={[{ label: 'จัดการสวัสดิการ', href: '/hr/benefits' }, { label: title }]}
        title={title}
        description={
          mode === 'direct'
            ? 'กรอก 4 ขั้น ด้านขวาคือหน้าตาที่พนักงานจะเห็นจริง · หัวหน้า HR สร้างแล้วเปิดใช้ทันที'
            : 'กรอก 4 ขั้น ด้านขวาคือหน้าตาที่พนักงานจะเห็นจริง · ส่งให้หัวหน้า HR อนุมัติ'
        }
        actions={
          mode === 'propose' ? (
            <Button variant="secondary" onClick={() => void save('draft')} disabled={busy !== null}>
              {busy === 'draft' ? 'กำลังบันทึก...' : 'บันทึกฉบับร่าง'}
            </Button>
          ) : null
        }
      />

      <nav aria-label="ขั้นตอน" className="flex flex-wrap gap-2">
        {STEPS.map((label, index) => (
          <button
            key={label}
            type="button"
            onClick={() => index <= step && setStep(index)}
            aria-current={index === step ? 'step' : undefined}
            disabled={index > step}
            className={cx(
              'inline-flex h-9 items-center gap-2 rounded-[999px] border px-3.5 text-13 disabled:cursor-not-allowed',
              index === step ? 'border-[#1D4ED8] bg-[#EFF6FF] font-semibold text-[#1E40AF]' : index < step ? 'border-line bg-white text-ink' : 'border-line bg-white text-muted',
            )}
          >
            <span className={cx('flex size-5 items-center justify-center rounded-full text-11', index <= step ? 'bg-[#1D4ED8] text-white' : 'bg-mist text-muted')}>{index + 1}</span>
            {label}
          </button>
        ))}
      </nav>

      <div className="flex flex-wrap items-start gap-4">
        <Card className="flex min-w-0 flex-[999_1_560px] flex-col gap-4 p-5">
          {step === 0 ? (
            <>
              <h2 className="text-16 font-semibold">1. ข้อมูลพื้นฐาน</h2>
              <div className="grid gap-3.5 sm:grid-cols-2">
                <Input label={<>ชื่อสวัสดิการ <span className="text-[#B3261E]">*</span></>} value={name} onChange={(event) => setName(event.target.value)} error={errors.name} />
                <div>
                  <label htmlFor="proposal-category" className={labelClass}>
                    หมวด <span className="text-[#B3261E]">*</span>
                  </label>
                  <input id="proposal-category" list="proposal-categories" value={category} onChange={(event) => setCategory(event.target.value)} aria-invalid={errors.category ? true : undefined} className={fieldClass} placeholder="เลือกหรือพิมพ์หมวดใหม่" />
                  <datalist id="proposal-categories">
                    {categories.map((item) => (
                      <option key={item} value={item} />
                    ))}
                  </datalist>
                  {errors.category ? <p className="mt-1 text-12 text-[#991B1B]">{errors.category}</p> : null}
                </div>
              </div>
              <Input
                label={<>คำอธิบายสั้นบนการ์ด <span className="text-[#B3261E]">*</span> <span className="font-normal text-muted">(ไม่เกิน 80 ตัวอักษร)</span></>}
                value={description}
                maxLength={80}
                onChange={(event) => setDescription(event.target.value)}
                error={errors.description}
                hint={`${description.length}/80`}
              />
              <Textarea label="รายละเอียดเต็ม" rows={3} value={detail} onChange={(event) => setDetail(event.target.value)} />
              <div>
                <p className={labelClass}>
                  รูปประกอบ <span className="text-[#B3261E]">*</span>
                </p>
                <label htmlFor="proposal-image" className={cx('flex cursor-pointer items-center gap-3 rounded-[8px] border border-dashed p-3', errors.image ? 'border-[#991B1B]' : 'border-[#CBD5E1] hover:bg-surface')}>
                  {imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- พรีวิวรูปที่เพิ่งอัปโหลด
                    <img src={imageUrl} alt="รูปที่อัปโหลด" className="h-16 w-28 rounded-[6px] object-cover" />
                  ) : (
                    <span className="flex h-16 w-28 items-center justify-center rounded-[6px] bg-mist text-muted">
                      <ImageIcon className="size-6" aria-hidden="true" />
                    </span>
                  )}
                  <span className="text-13">
                    <b className="font-semibold text-[#1D4ED8]">{uploading ? 'กำลังอัปโหลด...' : imageUrl ? 'เปลี่ยนรูป' : 'เลือกรูป'}</b>
                    <br />
                    <span className="text-12 text-muted">JPG/PNG แนวนอน 16:9 อย่างน้อย 1200px · ไม่เกิน 5 MB</span>
                  </span>
                </label>
                <input ref={fileRef} id="proposal-image" type="file" accept="image/jpeg,image/png,image/webp" onChange={upload} className="sr-only" />
                {errors.image ? <p className="mt-1 text-12 text-[#991B1B]">{errors.image}</p> : null}
              </div>
            </>
          ) : null}

          {step === 1 ? (
            <>
              <h2 className="text-16 font-semibold">2. วงเงินและเงื่อนไข</h2>
              <div>
                <p className={labelClass}>รอบวงเงิน</p>
                <div role="group" aria-label="รอบวงเงิน" className="flex flex-wrap gap-2">
                  {BUDGETS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      aria-pressed={budgetType === item.id}
                      onClick={() => setBudgetType(item.id)}
                      className={cx('h-9 rounded-[999px] border px-4 text-13', budgetType === item.id ? 'border-[#1D4ED8] bg-[#EFF6FF] font-semibold text-[#1E40AF]' : 'border-[#CBD5E1] bg-white text-ink-soft')}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className={labelClass}>วงเงินตามระดับตำแหน่ง (บาท)</p>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {levels.map((level) => (
                    <label key={level.id} className="flex items-center gap-3 rounded-[8px] border border-line px-3 py-2">
                      <span className="min-w-0 flex-1 text-13">
                        {level.code} {level.name}
                      </span>
                      <input
                        aria-label={`วงเงิน ${level.code} ${level.name}`}
                        inputMode="decimal"
                        value={amounts[level.id] ?? ''}
                        onChange={(event) => setAmounts({ ...amounts, [level.id]: event.target.value })}
                        className={cx(fieldClass, '!h-9 w-32 text-right')}
                      />
                    </label>
                  ))}
                </div>
                {errors.limits ? <p className="mt-1 text-12 text-[#991B1B]">{errors.limits}</p> : null}
              </div>
              <div className="grid gap-3.5 sm:grid-cols-2">
                <Input label="จำนวนครั้งต่อปี" inputMode="numeric" value={maxClaims} onChange={(event) => setMaxClaims(event.target.value)} error={errors.maxClaims} hint="เว้นว่าง = ไม่จำกัด" />
                <Input label={<>มีผลตั้งแต่ <span className="text-[#B3261E]">*</span></>} type="date" value={effectiveFrom} onChange={(event) => setEffectiveFrom(event.target.value)} error={errors.effectiveFrom} />
              </div>
              <div className="flex flex-col gap-2 text-14">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={allowFamily} onChange={(event) => setAllowFamily(event.target.checked)} className="size-4 accent-[#1D4ED8]" />
                  เบิกให้ครอบครัวได้ (คู่สมรสจดทะเบียน, บุตร)
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={allowInsurance} onChange={(event) => setAllowInsurance(event.target.checked)} className="size-4 accent-[#1D4ED8]" />
                  เบิกส่วนเกินจากประกันได้
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={allowAdvance} onChange={(event) => setAllowAdvance(event.target.checked)} className="size-4 accent-[#1D4ED8]" />
                  เบิกล่วงหน้าได้
                </label>
                <label className="flex items-center gap-2 text-muted">
                  <input type="checkbox" checked readOnly disabled className="size-4" />
                  ทุกแผนกมีสิทธิ์
                </label>
              </div>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <h2 className="text-16 font-semibold">3. เอกสารที่ต้องแนบ</h2>
              {documents.length > 0 ? (
                <ul aria-label="เอกสารที่ต้องแนบ" className="m-0 flex list-none flex-col p-0">
                  {documents.map((doc, index) => (
                    <li key={doc} className="flex items-center justify-between gap-3 border-t border-[#F1F5F9] py-2.5 first:border-t-0">
                      <span>{doc}</span>
                      <button type="button" onClick={() => removeDoc(index)} aria-label={`ลบ ${doc}`} className="text-13 text-[#991B1B] hover:underline">
                        ลบ
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-13 text-muted">ยังไม่มีเอกสารที่ต้องแนบ</p>
              )}
              <div className="flex flex-wrap items-end gap-2">
                <div className="min-w-0 flex-1">
                  <label htmlFor="proposal-newdoc" className={labelClass}>
                    ชื่อเอกสารที่ต้องการเพิ่ม
                  </label>
                  <input
                    id="proposal-newdoc"
                    value={newDoc}
                    onChange={(event) => setNewDoc(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        addDoc();
                      }
                    }}
                    placeholder="พิมพ์ชื่อเอกสาร เช่น ใบส่งตัวจากแพทย์"
                    className={fieldClass}
                  />
                </div>
                <Button variant="secondary" onClick={addDoc}>
                  + เพิ่มเอกสาร
                </Button>
              </div>
              {errors.documents ? <p className="text-12 text-[#991B1B]">{errors.documents}</p> : null}
              {removed ? (
                <div role="status" className="flex items-center gap-3 rounded-[8px] bg-surface px-3 py-2 text-13">
                  <span>ลบ &quot;{removed.name}&quot; แล้ว</span>
                  <button type="button" onClick={undoRemove} className="font-medium text-[#1D4ED8] hover:underline">
                    เลิกทำ
                  </button>
                </div>
              ) : null}
            </>
          ) : null}

          {step === 3 ? (
            <>
              <h2 className="text-16 font-semibold">{mode === 'direct' ? '4. ตรวจทานและสร้าง' : '4. ตรวจทานและส่งให้หัวหน้า HR'}</h2>
              <dl className="grid gap-3.5 sm:grid-cols-3">
                {[
                  ['ชื่อ', `${name} · ${category}`],
                  ['วงเงิน', limitText],
                  ['จำนวนครั้ง', maxClaims ? `${maxClaims} ครั้ง/ปี` : 'ไม่จำกัด'],
                  ['ตัวเลือก', chips.join(', ') || '—'],
                  ['เอกสาร', `${documents.length} รายการ`],
                  ['มีผล', thaiDate(effectiveFrom)],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-12 text-muted">{label}</dt>
                    <dd className="text-14">{value}</dd>
                  </div>
                ))}
              </dl>
              <Textarea
                label={<>{mode === 'direct' ? 'เหตุผลที่สร้าง' : 'เหตุผลที่เสนอ'} <span className="text-[#B3261E]">*</span></>}
                rows={2}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                error={errors.reason}
              />
              {mode === 'propose' && headName ? (
                <div className="flex items-center gap-2.5 rounded-[8px] bg-surface px-3 py-2.5 text-13">
                  <Avatar name={headName} size="sm" />
                  <span>
                    ส่งถึง <b className="font-semibold">{headName}</b> · หัวหน้า HR
                  </span>
                </div>
              ) : null}
            </>
          ) : null}

          {errors.form ? (
            <p role="alert" className="text-13 text-[#991B1B]">
              {errors.form}
            </p>
          ) : null}
          <div className="flex justify-between gap-2 border-t border-line pt-4">
            <Button variant="quiet" onClick={() => setStep(Math.max(step - 1, 0))} disabled={step === 0 || busy !== null}>
              ย้อนกลับ
            </Button>
            <Button onClick={next} disabled={busy !== null || uploading}>
              {busy === 'submit' ? 'กำลังบันทึก...' : step === STEPS.length - 1 ? lastLabel : 'ถัดไป'}
            </Button>
          </div>
        </Card>

        <aside aria-label="พรีวิว" className="flex min-w-0 flex-[1_1_300px] flex-col gap-2.5">
          <p className="text-12 font-semibold text-muted">พรีวิว: การ์ดที่พนักงานเห็น</p>
          <BenefitPreview
            imageUrl={imageUrl}
            label={`ใหม่${category ? ` · ${category}` : ''}`}
            name={name}
            description={description}
            chips={chips}
            maxClaims={maxClaims ? Number(maxClaims) || null : null}
            amount={previewAmount}
          />
          {previewLevel ? <p className="text-12 text-muted">พรีวิวแสดงวงเงินของพนักงานระดับ {previewLevel.code}</p> : null}
        </aside>
      </div>
    </>
  );
}
