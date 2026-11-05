import type { ComponentProps } from 'react';
import { cx } from '../../lib/cx';
import { Spinner } from './Spinner';

type Variant = 'primary' | 'secondary' | 'ghost' | 'tonal' | 'danger' | 'danger-outline';
type Size = 'sm' | 'md';

// ComponentProps (ไม่ใช่ ButtonHTMLAttributes) เพื่อให้ส่ง ref ได้ตาม React 19 เช่น ย้ายโฟกัสไปที่ปุ่ม
interface ButtonProps extends ComponentProps<'button'> {
  variant?: Variant;
  size?: Size;
  /** แสดงวงหมุนและปิดปุ่มไว้ระหว่างรอผลจากเซิร์ฟเวอร์ */
  loading?: boolean;
}

const variants: Record<Variant, string> = {
  primary: 'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-700 shadow-xs',
  secondary: 'border border-line bg-white text-ink hover:bg-surface hover:border-slate-300 transition-colors',
  ghost: 'text-muted hover:text-ink hover:bg-surface transition-colors',
  tonal: 'bg-primary-50 text-primary-700 hover:bg-primary-100 transition-colors',
  danger: 'bg-danger text-white hover:bg-danger/90 active:bg-danger/90 shadow-xs',
  // ปุ่มเปิดการกระทำที่ย้อนไม่ได้ (เช่น รีเซ็ตรหัสผ่าน): แยกจากปุ่มแก้ไขทั่วไป แต่ไม่ดังเท่าปุ่มยืนยันสีทึบ
  'danger-outline': 'border border-danger/40 bg-white text-danger hover:border-danger hover:bg-danger/5 transition-colors',
};

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-13',
  md: 'h-10 px-4 text-sm',
};

export function Button({
  variant = 'secondary',
  size = 'md',
  loading = false,
  className,
  type = 'button',
  disabled,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium whitespace-nowrap transition-colors motion-reduce:transition-none',
        variants[variant],
        sizes[size],
        className,
        // ระหว่างโหลด: เคอร์เซอร์รอ และไม่จางมากจนมองวงหมุนไม่ออก (ทับ disabled:* ของผู้เรียก)
        '[&[aria-busy=true]]:cursor-wait [&[aria-busy=true]]:opacity-80',
      )}
      {...rest}
    >
      {loading ? <Spinner /> : null}
      {children}
    </button>
  );
}
