import { Check } from 'lucide-react';
import { cx } from '../../lib/cx';
import { CategoryIcon, reviewButtonClass, toneOf } from '../notifications/alertVisuals';
import { OutlineButton, Panel, PanelTitle } from './ui';
import type { AdminAlert } from '../../types';

interface NotificationPanelProps {
  className?: string;
  alerts: AdminAlert[];
  /** How many items to preview on the dashboard. */
  limit?: number;
  onReview: (alert: AdminAlert) => void;
  onViewAll: () => void;
}

// Figma 163:1169 – "Notification" panel, จัดแบบเดียวกับหน้าแจ้งเตือน:
// งานที่ต้องดำเนินการ (ปุ่มตรวจสอบแบบทึบ) อยู่บนสุด ตามด้วยรายการที่ยังไม่อ่านล่าสุด
export function NotificationPanel({ className, alerts, limit = 3, onReview, onViewAll }: NotificationPanelProps) {
  const actionable = alerts.filter((alert) => alert.actionable);
  const unreadCount = alerts.filter((alert) => alert.unread).length;
  const unreadFeed = alerts.filter((alert) => !alert.actionable && alert.unread);
  const visible = [...actionable, ...unreadFeed].slice(0, limit);

  return (
    <Panel className={className} aria-labelledby="noti-title">
      <div className="flex items-start justify-between gap-[14px]">
        <div className="flex min-w-0 flex-col gap-[4px]">
          <PanelTitle id="noti-title">Notification</PanelTitle>
          <p className="text-13 text-muted tabular-nums">
            {actionable.length > 0 ? `ต้องดำเนินการ ${actionable.length} · ` : ''}
            {unreadCount > 0 ? `ยังไม่อ่าน ${unreadCount} รายการ` : 'อ่านครบทุกรายการแล้ว'}
          </p>
        </div>
        <OutlineButton onClick={onViewAll}>ดูทั้งหมด</OutlineButton>
      </div>

      {visible.length === 0 ? (
        <p className="flex items-center justify-center gap-[8px] rounded-[10px] border border-dashed border-line px-[16px] py-[32px] text-14 text-muted">
          <Check className="size-[16px] text-ok" aria-hidden="true" />
          ไม่มีงานค้างหรือแจ้งเตือนใหม่
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-line">
          {visible.map((alert) => (
            <li key={alert.id} className="py-[12px] first:pt-[4px] last:pb-0">
              {alert.actionable ? (
                <article className="flex flex-wrap items-center gap-x-[14px] gap-y-[10px] sm:flex-nowrap">
                  <CategoryIcon category={alert.category} />
                  {/* บนมือถือให้ข้อความกินเต็มแถว แล้วปุ่มตกลงไปบรรทัดใหม่ */}
                  <div className="flex min-w-[calc(100%-54px)] flex-1 flex-col gap-[2px] sm:min-w-0">
                    <h3 className="text-15 font-semibold text-ink">
                      {alert.unread ? <span className="sr-only">ยังไม่อ่าน: </span> : null}
                      {alert.title}
                    </h3>
                    <p className="text-13 text-muted">
                      {alert.description} · <time className="whitespace-nowrap tabular-nums">{alert.time}</time>
                    </p>
                  </div>
                  <button type="button" onClick={() => onReview(alert)} className={cx('ml-[54px] sm:ml-0', reviewButtonClass(alert.category))}>
                    ตรวจสอบ
                    <span className="sr-only"> {alert.title}</span>
                  </button>
                </article>
              ) : (
                <article className="flex items-center gap-[14px]">
                  <CategoryIcon category={alert.category} />
                  <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
                    <h3 className="text-14 font-semibold text-ink">
                      <span className="sr-only">ยังไม่อ่าน: </span>
                      {alert.title}
                    </h3>
                    <p className={cx('text-13', toneOf(alert.category) === 'warning' ? 'text-status-pending-ink' : 'text-muted')}>
                      {alert.description} · <time className="whitespace-nowrap tabular-nums">{alert.time}</time>
                    </p>
                  </div>
                  <span className="size-[8px] shrink-0 rounded-full bg-primary-600" aria-hidden="true" />
                </article>
              )}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
