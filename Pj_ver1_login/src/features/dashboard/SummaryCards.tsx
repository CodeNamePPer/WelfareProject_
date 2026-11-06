import Link from 'next/link';
import type { ReactNode } from 'react';
import type { SummaryStats } from '../../types';
import { cx } from '../../lib/cx';
import { EMPLOYMENT_STATUS_LABELS } from '../../lib/employmentStatus';

// Figma 163:1146 – ตัวเลขสรุป 4 ช่อง วาง 2×2 ทางซ้ายของแผ่นภาพรวม
// แต่ละช่องเป็นส่วนของแผ่นเดียวกัน (เส้นแบ่งร่วม ไม่มีกรอบ/ไอคอนของตัวเอง): ชื่อ, ตัวเลข, ภาพเล็กของข้อมูล, บรรทัดบริบท
// กดทั้งช่องเพื่อไปหน้าที่มีรายละเอียด

type Tone = 'primary' | 'danger';

function SummaryCard({ label, href, children }: { label: string; href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className={cx(
        'flex min-h-[132px] flex-col gap-[12px] bg-white p-[16px] transition-colors sm:p-[20px]',
        'hover:bg-surface focus-visible:relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500 motion-reduce:transition-none',
      )}
    >
      <span className="text-13 font-medium text-ink-soft">{label}</span>
      <span className="flex flex-1 flex-col justify-end gap-[8px]">{children}</span>
    </Link>
  );
}

/** Headline number + unit. null = โหลดไม่สำเร็จ → "—" แทนตัวเลข */
function Headline({ value, unit, className }: { value: number | null; unit: string; className?: string }) {
  if (value === null) {
    return (
      <span className="text-24 font-semibold leading-none text-muted" aria-label="ไม่มีข้อมูล">
        —
      </span>
    );
  }
  return (
    <span className="flex items-baseline gap-[6px]">
      <span className={cx('text-24 font-semibold leading-none text-ink tabular-nums', className)}>{value.toLocaleString('th-TH')}</span>
      <span className="text-13 text-muted">{unit}</span>
    </span>
  );
}

function LoadFailed() {
  return <span className="text-12 text-danger">โหลดข้อมูลไม่สำเร็จ</span>;
}

/** บรรทัดบริบทสีจาง – แต่ละส่วนเว้นระยะกัน ไม่คั่นด้วยจุดกลาง */
function MetaLine({ parts }: { parts: ReactNode[] }) {
  return (
    <span className="flex flex-wrap items-center gap-x-[12px] text-12 text-muted tabular-nums">
      {parts.map((part, i) => (
        <span key={i} className="flex items-center gap-[6px]">
          {part}
        </span>
      ))}
    </span>
  );
}

/** ข้อความกำกับข้างตัวเลข – ตัวหนังสือเฉยๆ ไม่ใช่ป้ายแคปซูล */
function Note({ children, tone = 'muted' }: { children: ReactNode; tone?: 'muted' | 'primary' | 'pending' }) {
  return (
    <span
      className={cx(
        'shrink-0 text-12 font-medium tabular-nums',
        tone === 'muted' && 'text-muted',
        tone === 'primary' && 'text-primary-700',
        tone === 'pending' && 'text-status-pending-ink',
      )}
    >
      {children}
    </span>
  );
}

/** Horizontal bar split into coloured segments (e.g. active vs inactive users). */
function SegmentBar({ label, segments }: { label: string; segments: { value: number; className: string }[] }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  return (
    <span role="img" aria-label={label} className="flex h-[6px] w-full overflow-hidden rounded-[3px] bg-mist">
      {total > 0
        ? segments.map((s, i) =>
            s.value > 0 ? <span key={i} className={cx('h-full', s.className)} style={{ width: `${(s.value / total) * 100}%` }} /> : null,
          )
        : null}
    </span>
  );
}

const WEEKDAY = new Intl.DateTimeFormat('th-TH', { weekday: 'short', timeZone: 'Asia/Bangkok' });

/** 7 tiny bars, oldest first; the last bar (today) is drawn in full colour. */
function Sparkbars({ values, label, tone = 'primary' }: { values: number[]; label: string; tone?: Tone }) {
  const max = Math.max(...values, 1);
  const now = Date.now();
  return (
    <span role="img" aria-label={label} className="flex h-[32px] shrink-0 items-end gap-[3px]">
      {values.map((v, i) => {
        const isToday = i === values.length - 1;
        const day = WEEKDAY.format(new Date(now - (values.length - 1 - i) * 24 * 60 * 60 * 1000));
        return (
          <span
            key={i}
            title={`${day}: ${v.toLocaleString('th-TH')}`}
            className={cx(
              'w-[6px] rounded-[2px]',
              tone === 'danger'
                ? isToday ? 'bg-danger' : 'bg-danger/30'
                : isToday ? 'bg-primary-600' : 'bg-primary-500/30',
            )}
            style={{ height: v === 0 ? '2px' : `${Math.max((v / max) * 100, 12)}%` }}
          />
        );
      })}
    </span>
  );
}

