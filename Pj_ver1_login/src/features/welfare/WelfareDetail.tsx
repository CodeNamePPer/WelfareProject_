'use client';

import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { Button } from '../../components/ui/Button';
import { Tag } from '../../components/ui/Tag';
import { APPROVAL_FLOW, FORM_TYPE_LABELS, fieldsFor } from '../../lib/claims/forms';
import { cx } from '../../lib/cx';
import { formatBahtWhole, formatShortThaiDate } from '../../lib/format';
import type { BudgetType, WelfareItem } from '../../types';

const budgetTypes: BudgetType[] = ['รายปี', 'รายเดือน', 'ต่อครั้ง'];
const DEFAULT_CATEGORIES = ['สุขภาพ', 'ครอบครัว', 'การศึกษาและพัฒนา', 'การเดินทางและที่พัก', 'อุปกรณ์และเครื่องมือทำงาน', 'ช่วยเหลือพิเศษ'];

type EditableFields = Pick<
  WelfareItem,
  'name' | 'category' | 'description' | 'detail' | 'amount' | 'budgetType' | 'maxClaimsPerYear' | 'formType' | 'eligible' | 'startDate' | 'allowFamily' | 'allowInsurance' | 'allowAdvance'
>;

type Row = { label: string; value: string; field?: keyof EditableFields };

export interface ProposalSubmitPayload {
  kind: 'create' | 'update';
  benefitCode?: string;
  name: string;
  category: string;
  description: string;
  detail: string;
  budgetType: BudgetType;
  amount: number;
  levelAmounts: Record<string, string>;
  maxClaimsPerYear: number | null;
  effectiveFrom: string;
  allowFamily: boolean;
  allowInsurance: boolean;
  allowAdvance: boolean;
  documents: string[];
  reason: string;
}

interface WelfareDetailProps {
  item: WelfareItem;
  editing: boolean;
  categories?: string[];
  levels?: { id: string; code: string; name: string }[];
  openProposalNo?: string | null;
  onEdit: () => void;
  onCancel: () => void;
  /** ส่งข้อเสนอสร้าง/แก้ไขสวัสดิการให้หัวหน้า HR พิจารณา – คืนข้อความเมื่อไม่สำเร็จ */
  onSubmitProposal: (payload: ProposalSubmitPayload) => Promise<string | null>;
}

function todayIso(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' });
}

