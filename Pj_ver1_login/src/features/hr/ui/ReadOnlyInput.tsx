import { useId, type ReactNode } from 'react';
import { Field } from './Input';

// ช่องที่ระบบกำหนด แก้ไม่ได้ (สเปก: พื้น #F1F5F9 ตัว #475569 (เข้มกว่าสเปก #8A94A6 ที่จางเกินไป) cursor not-allowed ไม่มีไอคอน)
export function ReadOnlyInput({
  id,
  label,
  value,
  hint,
  reason = 'ระบบกำหนด แก้ไขไม่ได้',
  className,
}: {
  id?: string;
  label?: ReactNode;
  value: string | number | null | undefined;
  hint?: ReactNode;
  reason?: string;
  className?: string;
}) {
  const auto = useId();
  const inputId = id ?? auto;
  return (
    <Field id={inputId} label={label} hint={hint} className={className}>
      <input
          id={inputId}
          readOnly
          aria-readonly="true"
          title={reason}
          value={value ?? '-'}
          aria-describedby={hint ? `${inputId}-hint` : undefined}
          className="h-[42px] w-full cursor-not-allowed rounded-[8px] border border-[#E2E8F0] bg-[#F1F5F9] px-3 text-14 text-[#475569] outline-none focus:ring-1 focus:ring-[#CBD5E1]"
        />
    </Field>
  );
}
