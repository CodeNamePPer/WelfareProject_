import { ImageIcon } from 'lucide-react';
import { cx } from '@/lib/cx';

// การ์ดที่พนักงานจะเห็น (พรีวิวใน H04 และ HH2)
export function BenefitPreview({
  imageUrl,
  label,
  name,
  description,
  chips,
  maxClaims,
  amount,
  className,
}: {
  imageUrl: string | null;
  /** บรรทัดเล็กด้านบน เช่น "ใหม่ · สุขภาพ" หรือ "WEL-014 · สุขภาพ" */
  label: string;
  name: string;
  description: string;
  chips: string[];
  maxClaims: number | null;
  amount: number | null;
  className?: string;
}) {
  return (
    <article className={cx('overflow-hidden rounded-[8px] border border-line bg-white', className)}>
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- รูปจาก storage ผ่านลิงก์ชั่วคราว
        <img src={imageUrl} alt={`รูปประกอบ: ${name || 'สวัสดิการ'}`} className="h-[150px] w-full object-cover" />
      ) : (
        <div role="img" aria-label="ยังไม่มีรูปประกอบ" className="flex h-[150px] flex-col items-center justify-center gap-1.5 bg-mist text-11 text-muted">
          <ImageIcon className="size-7" strokeWidth={1.5} aria-hidden="true" />
          [รูปประกอบสวัสดิการ]
        </div>
      )}
      <div className="flex flex-col gap-1.5 px-4 py-3.5">
        <p className="text-12 text-muted">{label}</p>
        <p className="text-16 font-semibold">{name || 'ชื่อสวัสดิการ'}</p>
        <p className="text-13 text-ink-soft">{description || 'คำอธิบายสั้นบนการ์ด'}</p>
        {chips.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {chips.map((chip) => (
              <span key={chip} className="rounded-[999px] bg-[#EFF6FF] px-2 text-11 text-[#1E40AF]">
                {chip}
              </span>
            ))}
          </div>
        ) : null}
        <div className="flex justify-between text-12 text-muted">
          <span>{maxClaims ? `เบิกแล้ว 0/${maxClaims} ครั้ง` : 'ไม่จำกัดจำนวนครั้ง'}</span>
          <span className="font-semibold text-ink">{amount !== null ? `คงเหลือ ฿${amount.toLocaleString('th-TH')}` : '—'}</span>
        </div>
        <span className="mt-1 inline-flex h-8 w-fit items-center rounded-[999px] border border-[#1D4ED8] px-3.5 text-13 font-medium text-[#1D4ED8]">ดูรายละเอียด</span>
      </div>
    </article>
  );
}
