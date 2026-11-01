import { CircleAlert, ClockAlert, CircleUserRound } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cx } from '../../lib/cx';
import { ItemCard, OutlineButton, Panel, PanelTitle } from './ui';
import type { NotificationItem, NotificationKind } from '../../types';

const icons: Record<NotificationKind, LucideIcon> = {
  'access-request': CircleUserRound,
  expiring: ClockAlert,
  system: CircleAlert,
};

interface NotificationPanelProps {
  className?: string;
  items: NotificationItem[];
  /** How many items to preview on the dashboard (Figma shows 2). */
  limit?: number;
  onReview: (item: NotificationItem) => void;
  onViewAll: () => void;
}

// Figma 163:1169 – "Notification" panel.
export function NotificationPanel({ className, items, limit = 2, onReview, onViewAll }: NotificationPanelProps) {
  const visible = items.slice(0, limit);

  return (
    <Panel className={className} aria-labelledby="noti-title">
      <div className="flex items-start justify-between gap-[14px]">
        <PanelTitle id="noti-title">Notification</PanelTitle>
        <OutlineButton onClick={onViewAll}>ดูทั้งหมด</OutlineButton>
      </div>

      {visible.length === 0 ? (
        <p className="rounded-[10px] border border-dashed border-line px-[16px] py-[32px] text-center text-14 text-muted">
          ไม่มีการแจ้งเตือนใหม่
        </p>
      ) : (
        <ul className="flex flex-col gap-[10px]">
          {visible.map((item) => {
            const Icon = icons[item.kind];
            return (
              <li key={item.id}>
                <ItemCard className="items-start">
                  <span className="flex h-[32px] w-[12px] shrink-0 items-center justify-center" aria-hidden="true">
                    <span className={cx('size-[10px] rounded-full', item.unread ? 'bg-primary-600' : 'bg-transparent')} />
                  </span>
                  <Icon className="size-[32px] shrink-0 text-primary-600" strokeWidth={1.5} aria-hidden="true" />
                  <div className="flex min-w-0 flex-1 flex-col gap-[4px]">
                    <div className="flex items-start justify-between gap-[12px]">
                      <p className="min-w-0 text-15 font-semibold leading-snug text-ink">
                        {item.unread ? <span className="sr-only">ยังไม่อ่าน: </span> : null}
                        {item.title}
                      </p>
                      {item.actionLabel ? (
                        <button
                          type="button"
                          onClick={() => onReview(item)}
                          className="inline-flex min-w-[75px] shrink-0 items-center whitespace-nowrap justify-center rounded-[5px] border border-line bg-white px-[10px] py-[4px] text-14 text-ink transition-colors hover:border-primary-500 hover:bg-primary-50 hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 motion-reduce:transition-none"
                        >
                          {item.actionLabel}
                        </button>
                      ) : null}
                    </div>
                    <p className="text-14 text-muted">
                      {item.description} · <time className="whitespace-nowrap tabular-nums">{item.time}</time>
                    </p>
                  </div>
                </ItemCard>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
