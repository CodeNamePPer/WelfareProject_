import { PanelError, Region, RegionHeader } from './ui';
import { cx } from '../../lib/cx';
import type { RoleCount } from '../../types';

interface UsersByRolePanelProps {
  className?: string;
  /** null = โหลดรายชื่อผู้ใช้ไม่สำเร็จ */
  roles: RoleCount[] | null;
  onViewAll: () => void;
  onRetry: () => void;
}

// สีตามลำดับบทบาท (Admin → พนักงาน) ไล่จากเข้มไปอ่อน ใช้ร่วมกันระหว่างแถบสัดส่วนและจุดใน legend
// สีอ่อนสุดมีเส้นขอบบางเพื่อไม่ให้กลืนกับพื้นขาว
const ROLE_SWATCHES = ['bg-ink', 'bg-primary-700', 'bg-primary-500', 'bg-primary-100 ring-1 ring-inset ring-primary-500/40'];

// Figma 163:1197 – ส่วน "ผู้ใช้ในระบบ": แถบสัดส่วนเส้นเดียว + รายการบทบาทแบบ legend
export function UsersByRolePanel({ className, roles, onViewAll, onRetry }: UsersByRolePanelProps) {
  const total = roles?.reduce((sum, role) => sum + role.count, 0) ?? null;
  const share = (count: number) => (!total ? 0 : (count / total) * 100);
  const swatch = (index: number) => ROLE_SWATCHES[index % ROLE_SWATCHES.length];

  return (
    <Region className={className} aria-labelledby="users-title">
      <RegionHeader
        title="ผู้ใช้ในระบบ"
        titleId="users-title"
        sub={total === null ? 'ทำงานอยู่ — คน' : `ทำงานอยู่ ${total.toLocaleString('th-TH')} คน`}
        onViewAll={onViewAll}
      />

      {roles === null ? (
        <PanelError onRetry={onRetry} />
      ) : (
        // แถวบทบาทสูงตามเนื้อหา ถ้าตารางประวัติข้างๆ สูงกว่า ที่ว่างด้านล่างเป็นพื้นแผ่นเดียวกัน ไม่ต้องยืดแถว
        <div className="flex flex-col gap-[14px]">
          {/* ตัวเลขจริงอยู่ในรายการด้านล่าง แถบนี้จึงเป็นภาพสรุปสำหรับผู้ใช้ screen reader แบบข้อความเดียว */}
          <div
            role="img"
            aria-label={`สัดส่วนผู้ใช้: ${roles.map((r) => `${r.role} ${r.count} คน`).join(', ')}`}
            className="flex h-[12px] gap-[2px] overflow-hidden rounded-[6px] bg-mist"
          >
            {roles.map((role, index) =>
              role.count === 0 ? null : (
                <div key={role.id} className={cx('h-full', swatch(index))} style={{ width: `${share(role.count)}%` }} />
              ),
            )}
          </div>

          <ul className="flex flex-col divide-y divide-line">
            {roles.map((role, index) => (
              <li key={role.id} className="flex items-center gap-[10px] py-[12px] first:pt-[4px] last:pb-0">
                <span aria-hidden="true" className={cx('size-[10px] shrink-0 rounded-full', swatch(index))} />
                <span className="min-w-0 flex-1 truncate text-14 text-ink" title={role.role}>
                  {role.role}
                </span>
                <span className="w-[3.5rem] text-right text-13 text-muted tabular-nums">{Math.round(share(role.count))}%</span>
                <span className="min-w-[3.5rem] whitespace-nowrap text-right text-15 font-semibold text-ink tabular-nums">
                  {role.count.toLocaleString('th-TH')} <span className="text-13 font-normal text-muted">คน</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Region>
  );
}
