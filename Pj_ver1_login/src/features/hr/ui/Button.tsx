import Link from 'next/link';
import type { ComponentProps } from 'react';
import { cx } from '@/lib/cx';

// ปุ่มของ HR (สเปก: สูง 38px มุม 999px)
// primary = พื้น #1D4ED8 ตัวขาว · secondary = พื้นขาว ขอบและตัว #1D4ED8 · revise = "แก้ไข" #FF8A00 · reject = "ไม่อนุมัติ" #991B1B
export type ButtonVariant = 'primary' | 'secondary' | 'revise' | 'reject' | 'quiet';
export type ButtonSize = 'md' | 'sm';

const base =
  'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-[999px] font-medium whitespace-nowrap no-underline transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50';

const variantClass: Record<ButtonVariant, string> = {
  primary: 'bg-[#1D4ED8] text-white hover:bg-[#1E40AF]',
  secondary: 'border border-[#1D4ED8] bg-white text-[#1D4ED8] hover:bg-primary-50',
  revise: 'bg-[#FF8A00] text-white hover:bg-[#E67A00]',
  reject: 'bg-[#991B1B] text-white hover:bg-[#7F1D1D]',
  quiet: 'border border-[#CBD5E1] bg-white font-normal text-ink-soft hover:bg-surface',
};

const sizeClass: Record<ButtonSize, string> = {
  md: 'h-[38px] px-[18px] text-13',
  sm: 'h-[32px] px-[14px] text-13',
};

export function buttonClass(variant: ButtonVariant = 'primary', size: ButtonSize = 'md', className?: string) {
  return cx(base, variantClass[variant], sizeClass[size], className);
}

type Common = { variant?: ButtonVariant; size?: ButtonSize };

export function Button({ variant, size, className, type = 'button', ...rest }: ComponentProps<'button'> & Common) {
  return <button type={type} className={buttonClass(variant, size, className)} {...rest} />;
}

/** ลิงก์ที่หน้าตาเป็นปุ่ม */
export function ButtonLink({ variant, size, className, ...rest }: ComponentProps<typeof Link> & Common) {
  return <Link className={buttonClass(variant, size, className)} {...rest} />;
}
