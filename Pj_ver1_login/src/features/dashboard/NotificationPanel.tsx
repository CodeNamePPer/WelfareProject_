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
  items: NotificationItem[];
  /** How many items to preview on the dashboard (Figma shows 2). */
  limit?: number;
  onReview: (item: NotificationItem) => void;
  onViewAll: () => void;
}

// Figma 163:1169 – "Notification" panel.
export function NotificationPanel({ items, limit = 2, onReview, onViewAll }: NotificationPanelProps) {
  const visible = items.slice(0, limit);

  return (
    <Panel aria-labelledby="noti-title" className="min-h-[316px]">
      <div className="flex items-start justify-between gap-[14px]">
        <PanelTitle id="noti-title">Notification</PanelTitle>
        <OutlineButton onClick={onViewAll}>ดูทั้งหมด</OutlineButton>
      </div>

      {visible.length === 0 ? (
        <p className="rounded-[10px] border border-dashed border-line px-[16px] py-[32px] text-center text-[14px] text-muted">
          ไม่มีการแจ้งเตือนใหม่
        </p>
      ) : (
        <ul className="flex flex-col gap-[43px]">
          {visible.map((item) => {
            const Icon = icons[item.kind];
            return (
              <li key={item.id}>
                <ItemCard className="min-h-[89px]">
                  <span className="flex w-[12px] shrink-0 justify-center" aria-hidden="true">
                    <span className={cx('size-[10px] rounded-full', item.unread ? 'bg-primary-600' : 'bg-transparent')} />
                  </span>
                  <Icon className="size-[35px] shrink-0 text-primary-600" strokeWidth={1.5} aria-hidden="true" />
                  <div className="flex min-w-0 flex-1 flex-col gap-[4px]">
                    <div className="flex items-center justify-between gap-[12px]">
                      <p className="text-[16px] font-semibold text-ink">
                        {item.unread ? <span className="sr-only">ยังไม่อ่าน: </span> : null}
                        {item.title}
                      </p>
                      {item.actionLabel ? (
                        <button
                          type="button"
                          onClick={() => onReview(item)}
                          className="inline-flex min-w-[75px] shrink-0 items-center whitespace-nowrap justify-center rounded-[5px] border border-line bg-white px-[10px] py-[4px] text-[14px] text-ink transition-colors hover:border-primary-500 hover:bg-primary-50 hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 motion-reduce:transition-none"
                        >
                          {item.actionLabel}
                        </button>
                      ) : null}
                    </div>
                    <p className="text-[14px] text-muted">
                      {item.description} · <time className="tabular-nums">{item.time}</time>
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
