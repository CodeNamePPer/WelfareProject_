import { cx } from '@/lib/cx';
import { initialsOf } from '@/features/hr/queue';

// รูปย่อพนักงาน: มีรูปใช้รูป ไม่มีใช้อักษรย่อ (ฐานข้อมูลยังไม่มีรูปพนักงาน)
const sizeClass = { sm: 'size-8 text-12', md: 'size-10 text-13', lg: 'size-16 text-[20px]' } as const;
const toneClass = { mist: 'bg-mist text-ink-soft', blue: 'bg-[#DBEAFE] text-[#1E40AF]', orange: 'bg-[#FFEDD5] text-[#9A3412]' } as const;

export function Avatar({ name, src, size = 'md', tone = 'mist', className }: { name: string; src?: string | null; size?: keyof typeof sizeClass; tone?: keyof typeof toneClass; className?: string }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element -- รูปย่อจาก storage ไม่ต้องผ่าน next/image
    return <img src={src} alt="" className={cx('shrink-0 rounded-full object-cover', sizeClass[size], className)} />;
  }
  return (
    <span aria-hidden="true" className={cx('flex shrink-0 items-center justify-center rounded-full font-semibold', toneClass[tone], sizeClass[size], className)}>
      {initialsOf(name) || '?'}
    </span>
  );
}
