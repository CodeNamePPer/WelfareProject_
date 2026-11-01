import { ItemCard, OutlineButton, Panel, PanelError, PanelTitle } from './ui';
import type { RoleCount } from '../../types';

interface UsersByRolePanelProps {
  className?: string;
  /** null = โหลดรายชื่อผู้ใช้ไม่สำเร็จ */
  roles: RoleCount[] | null;
  onViewAll: () => void;
  onRetry: () => void;
}

// Figma 163:1197 – "Users ในระบบ" panel.
export function UsersByRolePanel({ className, roles, onViewAll, onRetry }: UsersByRolePanelProps) {
  const total = roles?.reduce((sum, role) => sum + role.count, 0) ?? null;

  return (
    <Panel className={className} aria-labelledby="users-title">
      {/* หัวข้อ + จำนวนรวมเป็นบรรทัดรอง แบบเดียวกับ ActivityLogPanel – ไม่ชนปุ่มเมื่อจอแคบ */}
      <div className="flex items-start justify-between gap-[14px]">
        <div className="flex min-w-0 flex-col gap-[4px]">
          <PanelTitle id="users-title">Users ในระบบ</PanelTitle>
          <p className="text-13 text-muted tabular-nums">{total === null ? 'รวม — คน' : `รวม ${total.toLocaleString('th-TH')} คน`}</p>
        </div>
        <OutlineButton onClick={onViewAll}>ดูทั้งหมด</OutlineButton>
      </div>

      {roles === null ? (
        <PanelError onRetry={onRetry} />
      ) : (
        <ul className="flex flex-col gap-[10px]">
          {roles.map((role) => {
            const percent = !total ? 0 : (role.count / total) * 100;
            return (
              <li key={role.id}>
                <ItemCard>
                  <div className="grid w-full grid-cols-[minmax(0,8.5rem)_minmax(3rem,1fr)_auto] items-center gap-[12px] sm:gap-[16px]">
                    <span className="truncate text-15 font-semibold text-ink">{role.role}</span>
                    <div
                      role="progressbar"
                      aria-label={`สัดส่วน ${role.role}`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={Math.round(percent)}
                      className="h-[6px] overflow-hidden rounded-[3px] bg-mist"
                    >
                      <div
                        className="h-full rounded-[3px] bg-primary-500"
                        style={{ width: `${role.count === 0 ? 0 : Math.max(percent, 2)}%` }}
                      />
                    </div>
                    <span className="whitespace-nowrap text-right text-15 font-semibold text-ink tabular-nums">
                      {role.count.toLocaleString('th-TH')} คน
                    </span>
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
