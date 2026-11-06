'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BellOff, Check, CheckCheck, Settings2 } from 'lucide-react';
import { FilterChips } from '../../components/ui/FilterChips';
import { PageHeader } from '../../components/ui/PageHeader';
import { SearchInput } from '../../components/ui/SearchInput';
import { Select } from '../../components/ui/Select';
import { useToast } from '../../components/ui/Toast';
import { cx } from '../../lib/cx';
import { CategoryIcon, reviewButtonClass, reviewHref, toneOf } from './alertVisuals';
import { updateAlert, type AlertUpdate } from './api';
import type { AdminAlert } from '../../types';

type Filter = 'all' | 'unread' | 'actionable' | 'access' | 'expiring' | 'security' | 'system';
type Range = 'all' | '0' | '7' | '30';

const PAGE_STEP = 6;

function groupLabel(daysAgo: number): string {
  if (daysAgo === 0) return 'วันนี้';
  if (daysAgo === 1) return 'เมื่อวาน';
  if (daysAgo <= 7) return 'สัปดาห์นี้';
  return 'ก่อนหน้านี้';
}

function matchesFilter(alert: AdminAlert, filter: Filter): boolean {
  switch (filter) {
    case 'all':
      return true;
    case 'unread':
      return alert.unread;
    case 'actionable':
      return alert.actionable;
    case 'access':
      return alert.category === 'access' || alert.category === 'expiring';
    case 'expiring':
      return alert.category === 'expiring';
    case 'security':
      return alert.category === 'security';
    case 'system':
      return alert.category === 'system' || alert.category === 'welfare';
  }
}

