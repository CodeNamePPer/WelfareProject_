'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CircleAlert, CircleUserRound, ClockAlert, Gift, ListChecks, ShieldAlert } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { FilterChips } from '../../components/ui/FilterChips';
import { PageHeader } from '../../components/ui/PageHeader';
import { SearchInput } from '../../components/ui/SearchInput';
import { Select } from '../../components/ui/Select';
import { cx } from '../../lib/cx';
import type { AdminAlert, AlertCategory } from '../../types';

type Filter = 'all' | 'unread' | 'access' | 'security' | 'system';
type Range = 'all' | '0' | '7' | '30';

const icons: Record<AlertCategory, LucideIcon> = {
  access: ListChecks,
  security: ShieldAlert,
  system: CircleAlert,
  welfare: Gift,
  expiring: ClockAlert,
};

/** Where "ตรวจสอบ" takes the admin for each kind of alert. */
const reviewHref: Partial<Record<AlertCategory, string>> = {
  access: '/admin/users',
  security: '/admin/logs',
  welfare: '/admin/benefits',
};

const PAGE_STEP = 5;

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
    case 'access':
      return alert.category === 'access' || alert.category === 'expiring';
    case 'security':
      return alert.category === 'security';
    case 'system':
      return alert.category === 'system' || alert.category === 'welfare';
  }
}

