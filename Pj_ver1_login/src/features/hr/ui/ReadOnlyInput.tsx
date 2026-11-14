import { useId, type ReactNode } from 'react';
import { Lock } from 'lucide-react';
import { Field } from './Input';

// ช่องที่ระบบกำหนด แก้ไม่ได้ (สเปก: พื้น #F1F5F9 ตัว #8A94A6 ไอคอนแม่กุญแจซ้าย cursor not-allowed)
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
      <div className="relative">
        <Lock aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#8A94A6]" />
        <input
          id={inputId}
          readOnly
          aria-readonly="true"
          title={reason}
          value={value ?? '-'}
          aria-describedby={hint ? `${inputId}-hint` : undefined}
          className="h-[42px] w-full cursor-not-allowed rounded-[8px] border border-[#E2E8F0] bg-[#F1F5F9] pr-3 pl-9 text-14 text-[#8A94A6] outline-none focus:ring-1 focus:ring-[#CBD5E1]"
        />
      </div>
    </Field>
  );
}
