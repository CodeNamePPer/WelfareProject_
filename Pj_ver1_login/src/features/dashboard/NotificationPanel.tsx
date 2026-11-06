import { Check } from 'lucide-react';
import { cx } from '../../lib/cx';
import { CategoryIcon, reviewButtonClass, toneOf } from '../notifications/alertVisuals';
import { Region, RegionHeader } from './ui';
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
    <Region className={className} aria-labelledby="noti-title">
      <RegionHeader
        title="แจ้งเตือน"
        titleId="noti-title"
        sub={[
          actionable.length > 0 ? `ต้องดำเนินการ ${actionable.length}` : null,
          unreadCount > 0 ? `ยังไม่อ่าน ${unreadCount} รายการ` : 'อ่านครบทุกรายการแล้ว',
        ]
          .filter(Boolean)
          .join(', ')}
        onViewAll={onViewAll}
      />

      {actionable.length === 0 ? (
        // ไม่มีงานค้าง = คำตอบหลักของส่วนนี้ ขึ้นก่อน แล้วรายการที่ยังไม่อ่านย่อเหลือบรรทัดเดียว ไม่มีไอคอน ไม่ดึงสายตา
        <div className="flex flex-col gap-[14px]">
          <div className="flex items-start gap-[10px]">
            <Check className="mt-[2px] size-[18px] shrink-0 text-ok" aria-hidden="true" />
            <div className="flex flex-col gap-[2px]">
              <p className="text-15 font-semibold text-ink">ไม่มีงานค้าง</p>
              <p className="text-13 text-muted">ตอนนี้ไม่มีเรื่องที่ Admin ต้องดำเนินการ</p>
            </div>
          </div>
          {unreadFeed.length > 0 ? (
            <ul aria-label="แจ้งเตือนที่ยังไม่อ่านล่าสุด" className="flex flex-col divide-y divide-line border-y border-line">
              {unreadFeed.slice(0, limit + 1).map((alert) => (
                <li key={alert.id} className="flex items-baseline gap-[12px] py-[10px] text-13">
                  <p className="min-w-0 flex-1 truncate">
                    <span className="sr-only">ยังไม่อ่าน: </span>
                    <span className="font-medium text-ink">{alert.title}</span>
                    <span className={toneOf(alert) === 'warning' ? 'text-status-pending-ink' : 'text-muted'}> {alert.description}</span>
                  </p>
                  <time className="shrink-0 whitespace-nowrap text-12 text-ink-mute tabular-nums">{alert.time}</time>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : (
        <ul className="flex flex-col divide-y divide-line">
          {visible.map((alert) => (
            <li key={alert.id} className="py-[12px] first:pt-[4px] last:pb-0">
              {alert.actionable ? (
                <article className="flex flex-wrap items-center gap-x-[14px] gap-y-[10px] sm:flex-nowrap">
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
                  <button type="button" onClick={() => onReview(alert)} className={cx('ml-[54px] sm:ml-0', reviewButtonClass(alert))}>
                    ตรวจสอบ
                    <span className="sr-only"> {alert.title}</span>
                  </button>
                </article>
              ) : (
                <article className="flex items-center gap-[14px]">
                  <CategoryIcon alert={alert} />
                  <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
                    <h3 className="text-14 font-semibold text-ink">
                      <span className="sr-only">ยังไม่อ่าน: </span>
                      {alert.title}
                    </h3>
                    <p className={cx('text-13', toneOf(alert) === 'warning' ? 'text-status-pending-ink' : 'text-muted')}>
                      {alert.description} <time className="ml-[6px] whitespace-nowrap text-ink-mute tabular-nums">{alert.time}</time>
                    </p>
                  </div>
                  <span className="size-[8px] shrink-0 rounded-full bg-primary-600" aria-hidden="true" />
                </article>
              )}
            </li>
          ))}
        </ul>
      )}
    </Region>
  );
}
