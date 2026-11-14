import Link from 'next/link';
import type { ReactNode } from 'react';
import { cx } from '@/lib/cx';
import { Avatar } from './Avatar';
import { ProxyBadge } from './Badge';
import { Card } from './Card';

// โปรไฟล์ผู้ขอ: แบบย่อใช้ในแถวคิว แบบเต็มใช้ในหน้าตรวจคำขอ (ข้อมูลมาจาก Supabase ผ่าน props)

export type RequesterSummary = {
  name: string;
  code: string;
  position?: string | null;
  department?: string | null;
  photoUrl?: string | null;
  /** ชื่อหัวหน้าแผนกที่ยื่นแทน (null = ยื่นเอง) */
  proxyBy?: string | null;
};

/** แบบย่อ: รูป ชื่อ รหัส · ตำแหน่ง · แผนก และป้ายยื่นแทน */
export function RequesterCompact({ person, className }: { person: RequesterSummary; className?: string }) {
  const meta = [person.code, person.position, person.department].filter(Boolean).join(' · ');
  return (
    <span className={cx('flex min-w-0 items-center gap-2.5', className)}>
      <Avatar name={person.name} src={person.photoUrl} />
      <span className="min-w-0">
        <span className="block truncate font-semibold text-ink">{person.name}</span>
        <span className="block text-12 text-muted">{meta}</span>
        {person.proxyBy ? <ProxyBadge name={person.proxyBy} className="mt-0.5" /> : null}
      </span>
    </span>
  );
}

export type RequesterDetail = RequesterSummary & {
  level?: string | null;
  tenure?: string | null;
  supervisor?: string | null;
  /** สถานะพนักงาน เช่น ทำงานอยู่ / ลาออก */
  employmentStatus?: ReactNode;
  /** เช่น "5/30 ครั้ง" */
  claimsThisYear?: string | null;
  available?: string | null;
  profileHref?: string;
};

/** แบบเต็ม (ดีไซน์ H02): แถบสีด้านบน รูปซ้อนขอบ ข้อมูลผู้ขอ 2 คอลัมน์ และลิงก์ไปโปรไฟล์พนักงาน */
export function RequesterFull({ person, title = 'ผู้ขอ', className }: { person: RequesterDetail; title?: string; className?: string }) {
  const rows: [string, ReactNode][] = [
    ['ระดับ', person.level],
    ['อายุงาน', person.tenure],
    ['หัวหน้า', person.supervisor],
    ['สถานะ', person.employmentStatus],
    ['เบิกปีนี้', person.claimsThisYear],
    ['วงเงินใช้ได้', person.available],
  ];
  return (
    <Card aria-label={title} className={cx('overflow-hidden', className)}>
      <div aria-hidden="true" className="h-14 bg-[#1E3A8A]" />
      <div className="px-[18px] pb-4">
        <span className="-mt-8 inline-flex rounded-full border-[3px] border-white bg-white">
          <Avatar name={person.name} src={person.photoUrl} size="lg" tone="blue" />
        </span>
        <p className="mt-1.5 text-17 font-semibold text-ink">{person.name}</p>
        {person.position ? <p className="text-13 text-ink-soft">{person.position}</p> : null}
        <p className="text-12 text-muted">{[person.code, person.department].filter(Boolean).join(' · ')}</p>
        {person.proxyBy ? <ProxyBadge name={person.proxyBy} className="mt-1.5" /> : null}
        <dl className="mt-3 grid grid-cols-2 gap-2.5 border-t border-line pt-3">
          {rows.map(([label, value]) => (
            <div key={label} className="min-w-0">
              <dt className="text-12 text-muted">{label}</dt>
              <dd className="text-14 break-words text-ink">{value ?? '—'}</dd>
            </div>
          ))}
        </dl>
        {person.profileHref ? (
          <Link href={person.profileHref} className="mt-3 block text-13 text-[#1D4ED8] hover:underline">
            ดูโปรไฟล์และประวัติการเบิกทั้งหมด ›
          </Link>
        ) : null}
      </div>
    </Card>
  );
}
