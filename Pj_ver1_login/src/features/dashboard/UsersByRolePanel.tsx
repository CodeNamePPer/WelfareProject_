import { ItemCard, OutlineButton, Panel, PanelTitle } from './ui';
import type { RoleCount } from '../../types';

interface UsersByRolePanelProps {
  roles: RoleCount[];
  onViewAll: () => void;
}

// Figma 163:1197 – "Users ในระบบ" panel.
export function UsersByRolePanel({ roles, onViewAll }: UsersByRolePanelProps) {
  const total = roles.reduce((sum, role) => sum + role.count, 0);

  return (
    <Panel aria-labelledby="users-title" className="min-h-[316px] pb-[22px]">
      <div className="flex items-center justify-between gap-[12px] pl-px">
        <div className="flex min-w-0 flex-1 items-center gap-[4px]">
          <PanelTitle id="users-title">
            <span className="inline-block w-[190px] max-w-full">Users ในระบบ</span>
          </PanelTitle>
          <span className="text-[16px] font-semibold text-ink tabular-nums">รวม {total.toLocaleString('th-TH')} คน</span>
        </div>
        <OutlineButton className="h-[32px] w-[118px]" onClick={onViewAll}>
          ดูทั้งหมด
        </OutlineButton>
      </div>

      <ul className="mt-[5px] flex flex-col gap-[14px]">
        {roles.map((role) => {
          const percent = total === 0 ? 0 : (role.count / total) * 100;
          return (
            <li key={role.id}>
              <ItemCard className="h-[62px]">
                <div className="flex w-full items-center justify-between gap-[12px]">
                  <span className="w-[136px] shrink-0 text-[16px] font-semibold text-ink">{role.role}</span>
                  <div
                    role="progressbar"
                    aria-label={`สัดส่วน ${role.role}`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(percent)}
                    className="h-[6px] w-[156px] min-w-0 shrink overflow-hidden rounded-[3px] bg-mist"
                  >
                    <div
                      className="h-full rounded-[3px] bg-primary-500"
                      style={{ width: `${role.count === 0 ? 0 : Math.max(percent, 2)}%` }}
                    />
                  </div>
                  <span className="w-[62px] shrink-0 text-right text-[16px] font-semibold text-ink tabular-nums">
                    {role.count.toLocaleString('th-TH')} คน
                  </span>
                </div>
              </ItemCard>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
