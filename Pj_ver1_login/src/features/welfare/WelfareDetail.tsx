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

type EditableFields = Pick<WelfareItem, 'name' | 'amount' | 'budgetType' | 'maxClaimsPerYear' | 'formType' | 'eligible' | 'startDate'>;

type Row = { label: string; value: string; field?: keyof EditableFields };

interface WelfareDetailProps {
  item: WelfareItem;
  editing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  /** คืนข้อความเมื่อบันทึกไม่สำเร็จ */
  onSave: (patch: Partial<WelfareItem>) => Promise<string | null>;
}

// หน้ารายละเอียดสวัสดิการ เปิดจากแถวในตาราง (?item=รหัสสวัสดิการ)
export function WelfareDetail({ item, editing, onEdit, onCancel, onSave }: WelfareDetailProps) {
  const [form, setForm] = useState<EditableFields>(item);
  // แก้เป็นข้อความ หนึ่งรายการต่อบรรทัด แล้วแยกเป็นรายการตอนบันทึก
  const [documentsText, setDocumentsText] = useState(item.documents.join('\n'));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof EditableFields>(key: K, value: EditableFields[K]) => setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (saving) return;
    if (!form.name.trim()) return setError('กรุณาระบุชื่อสวัสดิการ');
    if (!(form.amount > 0)) return setError('วงเงินต้องมากกว่า 0');
    setError('');
    setSaving(true);
    const { amount, budgetType, maxClaimsPerYear, formType, eligible, startDate } = form;
    const documents = documentsText.split('\n').map((name) => name.trim()).filter(Boolean);
    const failure = await onSave({ name: form.name.trim(), amount, budgetType, maxClaimsPerYear, formType, eligible, startDate, documents });
    setSaving(false);
    if (failure) setError(failure);
  };

  const conditionRows: Row[] = [
    { label: 'ประเภทวงเงิน', value: item.budgetType, field: 'budgetType' },
    { label: `วงเงิน${item.budgetType}`, value: formatBahtWhole(item.amount), field: 'amount' },
    { label: 'จำนวนครั้งที่เบิกได้ต่อปี', value: item.maxClaims || 'ไม่จำกัด', field: 'maxClaimsPerYear' },
    { label: 'ผู้มีสิทธิ์', value: item.eligible || '—', field: 'eligible' },
    { label: 'วันที่เริ่มใช้', value: item.startDate ? formatShortThaiDate(item.startDate) : '—', field: 'startDate' },
    ...(item.nextLimit
      ? [{ label: 'วงเงินใหม่ที่ตั้งไว้', value: `${formatBahtWhole(item.nextLimit.amount)} ตั้งแต่ ${formatShortThaiDate(item.nextLimit.from)}` }]
      : []),
  ];
  const approvalRows: Row[] = [
    { label: 'ขั้นตอนอนุมัติ', value: APPROVAL_FLOW },
    { label: 'งบรวมโดยประมาณ', value: item.estimatedBudget },
    { label: 'ผู้ดูแล', value: item.owner },
    { label: 'แก้ไขล่าสุด', value: formatShortThaiDate(item.updatedAt) },
  ];

  const renderRows = (rows: Row[]) => (
    <dl className="flex flex-col gap-[8px]">
      {rows.map(({ label, value, field }) => (
        <div key={label} className="flex items-center justify-between gap-3 text-13">
          <dt className="shrink-0 text-muted">{label}</dt>
          <dd className="min-w-0 break-words text-right font-medium text-ink">
            {editing && field ? <EditInput field={field} form={form} set={set} label={label} /> : value}
          </dd>
        </div>
      ))}
    </dl>
  );

  return (
    <div className="flex flex-col gap-[12px]">
      <Breadcrumb items={[{ label: 'สวัสดิการที่มีอยู่', href: '/admin/benefits' }, { label: item.code }]} />
      <form
        onSubmit={submit}
        aria-labelledby="welfare-detail-title"
        className="flex flex-col gap-[16px] rounded-[10px] border border-line bg-white p-[16px] sm:p-[20px]"
      >
        <header className="flex items-start justify-between gap-[8px]">
          <div className="min-w-0">
            <p className="text-12 text-muted tabular-nums">{item.code}</p>
            <h1 id="welfare-detail-title" className="break-words text-22 font-semibold text-ink">
              {item.name}
            </h1>
          </div>
          <Tag tone={item.status === 'active' ? 'success' : 'neutral'}>{item.status === 'active' ? 'ใช้งาน' : 'หยุดใช้'}</Tag>
        </header>

        <div className="grid grid-cols-1 gap-[16px] lg:grid-cols-2 lg:gap-x-[40px]">
          <DetailSection title="เงื่อนไขการเบิก">
            {editing ? (
              <label className="flex flex-col gap-[6px] text-13 font-medium text-ink">
                ชื่อสวัสดิการ
                <input className={cx(inputClass, 'w-full')} value={form.name} onChange={(event) => set('name', event.target.value)} autoFocus />
              </label>
            ) : null}
            {renderRows(conditionRows)}
            {editing ? (
              <p className="text-12 leading-5 text-muted">
                ปรับวงเงินต้องเลือกวันที่เริ่มใช้ตั้งแต่วันนี้เป็นต้นไป วงเงินเดิมจะเก็บไว้เป็นประวัติ จำนวนครั้งนับตามปีของวันที่เกิดค่าใช้จ่าย
                เว้นว่างเมื่อไม่จำกัด ส่วนผู้มีสิทธิ์เป็นข้อความที่แสดงให้พนักงานและ HR เห็น ระบบไม่ได้ตรวจให้
              </p>
            ) : null}

            <div className="flex flex-col gap-[8px] border-t border-line pt-[12px]">
              <div className="flex items-center justify-between gap-3 text-13">
                <span className="shrink-0 text-muted">แบบฟอร์มยื่นคำขอ</span>
                <span className="min-w-0 text-right font-medium text-ink">
                  {editing ? (
                    <EditInput field="formType" form={form} set={set} label="แบบฟอร์มยื่นคำขอ" />
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
                  setError('');
                  onCancel();
                }}
              >
                ยกเลิก
              </Button>
              <Button type="submit" variant="primary" disabled={saving}>
                {saving ? 'กำลังบันทึก...' : 'บันทึก'}
              </Button>
            </>
          ) : (
            <Button variant="primary" onClick={onEdit}>
              แก้ไข
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
}: {
  field: keyof EditableFields;
  form: EditableFields;
  set: <K extends keyof EditableFields>(key: K, value: EditableFields[K]) => void;
  label: string;
}) {
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
  return <input aria-label={label} className={cx(editInputClass, 'text-right')} value={String(form[field])} onChange={(event) => set(field as 'eligible', event.target.value)} />;
}