// Inbox layout: งานที่ต้องดำเนินการอยู่บนสุด ตามด้วยรายการทั้งหมดเรียงตามวัน
export function NotificationsPage({ initialAlerts }: { initialAlerts: AdminAlert[] }) {
  const router = useRouter();
  const { notify } = useToast();
  const [alerts, setAlerts] = useState(initialAlerts);
  const [filter, setFilter] = useState<Filter>('all');
  const [range, setRange] = useState<Range>('all');
  const [query, setQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_STEP);

  const unreadCount = alerts.filter((alert) => alert.unread).length;
  const count = (f: Filter) => alerts.filter((alert) => matchesFilter(alert, f)).length;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return alerts.filter(
      (alert) =>
        matchesFilter(alert, filter) &&
        (range === 'all' || alert.daysAgo <= Number(range)) &&
        (!q || `${alert.title} ${alert.description}`.toLowerCase().includes(q)),
    );
  }, [alerts, filter, range, query]);

  const actionItems = filtered.filter((alert) => alert.actionable);
  const feed = filtered.filter((alert) => !alert.actionable);
  const visible = feed.slice(0, visibleCount);
  const groups = visible.reduce<Array<{ label: string; items: AdminAlert[] }>>((acc, alert) => {
    const label = groupLabel(alert.daysAgo);
    const last = acc[acc.length - 1];
    if (last && last.label === label) last.items.push(alert);
    else acc.push({ label, items: [alert] });
    return acc;
  }, []);

  const changeFilter = (value: Filter) => {
    setFilter(value);
    setVisibleCount(PAGE_STEP);
  };

  // แสดงผลทันที แล้วบันทึกลงฐานข้อมูล – ถ้าบันทึกไม่สำเร็จให้คืนค่าเดิมและแจ้งผู้ใช้
  // สำเร็จแล้ว refresh เพื่อให้ตัวเลขใน sidebar / ปุ่มทางลัดตรงกับหน้านี้
  const persist = (update: AlertUpdate, change: (items: AdminAlert[]) => AdminAlert[]) => {
    const before = alerts;
    setAlerts(change);
    return updateAlert(update)
      .then(() => router.refresh())
      .catch((err: Error) => {
        setAlerts(before);
        notify(err.message);
      });
  };

  const review = (alert: AdminAlert) => {
    persist({ action: 'resolve', id: alert.id }, (prev) =>
      prev.map((item) => (item.id === alert.id ? { ...item, unread: false, actionable: false } : item)),
    );
    const href = reviewHref[alert.category];
    if (href) router.push(href);
  };

  const toggleRead = (alert: AdminAlert) =>
    persist({ action: alert.unread ? 'read' : 'unread', id: alert.id }, (prev) =>
      prev.map((item) => (item.id === alert.id ? { ...item, unread: !item.unread } : item)),
    );

  const markAllRead = () =>
    persist({ action: 'read_all' }, (prev) => prev.map((item) => ({ ...item, unread: false })));

  return (
    <div className="flex flex-col gap-[20px]">
      <PageHeader
        title="การแจ้งเตือน"
        description={unreadCount > 0 ? `ยังไม่อ่าน ${unreadCount} รายการ` : 'อ่านครบทุกรายการแล้ว'}
        action={
          <div className="flex items-center gap-[8px]">
            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={markAllRead}
                className="inline-flex h-[40px] items-center gap-[6px] rounded-[6px] px-[10px] sm:h-[34px] text-13 font-medium text-primary-700 transition-colors hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 motion-reduce:transition-none"
              >
                <CheckCheck className="size-[16px]" aria-hidden="true" />
                อ่านแล้วทั้งหมด
              </button>
            ) : null}
            <ChannelSettings />
          </div>
        }
      />

      {/* แผ่นเดียว: สรุปตัวเลข, ตัวกรอง, งานที่ต้องทำ, รายการทั้งหมด คั่นด้วยเส้น ไม่แยกเป็นการ์ด */}
      <div className="flex flex-col overflow-hidden rounded-[10px] border border-line bg-white">
      {/* สรุปตัวเลข – กดเพื่อกรองรายการ */}
      <div className="grid grid-cols-3 divide-x divide-line border-b border-line">
        <SummaryStat label="ต้องดำเนินการ" value={count('actionable')} active={filter === 'actionable'} onClick={() => changeFilter(filter === 'actionable' ? 'all' : 'actionable')} />
        <SummaryStat label="สิทธิ์ใกล้หมดอายุ" value={count('expiring')} tone="warning" active={filter === 'expiring'} onClick={() => changeFilter(filter === 'expiring' ? 'all' : 'expiring')} />
        <SummaryStat label="เหตุการณ์ความปลอดภัย" value={count('security')} tone={alerts.some((a) => a.category === 'security' && a.actionable) ? 'danger' : undefined} active={filter === 'security'} onClick={() => changeFilter(filter === 'security' ? 'all' : 'security')} />
      </div>

      <div className="flex flex-col gap-[12px] border-b border-line p-[16px]">
        <FilterChips
          label="กรองการแจ้งเตือน"
          value={filter}
          onChange={changeFilter}
          options={[
            { id: 'all', label: 'ทั้งหมด', count: alerts.length },
            { id: 'unread', label: 'ยังไม่อ่าน', count: unreadCount },
            { id: 'access', label: 'คำขอสิทธิ์', count: count('access') },
            { id: 'security', label: 'ความปลอดภัย', count: count('security') },
            { id: 'system', label: 'ระบบ', count: count('system') },
          ]}
        />
        <div className="flex flex-col gap-[8px] sm:flex-row">
          <SearchInput
            label="ค้นหาแจ้งเตือน"
            placeholder="ค้นหาจากหัวข้อหรือรายละเอียด"
            value={query}
            onChange={(value) => {
              setQuery(value);
              setVisibleCount(PAGE_STEP);
            }}
            className="flex-1"
          />
          <Select
            label="ช่วงวันที่"
            value={range}
            onChange={(event) => {
              setRange(event.target.value as Range);
              setVisibleCount(PAGE_STEP);
            }}
            wrapperClassName="sm:w-[160px]"
          >
            <option value="all">ทุกช่วงวันที่</option>
            <option value="0">วันนี้</option>
            <option value="7">7 วันล่าสุด</option>
            <option value="30">30 วันล่าสุด</option>
          </Select>
        </div>
      </div>

      {/* แจ้งผู้ใช้โปรแกรมอ่านหน้าจอเมื่อผลลัพธ์เปลี่ยน */}
      <p className="sr-only" role="status" aria-live="polite">
        {`แสดง ${filtered.length} รายการ, ต้องดำเนินการ ${actionItems.length}, ยังไม่อ่าน ${unreadCount}`}
      </p>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-[8px] px-[16px] py-[48px] text-center">
          <BellOff className="size-[28px] text-muted" strokeWidth={1.5} aria-hidden="true" />
          <p className="text-14 font-medium text-ink">ไม่พบการแจ้งเตือนที่ตรงกับเงื่อนไข</p>
          <p className="text-13 text-muted">ลองเปลี่ยนตัวกรอง ช่วงวันที่ หรือคำค้นหา</p>
        </div>
      ) : null}

      {actionItems.length > 0 ? (
        <section aria-labelledby="action-title" className="border-b border-line last:border-b-0">
          <header className="flex items-center gap-[8px] border-b border-primary-100 bg-primary-50 px-[16px] py-[10px]">
            <h2 id="action-title" className="text-14 font-semibold text-primary-700">
              ต้องดำเนินการ
            </h2>
            <span className="inline-flex min-w-[20px] items-center justify-center rounded-full bg-primary-600 px-[6px] text-11 font-semibold leading-[calc(18rem/14)] text-white tabular-nums">
              {actionItems.length}
            </span>
          </header>
          <ul className="divide-y divide-line">
            {actionItems.map((alert) => (
              <li key={alert.id}>
                <ActionRow alert={alert} onReview={review} />
              </li>
            ))}
          </ul>
        </section>
      ) : filter !== 'actionable' && filtered.length > 0 ? (
        <p className="flex items-center gap-[8px] border-b border-line px-[16px] py-[12px] text-13 text-muted last:border-b-0">
          <Check className="size-[16px] text-ok" aria-hidden="true" />
          ไม่มีงานค้างที่ต้องดำเนินการ
        </p>
      ) : null}

      {groups.length > 0 ? (
        <section aria-label="การแจ้งเตือนทั้งหมด">
          {groups.map((group) => (
            <div key={group.label} role="group" aria-label={group.label}>
              <h2 className="border-b border-line bg-surface px-[16px] py-[8px] text-12 font-medium text-muted">{group.label}</h2>
              <ul className="divide-y divide-line border-b border-line last:border-b-0">
                {group.items.map((alert) => (
                  <li key={alert.id}>
                    <FeedRow alert={alert} onToggleRead={toggleRead} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      ) : null}

      {feed.length > visibleCount ? (
        <button
          type="button"
          onClick={() => setVisibleCount((n) => n + PAGE_STEP)}
          className="w-full border-t border-line px-[12px] py-[12px] text-13 font-medium text-muted transition-colors hover:bg-primary-50 hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500 motion-reduce:transition-none"
        >
          โหลดเพิ่มเติม ({feed.length - visibleCount} รายการ)
        </button>
      ) : null}
      </div>
    </div>
  );
}

function ActionRow({ alert, onReview }: { alert: AdminAlert; onReview: (alert: AdminAlert) => void }) {
  return (
    <article className="flex flex-wrap items-center gap-x-[14px] gap-y-[10px] px-[16px] py-[14px] sm:flex-nowrap">
      <CategoryIcon alert={alert} />
      {/* บนมือถือให้ข้อความกินเต็มแถว แล้วปุ่มตกลงไปบรรทัดใหม่ */}
      <div className="flex min-w-[calc(100%-54px)] flex-1 flex-col gap-[2px] sm:min-w-0">
        <h3 className="text-15 font-semibold text-ink">
          {alert.unread ? <span className="sr-only">ยังไม่อ่าน: </span> : null}
          {alert.title}
        </h3>
        <p className="text-13 text-muted">
          {alert.description} <time className="ml-[6px] whitespace-nowrap text-ink-mute tabular-nums">{alert.time}</time>
        </p>
      </div>
      <button
        type="button"
        onClick={() => onReview(alert)}
        className={cx('ml-[54px] sm:ml-0', reviewButtonClass(alert))}
      >
        ตรวจสอบ
        <span className="sr-only"> {alert.title}</span>
      </button>
    </article>
  );
}

function FeedRow({ alert, onToggleRead }: { alert: AdminAlert; onToggleRead: (alert: AdminAlert) => void }) {
  return (
    <article className={cx('group flex items-center gap-[12px] px-[16px] py-[12px] transition-colors motion-reduce:transition-none', alert.unread ? 'bg-white' : 'bg-white hover:bg-surface')}>
      <span className="flex w-[8px] shrink-0 justify-center" aria-hidden="true">
        <span className={cx('size-[8px] rounded-full', alert.unread ? 'bg-primary-600' : 'bg-transparent')} />
      </span>
      <CategoryIcon alert={alert} size="sm" />
      <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
        <h3 className={cx('text-14', alert.unread ? 'font-semibold text-ink' : 'font-medium text-ink-soft')}>
          {alert.unread ? <span className="sr-only">ยังไม่อ่าน: </span> : null}
          {alert.title}
        </h3>
        <p className={cx('text-13', toneOf(alert) === 'warning' ? 'text-status-pending-ink' : 'text-muted')}>
          {alert.description}
        </p>
      </div>
      <time className="hidden shrink-0 text-12 text-muted tabular-nums sm:block">{alert.time}</time>
      <button
        type="button"
        onClick={() => onToggleRead(alert)}
        className={cx(
          '-mr-[6px] flex size-[44px] shrink-0 sm:mr-0 sm:size-[30px] items-center justify-center rounded-[6px] text-muted transition-colors hover:bg-primary-50 hover:text-primary-700',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 motion-reduce:transition-none',
          alert.unread ? '' : 'sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100',
        )}
      >
        {alert.unread ? <Check className="size-[16px]" aria-hidden="true" /> : <span className="size-[8px] rounded-full border border-current" aria-hidden="true" />}
        <span className="sr-only">
          {alert.unread ? 'ทำเครื่องหมายว่าอ่านแล้ว' : 'ทำเครื่องหมายว่ายังไม่อ่าน'}: {alert.title}
        </span>
      </button>
    </article>
  );
}

function SummaryStat({
  label,
  value,
  tone,
  active,
  onClick,
}: {
  label: string;
  value: number;
  tone?: 'warning' | 'danger';
  active: boolean;
  onClick: () => void;
}) {
  const valueColor =
    value === 0 ? 'text-muted' : tone === 'danger' ? 'text-danger' : tone === 'warning' ? 'text-status-pending-ink' : 'text-primary-700';

  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cx(
        'flex flex-col items-start gap-[2px] px-[12px] py-[12px] text-left transition-colors sm:px-[18px] sm:py-[14px]',
        'focus-visible:relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500 motion-reduce:transition-none',
        active ? 'bg-primary-50' : 'hover:bg-surface',
      )}
    >
      <span className={cx('text-24 font-semibold leading-tight tabular-nums', valueColor)}>{value}</span>
      <span className={cx('text-12 sm:text-13', active ? 'font-medium text-primary-700' : 'text-muted')}>{label}</span>
    </button>
  );
}

function ChannelSettings() {
  const [open, setOpen] = useState(false);
  const [channels, setChannels] = useState({ inApp: true, gmail: false });
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    // ปิดด้วย Escape แล้วคืนโฟกัสให้ปุ่มเปิด เพื่อไม่ให้โฟกัสหลุดไปต้นหน้า
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-controls="channel-settings"
        onClick={() => setOpen((v) => !v)}
        className={cx(
          'inline-flex h-[40px] items-center gap-[6px] rounded-[6px] border px-[10px] sm:h-[34px] text-13 font-medium transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 motion-reduce:transition-none',
          open ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-line bg-white text-ink hover:border-primary-500 hover:bg-primary-50',
        )}
      >
        <Settings2 className="size-[16px]" aria-hidden="true" />
        ช่องทางรับแจ้งเตือน
      </button>
      {open ? (
        <div
          id="channel-settings"
          className="absolute right-0 top-[calc(100%+6px)] z-20 flex w-[260px] flex-col gap-[12px] rounded-[10px] border border-line bg-white p-[14px] shadow-popover"
        >
          <p className="text-13 text-muted">เลือกช่องทางที่ต้องการรับการแจ้งเตือน</p>
          <Toggle label="ในระบบ" checked={channels.inApp} onChange={(inApp) => setChannels((prev) => ({ ...prev, inApp }))} />
          <Toggle label="Gmail" checked={channels.gmail} onChange={(gmail) => setChannels((prev) => ({ ...prev, gmail }))} />
        </div>
      ) : null}
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 text-14 text-ink">
      {label}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cx(
          'relative inline-flex h-[24px] w-[44px] shrink-0 items-center rounded-full transition-colors motion-reduce:transition-none',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
          checked ? 'bg-primary-600' : 'bg-line',
        )}
      >
        <span
          className={cx(
            'inline-block size-[18px] rounded-full bg-white shadow transition-transform motion-reduce:transition-none',
            checked ? 'translate-x-[23px]' : 'translate-x-[3px]',
          )}
        />
      </button>
    </label>
  );
}
