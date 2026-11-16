'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { cx } from '@/lib/cx';
import { updateAlert, type AlertUpdate } from '@/features/notifications/api';
import { reviewHref, toneOf, type Tone } from '@/features/notifications/alertVisuals';
import { Badge, Button, Card, PageHeader } from '@/features/hr/ui';
import type { AdminAlert } from '@/types';

// สีวงไอคอนตามดีไซน์ H07 (แดง = เหตุความปลอดภัยที่ยังค้าง, ส้ม = ใกล้หมดอายุ)
const TONE: Record<Tone, { bg: string; ink: string }> = {
  primary: { bg: 'bg-[#E0E7FF]', ink: 'text-[#3730A3]' },
  danger: { bg: 'bg-[#FEE2E2]', ink: 'text-[#991B1B]' },
  warning: { bg: 'bg-[#FFEDD5]', ink: 'text-[#9A3412]' },
  neutral: { bg: 'bg-[#DCFCE7]', ink: 'text-[#166534]' },
};

const GROUPS = [
  { label: 'วันนี้', match: (days: number) => days === 0 },
  { label: 'สัปดาห์นี้', match: (days: number) => days > 0 && days < 7 },
  { label: 'ก่อนหน้านี้', match: (days: number) => days >= 7 },
];

/** ปลายทางของแจ้งเตือนแต่ละรายการ (ข้อเสนอสวัสดิการเปิดหน้าข้อเสนอนั้น) */
function hrefOf(alert: AdminAlert) {
  if (alert.id.startsWith('prop-')) return `/admin/benefits/proposals/${encodeURIComponent(alert.id.slice(5))}`;
  return reviewHref[alert.category] ?? null;
}

// แจ้งเตือนของ Admin ในโครงเดียวกับหน้าแจ้งเตือนของ HR (H07) · ข้อมูลและสถานะอ่านแล้วยังเป็นของ Admin
export function AdminNotices({ initialAlerts }: { initialAlerts: AdminAlert[] }) {
  const router = useRouter();
  const { notify } = useToast();
  const [alerts, setAlerts] = useState(initialAlerts);
  const [busy, setBusy] = useState(false);
  const unread = alerts.filter((alert) => alert.unread).length;

  // แสดงผลทันที แล้วบันทึก ถ้าไม่สำเร็จคืนค่าเดิม · สำเร็จแล้ว refresh ให้ตัวเลขบนเมนูตรงกัน
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

  const open = (alert: AdminAlert) => {
    if (alert.unread) void persist({ action: 'read', id: alert.id }, (prev) => prev.map((item) => (item.id === alert.id ? { ...item, unread: false } : item)));
    const href = hrefOf(alert);
    if (href) router.push(href);
  };

  const resolve = (alert: AdminAlert) =>
    persist({ action: 'resolve', id: alert.id }, (prev) => prev.map((item) => (item.id === alert.id ? { ...item, unread: false, actionable: false } : item)));

  const markAll = async () => {
    if (busy || unread === 0) return;
    setBusy(true);
    await persist({ action: 'read_all' }, (prev) => prev.map((item) => ({ ...item, unread: false })));
    setBusy(false);
  };

  const groups = GROUPS.map((group) => ({ label: group.label, items: alerts.filter((alert) => group.match(alert.daysAgo)) })).filter((group) => group.items.length > 0);

  return (
    <>
      <PageHeader
        title="แจ้งเตือน"
        description={unread > 0 ? `ยังไม่ได้อ่าน ${unread} รายการ` : 'ไม่มีรายการที่ยังไม่ได้อ่าน'}
        actions={
          <Button variant="quiet" className="!px-4" onClick={() => void markAll()} disabled={busy || unread === 0}>
            {busy ? 'กำลังบันทึก...' : 'อ่านทั้งหมดแล้ว'}
          </Button>
        }
      />
      <Card className="overflow-hidden">
        {groups.length === 0 ? (
          <p className="px-5 py-10 text-center text-13 text-muted">ยังไม่มีแจ้งเตือน</p>
        ) : (
          groups.map((group, index) => (
            <div key={group.label}>
              <h2 className={cx('bg-[#F8FAFC] px-5 py-2.5 text-12 font-semibold text-muted', index > 0 && 'border-t border-[#F1F5F9]')}>{group.label}</h2>
              <ul className="m-0 list-none p-0">
                {group.items.map((alert) => {
                  const tone = TONE[toneOf(alert)];
                  const href = hrefOf(alert);
                  const canResolve = alert.actionable && !alert.id.startsWith('prop-');
                  return (
                    <li key={alert.id} className={cx('flex items-start gap-3.5 border-t border-[#F1F5F9] px-4 py-3.5 sm:px-5', alert.unread ? 'bg-[#F8FAFF]' : 'bg-white')}>
                      <button
                        type="button"
                        onClick={() => open(alert)}
                        className={cx(
                          'flex min-w-0 flex-1 items-start gap-3.5 rounded text-left text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
                          href ? 'cursor-pointer' : 'cursor-default',
                        )}
                      >
                        <span aria-hidden="true" className={cx('flex size-9 shrink-0 items-center justify-center rounded-full', tone.bg)}>
                          <Bell className={cx('size-4', tone.ink)} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className={alert.unread ? 'font-semibold' : 'font-medium'}>{alert.title}</span>
                            {alert.actionable ? <Badge tone="review">รอดำเนินการ</Badge> : null}
                          </span>
                          <span className="block break-words text-13 text-ink-soft">{alert.description}</span>
                        </span>
                      </button>
                      <span className="flex shrink-0 flex-col items-end gap-2">
                        <span className="flex items-center gap-2 text-12 whitespace-nowrap text-muted">
                          {alert.time}
                          {alert.unread ? <span role="img" aria-label="ยังไม่อ่าน" className="size-2 rounded-full bg-[#1D4ED8]" /> : <span aria-hidden="true" className="size-2" />}
                        </span>
                        {canResolve ? (
                          <button type="button" onClick={() => void resolve(alert)} className="rounded text-12 font-medium text-primary-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">
                            ดำเนินการแล้ว
                          </button>
                        ) : null}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))
        )}
      </Card>
    </>
  );
}
