'use client';

import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { FileText } from 'lucide-react';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { Button } from '../../components/ui/Button';
import { Tag } from '../../components/ui/Tag';
import { useToast } from '../../components/ui/Toast';
import { ROLE_LABELS, type Role } from '../../lib/auth/roles';
import { cx } from '../../lib/cx';
import { formatBahtWhole, formatShortThaiDate } from '../../lib/format';
import type { BudgetType, WelfareItem } from '../../types';

const budgetTypes: BudgetType[] = ['รายปี', 'รายเดือน', 'ต่อครั้ง'];
const approverRoles: Role[] = ['HR', 'FINANCE'];

type EditableFields = Pick<WelfareItem, 'name' | 'amount' | 'budgetType' | 'maxClaims' | 'eligible' | 'startDate' | 'approver'>;

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
  const { notifyPending } = useToast();
  const [form, setForm] = useState<EditableFields>(item);
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
    const { amount, budgetType, maxClaims, eligible, startDate, approver } = form;
    const failure = await onSave({ name: form.name.trim(), amount, budgetType, maxClaims, eligible, startDate, approver });
    setSaving(false);
    if (failure) setError(failure);
  };

  const conditionRows: Row[] = [
    { label: 'ประเภทวงเงิน', value: item.budgetType, field: 'budgetType' },
    { label: 'วงเงินต่อปี', value: formatBahtWhole(item.amount), field: 'amount' },
    { label: 'จำนวนครั้งที่เบิกได้', value: item.maxClaims || '—', field: 'maxClaims' },
    { label: 'ผู้มีสิทธิ์', value: item.eligible || '—', field: 'eligible' },
    { label: 'วันที่เริ่มใช้', value: item.startDate ? formatShortThaiDate(item.startDate) : '—', field: 'startDate' },
    ...(item.nextLimit
      ? [{ label: 'วงเงินใหม่ที่ตั้งไว้', value: `${formatBahtWhole(item.nextLimit.amount)} ตั้งแต่ ${formatShortThaiDate(item.nextLimit.from)}` }]
      : []),
  ];
  const approvalRows: Row[] = [
    { label: 'ผู้อนุมัติการเบิก', value: ROLE_LABELS[item.approver as Role] ?? '—', field: 'approver' },
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
              <p className="text-12 text-muted">ปรับวงเงินต้องเลือกวันที่เริ่มใช้ตั้งแต่วันนี้เป็นต้นไป วงเงินเดิมจะเก็บไว้เป็นประวัติ</p>
            ) : null}
          </DetailSection>

          <div className="flex min-w-0 flex-col gap-[16px]">
            <DetailSection title="การอนุมัติและผู้ดูแล">{renderRows(approvalRows)}</DetailSection>

            <DetailSection title={`เอกสารประกอบ (${item.documents.length})`}>
              {item.documents.length === 0 ? (
                <p className="text-13 text-muted">ยังไม่มีเอกสารแนบ</p>
              ) : (
                <ul className="flex flex-col divide-y divide-line">
                  {item.documents.map((doc) => (
                    <li key={doc} className="flex items-center gap-[8px] py-[8px] text-13 text-ink">
                      <FileText className="size-4 shrink-0 text-muted" aria-hidden="true" />
                      <span className="min-w-0 flex-1 truncate">{doc}</span>
                      <button type="button" onClick={() => notifyPending(`ดูไฟล์ ${doc}`)} className="shrink-0 text-primary-700 hover:underline">
                        ดู<span className="sr-only"> {doc}</span>
                      </button>
                    </li>
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
  if (field === 'approver') {
    return (
      <select aria-label={label} className={editInputClass} value={form.approver} onChange={(event) => set('approver', event.target.value)}>
        {approverRoles.map((role) => (
          <option key={role} value={role}>
            {ROLE_LABELS[role]}
          </option>
        ))}
      </select>
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
  return <input aria-label={label} className={cx(editInputClass, 'text-right')} value={String(form[field])} onChange={(event) => set(field as 'maxClaims', event.target.value)} />;
}
