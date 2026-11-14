'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState, type ChangeEvent } from 'react';
import { Check, ImageIcon, Plus, X } from 'lucide-react';
import { cx } from '@/lib/cx';
import { useToast } from '@/components/ui/Toast';
import type { BudgetType, ProposalInput } from '@/lib/hr/proposals';
import { Avatar, BenefitPreview, Button, Card, Input, PageHeader, Select, Textarea, fieldClass, labelClass } from '@/features/hr/ui';

export type Level = { id: string; code: string; name: string };

const STEPS = ['ข้อมูลพื้นฐาน', 'วงเงินและเงื่อนไข', 'เอกสารที่ต้องแนบ', 'ตรวจทานและส่ง'];

const DEFAULT_CATEGORIES = [
  'สุขภาพ',
  'ครอบครัว',
  'การศึกษาและพัฒนา',
  'การเดินทางและที่พัก',
  'กีฬาและออกกำลังกาย',
  'อุปกรณ์และเครื่องมือทำงาน',
  'ช่วยเหลือพิเศษ',
];

const BUDGETS: { id: BudgetType; label: string; desc: string; per: string }[] = [
  { id: 'yearly', label: 'รายปี', desc: 'คำนวณวงเงินรวมต่อปีปฏิทิน', per: 'ต่อปี' },
  { id: 'monthly', label: 'รายเดือน', desc: 'รีเซ็ตวงเงินทุกเดือน', per: 'ต่อเดือน' },
  { id: 'per_claim', label: 'ต่อครั้ง', desc: 'จำกัดวงเงินสูงสุดต่อการยื่น 1 ครั้ง', per: 'ต่อครั้ง' },
];

const PRESET_DOCS = [
  'ใบเสร็จรับเงิน',
  'ใบรับรองแพทย์',
  'สำเนาสูติบัตรบุตร',
  'สำเนาทะเบียนสมรส',
  'ใบประกาศนียบัตร / ผลการเรียน',
  'ใบอนุมัติเดินทาง / กำหนดการอบรม',
  'ใบเสนอราคา / ใบแจ้งหนี้',
];

const REASON_PRESETS = [
  'เพิ่มสวัสดิการใหม่ตามแผนสวัสดิการประจำปี',
  'ปรับวงเงินให้สอดคล้องกับค่าครองชีพปัจจุบัน',
  'ปรับปรุงเงื่อนไขและเอกสารประกอบการเบิกให้ชัดเจน',
];

const DEFAULT_DOCS = ['ใบเสร็จรับเงิน'];
const money = (value: number) => value.toLocaleString('th-TH', { maximumFractionDigits: 2 });
const toNumber = (text: string) => (text.trim() === '' ? Number.NaN : Number(text.replace(/,/g, '')));
const todayIso = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' });
const thaiDate = (iso: string) =>
  iso ? new Date(`${iso}T00:00:00+07:00`).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

type Errors = Record<string, string>;

