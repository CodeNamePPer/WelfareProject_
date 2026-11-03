import { OutlineButton, Panel, PanelError, PanelTitle } from './ui';
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

// Figma 163:1197 – "Users ในระบบ" panel: แถบสัดส่วนเส้นเดียว + รายการบทบาทแบบ legend
export function UsersByRolePanel({ className, roles, onViewAll, onRetry }: UsersByRolePanelProps) {
  const total = roles?.reduce((sum, role) => sum + role.count, 0) ?? null;
  const share = (count: number) => (!total ? 0 : (count / total) * 100);
  const swatch = (index: number) => ROLE_SWATCHES[index % ROLE_SWATCHES.length];

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
        // flex-1 ทั้งสายลงถึง li: เมื่อแผงถูกยืดให้สูงเท่าตาราง Log ข้างๆ แถวบทบาทจะกระจายเต็มแผงแทนการเหลือที่ว่างด้านล่าง
        <div className="flex flex-1 flex-col gap-[14px]">
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

          <ul className="flex flex-1 flex-col divide-y divide-line">
            {roles.map((role, index) => (
              <li key={role.id} className="flex flex-1 items-center gap-[10px] py-[12px] first:pt-[4px] last:pb-0">
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
    </Panel>
  );
}
