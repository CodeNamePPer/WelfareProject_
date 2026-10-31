'use client';

import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Check, FileText } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Tag } from '../../components/ui/Tag';
import { useToast } from '../../components/ui/Toast';
import { cx } from '../../lib/cx';
import { formatBahtWhole, formatShortThaiDate } from '../../lib/format';
import type { BudgetType, WelfareItem } from '../../types';

const steps = [
  { label: 'เพิ่มข้อมูล', by: 'Admin' },
  { label: 'ตรวจข้อมูล', by: 'HR' },
  { label: 'บันทึก', by: 'HR' },
  { label: 'แจ้งอีเมล', by: 'ประกาศในระบบ' },
];

const budgetTypes: BudgetType[] = ['รายปี', 'รายเดือน', 'ต่อครั้ง'];

type EditableFields = Pick<WelfareItem, 'name' | 'amount' | 'budgetType' | 'maxClaims' | 'eligible' | 'startDate' | 'approver'>;

interface WelfareDetailProps {
  item: WelfareItem;
  editing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (patch: Partial<WelfareItem>) => void;
}

// Figma 163:180 – right-hand "รายละเอียดสวัสดิการ" card.
export function WelfareDetail({ item, editing, onEdit, onCancel, onSave }: WelfareDetailProps) {
  const { notifyPending } = useToast();
  const [form, setForm] = useState<EditableFields>(item);
  const [error, setError] = useState('');

  const set = <K extends keyof EditableFields>(key: K, value: EditableFields[K]) => setForm((prev) => ({ ...prev, [key]: value }));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) return setError('กรุณาระบุชื่อสวัสดิการ');
    if (!(form.amount > 0)) return setError('วงเงินต้องมากกว่า 0');
    setError('');
    onSave({ ...form, name: form.name.trim(), step: Math.max(item.step, 1) });
  };

  const rows: Array<{ label: string; value: string; field?: keyof EditableFields }> = [
    { label: 'ประเภทวงเงิน', value: item.budgetType, field: 'budgetType' },
    { label: 'วงเงินต่อปี', value: formatBahtWhole(item.amount), field: 'amount' },
    { label: 'จำนวนครั้งที่เบิกได้', value: item.maxClaims || '—', field: 'maxClaims' },
    { label: 'ผู้มีสิทธิ์', value: item.eligible || '—', field: 'eligible' },
    { label: 'วันที่เริ่มใช้', value: item.startDate || '—', field: 'startDate' },
    { label: 'ผู้อนุมัติการเบิก', value: item.approver || '—', field: 'approver' },
    { label: 'งบรวมโดยประมาณ', value: item.estimatedBudget },
  ];

  return (
    <form
      onSubmit={submit}
      aria-labelledby="welfare-detail-title"
      className="flex flex-col gap-[16px] rounded-[10px] border border-line bg-white p-[20px] xl:sticky xl:top-[24px] xl:self-start"
    >
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="welfare-detail-title" className="text-[17px] font-semibold text-ink">
            รายละเอียดสวัสดิการ
          </h2>
          <p className="mt-[4px] text-[12px] text-muted">
            {item.code} · แก้ไขล่าสุด {formatShortThaiDate(item.updatedAt)}
          </p>
          <p className="text-[12px] text-muted">ผู้ดูแล: {item.owner}</p>
        </div>
        <Tag tone={item.status === 'active' ? 'success' : 'neutral'}>{item.status === 'active' ? 'ใช้งาน' : 'หยุดใช้'}</Tag>
      </header>

      <div className="flex flex-col gap-[8px] rounded-[8px] bg-surface p-[12px]">
        <p className="text-[11px] text-muted">สวัสดิการที่เลือก</p>
        {editing ? (
          <Field label="ชื่อสวัสดิการ">
            <input className={inputClass} value={form.name} onChange={(event) => set('name', event.target.value)} autoFocus />
          </Field>
        ) : (
          <p className="text-[15px] font-semibold text-ink">{item.name}</p>
        )}

        <dl className="flex flex-col gap-[6px]">
          {rows.map(({ label, value, field }) => (
            <div key={label} className="flex items-center justify-between gap-3 text-[12px]">
              <dt className="shrink-0 text-muted">{label}</dt>
              <dd className="min-w-0 text-right font-medium text-ink">
                {editing && field ? <EditInput field={field} form={form} set={set} label={label} /> : value}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <section aria-labelledby="welfare-docs-title" className="flex flex-col gap-[8px]">
        <h3 id="welfare-docs-title" className="text-[13px] font-medium text-ink">
          เอกสารประกอบ ({item.documents.length})
        </h3>
        {item.documents.length === 0 ? (
          <p className="text-[12px] text-muted">ยังไม่มีเอกสารแนบ</p>
        ) : (
          <ul className="flex flex-col gap-[8px]">
            {item.documents.map((doc) => (
              <li key={doc} className="flex items-center gap-[8px] rounded-[6px] border border-line px-[10px] py-[6px] text-[12px] text-ink">
                <FileText className="size-4 shrink-0 text-muted" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate">{doc}</span>
                <button type="button" onClick={() => notifyPending(`ดูไฟล์ ${doc}`)} className="shrink-0 text-primary-700 hover:underline">
                  ดู<span className="sr-only"> {doc}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="welfare-steps-title" className="flex flex-col gap-[12px]">
        <h3 id="welfare-steps-title" className="text-[13px] font-medium text-ink">
          ขั้นตอนการจัดการสวัสดิการ
        </h3>
        <ol className="grid grid-cols-4">
          {steps.map((step, index) => {
            const done = index < item.step;
            const current = index === item.step;
            return (
              <li key={step.label} className="relative flex flex-col items-center gap-[4px] text-center" aria-current={current ? 'step' : undefined}>
                {index > 0 ? (
                  <span className={cx('absolute top-[7px] right-1/2 h-[2px] w-full', index <= item.step ? 'bg-primary-600' : 'bg-line')} aria-hidden="true" />
                ) : null}
                <span
                  className={cx(
                    'relative z-[1] inline-flex size-[16px] items-center justify-center rounded-full border-2 bg-white',
                    done ? 'border-primary-600 bg-primary-600 text-white' : current ? 'border-primary-600' : 'border-line',
                  )}
                >
                  {done ? <Check className="size-[10px]" strokeWidth={3} aria-hidden="true" /> : null}
                </span>
                <span className={cx('text-[12px]', current || done ? 'font-medium text-ink' : 'text-muted')}>{step.label}</span>
                <span className="text-[10px] text-muted">{step.by}</span>
              </li>
            );
          })}
        </ol>
      </section>

      {error ? (
        <p role="alert" className="text-[12px] text-danger">
          {error}
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-[8px] pt-[8px]">
        {editing ? (
          <>
            <Button
              onClick={() => {
                setForm(item);
                setError('');
                onCancel();
              }}
            >
              ยกเลิก
            </Button>
            <Button type="submit" variant="primary">
              บันทึก
            </Button>
          </>
        ) : (
          <>
            <Button variant="primary" onClick={onEdit}>
              แก้ไข
            </Button>
            <Button disabled className="disabled:cursor-not-allowed disabled:opacity-50" title="กด แก้ไข ก่อนบันทึก">
              บันทึก
            </Button>
          </>
        )}
      </div>
    </form>
  );
}

const inputClass =
  'h-8 w-full rounded-[6px] border border-line bg-white px-2 text-[12px] text-ink focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500';

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-[4px] text-[11px] text-muted">
      {label}
      {children}
    </label>
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
      <select aria-label={label} className={cx(inputClass, 'w-[140px]')} value={form.budgetType} onChange={(event) => set('budgetType', event.target.value as BudgetType)}>
        {budgetTypes.map((type) => (
          <option key={type}>{type}</option>
        ))}
      </select>
    );
  }
  if (field === 'amount') {
    return (
      <input
        aria-label={label}
        type="number"
        min={0}
        step={100}
        inputMode="numeric"
        className={cx(inputClass, 'w-[140px] text-right tabular-nums')}
        value={form.amount || ''}
        onChange={(event) => set('amount', Number(event.target.value))}
      />
    );
  }
  return (
    <input aria-label={label} className={cx(inputClass, 'w-[140px] text-right')} value={String(form[field])} onChange={(event) => set(field as 'maxClaims', event.target.value)} />
  );
}