/** ฟอร์มเสนอสวัสดิการ 4 ขั้น + พรีวิว (ดีไซน์ H04) · ใช้ร่วมกันทั้ง HR และ Admin ทั้งสร้างใหม่และแก้ไข */
export function ProposalForm({
  mode,
  kind = 'create',
  benefitCode,
  levels,
  categories,
  headName,
  initial,
  returnHref = '/hr/benefits',
  onCancel,
  onSuccess,
}: {
  mode: 'propose' | 'direct';
  kind?: 'create' | 'update';
  benefitCode?: string;
  levels: Level[];
  categories: string[];
  headName: string | null;
  initial?: { id?: string; input: ProposalInput; imageUrl: string | null };
  returnHref?: string;
  onCancel?: () => void;
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const { notify } = useToast();
  const start = initial?.input;

  const categoryChoices = Array.from(new Set([...DEFAULT_CATEGORIES, ...categories, start?.category || ''].filter(Boolean)));

  const [step, setStep] = useState(0);
  const [name, setName] = useState(start?.name ?? '');
  const [category, setCategory] = useState(start?.category || categoryChoices[0] || 'สุขภาพ');
  const [customCategory, setCustomCategory] = useState(false);
  const [description, setDescription] = useState(start?.description ?? '');
  const [detail, setDetail] = useState(start?.detail ?? '');
  const [imagePath, setImagePath] = useState<string | null>(start?.imagePath ?? null);
  const [imageUrl, setImageUrl] = useState<string | null>(initial?.imageUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [budgetType, setBudgetType] = useState<BudgetType>(start?.budgetType ?? 'yearly');

  // ตรวจสอบว่าค่าเริ่มต้นใช้วงเงินเท่ากันทุกระดับ หรือแยกตามระดับ
  const initialAmounts = () => {
    const central = start?.limits.find((limit) => limit.levelId === null)?.amount;
    return Object.fromEntries(
      levels.map((level) => {
        const levelVal = start?.limits.find((limit) => limit.levelId === level.id)?.amount ?? central;
        return [level.id, levelVal !== undefined && levelVal > 0 ? String(levelVal) : ''];
      }),
    );
  };

  const [amounts, setAmounts] = useState<Record<string, string>>(initialAmounts);
  const [flatAmount, setFlatAmount] = useState<string>(() => {
    const central = start?.limits.find((limit) => limit.levelId === null)?.amount ?? start?.limits[0]?.amount;
    return central && central > 0 ? String(central) : '';
  });
  const [limitMode, setLimitMode] = useState<'flat' | 'by_level'>(() => {
    if (!levels.length) return 'flat';
    const distinct = new Set((start?.limits ?? []).filter((l) => l.levelId !== null && l.amount > 0).map((l) => l.amount));
    return distinct.size > 1 ? 'by_level' : 'flat';
  });

  const [claimLimitMode, setClaimLimitMode] = useState<'unlimited' | 'limited'>(() => (start?.maxClaims ? 'limited' : 'unlimited'));
  const [maxClaims, setMaxClaims] = useState(start?.maxClaims ? String(start.maxClaims) : '1');
  const [effectiveFrom, setEffectiveFrom] = useState(start?.effectiveFrom || todayIso());
  const [allowFamily, setAllowFamily] = useState(start?.allowFamily ?? false);
  const [allowInsurance, setAllowInsurance] = useState(start?.allowInsurance ?? false);
  const [allowAdvance, setAllowAdvance] = useState(start?.allowAdvance ?? false);
  const [documents, setDocuments] = useState<string[]>(start?.documents.length ? start.documents : DEFAULT_DOCS);
  const [newDoc, setNewDoc] = useState('');
  const [reason, setReason] = useState(start?.reason ?? '');
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState<'draft' | 'submit' | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const computedLimits = (): { levelId: string | null; amount: number }[] => {
    if (limitMode === 'flat' || levels.length === 0) {
      const val = toNumber(flatAmount);
      if (Number.isNaN(val) || val <= 0) return [];
      return levels.length > 0 ? levels.map((level) => ({ levelId: level.id, amount: val })) : [{ levelId: null, amount: val }];
    }
    return levels
      .map((level) => ({ levelId: level.id, amount: toNumber(amounts[level.id] ?? '') }))
      .filter((limit) => !Number.isNaN(limit.amount) && limit.amount > 0);
  };

  const limits = computedLimits();
  const filled = limits.map((limit) => limit.amount);
  const previewLevel = levels[2] ?? levels[levels.length - 1];
  const previewAmount =
    limitMode === 'flat'
      ? !Number.isNaN(toNumber(flatAmount)) && toNumber(flatAmount) > 0
        ? toNumber(flatAmount)
        : null
      : previewLevel && !Number.isNaN(toNumber(amounts[previewLevel.id] ?? '')) && toNumber(amounts[previewLevel.id]) > 0
        ? toNumber(amounts[previewLevel.id])
        : filled.length
          ? Math.max(...filled)
          : null;

  const per = BUDGETS.find((item) => item.id === budgetType)?.per ?? '';
  const chips = [
    allowFamily ? 'เบิกให้ครอบครัวได้' : null,
    allowInsurance ? 'เบิกส่วนเกินประกันได้' : null,
    allowAdvance ? 'เบิกล่วงหน้าได้' : null,
  ].filter((chip): chip is string => chip !== null);

  const limitText =
    filled.length === 0
      ? '—'
      : Math.min(...filled) === Math.max(...filled)
        ? `฿${money(filled[0])} ${per} (เท่ากันทุกระดับ)`
        : `฿${money(Math.min(...filled))}–${money(Math.max(...filled))} ${per} ตามระดับ`;

  const effectiveMaxClaims = claimLimitMode === 'limited' && maxClaims.trim() ? Number(maxClaims) : null;

  const input = (): ProposalInput => ({
    name: name.trim(),
    category: category.trim(),
    description: description.trim(),
    detail: detail.trim(),
    imagePath,
    budgetType,
    limits,
    maxClaims: effectiveMaxClaims,
    effectiveFrom,
    allowFamily,
    allowInsurance,
    allowAdvance,
    documents,
    reason: reason.trim(),
  });

  /** ตรวจทีละขั้นก่อนไปขั้นถัดไป */
  function check(upTo: number): Errors {
    const found: Errors = {};
    if (upTo >= 0) {
      if (!name.trim()) found.name = 'กรุณากรอกชื่อสวัสดิการ';
      if (!category.trim()) found.category = 'กรุณาเลือกหรือระบุหมวดสวัสดิการ';
      if (kind === 'create' && !description.trim()) found.description = 'กรุณากรอกคำอธิบายสั้นสำหรับแสดงบนการ์ด';
      else if (description.length > 80) found.description = 'คำอธิบายสั้นต้องไม่เกิน 80 ตัวอักษร';
    }
    if (upTo >= 1) {
      if (limitMode === 'flat' || levels.length === 0) {
        const val = toNumber(flatAmount);
        if (Number.isNaN(val) || val <= 0) found.limits = 'กรุณากรอกวงเงินมากกว่า 0 บาท';
      } else {
        if (levels.some((level) => (amounts[level.id] ?? '').trim() && Number.isNaN(toNumber(amounts[level.id])))) {
          found.limits = 'วงเงินต้องเป็นตัวเลขเท่านั้น';
        } else if (filled.length === 0) {
          found.limits = 'กรุณากรอกวงเงินอย่างน้อย 1 ระดับตำแหน่ง';
        }
      }
      if (claimLimitMode === 'limited') {
        if (!maxClaims.trim() || !(Number.isInteger(Number(maxClaims)) && Number(maxClaims) >= 1)) {
          found.maxClaims = 'กรุณาระบุจำนวนครั้งเป็นจำนวนเต็มตั้งแต่ 1 ครั้งขึ้นไป';
        }
      }
      if (!effectiveFrom) found.effectiveFrom = 'กรุณาเลือกวันที่มีผลบังคับใช้';
    }
    if (upTo >= 2 && kind === 'create' && documents.length === 0) {
      found.documents = 'กรุณาเลือกหรือเพิ่มเอกสารที่ต้องแนบอย่างน้อย 1 รายการ';
    }
    if (upTo >= 3 && !reason.trim()) {
      found.reason = mode === 'direct' ? 'กรุณาระบุเหตุผลในการสร้างสวัสดิการ' : 'กรุณาระบุเหตุผลในการเสนอเพื่อให้หัวหน้า HR พิจารณา';
    }
    return found;
  }

  const firstStepWithError = (found: Errors) =>
    found.name || found.category || found.description || found.image
      ? 0
      : found.limits || found.maxClaims || found.effectiveFrom
        ? 1
        : found.documents
          ? 2
          : 3;

  function goToStep(targetStep: number) {
    if (targetStep < step) {
      setErrors({});
      setStep(targetStep);
      return;
    }
    const found = check(targetStep - 1);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setStep(firstStepWithError(found));
      return;
    }
    setStep(targetStep);
  }

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

  async function save(kindType: 'draft' | 'submit') {
    if (busy) return;
    if (kindType === 'submit') {
      const found = check(3);
      setErrors(found);
      if (Object.keys(found).length > 0) return setStep(firstStepWithError(found));
    } else if (!name.trim()) {
      setErrors({ name: 'กรุณากรอกชื่อสวัสดิการก่อนบันทึกฉบับร่าง' });
      return setStep(0);
    }
    setBusy(kindType);
    try {
      const response = initial?.id
        ? await fetch(`/api/hr/proposals/${initial.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'revise', input: input(), submit: kindType === 'submit', message: reason }),
          })
        : await fetch('/api/hr/proposals', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ kind, benefitCode, input: input(), submit: kindType === 'submit' }),
          });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        const field = typeof body.field === 'string' ? body.field : 'form';
        setErrors({ [field]: body.error ?? 'บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง' });
        if (field !== 'form') setStep(firstStepWithError({ [field]: 'x' }));
        return;
      }
      notify(mode === 'direct' ? `สร้างสวัสดิการ ${body.benefitCode} แล้ว` : kindType === 'draft' ? 'บันทึกฉบับร่างแล้ว' : 'ส่งข้อเสนอให้หัวหน้า HR พิจารณาแล้ว');
      if (onSuccess) {
        onSuccess();
      } else {
        router.push(returnHref);
        router.refresh();
      }
    } catch {
      setErrors({ form: 'เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง' });
    } finally {
      setBusy(null);
    }
  }

  function toggleDoc(docName: string) {
    if (documents.includes(docName)) {
      setDocuments(documents.filter((d) => d !== docName));
    } else {
      setDocuments([...documents, docName]);
      setErrors((current) => ({ ...current, documents: '' }));
    }
  }

  function addCustomDoc() {
    const value = newDoc.trim();
    if (!value) return;
    if (!documents.includes(value)) {
      setDocuments([...documents, value]);
    }
    setNewDoc('');
    setErrors((current) => ({ ...current, documents: '' }));
  }

  const title =
    kind === 'update'
      ? `เสนอแก้ไขสวัสดิการ ${benefitCode ?? ''}`
      : mode === 'direct'
        ? 'สร้างสวัสดิการใหม่'
        : initial?.id
          ? 'แก้ฉบับร่างข้อเสนอ'
          : 'เสนอสวัสดิการใหม่';
  const lastLabel = mode === 'direct' ? 'สร้างและเปิดใช้ทันที' : 'ส่งข้อเสนอให้หัวหน้า HR';

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        crumbs={[{ label: 'จัดการสวัสดิการ', href: returnHref }, { label: title }]}
        title={title}
        description={
          mode === 'direct'
            ? 'กรอกข้อมูล 4 ขั้นตอน ด้านขวาแสดงตัวอย่างการ์ดที่พนักงานจะเห็นจริง · หัวหน้า HR สร้างแล้วเปิดใช้ได้ทันที'
            : 'กรอกข้อมูล 4 ขั้นตอน ด้านขวาแสดงตัวอย่างการ์ดที่พนักงานจะเห็นจริง · ส่งให้หัวหน้า HR อนุมัติ'
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {onCancel ? (
              <Button variant="quiet" onClick={onCancel} disabled={busy !== null}>
                ยกเลิก
              </Button>
            ) : null}
            {mode === 'propose' ? (
              <Button variant="secondary" onClick={() => void save('draft')} disabled={busy !== null}>
                {busy === 'draft' ? 'กำลังบันทึก...' : 'บันทึกฉบับร่าง'}
              </Button>
            ) : null}
          </div>
        }
      />

      {/* แถบขั้นตอน 1 - 4 */}
      <nav aria-label="ขั้นตอนการกรอก" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {STEPS.map((label, index) => {
          const active = index === step;
          const done = index < step;
          return (
            <button
              key={label}
              type="button"
              onClick={() => goToStep(index)}
              aria-current={active ? 'step' : undefined}
              className={cx(
                'flex items-center gap-2.5 rounded-[10px] border px-3.5 py-2.5 text-left text-13 transition-colors',
                active
                  ? 'border-[#1D4ED8] bg-[#EFF6FF] font-semibold text-[#1E40AF]'
                  : done
                    ? 'border-[#BFDBFE] bg-white font-medium text-ink hover:bg-surface'
                    : 'border-line bg-white text-muted hover:bg-surface',
              )}
            >
              <span
                className={cx(
                  'flex size-6 shrink-0 items-center justify-center rounded-full text-12 font-semibold',
                  active ? 'bg-[#1D4ED8] text-white' : done ? 'bg-[#DBEAFE] text-[#1D4ED8]' : 'bg-mist text-muted',
                )}
              >
                {done ? <Check className="size-3.5" strokeWidth={2.5} /> : index + 1}
              </span>
              <span className="truncate">{label}</span>
            </button>
          );
        })}
      </nav>

      <div className="flex flex-wrap items-start gap-4">
        <Card className="flex min-w-0 flex-[999_1_580px] flex-col gap-5 p-5 sm:p-6">
          {/* ขั้นที่ 1: ข้อมูลพื้นฐาน */}
          {step === 0 ? (
            <>
              <div>
                <h2 className="text-16 font-semibold text-ink">1. ข้อมูลพื้นฐานของสวัสดิการ</h2>
                <p className="mt-0.5 text-12 text-muted">กำหนดชื่อ หมวดหมู่ และคำอธิบายที่จะแสดงให้พนักงานเห็นในหน้าสวัสดิการ</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label={
                    <>
                      ชื่อสวัสดิการ <span className="text-[#B3261E]">*</span>
                    </>
                  }
                  placeholder="เช่น ค่ารักษาพยาบาลผู้ป่วยนอก, ค่าตัดแว่นสายตา"
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value);
                    if (errors.name) setErrors((c) => ({ ...c, name: '' }));
                  }}
                  error={errors.name}
                />

                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label htmlFor="proposal-category" className="text-13 font-medium text-ink-soft">
                      หมวดสวัสดิการ <span className="text-[#B3261E]">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setCustomCategory((prev) => !prev);
                        if (!customCategory) setCategory('');
                        else setCategory(categoryChoices[0] || 'สุขภาพ');
                      }}
                      className="text-12 font-medium text-[#1D4ED8] hover:underline"
                    >
                      {customCategory ? 'เลือกจากหมวดที่มีอยู่' : '+ พิมพ์หมวดใหม่'}
                    </button>
                  </div>
                  {customCategory ? (
                    <input
                      id="proposal-category"
                      value={category}
                      onChange={(event) => {
                        setCategory(event.target.value);
                        if (errors.category) setErrors((c) => ({ ...c, category: '' }));
                      }}
                      placeholder="พิมพ์ชื่อหมวดสวัสดิการใหม่..."
                      aria-invalid={errors.category ? true : undefined}
                      className={fieldClass}
                    />
                  ) : (
                    <select
                      id="proposal-category"
                      value={category}
                      onChange={(event) => {
                        setCategory(event.target.value);
                        if (errors.category) setErrors((c) => ({ ...c, category: '' }));
                      }}
                      aria-invalid={errors.category ? true : undefined}
                      className={fieldClass}
                    >
                      {categoryChoices.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  )}
                  {errors.category ? <p className="mt-1 text-12 text-[#991B1B]">{errors.category}</p> : null}
                </div>
              </div>

              <Input
                label={
                  <>
                    คำอธิบายสั้นบนการ์ด <span className="text-[#B3261E]">*</span>{' '}
                    <span className="font-normal text-muted">(สรุปสั้นๆ ไม่เกิน 80 ตัวอักษร)</span>
                  </>
                }
                placeholder="เช่น เบิกค่ารักษาพยาบาลคลินิกหรือโรงพยาบาลตามใบเสร็จจริง"
                value={description}
                maxLength={80}
                onChange={(event) => {
                  setDescription(event.target.value);
                  if (errors.description) setErrors((c) => ({ ...c, description: '' }));
                }}
                error={errors.description}
                hint={`ความยาวปัจจุบัน ${description.length}/80 ตัวอักษร`}
              />

              <Textarea
                label="รายละเอียดและเงื่อนไขการเบิกเพิ่มเติม"
                rows={3}
                placeholder="ระบุขอบเขตการเบิก เงื่อนไขข้อยกเว้น หรือหมายเหตุสำหรับพนักงาน..."
                value={detail}
                onChange={(event) => setDetail(event.target.value)}
              />

              <div>
                <p className={labelClass}>
                  รูปหน้าปกการ์ดสวัสดิการ <span className="font-normal text-muted">(ทางเลือก — หากไม่อัปโหลด ระบบจะแสดงไอคอนตามหมวดหมู่ให้อัตโนมัติ)</span>
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <label
                    htmlFor="proposal-image"
                    className={cx(
                      'flex flex-1 cursor-pointer items-center gap-3 rounded-[8px] border border-dashed p-3 transition-colors',
                      errors.image ? 'border-[#991B1B]' : 'border-[#CBD5E1] hover:bg-surface',
                    )}
                  >
                    {imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- พรีวิวรูปที่เพิ่งอัปโหลด
                      <img src={imageUrl} alt="รูปที่อัปโหลด" className="h-14 w-24 rounded-[6px] object-cover" />
                    ) : (
                      <span className="flex h-14 w-24 shrink-0 items-center justify-center rounded-[6px] bg-mist text-muted">
                        <ImageIcon className="size-6" aria-hidden="true" />
                      </span>
                    )}
                    <span className="text-13">
                      <b className="font-semibold text-[#1D4ED8]">{uploading ? 'กำลังอัปโหลด...' : imageUrl ? 'เปลี่ยนรูปภาพ' : 'คลิกเพื่ออัปโหลดรูปภาพประกอบ'}</b>
                      <span className="mt-0.5 block text-12 text-muted">รองรับไฟล์ JPG, PNG หรือ WebP ขนาดไม่เกิน 5 MB</span>
                    </span>
                  </label>
                  {imageUrl ? (
                    <Button
                      variant="quiet"
                      onClick={() => {
                        setImagePath(null);
                        setImageUrl(null);
                      }}
                    >
                      ลบรูป
                    </Button>
                  ) : null}
                </div>
                <input ref={fileRef} id="proposal-image" type="file" accept="image/jpeg,image/png,image/webp" onChange={upload} className="sr-only" />
                {errors.image ? <p className="mt-1 text-12 text-[#991B1B]">{errors.image}</p> : null}
              </div>
            </>
          ) : null}

          {/* ขั้นที่ 2: วงเงินและเงื่อนไข */}
          {step === 1 ? (
            <>
              <div>
                <h2 className="text-16 font-semibold text-ink">2. วงเงินและเงื่อนไขการเบิก</h2>
                <p className="mt-0.5 text-12 text-muted">เลือกรอบการคำนวณวงเงิน กำหนดจำนวนเงิน และเงื่อนไขสิทธิ์เพิ่มเติม</p>
              </div>

              {/* รอบวงเงิน */}
              <div>
                <p className={labelClass}>รอบการคำนวณวงเงิน</p>
                <div role="group" aria-label="รอบวงเงิน" className="grid gap-2.5 sm:grid-cols-3">
                  {BUDGETS.map((item) => {
                    const active = budgetType === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setBudgetType(item.id)}
                        className={cx(
                          'flex flex-col items-start rounded-[10px] border p-3 text-left transition-colors',
                          active ? 'border-[#1D4ED8] bg-[#EFF6FF]' : 'border-line bg-white hover:bg-surface',
                        )}
                      >
                        <span className={cx('text-14 font-semibold', active ? 'text-[#1E40AF]' : 'text-ink')}>{item.label}</span>
                        <span className="mt-0.5 text-12 text-muted">{item.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* รูปแบบการกำหนดวงเงิน: เท่ากันทุกระดับ vs แยกตามระดับ */}
              <div className="flex flex-col gap-3 rounded-[10px] border border-line bg-[#F8FAFC] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-13 font-semibold text-ink">
                    การกำหนดวงเงิน ({per}) <span className="text-[#B3261E]">*</span>
                  </p>
                  {levels.length > 0 ? (
                    <div className="inline-flex rounded-[8px] border border-line bg-white p-0.5 text-12">
                      <button
                        type="button"
                        onClick={() => setLimitMode('flat')}
                        className={cx(
                          'rounded-[6px] px-3 py-1 font-medium transition-colors',
                          limitMode === 'flat' ? 'bg-[#1D4ED8] text-white' : 'text-ink-soft hover:text-ink',
                        )}
                      >
                        วงเงินเท่ากันทุกระดับ
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          // ถ้าสลับมาแยกตามระดับและยังว่าง ให้คัดลอกค่าจาก flatAmount ไปตั้งต้น
                          if (flatAmount && Object.values(amounts).every((v) => !v)) {
                            setAmounts(Object.fromEntries(levels.map((lvl) => [lvl.id, flatAmount])));
                          }
                          setLimitMode('by_level');
                        }}
                        className={cx(
                          'rounded-[6px] px-3 py-1 font-medium transition-colors',
                          limitMode === 'by_level' ? 'bg-[#1D4ED8] text-white' : 'text-ink-soft hover:text-ink',
                        )}
                      >
                        แยกตามระดับตำแหน่ง ({levels.length} ระดับ)
                      </button>
                    </div>
                  ) : null}
                </div>

                {limitMode === 'flat' || levels.length === 0 ? (
                  <div className="max-w-[320px]">
                    <label htmlFor="flat-amount-input" className="mb-1 block text-12 text-muted">
                      ระบุจำนวนเงินที่เบิกได้สูงสุด ({per})
                    </label>
                    <div className="relative flex items-center">
                      <input
                        id="flat-amount-input"
                        inputMode="decimal"
                        placeholder="เช่น 10000"
                        value={flatAmount}
                        onChange={(e) => {
                          setFlatAmount(e.target.value);
                          if (errors.limits) setErrors((c) => ({ ...c, limits: '' }));
                        }}
                        className={cx(fieldClass, 'pr-12 tabular-nums')}
                      />
                      <span className="pointer-events-none absolute right-3 text-13 text-muted">บาท</span>
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    {levels.map((level) => (
                      <label key={level.id} className="flex items-center justify-between gap-3 rounded-[8px] border border-line bg-white px-3 py-2">
                        <span className="min-w-0 flex-1 text-13 font-medium text-ink">
                          <span className="text-[#1D4ED8]">{level.code}</span> · {level.name}
                        </span>
                        <div className="relative flex items-center">
                          <input
                            aria-label={`วงเงิน ${level.code} ${level.name}`}
                            inputMode="decimal"
                            placeholder="0"
                            value={amounts[level.id] ?? ''}
                            onChange={(event) => {
                              setAmounts({ ...amounts, [level.id]: event.target.value });
                              if (errors.limits) setErrors((c) => ({ ...c, limits: '' }));
                            }}
                            className={cx(fieldClass, '!h-9 w-32 pr-9 text-right tabular-nums')}
                          />
                          <span className="pointer-events-none absolute right-2.5 text-12 text-muted">฿</span>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
                {errors.limits ? <p className="text-12 text-[#991B1B]">{errors.limits}</p> : null}
              </div>

              {/* จำนวนครั้งต่อปี และ วันที่มีผล */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className={labelClass}>จำนวนครั้งที่เบิกได้ต่อปี</p>
                  <div className="flex items-center gap-2">
                    <Select
                      value={claimLimitMode}
                      onChange={(e) => setClaimLimitMode(e.target.value as 'unlimited' | 'limited')}
                      className="flex-1"
                    >
                      <option value="unlimited">ไม่จำกัดจำนวนครั้ง (เบิกได้จนครบวงเงิน)</option>
                      <option value="limited">จำกัดจำนวนครั้งต่อปี</option>
                    </Select>
                    {claimLimitMode === 'limited' ? (
                      <div className="relative w-28 shrink-0">
                        <input
                          aria-label="จำนวนครั้งต่อปี"
                          type="number"
                          min={1}
                          max={365}
                          inputMode="numeric"
                          value={maxClaims}
                          onChange={(e) => setMaxClaims(e.target.value)}
                          className={cx(fieldClass, 'pr-10 text-right tabular-nums')}
                        />
                        <span className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-12 text-muted">ครั้ง</span>
                      </div>
                    ) : null}
                  </div>
                  {errors.maxClaims ? <p className="mt-1 text-12 text-[#991B1B]">{errors.maxClaims}</p> : null}
                </div>

                <Input
                  label={
                    <>
                      วันที่มีผลบังคับใช้ <span className="text-[#B3261E]">*</span>
                    </>
                  }
                  type="date"
                  value={effectiveFrom}
                  onChange={(event) => {
                    setEffectiveFrom(event.target.value);
                    if (errors.effectiveFrom) setErrors((c) => ({ ...c, effectiveFrom: '' }));
                  }}
                  error={errors.effectiveFrom}
                />
              </div>

              {/* เงื่อนไขเพิ่มเติม */}
              <div>
                <p className={labelClass}>เงื่อนไขและสิทธิ์การเบิกเพิ่มเติม (เลือกได้หลายข้อ)</p>
                <div className="grid gap-2.5 sm:grid-cols-3">
                  {[
                    {
                      checked: allowFamily,
                      set: setAllowFamily,
                      title: 'เบิกให้ครอบครัวได้',
                      desc: 'ครอบคลุมคู่สมรสจดทะเบียน และบุตร (สูงสุดไม่เกิน 2 คน)',
                    },
                    {
                      checked: allowInsurance,
                      set: setAllowInsurance,
                      title: 'เบิกส่วนเกินจากประกันได้',
                      desc: 'ใช้เบิกส่วนต่างค่ารักษาที่เกินจากวงเงินประกันกลุ่ม',
                    },
                    {
                      checked: allowAdvance,
                      set: setAllowAdvance,
                      title: 'เบิกล่วงหน้าได้',
                      desc: 'ยื่นขอรับเงินก่อนและแนบใบเสร็จจริงหลังเสร็จสิ้นกิจกรรม',
                    },
                  ].map((opt) => (
                    <label
                      key={opt.title}
                      className={cx(
                        'flex cursor-pointer items-start gap-2.5 rounded-[10px] border p-3 transition-colors',
                        opt.checked ? 'border-[#1D4ED8] bg-[#EFF6FF]/60' : 'border-line bg-white hover:bg-surface',
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={opt.checked}
                        onChange={(e) => opt.set(e.target.checked)}
                        className="mt-0.5 size-4 shrink-0 accent-[#1D4ED8]"
                      />
                      <span className="min-w-0">
                        <span className="block text-13 font-semibold text-ink">{opt.title}</span>
                        <span className="mt-0.5 block text-12 leading-relaxed text-muted">{opt.desc}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </>
          ) : null}

          {/* ขั้นที่ 3: เอกสารที่ต้องแนบ */}
          {step === 2 ? (
            <>
              <div>
                <h2 className="text-16 font-semibold text-ink">3. เอกสารที่พนักงานต้องแนบเมื่อยื่นเบิก</h2>
                <p className="mt-0.5 text-12 text-muted">คลิกเลือกจากรายการเอกสารมาตรฐาน หรือพิมพ์เพิ่มเอกสารเฉพาะทางด้านล่าง</p>
              </div>

              <div>
                <p className={labelClass}>คลิกเลือกเอกสารที่ใช้บ่อย</p>
                <div className="flex flex-wrap gap-2">
                  {PRESET_DOCS.map((doc) => {
                    const selected = documents.includes(doc);
                    return (
                      <button
                        key={doc}
                        type="button"
                        onClick={() => toggleDoc(doc)}
                        className={cx(
                          'inline-flex items-center gap-1.5 rounded-[999px] border px-3.5 py-1.5 text-13 transition-colors',
                          selected
                            ? 'border-[#1D4ED8] bg-[#EFF6FF] font-medium text-[#1E40AF]'
                            : 'border-line bg-white text-ink-soft hover:bg-surface',
                        )}
                      >
                        {selected ? <Check className="size-3.5 text-[#1D4ED8]" strokeWidth={2.5} /> : <Plus className="size-3.5 text-muted" />}
                        {doc}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-[10px] border border-line bg-[#F8FAFC] p-4">
                <p className="mb-2 text-13 font-semibold text-ink">เอกสารที่เลือกไว้ ({documents.length} รายการ)</p>
                {documents.length > 0 ? (
                  <ul aria-label="เอกสารที่ต้องแนบ" className="m-0 flex list-none flex-col divide-y divide-line rounded-[8px] border border-line bg-white px-3">
                    {documents.map((doc, index) => (
                      <li key={doc} className="flex items-center justify-between gap-3 py-2.5 text-13">
                        <span className="font-medium text-ink">
                          {index + 1}. {doc}
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleDoc(doc)}
                          aria-label={`ลบ ${doc}`}
                          className="inline-flex items-center gap-1 text-12 text-[#991B1B] hover:underline"
                        >
                          <X className="size-3.5" /> เอาออก
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="rounded-[8px] border border-dashed border-line bg-white py-4 text-center text-13 text-muted">
                    ยังไม่ได้เลือกเอกสารประกอบการเบิก
                  </p>
                )}

                <div className="mt-3 flex flex-wrap items-end gap-2">
                  <div className="min-w-0 flex-1">
                    <label htmlFor="proposal-newdoc" className="mb-1 block text-12 text-muted">
                      เพิ่มชื่อเอกสารอื่นๆ นอกเหนือจากรายการด้านบน
                    </label>
                    <input
                      id="proposal-newdoc"
                      value={newDoc}
                      onChange={(event) => setNewDoc(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          addCustomDoc();
                        }
                      }}
                      placeholder="พิมพ์ชื่อเอกสาร เช่น ใบส่งตัวจากแพทย์ แล้วกดเพิ่ม"
                      className={fieldClass}
                    />
                  </div>
                  <Button variant="secondary" onClick={addCustomDoc}>
                    + เพิ่มรายการ
                  </Button>
                </div>
              </div>
              {errors.documents ? <p className="text-12 text-[#991B1B]">{errors.documents}</p> : null}
            </>
          ) : null}

          {/* ขั้นที่ 4: ตรวจทานและส่ง */}
          {step === 3 ? (
            <>
              <div>
                <h2 className="text-16 font-semibold text-ink">{mode === 'direct' ? '4. ตรวจทานและสร้างสวัสดิการ' : '4. ตรวจทานและส่งให้หัวหน้า HR อนุมัติ'}</h2>
                <p className="mt-0.5 text-12 text-muted">ตรวจสอบความถูกต้องของข้อมูลและระบุเหตุผลประกอบการพิจารณา</p>
              </div>

              <div className="rounded-[10px] border border-line bg-[#F8FAFC] p-4">
                <dl className="grid gap-3.5 sm:grid-cols-3">
                  {[
                    ['ชื่อสวัสดิการ', name || '—'],
                    ['หมวดหมู่', category || '—'],
                    ['รอบและวงเงิน', limitText],
                    ['จำนวนครั้งต่อปี', effectiveMaxClaims ? `${effectiveMaxClaims} ครั้ง/ปี` : 'ไม่จำกัดจำนวนครั้ง'],
                    ['วันที่มีผล', thaiDate(effectiveFrom)],
                    ['เงื่อนไขเพิ่มเติม', chips.join(', ') || 'เบิกเฉพาะพนักงานตามใบเสร็จจริง'],
                  ].map(([label, value]) => (
                    <div key={label} className="min-w-0">
                      <dt className="text-12 text-muted">{label}</dt>
                      <dd className="mt-0.5 text-13 font-semibold break-words text-ink">{value}</dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-3 border-t border-line pt-3">
                  <p className="text-12 text-muted">เอกสารที่พนักงานต้องแนบ ({documents.length} รายการ)</p>
                  <p className="mt-0.5 text-13 font-medium text-ink">{documents.join(' · ') || '—'}</p>
                </div>
              </div>

              <div>
                <Textarea
                  label={
                    <>
                      {mode === 'direct' ? 'เหตุผลในการสร้างสวัสดิการ' : 'เหตุผลในการเสนอให้หัวหน้า HR พิจารณา'} <span className="text-[#B3261E]">*</span>
                    </>
                  }
                  rows={3}
                  placeholder="ระบุเหตุผลและความจำเป็น เช่น เพิ่มสวัสดิการประจำปี หรือปรับวงเงินตามมติที่ประชุม..."
                  value={reason}
                  onChange={(event) => {
                    setReason(event.target.value);
                    if (errors.reason) setErrors((c) => ({ ...c, reason: '' }));
                  }}
                  error={errors.reason}
                />
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="text-12 text-muted">ข้อความตัวอย่าง:</span>
                  {REASON_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setReason(preset);
                        if (errors.reason) setErrors((c) => ({ ...c, reason: '' }));
                      }}
                      className="rounded-[999px] border border-line bg-surface px-2.5 py-1 text-11 text-ink-soft hover:border-[#1D4ED8] hover:text-[#1D4ED8]"
                    >
                      + {preset}
                    </button>
                  ))}
                </div>
              </div>

              {mode === 'propose' ? (
                <div className="flex items-center gap-2.5 rounded-[8px] bg-surface px-3.5 py-2.5 text-13">
                  {headName ? <Avatar name={headName} size="sm" /> : null}
                  <span>
                    ส่งข้อเสนอถึง <b className="font-semibold">{headName ? `${headName} · หัวหน้า HR` : 'หัวหน้า HR'}</b> เพื่อพิจารณาอนุมัติ
                  </span>
                </div>
              ) : null}
            </>
          ) : null}

          {errors.form ? (
            <p role="alert" className="rounded-[8px] bg-[#FEF2F2] px-3 py-2 text-13 text-[#991B1B]">
              {errors.form}
            </p>
          ) : null}

          <div className="flex justify-between gap-2 border-t border-line pt-4">
            <Button variant="quiet" onClick={() => setStep(Math.max(step - 1, 0))} disabled={step === 0 || busy !== null}>
              ย้อนกลับ
            </Button>
            <div className="flex items-center gap-2">
              {step < STEPS.length - 1 ? (
                <span className="text-12 text-muted">
                  ขั้นที่ {step + 1} / {STEPS.length}
                </span>
              ) : null}
              <Button onClick={next} disabled={busy !== null || uploading}>
                {busy === 'submit' ? 'กำลังบันทึก...' : step === STEPS.length - 1 ? lastLabel : 'ถัดไป ›'}
              </Button>
            </div>
          </div>
        </Card>

        <aside aria-label="พรีวิว" className="flex min-w-0 flex-[1_1_300px] flex-col gap-2.5">
          <p className="text-12 font-semibold text-muted">พรีวิว: การ์ดที่พนักงานเห็น</p>
          <BenefitPreview
            imageUrl={imageUrl}
            category={category || 'สุขภาพ'}
            label={`${benefitCode ?? 'ใหม่'}${category ? ` · ${category}` : ''}`}
            name={name}
            description={description}
            chips={chips}
            maxClaims={effectiveMaxClaims}
            amount={previewAmount}
          />
          <p className="text-12 text-muted">
            {limitMode === 'flat' || !previewLevel
              ? 'พรีวิวแสดงวงเงินพื้นฐานสำหรับพนักงานทุกระดับ'
              : `พรีวิวแสดงวงเงินของพนักงานระดับ ${previewLevel.code} (${previewLevel.name})`}
          </p>
        </aside>
      </div>
    </div>
  );
}