// หน้ารายละเอียดสวัสดิการ เปิดจากแถวในตาราง (?item=รหัสสวัสดิการ)
export function WelfareDetail({
  item,
  editing,
  categories = [],
  levels = [],
  openProposalNo = null,
  onEdit,
  onCancel,
  onSubmitProposal,
}: WelfareDetailProps) {
  const categoryOptions = Array.from(new Set([...DEFAULT_CATEGORIES, ...categories, item.category || ''].filter(Boolean)));
  const [form, setForm] = useState<EditableFields>({
    ...item,
    category: item.category || categoryOptions[0] || 'สุขภาพ',
    description: item.description ?? '',
    detail: item.detail ?? '',
    startDate: item.startDate && item.startDate >= todayIso() ? item.startDate : todayIso(),
    allowFamily: Boolean(item.allowFamily),
    allowInsurance: Boolean(item.allowInsurance),
    allowAdvance: Boolean(item.allowAdvance),
  });
  const [levelAmounts, setLevelAmounts] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const lvl of item.levelLimits ?? []) {
      map[lvl.levelId] = String(lvl.amount);
    }
    return map;
  });
  const [useByLevel, setUseByLevel] = useState<boolean>(() => (item.levelLimits?.length ?? 0) > 0);
  // แก้เป็นข้อความ หนึ่งรายการต่อบรรทัด แล้วแยกเป็นรายการตอนบันทึก
  const [documentsText, setDocumentsText] = useState(item.documents.join('\n'));
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof EditableFields>(key: K, value: EditableFields[K]) => setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (saving) return;
    if (!form.name.trim()) return setError('กรุณาระบุชื่อสวัสดิการ');
    if (!(form.amount > 0) && (!useByLevel || Object.values(levelAmounts).every((v) => !(Number(v) > 0)))) {
      return setError('กรุณาระบุวงเงินมากกว่า 0');
    }
    if (!form.startDate || form.startDate < todayIso()) {
      return setError('วันที่มีผลต้องเป็นตั้งแต่วันนี้เป็นต้นไป');
    }
    if (!reason.trim()) {
      return setError('กรุณาระบุเหตุผลที่เสนอ เพื่อให้หัวหน้า HR ใช้ประกอบการพิจารณา');
    }
    setError('');
    setSaving(true);
    const documents = documentsText.split('\n').map((name) => name.trim()).filter(Boolean);
    const failure = await onSubmitProposal({
      kind: item.unsaved ? 'create' : 'update',
      benefitCode: item.unsaved ? undefined : item.code,
      name: form.name.trim(),
      category: (form.category || 'สุขภาพ').trim(),
      description: (form.description || '').trim(),
      detail: (form.detail || '').trim(),
      budgetType: form.budgetType,
      amount: form.amount,
      levelAmounts: useByLevel ? levelAmounts : {},
      maxClaimsPerYear: form.maxClaimsPerYear,
      effectiveFrom: form.startDate,
      allowFamily: Boolean(form.allowFamily),
      allowInsurance: Boolean(form.allowInsurance),
      allowAdvance: Boolean(form.allowAdvance),
      documents,
      reason: reason.trim(),
    });
    setSaving(false);
    if (failure) setError(failure);
  };

  const extraFlags = [
    item.allowFamily ? 'เบิกให้ครอบครัวได้' : null,
    item.allowInsurance ? 'เบิกส่วนเกินจากประกันได้' : null,
    item.allowAdvance ? 'เบิกล่วงหน้าได้' : null,
  ].filter(Boolean);

  const conditionRows: Row[] = [
    { label: 'หมวดสวัสดิการ', value: item.category || '—', field: 'category' },
    { label: 'ประเภทวงเงิน', value: item.budgetType, field: 'budgetType' },
    { label: `วงเงิน${item.budgetType}`, value: formatBahtWhole(item.amount), field: 'amount' },
    { label: 'จำนวนครั้งที่เบิกได้ต่อปี', value: item.maxClaims || 'ไม่จำกัด', field: 'maxClaimsPerYear' },
    { label: 'ผู้มีสิทธิ์', value: item.eligible || 'พนักงานทุกคน', field: 'eligible' },
    { label: 'วันที่เริ่มใช้', value: item.startDate ? formatShortThaiDate(item.startDate) : '—', field: 'startDate' },
    ...(item.nextLimit
      ? [{ label: 'วงเงินใหม่ที่ตั้งไว้', value: `${formatBahtWhole(item.nextLimit.amount)} ตั้งแต่ ${formatShortThaiDate(item.nextLimit.from)}` }]
      : []),
  ];
  const approvalRows: Row[] = [
    { label: 'ขั้นตอนอนุมัติคำขอเบิก', value: APPROVAL_FLOW },
    { label: 'การแก้ไขสวัสดิการ', value: 'เสนอให้หัวหน้า HR อนุมัติ' },
    { label: 'ผู้ดูแล', value: item.owner },
    { label: 'แก้ไขล่าสุด', value: formatShortThaiDate(item.updatedAt) },
  ];

  const renderRows = (rows: Row[]) => (
    <dl className="flex flex-col gap-[8px]">
      {rows.map(({ label, value, field }) => (
        <div key={label} className="flex items-center justify-between gap-3 text-13">
          <dt className="shrink-0 text-muted">{label}</dt>
          <dd className="min-w-0 break-words text-right font-medium text-ink">
            {editing && field ? <EditInput field={field} form={form} set={set} label={label} categories={categoryOptions} /> : value}
          </dd>
        </div>
      ))}
    </dl>
  );

  return (
    <div className="flex flex-col gap-[12px]">
      <Breadcrumb items={[{ label: 'สวัสดิการที่มีอยู่', href: '/admin/benefits' }, { label: item.unsaved ? 'เสนอสวัสดิการใหม่' : item.code }]} />
      <form
        onSubmit={submit}
        aria-labelledby="welfare-detail-title"
        className="flex flex-col gap-[16px] rounded-[10px] border border-line bg-white p-[16px] sm:p-[20px]"
      >
        <header className="flex items-start justify-between gap-[8px]">
          <div className="min-w-0">
            <p className="text-12 text-muted tabular-nums">{item.unsaved ? 'ข้อเสนอสร้างสวัสดิการใหม่' : item.code}</p>
            <h1 id="welfare-detail-title" className="break-words text-22 font-semibold text-ink">
              {editing ? form.name || 'สวัสดิการใหม่' : item.name}
            </h1>
            {!editing && item.description ? <p className="mt-1 text-13 text-muted">{item.description}</p> : null}
          </div>
          <div className="flex flex-wrap items-center gap-[6px]">
            {openProposalNo ? <Tag tone="warning">รออนุมัติ ({openProposalNo})</Tag> : null}
            <Tag tone={item.status === 'active' ? 'success' : 'neutral'}>{item.status === 'active' ? 'ใช้งาน' : 'หยุดใช้'}</Tag>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-[16px] lg:grid-cols-2 lg:gap-x-[40px]">
          <DetailSection title="เงื่อนไขการเบิก">
            {editing ? (
              <>
                <label className="flex flex-col gap-[6px] text-13 font-medium text-ink">
                  ชื่อสวัสดิการ
                  <input className={cx(inputClass, 'w-full')} value={form.name} onChange={(event) => set('name', event.target.value)} autoFocus />
                </label>
                <label className="flex flex-col gap-[6px] text-13 font-medium text-ink">
                  คำอธิบายสั้น (แสดงบนการ์ดสวัสดิการ ไม่เกิน 80 ตัวอักษร)
                  <input
                    maxLength={80}
                    className={cx(inputClass, 'w-full')}
                    placeholder="เช่น เบิกค่ารักษาพยาบาลผู้ป่วยนอกและผู้ป่วยใน"
                    value={form.description ?? ''}
                    onChange={(event) => set('description', event.target.value)}
                  />
                </label>
                <label className="flex flex-col gap-[6px] text-13 font-medium text-ink">
                  รายละเอียดเงื่อนไขเพิ่มเติม
                  <textarea
                    rows={3}
                    className="rounded-lg border border-line bg-white px-3 py-2 text-13 font-normal text-ink focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    placeholder="อธิบายขอบเขตและเงื่อนไขการเบิกสวัสดิการ..."
                    value={form.detail ?? ''}
                    onChange={(event) => set('detail', event.target.value)}
                  />
                </label>
              </>
            ) : item.detail ? (
              <div className="rounded-[8px] bg-surface-muted px-[12px] py-[10px] text-13 text-ink">
                <p className="text-11 font-medium text-muted">รายละเอียดสวัสดิการ</p>
                <p className="mt-1 whitespace-pre-wrap">{item.detail}</p>
              </div>
            ) : null}

            {renderRows(conditionRows)}

            {/* วงเงินตามระดับตำแหน่ง */}
            {editing && levels.length > 0 ? (
              <div className="flex flex-col gap-[8px] border-t border-line pt-[12px]">
                <label className="flex items-center gap-[8px] text-13 font-medium text-ink">
                  <input
                    type="checkbox"
                    checked={useByLevel}
                    onChange={(e) => setUseByLevel(e.target.checked)}
                    className="size-4 rounded border-line text-primary-600 focus:ring-primary-500"
                  />
                  กำหนดวงเงินแยกตามระดับตำแหน่ง
                </label>
                {useByLevel ? (
                  <div className="grid grid-cols-1 gap-[8px] sm:grid-cols-2">
                    {levels.map((lvl) => (
                      <label key={lvl.id} className="flex items-center justify-between gap-2 text-12 text-muted">
                        <span className="truncate">{lvl.code} · {lvl.name}</span>
                        <input
                          type="number"
                          min={0}
                          step={100}
                          placeholder={String(form.amount || 0)}
                          value={levelAmounts[lvl.id] ?? ''}
                          onChange={(e) => setLevelAmounts((prev) => ({ ...prev, [lvl.id]: e.target.value }))}
                          className={cx(inputClass, 'h-8 w-[120px] text-right tabular-nums')}
                        />
                      </label>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : !editing && (item.levelLimits?.length ?? 0) > 0 ? (
              <div className="flex flex-col gap-[6px] border-t border-line pt-[12px]">
                <p className="text-12 font-medium text-muted">วงเงินตามระดับตำแหน่ง</p>
                <div className="grid grid-cols-1 gap-[6px] sm:grid-cols-2">
                  {item.levelLimits!.map((lvl) => (
                    <div key={lvl.levelId} className="flex items-center justify-between rounded-[6px] bg-surface-muted px-[10px] py-[6px] text-12">
                      <span className="text-muted">{lvl.code} · {lvl.name}</span>
                      <span className="font-medium text-ink tabular-nums">{formatBahtWhole(lvl.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {/* เงื่อนไขพิเศษ (ครอบครัว / ประกัน / เบิกล่วงหน้า) */}
            <div className="flex flex-col gap-[8px] border-t border-line pt-[12px]">
              <p className="text-12 font-medium text-muted">เงื่อนไขเพิ่มเติม</p>
              {editing ? (
                <div className="flex flex-wrap gap-[16px] text-13 text-ink">
                  <label className="inline-flex items-center gap-[6px]">
                    <input
                      type="checkbox"
                      checked={Boolean(form.allowFamily)}
                      onChange={(e) => set('allowFamily', e.target.checked)}
                      className="size-4 rounded border-line text-primary-600"
                    />
                    เบิกให้ครอบครัวได้ (คู่สมรส/บุตร)
                  </label>
                  <label className="inline-flex items-center gap-[6px]">
                    <input
                      type="checkbox"
                      checked={Boolean(form.allowInsurance)}
                      onChange={(e) => set('allowInsurance', e.target.checked)}
                      className="size-4 rounded border-line text-primary-600"
                    />
                    เบิกส่วนเกินจากประกันได้
                  </label>
                  <label className="inline-flex items-center gap-[6px]">
                    <input
                      type="checkbox"
                      checked={Boolean(form.allowAdvance)}
                      onChange={(e) => set('allowAdvance', e.target.checked)}
                      className="size-4 rounded border-line text-primary-600"
                    />
                    เบิกล่วงหน้าได้
                  </label>
                </div>
              ) : extraFlags.length > 0 ? (
                <div className="flex flex-wrap gap-[6px]">
                  {extraFlags.map((flag) => (
                    <Tag key={flag} tone="info">{flag}</Tag>
                  ))}
                </div>
              ) : (
                <p className="text-13 text-muted">เบิกเฉพาะพนักงานตามใบเสร็จจริง</p>
              )}
            </div>

            <div className="flex flex-col gap-[8px] border-t border-line pt-[12px]">
              <div className="flex items-center justify-between gap-3 text-13">
                <span className="shrink-0 text-muted">แบบฟอร์มยื่นคำขอ</span>
                <span className="min-w-0 text-right font-medium text-ink">
                  {editing ? (
                    <EditInput field="formType" form={form} set={set} label="แบบฟอร์มยื่นคำขอ" categories={categoryOptions} />
                  ) : (
                    (FORM_TYPE_LABELS[item.formType] ?? item.formType)
                  )}
                </span>
              </div>
              <p className="text-12 leading-5 text-muted">
                ช่องที่พนักงานต้องกรอก:{' '}
                {fieldsFor(editing ? form.formType : item.formType)
                  .map((field) => field.label)
                  .join(' · ')}
              </p>
            </div>
          </DetailSection>

          <div className="flex min-w-0 flex-col gap-[16px]">
            <DetailSection title="การอนุมัติและผู้ดูแล">{renderRows(approvalRows)}</DetailSection>

            <DetailSection title={`เอกสารที่พนักงานต้องแนบ (${item.documents.length})`}>
              {editing ? (
                <label className="flex flex-col gap-[6px] text-12 text-muted">
                  พิมพ์หนึ่งรายการต่อบรรทัด ใบเสร็จรับเงินระบบบังคับแนบอยู่แล้ว ไม่ต้องใส่ซ้ำ
                  <textarea
                    rows={4}
                    value={documentsText}
                    onChange={(event) => setDocumentsText(event.target.value)}
                    placeholder={'เช่น ใบรับรองแพทย์\nสำเนาสูติบัตรบุตร'}
                    className="rounded-lg border border-line bg-white px-3 py-2 text-13 text-ink focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </label>
              ) : item.documents.length === 0 ? (
                <p className="text-13 text-muted">ยังไม่ได้กำหนด พนักงานแนบเฉพาะใบเสร็จรับเงิน</p>
              ) : (
                <ul className="flex list-disc flex-col gap-[4px] pl-5 text-13 text-ink">
                  {item.documents.map((doc) => (
                    <li key={doc}>{doc}</li>
                  ))}
                </ul>
              )}
            </DetailSection>

            {editing ? (
              <DetailSection title="เหตุผลที่เสนอให้หัวหน้า HR พิจารณา (จำเป็น)">
                <label className="flex flex-col gap-[6px] text-12 text-muted">
                  ระบุเหตุผลในการเสนอ{item.unsaved ? 'สร้างสวัสดิการใหม่' : 'แก้ไขสวัสดิการ'} ข้อมูลจะมีผลเมื่อหัวหน้า HR อนุมัติ
                  <textarea
                    rows={3}
                    required
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    placeholder="เช่น ปรับวงเงินให้สอดคล้องกับค่าครองชีพประจำปี หรือเพิ่มสวัสดิการตามมติคณะกรรมการ"
                    className="rounded-lg border border-line bg-white px-3 py-2 text-13 text-ink focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </label>
              </DetailSection>
            ) : null}
          </div>
        </div>

        {error ? (
          <p role="alert" className="text-12 text-danger">
            {error}
          </p>
        ) : null}

        <div className="flex flex-col-reverse gap-[8px] border-t border-line pt-[16px] sm:flex-row sm:justify-end">
          {editing ? (
            <>
              <Button
                onClick={() => {
                  setForm(item);
                  setDocumentsText(item.documents.join('\n'));
                  setReason('');
                  setError('');
                  onCancel();
                }}
              >
                ยกเลิก
              </Button>
              <Button type="submit" variant="primary" disabled={saving}>
                {saving ? 'กำลังส่งข้อเสนอ...' : 'ส่งข้อเสนอให้หัวหน้า HR'}
              </Button>
            </>
          ) : (
            <Button variant="primary" onClick={onEdit} disabled={Boolean(openProposalNo)}>
              {openProposalNo ? `มีข้อเสนอรออนุมัติ (${openProposalNo})` : 'เสนอแก้ไข'}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}

const inputClass =
  'h-10 rounded-lg border border-line bg-white px-3 text-13 font-normal text-ink focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500';

const editInputClass = cx(inputClass, 'w-[200px] max-w-full');

function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex min-w-0 flex-col gap-[10px] border-t border-line pt-[16px]">
      <h2 className="text-13 font-semibold text-ink">{title}</h2>
      {children}
    </section>
  );
}

function EditInput({
  field,
  form,
  set,
  label,
  categories,
}: {
  field: keyof EditableFields;
  form: EditableFields;
  set: <K extends keyof EditableFields>(key: K, value: EditableFields[K]) => void;
  label: string;
  categories: string[];
}) {
  if (field === 'category') {
    return (
      <select aria-label={label} className={editInputClass} value={form.category ?? ''} onChange={(event) => set('category', event.target.value)}>
        {categories.map((cat) => (
          <option key={cat} value={cat}>
            {cat}
          </option>
        ))}
      </select>
    );
  }
  if (field === 'budgetType') {
    return (
      <select aria-label={label} className={editInputClass} value={form.budgetType} onChange={(event) => set('budgetType', event.target.value as BudgetType)}>
        {budgetTypes.map((type) => (
          <option key={type}>{type}</option>
        ))}
      </select>
    );
  }
  if (field === 'formType') {
    return (
      <select aria-label={label} className={editInputClass} value={form.formType} onChange={(event) => set('formType', event.target.value)}>
        {Object.entries(FORM_TYPE_LABELS).map(([key, name]) => (
          <option key={key} value={key}>
            {name}
          </option>
        ))}
      </select>
    );
  }
  if (field === 'maxClaimsPerYear') {
    return (
      <input
        aria-label={label}
        type="number"
        min={1}
        step={1}
        inputMode="numeric"
        placeholder="ไม่จำกัด"
        className={cx(editInputClass, 'text-right tabular-nums')}
        value={form.maxClaimsPerYear ?? ''}
        onChange={(event) => set('maxClaimsPerYear', event.target.value === '' ? null : Number(event.target.value))}
      />
    );
  }
  if (field === 'startDate') {
    return <input aria-label={label} type="date" className={editInputClass} value={form.startDate} onChange={(event) => set('startDate', event.target.value)} />;
  }
  if (field === 'amount') {
    return (
      <input
        aria-label={label}
        type="number"
        min={0}
        step={100}
        inputMode="numeric"
        className={cx(editInputClass, 'text-right tabular-nums')}
        value={form.amount || ''}
        onChange={(event) => set('amount', Number(event.target.value))}
      />
    );
  }
  return <input aria-label={label} className={cx(editInputClass, 'text-right')} value={String(form[field] ?? '')} onChange={(event) => set(field as 'eligible', event.target.value)} />;
}