// Layout follows Figma "Admin / การแจ้งเตือน" (node 163:30).
export function NotificationsPage({ initialAlerts }: { initialAlerts: AdminAlert[] }) {
  const router = useRouter();
  const [alerts, setAlerts] = useState(initialAlerts);
  const [filter, setFilter] = useState<Filter>('all');
  const [range, setRange] = useState<Range>('all');
  const [query, setQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_STEP);
  const [channels, setChannels] = useState({ inApp: true, gmail: false });

  const unreadCount = alerts.filter((alert) => alert.unread).length;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return alerts.filter(
      (alert) =>
        matchesFilter(alert, filter) &&
        (range === 'all' || alert.daysAgo <= Number(range)) &&
        (!q || `${alert.title} ${alert.description}`.toLowerCase().includes(q)),
    );
  }, [alerts, filter, range, query]);

  const visible = filtered.slice(0, visibleCount);
  const groups = visible.reduce<Array<{ label: string; items: AdminAlert[] }>>((acc, alert) => {
    const label = groupLabel(alert.daysAgo);
    const last = acc[acc.length - 1];
    if (last && last.label === label) last.items.push(alert);
    else acc.push({ label, items: [alert] });
    return acc;
  }, []);

  const pendingCount = alerts.filter((alert) => alert.actionable).length;
  const expiringCount = alerts.filter((alert) => alert.category === 'expiring').length;
  const securityCount = alerts.filter((alert) => alert.category === 'security').length;

  const resetPaging = () => setVisibleCount(PAGE_STEP);

  const review = (alert: AdminAlert) => {
    setAlerts((prev) => prev.map((item) => (item.id === alert.id ? { ...item, unread: false, actionable: false } : item)));
    const href = reviewHref[alert.category];
    if (href) router.push(href);
  };

  const markAllRead = () => setAlerts((prev) => prev.map((item) => ({ ...item, unread: false })));

  return (
    <div className="grid grid-cols-1 gap-[24px] xl:grid-cols-[minmax(0,1fr)_300px]">
      <div className="flex min-w-0 flex-col gap-[16px]">
        <PageHeader
          title="การแจ้งเตือน"
          description={`ยังไม่อ่าน ${unreadCount} รายการ`}
          action={
            unreadCount > 0 ? (
              <button type="button" onClick={markAllRead} className="text-[13px] font-medium text-primary-700 hover:underline">
                ทำเครื่องหมายว่าอ่านแล้วทั้งหมด
              </button>
            ) : null
          }
        />

        <FilterChips
          label="กรองการแจ้งเตือน"
          value={filter}
          onChange={(value) => {
            setFilter(value);
            resetPaging();
          }}
          options={[
            { id: 'all', label: 'ทั้งหมด' },
            { id: 'unread', label: 'ยังไม่อ่าน' },
            { id: 'access', label: 'คำขอสิทธิ์' },
            { id: 'security', label: 'ความปลอดภัย' },
            { id: 'system', label: 'ระบบ' },
          ]}
        />

        <div className="flex flex-col gap-[8px] sm:flex-row">
          <SearchInput
            label="ค้นหาแจ้งเตือน"
            placeholder="ค้นหาแจ้งเตือน"
            value={query}
            onChange={(value) => {
              setQuery(value);
              resetPaging();
            }}
            className="flex-1"
          />
          <Select
            label="ช่วงวันที่"
            value={range}
            onChange={(event) => {
              setRange(event.target.value as Range);
              resetPaging();
            }}
            wrapperClassName="sm:w-[150px]"
          >
            <option value="all">ทุกช่วงวันที่</option>
            <option value="0">วันนี้</option>
            <option value="7">7 วันล่าสุด</option>
            <option value="30">30 วันล่าสุด</option>
          </Select>
        </div>

        {groups.length === 0 ? (
          <p className="rounded-[10px] border border-dashed border-line bg-white px-[16px] py-[40px] text-center text-[14px] text-muted">
            ไม่พบการแจ้งเตือนที่ตรงกับเงื่อนไข
          </p>
        ) : (
          groups.map((group) => (
            <section key={group.label} aria-label={group.label} className="flex flex-col gap-[12px]">
              <h2 className="text-[13px] font-medium text-muted">{group.label}</h2>
              <ul className="flex flex-col gap-[12px]">
                {group.items.map((alert) => (
                  <li key={alert.id}>
                    <AlertCard alert={alert} onReview={review} />
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}

        {filtered.length > visibleCount ? (
          <button
            type="button"
            onClick={() => setVisibleCount((count) => count + PAGE_STEP)}
            className="self-center rounded-md px-3 py-2 text-[13px] text-muted hover:bg-primary-50 hover:text-primary-700"
          >
            โหลดเพิ่มเติม
          </button>
        ) : null}
      </div>

      {/* Right rail – summary counts + delivery channels */}
      <aside className="flex flex-col gap-[16px] xl:pt-[62px]" aria-label="สรุปการแจ้งเตือน">
        <div className="grid grid-cols-1 gap-[16px] sm:grid-cols-3 xl:grid-cols-1">
          <CountCard value={pendingCount} label="รอดำเนินการ" />
          <CountCard value={expiringCount} label="สิทธิ์ใกล้หมดอายุ" />
          <CountCard value={securityCount} label="เหตุการณ์ความปลอดภัย" tone={securityCount > 0 ? 'danger' : undefined} />
        </div>

        <section className="flex flex-col gap-[14px] rounded-[10px] border border-line bg-white p-[16px]" aria-labelledby="channels-title">
          <h2 id="channels-title" className="text-[15px] font-semibold text-ink">
            ช่องทางรับการแจ้งเตือน
          </h2>
          <Toggle label="ในระบบ" checked={channels.inApp} onChange={(inApp) => setChannels((prev) => ({ ...prev, inApp }))} />
          <Toggle label="Gmail" checked={channels.gmail} onChange={(gmail) => setChannels((prev) => ({ ...prev, gmail }))} />
        </section>
      </aside>
    </div>
  );
}

function AlertCard({ alert, onReview }: { alert: AdminAlert; onReview: (alert: AdminAlert) => void }) {
  const Icon = icons[alert.category];
  const canReview = alert.actionable;

  return (
    <article
      className={cx(
        'flex items-center gap-[14px] rounded-[10px] border bg-white px-[14px] py-[18px]',
        alert.unread ? 'border-primary-100' : 'border-line',
      )}
    >
      <span className="flex w-[12px] shrink-0 justify-center" aria-hidden="true">
        <span className={cx('size-[10px] rounded-full', alert.unread ? 'bg-primary-600' : 'bg-transparent')} />
      </span>
      <Icon
        className={cx('size-[35px] shrink-0', alert.category === 'security' ? 'text-danger' : 'text-primary-600')}
        strokeWidth={1.5}
        aria-hidden="true"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-[4px]">
        <div className="flex items-start justify-between gap-[12px]">
          <h3 className={cx('text-[16px] text-ink', alert.unread ? 'font-semibold' : 'font-medium')}>
            {alert.unread ? <span className="sr-only">ยังไม่อ่าน: </span> : null}
            {alert.title}
          </h3>
          {canReview ? (
            <button
              type="button"
              onClick={() => onReview(alert)}
              className="inline-flex min-w-[75px] shrink-0 items-center justify-center rounded-[5px] border border-line bg-white px-[10px] py-[4px] text-[14px] whitespace-nowrap text-ink transition-colors hover:border-primary-500 hover:bg-primary-50 hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 motion-reduce:transition-none"
            >
              ตรวจสอบ
            </button>
          ) : alert.daysAgo > 0 ? (
            <span className="shrink-0 text-[13px] text-muted">{alert.time}</span>
          ) : null}
        </div>
        <p className="text-[14px] text-muted">
          {alert.description}
          {alert.daysAgo === 0 ? (
            <>
              {' · '}
              <time className="tabular-nums">{alert.time}</time>
            </>
          ) : null}
        </p>
      </div>
    </article>
  );
}

function CountCard({ value, label, tone }: { value: number; label: string; tone?: 'danger' }) {
  return (
    <div className="flex flex-col gap-[6px] rounded-[10px] border border-line bg-white px-[16px] py-[14px]">
      <span className={cx('text-[26px] font-semibold tabular-nums', tone === 'danger' ? 'text-danger' : 'text-ink')}>
        {value}
      </span>
      <span className="text-[14px] font-medium text-ink">{label}</span>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 text-[14px] text-ink">
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
