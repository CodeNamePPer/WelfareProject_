import { useId, type ComponentProps, type ReactNode } from 'react';
import { cx } from '@/lib/cx';

// ช่องกรอกของ HR (สเปก: สูง 42px ขอบ #CBD5E1 มุม 8px)

export const fieldClass =
  'h-[42px] w-full rounded-[8px] border border-[#CBD5E1] bg-white px-3 text-14 text-ink outline-none placeholder:text-muted focus:border-primary-600 focus:ring-1 focus:ring-primary-600 aria-[invalid=true]:border-[#991B1B]';
export const labelClass = 'mb-1.5 block text-13 font-medium text-ink-soft';

type FieldProps = { label?: ReactNode; hint?: ReactNode; error?: ReactNode; className?: string };

/** ป้ายชื่อ + ช่อง + ข้อความช่วย/ข้อผิดพลาด */
export function Field({ id, label, hint, error, className, children }: FieldProps & { id: string; children: ReactNode }) {
  return (
    <div className={className}>
      {label ? (
        <label htmlFor={id} className={labelClass}>
          {label}
        </label>
      ) : null}
      {children}
      {error ? (
        <p id={`${id}-error`} className="mt-1 text-12 text-[#991B1B]">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1 text-12 text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function describedBy(id: string, error?: ReactNode, hint?: ReactNode) {
  return error ? `${id}-error` : hint ? `${id}-hint` : undefined;
}

export function Input({ id, label, hint, error, className, ...rest }: Omit<ComponentProps<'input'>, 'className'> & FieldProps) {
  const auto = useId();
  const inputId = id ?? auto;
  return (
    <Field id={inputId} label={label} hint={hint} error={error} className={className}>
      <input id={inputId} aria-invalid={error ? true : undefined} aria-describedby={describedBy(inputId, error, hint)} className={fieldClass} {...rest} />
    </Field>
  );
}

export function Select({ id, label, hint, error, className, children, ...rest }: Omit<ComponentProps<'select'>, 'className'> & FieldProps) {
  const auto = useId();
  const inputId = id ?? auto;
  return (
    <Field id={inputId} label={label} hint={hint} error={error} className={className}>
      <select id={inputId} aria-invalid={error ? true : undefined} aria-describedby={describedBy(inputId, error, hint)} className={fieldClass} {...rest}>
        {children}
      </select>
    </Field>
  );
}

export function Textarea({ id, label, hint, error, className, rows = 3, ...rest }: Omit<ComponentProps<'textarea'>, 'className'> & FieldProps) {
  const auto = useId();
  const inputId = id ?? auto;
  return (
    <Field id={inputId} label={label} hint={hint} error={error} className={className}>
      <textarea
        id={inputId}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(inputId, error, hint)}
        className={cx(fieldClass, 'h-auto min-h-[84px] py-2.5 leading-[1.55]')}
        {...rest}
      />
    </Field>
  );
}
