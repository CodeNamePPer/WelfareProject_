'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, LayoutGrid, X } from 'lucide-react';
import { cx } from '../../lib/cx';
import { getShortcuts } from './shortcuts';

// ปุ่มลอยมุมขวาล่างของทุกหน้า Admin (วางใน admin/layout) เปิดเมนูทางลัดขนาดกะทัดรัด
// ปิดได้ด้วยการคลิกนอกเมนู กด Escape หรือเลือกรายการ (focus กลับไปที่ปุ่ม)
// z-[25]: อยู่เหนือหัวมือถือ (z-20) แต่ใต้ฉากหลังของเมนูข้างเมื่อเปิดบนมือถือ (z-30)
export function ShortcutFab({ notificationCount }: { notificationCount: number | null }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const firstLinkRef = useRef<HTMLAnchorElement>(null);
  const menuId = useId();
  const titleId = useId();
  const shortcuts = getShortcuts(notificationCount);
  const badge = notificationCount ?? 0;

  useEffect(() => {
    if (!open) return;
    firstLinkRef.current?.focus();

    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div
      ref={rootRef}
      // pointer-events-none: กล่องนี้กว้างเท่าเมนู แม้เมนูปิดอยู่ก็จะบังปุ่มที่อยู่ข้างใต้ (เช่น ปุ่มหน้าถัดไป) จึงให้คลิกทะลุ
      // แล้วเปิดรับคลิกเฉพาะเมนูกับปุ่ม
      className="pointer-events-none fixed bottom-[16px] right-[16px] z-[25] flex flex-col items-end gap-[12px] sm:bottom-[24px] sm:right-[24px]"
    >
      <nav
        id={menuId}
        aria-labelledby={titleId}
        inert={!open}
        className={cx(
          'w-[min(320px,calc(100vw-32px))] origin-bottom-right pointer-events-auto rounded-[10px] border border-line bg-white p-[8px] shadow-popover',
          'duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none',
          // เปิด: visible ทันทีเพื่อให้ย้าย focus เข้าเมนูได้ · ปิด: คง visible จนจางหายแล้วจึงซ่อน
          open
            ? 'visible translate-y-0 scale-100 opacity-100 transition-[opacity,transform]'
            : 'invisible translate-y-[8px] scale-95 opacity-0 transition-[opacity,transform,visibility]',
        )}
      >
        <p id={titleId} className="px-[10px] pb-[6px] pt-[4px] text-13 font-semibold text-muted">
          ทางลัด
        </p>
        <ul className="flex flex-col">
          {shortcuts.map(({ id, label, description, icon: Icon, href, badge: count }, index) => {
            // หน้าที่เปิดอยู่ (เทียบเฉพาะ path – ?tab=import ไม่นับว่าเป็นหน้าเดียวกับ /admin/benefits)
            const current = !href.includes('?') && pathname === href;
            return (
              <li key={id}>
                <Link
                  ref={index === 0 ? firstLinkRef : undefined}
                  href={href}
                  aria-current={current ? 'page' : undefined}
                  onClick={() => setOpen(false)}
                  className={cx(
                    'group flex items-center gap-[12px] rounded-[8px] px-[10px] py-[8px] transition-colors hover:bg-primary-50 focus-visible:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 motion-reduce:transition-none',
                    current && 'bg-primary-50',
                  )}
                >
                  <span
                    className={cx(
                      'flex size-[36px] shrink-0 items-center justify-center rounded-[8px] text-primary-600 group-hover:bg-white group-focus-visible:bg-white',
                      current ? 'bg-white' : 'bg-primary-50',
                    )}
                    aria-hidden="true"
                  >
                    <Icon className="size-[18px]" strokeWidth={1.75} />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="flex items-center gap-[8px]">
                      <span className="truncate text-14 font-semibold text-ink group-hover:text-primary-700">{label}</span>
                      {count ? (
                        <span className="inline-flex min-w-[20px] shrink-0 items-center justify-center rounded-full bg-primary-600 px-[6px] text-11 font-semibold leading-[calc(18rem/14)] text-white tabular-nums">
                          {count.toLocaleString('th-TH')}
                          <span className="sr-only"> รายการยังไม่อ่าน</span>
                        </span>
                      ) : null}
                    </span>
                    <span className="truncate text-12 text-muted">{description}</span>
                  </span>
                  <ChevronRight
                    className="size-[16px] shrink-0 text-muted transition-transform group-hover:translate-x-[2px] group-hover:text-primary-600 motion-reduce:transition-none"
                    aria-hidden="true"
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={open ? 'ปิดเมนูทางลัด' : 'เปิดเมนูทางลัด'}
        className={cx(
          'pointer-events-auto relative inline-flex size-[56px] items-center justify-center rounded-full text-white shadow-popover',
          'transition-[background-color,box-shadow,transform] duration-200 ease-out hover:shadow-[0_12px_28px_-6px_rgba(15,23,42,0.28)] active:scale-95',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 motion-reduce:transition-none',
          open ? 'bg-primary-700' : 'bg-primary-600 hover:bg-primary-700',
        )}
      >
        <LayoutGrid
          className={cx(
            'absolute size-[22px] transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none',
            open ? 'rotate-90 scale-50 opacity-0' : 'rotate-0 scale-100 opacity-100',
          )}
          strokeWidth={1.75}
          aria-hidden="true"
        />
        <X
          className={cx(
            'absolute size-[22px] transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none',
            open ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-50 opacity-0',
          )}
          strokeWidth={2}
          aria-hidden="true"
        />
        {badge > 0 && !open ? (
          <span
            className="absolute -right-[2px] -top-[2px] inline-flex min-w-[20px] items-center justify-center rounded-full bg-white px-[5px] text-11 font-semibold leading-[calc(18rem/14)] text-primary-700 ring-2 ring-primary-600 tabular-nums"
            aria-hidden="true"
          >
            {badge.toLocaleString('th-TH')}
          </span>
        ) : null}
      </button>
    </div>
  );
}
