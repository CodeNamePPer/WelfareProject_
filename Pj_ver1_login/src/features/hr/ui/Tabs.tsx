'use client';

import { useRef, type KeyboardEvent } from 'react';
import { cx } from '@/lib/cx';

// แท็บขีดเส้นใต้ของ HR (ตัวที่เลือก: ตัวหนา ขีดล่าง 2px #1D4ED8) เลื่อนแนวนอนได้บนจอแคบ
export type TabItem<T extends string> = { id: T; label: string; count?: number | null };

export function Tabs<T extends string>({
  items,
  value,
  onChange,
  label,
  className,
  panelId,
}: {
  items: TabItem<T>[];
  value: T;
  onChange: (id: T) => void;
  label: string;
  className?: string;
  panelId?: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = items.length - 1;
    const next =
      event.key === 'ArrowRight' ? (index === last ? 0 : index + 1)
      : event.key === 'ArrowLeft' ? (index === 0 ? last : index - 1)
      : event.key === 'Home' ? 0
      : event.key === 'End' ? last
      : -1;
    if (next < 0) return;
    event.preventDefault();
    refs.current[next]?.focus();
    onChange(items[next].id);
  };

  return (
    <div role="tablist" aria-label={label} className={cx('flex overflow-x-auto border-b border-line px-5 [scrollbar-width:none]', className)}>
      {items.map((item, index) => {
        const active = item.id === value;
        return (
          <button
            key={item.id}
            ref={(node) => {
              refs.current[index] = node;
            }}
            type="button"
            role="tab"
            aria-selected={active}
            aria-controls={panelId}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(item.id)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={cx(
              'mr-[18px] -mb-px shrink-0 border-b-2 px-1 py-3 text-14 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
              active ? 'border-[#1D4ED8] font-semibold text-ink' : 'border-transparent text-muted hover:text-ink',
            )}
          >
            {item.label}
            {item.count !== undefined && item.count !== null ? ` (${item.count})` : ''}
          </button>
        );
      })}
    </div>
  );
}