/** ISO -> "5 นาทีก่อน" / "3 ชม.ก่อน" / "2 วันก่อน" – short enough for one card line */
function timeAgo(iso: string): string {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 60) return `${Math.max(minutes, 1)} นาทีก่อน`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} ชม.ก่อน`;
  return `${Math.round(hours / 24)} วันก่อน`;
}

function sum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}

export function SummaryCards({ stats }: { stats: SummaryStats }) {
  const { users, hrQueue, logins, loginErrors } = stats;
  const errorTotal = loginErrors ? loginErrors.failed + loginErrors.blocked : null;

  return (
    <div className="grid h-full grid-cols-1 gap-px bg-line sm:grid-cols-2">
      <SummaryCard label="ผู้ใช้ทั้งหมด" href="/admin/users">
        <span className="flex items-center justify-between gap-[8px]">
          {/* ทำงานอยู่ + ลาออก (ไม่นับผู้เสียชีวิต) ให้ตรงกับ "ทั้งหมด" บนหน้าผู้ใช้ */}
          <Headline value={users ? users.active + users.resigned : null} unit="คน" />
          {users && users.newThisMonth !== null ? (
            <Note tone={users.newThisMonth > 0 ? 'primary' : 'muted'}>ใหม่เดือนนี้ {users.newThisMonth}</Note>
          ) : null}
        </span>
        {users === null ? (
          <LoadFailed />
        ) : (
          <>
            <SegmentBar
              label={`${EMPLOYMENT_STATUS_LABELS.ACTIVE} ${users.active} คน ${EMPLOYMENT_STATUS_LABELS.RESIGNED} ${users.resigned} คน`}
              segments={[
                { value: users.active, className: 'bg-primary-500' },
                { value: users.resigned, className: 'bg-ink-mute/40' },
              ]}
            />
            <MetaLine
              parts={[
                <LegendDot key="a" className="bg-primary-500" text={`${EMPLOYMENT_STATUS_LABELS.ACTIVE} ${users.active.toLocaleString('th-TH')}`} />,
                <LegendDot key="r" className="bg-ink-mute/40" text={`${EMPLOYMENT_STATUS_LABELS.RESIGNED} ${users.resigned.toLocaleString('th-TH')}`} />,
              ]}
            />
          </>
        )}
      </SummaryCard>

      <SummaryCard label="คำขอรอ HR ตรวจ" href="/admin/benefits?tab=claims">
        <span className="flex items-center justify-between gap-[8px]">
          <Headline
            value={hrQueue?.pending ?? null}
            unit="รายการ"
            className={(hrQueue?.pending ?? 0) > 0 ? 'text-primary-700' : undefined}
          />
          {hrQueue?.oldestPendingDays != null ? (
            <Note tone={hrQueue.oldestPendingDays > 7 ? 'pending' : 'muted'}>ค้างนานสุด {hrQueue.oldestPendingDays} วัน</Note>
          ) : null}
        </span>
        {hrQueue === null ? (
          <LoadFailed />
        ) : (
          <>
            <SegmentBar
              label={`รอ HR ${hrQueue.pending} รอการเงิน ${hrQueue.atFinance} อนุมัติ ${hrQueue.approved} ไม่อนุมัติ ${hrQueue.rejected}`}
              segments={[
                { value: hrQueue.pending, className: 'bg-status-pending' },
                { value: hrQueue.atFinance, className: 'bg-status-pending/40' },
                { value: hrQueue.approved, className: 'bg-status-approved' },
                { value: hrQueue.rejected, className: 'bg-status-rejected' },
              ]}
            />
            <MetaLine
              parts={[
                <LegendDot key="p" className="bg-status-pending" text={`รอ HR ${hrQueue.pending}`} />,
                ...(hrQueue.atFinance > 0
                  ? [<LegendDot key="f" className="bg-status-pending/40" text={`รอการเงิน ${hrQueue.atFinance}`} />]
                  : []),
                <LegendDot key="a" className="bg-status-approved" text={`อนุมัติ ${hrQueue.approved}`} />,
                <LegendDot key="r" className="bg-status-rejected" text={`ไม่อนุมัติ ${hrQueue.rejected}`} />,
              ]}
            />
          </>
        )}
      </SummaryCard>

      <SummaryCard label="เข้าใช้งานวันนี้" href="/admin/logs">
        <span className="flex items-end justify-between gap-[8px]">
          <Headline value={logins?.today ?? null} unit="คน" />
          {logins ? (
            <Sparkbars values={logins.daily} label={`ผู้เข้าใช้งาน 7 วันล่าสุด: ${logins.daily.join(', ')} คน`} />
          ) : null}
        </span>
        {logins === null ? (
          <LoadFailed />
        ) : (
          <MetaLine
            parts={[
              `เฉลี่ย 7 วันล่าสุด ${(sum(logins.daily) / logins.daily.length).toLocaleString('th-TH', { maximumFractionDigits: 1 })} คน/วัน`,
            ]}
          />
        )}
      </SummaryCard>

      <SummaryCard label="ล็อกอินผิดพลาด" href="/admin/logs">
        <span className="flex items-end justify-between gap-[8px]">
          <Headline value={errorTotal} unit="ครั้ง" className={(errorTotal ?? 0) > 0 ? 'text-danger' : undefined} />
          {loginErrors ? (
            <Sparkbars
              values={loginErrors.daily}
              tone="danger"
              label={`ล็อกอินผิดพลาด 7 วันล่าสุด: ${loginErrors.daily.join(', ')} ครั้ง`}
            />
          ) : null}
        </span>
        {loginErrors === null ? (
          <LoadFailed />
        ) : errorTotal === 0 ? (
          <MetaLine parts={['ไม่พบใน 7 วันล่าสุด']} />
        ) : (
          <span className="flex flex-col gap-[2px]">
            <MetaLine parts={[`รหัสผิด ${loginErrors.failed}`, `ถูกบล็อก ${loginErrors.blocked}`]} />
            {loginErrors.lastAt ? (
              <span className="text-12 text-muted">ล่าสุด {timeAgo(loginErrors.lastAt)}</span>
            ) : null}
          </span>
        )}
      </SummaryCard>
    </div>
  );
}

function LegendDot({ className, text }: { className: string; text: string }) {
  return (
    <span className="flex items-center gap-[4px]">
      <span className={cx('size-[6px] rounded-full', className)} aria-hidden="true" />
      {text}
    </span>
  );
}
