'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronLeft, ChevronRight, FilePlus2 } from 'lucide-react';
import { cx } from '../../lib/cx';

const STORAGE_KEY = 'employee.requestFab.hidden';
const HREF = '/employee/withdraw';

// ปุ่มลอยมุมขวาล่างของหน้าผู้ส่งคำขอ (วางใน employee/layout) มีหน้าที่เดียวคือพาไปหน้ายื่นคำขอ
// แสดงเป็นไอคอนอย่างเดียว · ปุ่มเล็กข้าง ๆ ใช้ซ่อนปุ่มไปชิดขอบขวา เหลือแถบเล็กไว้กดเปิดกลับ (จำค่าไว้ในเครื่อง)
// ไม่แสดงในหน้ายื่นคำขอเอง · z-[25] เท่าปุ่มทางลัดของ Admin: เหนือหัวมือถือ ใต้ฉากหลังเมนูข้าง
export function RequestFab() {
  const pathname = usePathname();
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    try {
      setHidden(window.localStorage.getItem(STORAGE_KEY) === '1');
    } catch {
      // เปิดแบบส่วนตัว/บล็อกที่เก็บข้อมูล: แสดงปุ่มตามปกติ
    }
  }, []);

  const toggle = (next: boolean) => {
    setHidden(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
    } catch {
      // ไม่จำค่าก็ไม่เป็นไร
    }
  };

  if (pathname === HREF || pathname.startsWith(`${HREF}/`)) return null;

  return (
    <div className="pointer-events-none fixed bottom-[16px] right-0 z-[25] sm:bottom-[24px]">
      {/* แถบเปิดกลับ: โผล่ชิดขอบขวาเมื่อซ่อนปุ่ม */}
      <button
        type="button"
        onClick={() => toggle(false)}
        aria-label="แสดงปุ่มยื่นคำขอ"
        title="แสดงปุ่มยื่นคำขอ"
        inert={!hidden}
        className={cx(
          'pointer-events-auto absolute bottom-[12px] right-0 inline-flex h-[32px] w-[22px] items-center justify-center rounded-l-[8px] bg-primary-600 text-white shadow-popover',
          'transition-[opacity,transform,background-color] duration-200 ease-out hover:bg-primary-700 motion-reduce:transition-none',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
          hidden ? 'translate-x-0 opacity-100' : 'pointer-events-none translate-x-full opacity-0',
        )}
      >
        <ChevronLeft className="size-[16px]" strokeWidth={2} aria-hidden="true" />
      </button>

      <div
        inert={hidden}
        className={cx(
          'flex items-center gap-[8px] pr-[16px] sm:pr-[24px]',
          'transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none',
          hidden ? 'translate-x-[calc(100%+8px)] opacity-0' : 'translate-x-0 opacity-100',
        )}
      >
        <button
          type="button"
          onClick={() => toggle(true)}
          aria-label="ซ่อนปุ่มยื่นคำขอ"
          title="ซ่อนปุ่ม"
          className={cx(
            'pointer-events-auto inline-flex size-[28px] items-center justify-center rounded-full border border-line bg-white text-muted shadow-popover',
            'transition-colors hover:bg-primary-50 hover:text-primary-700 motion-reduce:transition-none',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
          )}
        >
          <ChevronRight className="size-[16px]" strokeWidth={2} aria-hidden="true" />
        </button>

        <Link
          href={HREF}
          aria-label="ยื่นคำขอ"
          title="ยื่นคำขอ"
          className={cx(
            'pointer-events-auto inline-flex size-[56px] items-center justify-center rounded-full bg-primary-600 text-white shadow-popover',
            'transition-[background-color,box-shadow,transform] duration-200 ease-out hover:bg-primary-700 hover:shadow-[0_12px_28px_-6px_rgba(15,23,42,0.28)] active:scale-95',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 motion-reduce:transition-none',
          )}
        >
          <FilePlus2 className="size-[22px]" strokeWidth={1.75} aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
